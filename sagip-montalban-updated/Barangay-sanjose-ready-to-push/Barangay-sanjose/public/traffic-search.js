/* ============================================================================
 * traffic-search.js — DESTINATION SEARCH ENGINE for the Traffic map
 * ============================================================================
 * Powers the "Choose destination" box with Google-Maps-like coverage:
 *
 *   1. LOCAL GAZETTEER  (traffic-places.js)  — instant, works offline, knows
 *      every subdivision / phase / sitio / landmark inside Barangay San Jose
 *      and the rest of Rodriguez. This is what finds "Sub-Urban Phase 1A"
 *      that Mapbox and Google simply do not have.
 *   2. MAPBOX GEOCODING — addresses, buildings, business names in the PH.
 *   3. PHOTON (Komoot)  — OpenStreetMap autocomplete; very good in PH.
 *   4. NOMINATIM (OSM)  — last-resort fallback, only when 1-3 find nothing.
 *
 * All four are merged, de-duplicated and re-ranked locally, so results from
 * the barangay list always win over a generic "San Jose, Rizal" match.
 *
 * Public API (window.TrafficSearch):
 *   normalize(q)                     -> canonical string used for matching
 *   parse(q)                         -> {norm, tokens, core, block, lot, phase}
 *   localSearch(q, proximity, limit) -> [result]        (sync, offline)
 *   search(q, {token, proximity})    -> Promise<{results, online, hint}>
 *   reverse(lat, lng, {token})       -> Promise<result>  (map-tap naming)
 *   category(q)                      -> {term, icon, label} | null
 *
 * RESULT OBJECT
 *   { label, sub, lat, lng, icon, src, rel, approx, dist }
 *   src: 'local' | 'mapbox' | 'photon' | 'nominatim'
 *
 * DATA CREDIT: results from Photon/Nominatim come from OpenStreetMap
 * (© OpenStreetMap contributors, ODbL 1.0).
 * ==========================================================================*/
(function (root) {
  'use strict';

  var NEAR = { lat: 14.7425, lng: 121.1310 };            // Barangay San Jose
  var PH_BBOX = '120.4,4.5,127.0,21.5';                  // minLon,minLat,maxLon,maxLat
  var PH_CENTER = '121.131,14.7425';

  /* ---------------------------------------------------------------- utils */
  function deaccent(s) {
    return s && s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : String(s || '');
  }
  function haversine(aLat, aLng, bLat, bLng) {
    if (aLat == null || bLat == null) return Infinity;
    var R = 6371000, d2r = Math.PI / 180;
    var dLat = (bLat - aLat) * d2r;
    var dLng = (bLng - aLng) * d2r * Math.cos(((aLat + bLat) / 2) * d2r);
    var x = dLng, y = dLat;
    return Math.sqrt(x * x + y * y) * R;
  }
  function fmtDist(m) {
    if (m == null || !isFinite(m)) return '';
    return m < 950 ? Math.round(m / 10) * 10 + ' m'
                   : (m / 1000).toFixed(m < 9500 ? 1 : 0) + ' km';
  }
  function withBounds(hay, token) {
    // whole-word match for short tokens, prefix match for longer ones so
    // "kasigla" still finds "Kasiglahan" while typing.
    if (!token) return false;
    var i = hay.indexOf(token);
    while (i > -1) {
      var atStart = i === 0 || hay.charAt(i - 1) === ' ';
      if (atStart) {
        var end = i + token.length;
        if (token.length >= 4 || end === hay.length || hay.charAt(end) === ' ') return true;
      }
      i = hay.indexOf(token, i + 1);
    }
    return false;
  }

  /* ------------------------------------------------- normalisation rules */
  var SUBS = [
    [/\b(brgy|bgy|brg|barrangay|baranggay|barangy)\b/g, 'barangay'],
    [/\b(blck|blk|blok|bloke)\b/g, 'block'],
    [/\b(phs|ph|pha)\b/g, 'phase'],
    [/\b(subdivision|subdivisions|subd)\b/g, 'subdivision'],
    [/\b(suburban|sub urban|sub urb)\b/g, 'sub urban'],
    [/\b(montalban|montalbn|montonban)\b/g, 'rodriguez'],
    [/\b(sanjose|sj)\b/g, 'san jose'],
    [/\b(st|str|ste)\b/g, 'street'],
    [/\b(ave|av)\b/g, 'avenue'],
    [/\b(rd|rds)\b/g, 'road'],
    [/\b(hwy|hi way|high way)\b/g, 'highway'],
    [/\b(natl|national)\b/g, 'national'],
    [/\b(sition|sito)\b/g, 'sitio'],
    [/\b(pruok|porok)\b/g, 'purok'],
    [/\b(eskwelahan|paaralan)\b/g, 'school'],
    [/\b(ospital|pagamutan)\b/g, 'hospital'],
    [/\b(botika|botica)\b/g, 'pharmacy'],
    [/\b(palengke)\b/g, 'market'],
    [/\b(simbahan)\b/g, 'church'],
    [/\b(bangko)\b/g, 'bank'],
    [/\b(kainan)\b/g, 'restaurant'],
    [/\b(philippines|pilipinas|phils|phl)\b/g, 'philippines']
  ];

  function normalize(s) {
    var t = deaccent(String(s == null ? '' : s).toLowerCase());
    t = t.replace(/[^a-z0-9]+/g, ' ');                 // hyphen/comma/dot -> space
    for (var i = 0; i < SUBS.length; i++) t = t.replace(SUBS[i][0], SUBS[i][1]);
    t = t.replace(/\b(\d+)\s+([a-z])\b/g, '$1$2');     // "phase 1 a" -> "phase 1a"
    return t.replace(/\s+/g, ' ').trim();
  }

  // Tokens that describe the barangay / province rather than the place the
  // user is hunting for. They must not decide the ranking on their own —
  // otherwise "san jose" outranks "sub urban".
  var GENERIC = ('rodriguez rizal philippines montalban barangay san jose street road avenue ' +
                 'sitio purok subdivision near the of and').split(' ').reduce(function (o, w) { o[w] = 1; return o; }, {});

  // Remove "Blk 4" / "Lot 11" — a house address, not the place name.
  function stripAddress(norm) {
    return norm.replace(/\b(block|lot)\s*\d+[a-z]?\b/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function parse(q) {
    var norm = normalize(q);
    var tokens = norm ? norm.split(' ') : [];
    var core = tokens.filter(function (t) { return !GENERIC[t]; });
    if (!core.length) core = tokens.slice();
    // `place` = the words that describe a PLACE (address + area words removed).
    // "blk 4 phase 1a sub-urban sanjose rodriguez rizal" -> [phase, 1a, sub, urban]
    var place = stripAddress(norm).split(' ').filter(function (t) { return t && !GENERIC[t]; });
    var match = place.length ? place : core;
    var mBlock = norm.match(/\bblock\s*(\d+[a-z]?)\b/);
    var mLot = norm.match(/\blot\s*(\d+[a-z]?)\b/);
    var mPhase = norm.match(/\bphase\s*(\d+[a-z]?)\b/);
    return {
      raw: q, norm: norm, tokens: tokens, core: core, place: place, match: match,
      block: mBlock ? mBlock[1] : null,
      lot: mLot ? mLot[1] : null,
      phase: mPhase ? mPhase[1] : null
    };
  }

  /* ------------------------------------------------------ local gazetteer */
  var HAY = null;
  function buildHay() {
    if (HAY || !root.TRAFFIC_PLACES) return;
    HAY = root.TRAFFIC_PLACES.map(function (p) {
      var aliases = p.a ? String(p.a).split('|') : [];
      var nHay = normalize(p.n);                       // display name only
      var aHay = normalize(aliases.join(' '));         // shortcuts only
      return { p: p, nHay: nHay, aHay: aHay, hay: nHay + ' ' + aHay + ' ' + normalize((p.c || '') + ' ' + (p.k || '')) };
    });
  }

  // Nearby barangay/town entries win ties — this app is about Barangay San Jose.
  var KIND_BOOST = { barangay: 45, town: 30, subdivision: 10, sitio: 8 };

  function scorePlace(entry, q, proximity) {
    var p = entry.p;
    var match = q.match, score = 0;

    if (q.norm && entry.nHay.indexOf(q.norm) === 0) score += 260;            // name starts with query
    else if (q.norm && entry.nHay.indexOf(q.norm) > -1) score += 225;        // name contains query
    else if (q.norm && entry.aHay.indexOf(q.norm) > -1) score += 175;        // a shortcut matched
    else if (q.norm && entry.hay.indexOf(q.norm) > -1) score += 110;

    var inName = 0, inAlias = 0, inHay = 0;
    for (var i = 0; i < match.length; i++) {
      if (withBounds(entry.nHay, match[i])) inName++;
      if (withBounds(entry.aHay, match[i])) inAlias++;
      if (withBounds(entry.hay, match[i])) inHay++;
    }
    score += (inName / match.length) * 420;
    score += (inAlias / match.length) * 130;
    if (inName === match.length) score += 130;                               // every word, in the name

    // Prefer the general place over its sub-phases ("Kasiglahan Village" >
    // "Kasiglahan Phase 1B") and boost barangay/town entries.
    var nameTokens = entry.nHay.split(' ').length;
    score += 12 * Math.max(0, 4 - nameTokens);
    score += KIND_BOOST[p.k] || 0;

    // Places near the map centre win ties (Google does the same).
    var d = proximity ? haversine(proximity.lat, proximity.lng, p.lat, p.lng) : 0;
    if (isFinite(d)) score += 45 * Math.max(0, 1 - d / 25000);

    return { score: score, dist: d, inName: inName };
  }

  function localSearch(q, proximity, limit) {
    buildHay();
    if (!HAY) return [];
    var parsed = typeof q === 'string' ? parse(q) : q;
    var match = parsed.match || [];
    if (match.length === 0 || parsed.norm.length < 2) return [];
    var out = [];
    for (var i = 0; i < HAY.length; i++) {
      var r = scorePlace(HAY[i], parsed, proximity || NEAR);
      if (r.score < 190) continue;
      // Require most of the place words to actually be in the place NAME —
      // otherwise "sub urban" would also match "Sub-Station".
      if (r.inName < Math.ceil(match.length * 0.6)) continue;
      var p = HAY[i].p;
      var label = p.n;
      var approx = !!p.ap;
      var allInName = r.inName === match.length;
      // Show the Blk/Lot/Phase the user typed, flagged as approximate: blocks
      // and lots are not individually surveyed in this dataset.
      if (allInName && (parsed.block || parsed.lot)) {
        var parts = [];
        if (parsed.block) parts.push('Blk ' + parsed.block);
        if (parsed.lot) parts.push('Lot ' + parsed.lot);
        label = parts.join(' ') + ', ' + p.n;
        approx = true;
      } else if (allInName && parsed.phase && !/phase/i.test(p.n)) {
        label = 'Phase ' + parsed.phase.toUpperCase() + ', ' + p.n;
        approx = true;
      }
      out.push({
        label: label, sub: p.c || 'Rodriguez (Montalban), Rizal',
        lat: p.lat, lng: p.lng, k: p.k || 'pin', src: 'local',
        rel: r.score / 1000, approx: approx, dist: r.dist, score: r.score
      });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, limit || 8);
  }

  /* --------------------------------------------------------- remote APIs */
  function jsonFetch(url, ms) {
    return new Promise(function (resolve, reject) {
      var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var t = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 8000);
      fetch(url, { signal: ctl ? ctl.signal : undefined, headers: { Accept: 'application/json' } })
        .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(function (d) { clearTimeout(t); resolve(d); })
        .catch(function (e) { clearTimeout(t); reject(e); });
    });
  }
  function splitName(full) {
    var i = String(full || '').indexOf(',');
    return i > 0 ? { label: full.slice(0, i).trim(), sub: full.slice(i + 1).trim() } : { label: String(full || ''), sub: '' };
  }
  function shortSub(sub) {
    var parts = String(sub || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var drop = /^(philippines|\d{4}|calabarzon|region iv-a.*|metro manila)$/i;
    parts = parts.filter(function (p) { return !drop.test(p); });
    return parts.slice(0, 3).join(', ');
  }

  function mapboxSearch(term, opts) {
    var types = opts.types || 'address,place,locality,neighborhood,poi,postcode,district,region';
    var url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(term) + '.json' +
      '?country=ph&limit=10&autocomplete=' + (opts.autocomplete === false ? 'false' : 'true') +
      '&types=' + types +
      '&proximity=' + (opts.proximity ? opts.proximity.lng + ',' + opts.proximity.lat : PH_CENTER) +
      '&access_token=' + encodeURIComponent(opts.token);
    return jsonFetch(url, opts.timeout || 8000).then(function (d) {
      return (d.features || []).map(function (f) {
        var pn = f.place_name || f.text || '';
        var sp = splitName(pn);
        var kind = (f.place_type && f.place_type[0]) || 'poi';
        return {
          label: sp.label, sub: shortSub(sp.sub), lat: f.center[1], lng: f.center[0],
          k: kind, src: 'mapbox', rel: typeof f.relevance === 'number' ? f.relevance : 0.5,
          cat: opts.cat || null
        };
      });
    });
  }

  function photonSearch(term, opts) {
    var url = 'https://photon.komoot.io/api/?q=' + encodeURIComponent(term) + '&limit=15&lang=en' +
      '&lat=' + (opts.proximity ? opts.proximity.lat : NEAR.lat) +
      '&lon=' + (opts.proximity ? opts.proximity.lng : NEAR.lng) +
      '&bbox=' + PH_BBOX;
    return jsonFetch(url, opts.timeout || 8000).then(function (d) {
      return (d.features || []).map(function (f) {
        var pr = f.properties || {};
        var c = f.geometry && f.geometry.coordinates;
        if (!c) return null;
        var sub = [pr.street, pr.locality, pr.district, pr.city, pr.state]
          .filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; })
          .filter(function (v) { return v !== pr.name; }).join(', ');
        return {
          label: pr.name || (pr.street || pr.city || 'Pinned location'),
          sub: shortSub(sub), lat: c[1], lng: c[0], k: pr.type || 'poi',
          src: 'photon', rel: 0.62, cat: opts.cat || null
        };
      }).filter(Boolean);
    });
  }

  function nominatimSearch(term, opts) {
    var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=15&dedupe=1' +
      '&countrycodes=ph&addressdetails=1&q=' + encodeURIComponent(term);
    return jsonFetch(url, opts.timeout || 9000).then(function (d) {
      return (d || []).map(function (f) {
        var a = f.address || {};
        var sub = [a.neighbourhood || a.quarter || a.suburb, a.village || a.town || a.city, a.state]
          .filter(Boolean).filter(function (v, i, arr) { return arr.indexOf(v) === i; }).join(', ');
        return {
          label: f.name || String(f.display_name || '').split(',')[0],
          sub: shortSub(sub || f.display_name), lat: +f.lat, lng: +f.lon,
          k: f.type || 'poi', src: 'nominatim', rel: 0.55, cat: opts.cat || null
        };
      });
    });
  }

  /* ------------------------------------------------------ category search */
  var CATEGORIES = [
    { re: /^(gas|gasoline|gasolinahan|gas station|fuel|petron|shell|caltex|seaoil|phoenix|unioil|total|flying v|cleanfuel)$/i, term: 'gas station', icon: 'fuel', label: 'Gas stations' },
    { re: /^(hospital|ospital|pagamutan|medical center|clinic|health center|infirmary)$/i, term: 'hospital', icon: 'health', label: 'Hospitals & clinics' },
    { re: /^(school|eskwelahan|paaralan|elementary school|high school|senior high|college|university)$/i, term: 'school', icon: 'school', label: 'Schools' },
    { re: /^(mall|shopping|shopping mall|department store|palengke|market|public market|supermarket|grocery)$/i, term: 'supermarket', icon: 'shop', label: 'Malls & markets' },
    { re: /^(restaurant|kainan|fast food|food|karinderya|carenderia|jollibee|mcdo|mcdonalds|chowking|inasal)$/i, term: 'restaurant', icon: 'food', label: 'Restaurants' },
    { re: /^(pharmacy|botika|botica|drugstore|drug store|mercury drug|generics)$/i, term: 'pharmacy', icon: 'health', label: 'Pharmacies' },
    { re: /^(atm|bank|bangko|money changer|pawnshop)$/i, term: 'bank', icon: 'shop', label: 'Banks & ATMs' },
    { re: /^(hotel|inn|motel|pension house|transient|lodge|resort)$/i, term: 'hotel', icon: 'pin', label: 'Hotels & stays' },
    { re: /^(church|simbahan|chapel|cathedral|parish)$/i, term: 'church', icon: 'worship', label: 'Churches' },
    { re: /^(police|pulis|police station|presinto|precinct)$/i, term: 'police station', icon: 'gov', label: 'Police stations' },
    { re: /^(fire station|bumbero|bfp)$/i, term: 'fire station', icon: 'gov', label: 'Fire stations' },
    { re: /^(barangay hall|hall|municipal hall|city hall|town hall|munisipyo)$/i, term: 'barangay hall', icon: 'gov', label: 'Barangay & municipal halls' },
    { re: /^(terminal|transport terminal|sakayan|bus terminal|jeepney|tricycle|van terminal|bus stop)$/i, term: 'transport terminal', icon: 'transit', label: 'Terminals & stops' },
    { re: /^(bakery|panaderia|panderia|hardware|water station|laundry|salon|barber|gym|fitness)$/i, term: 'hardware', icon: 'shop', label: 'Shops & services' }
  ];
  function category(q) {
    var t = String(q || '').trim();
    if (!t || t.length > 30) return null;
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].re.test(t)) return CATEGORIES[i];
    return null;
  }

  /* ------------------------------------------------------------ merging */
  // The same real-world place arrives spelled differently from every source
  // ("Phase 1-A Sub Urban" vs "Blk 4, Phase 1-A Sub Urban" vs OSM's
  // "Phase 1-A Sub Urban, San Isidro"). Two results are the same place when
  // they sit within 150 m of each other AND share most of their significant
  // words. Otherwise both are kept (two different shops 80 m apart stay).
  function sigWords(label) {
    return normalize(label).split(' ').filter(function (t) {
      return t && !GENERIC[t] && !/^\d+$/.test(t);
    });
  }
  function samePlace(a, b) {
    var d = haversine(a.lat, a.lng, b.lat, b.lng);
    if (d > 150) return false;
    var sa = sigWords(a.label), sb = sigWords(b.label);
    if (!sa.length || !sb.length) return d < 25;
    var small = sa.length <= sb.length ? sa : sb;
    var big = sa.length <= sb.length ? sb : sa;
    var hit = 0;
    for (var i = 0; i < small.length; i++) if (big.indexOf(small[i]) > -1) hit++;
    return hit / small.length >= 0.6;
  }

  function merge(local, remote, proximity, limit) {
    var out = [];
    function push(r, isLocal) {
      for (var i = 0; i < out.length; i++) if (samePlace(out[i], r)) return;   // already have it
      var d = haversine(proximity.lat, proximity.lng, r.lat, r.lng);
      r.dist = d;
      var s = r.score || 0;
      r.rank = isLocal
        ? (s >= 300 ? 0.60 + 0.40 * Math.min(1, s / 1000) : 0.25 * (s / 300))
        : (r.rel || 0.5) * 0.55 + 0.05 * Math.max(0, 1 - d / 30000);
      out.push(r);
    }
    local.forEach(function (r) { push(r, true); });
    remote.forEach(function (r) { push(r, false); });
    out.sort(function (a, b) { return b.rank - a.rank; });
    return out.slice(0, limit || 14);
  }

  /* -------------------------------------------------------- main search */
  function variants(q) {
    var v = [];
    var noAddr = stripAddress(q.norm);
    var core = (q.match && q.match.length ? q.match : q.core).join(' ');
    [noAddr, core, q.norm].forEach(function (x) { if (x && x.length >= 2 && v.indexOf(x) === -1) v.push(x); });
    return v.slice(0, 3);
  }

  function search(q, opts) {
    opts = opts || {};
    var parsed = typeof q === 'string' ? parse(q) : q;
    var proximity = opts.proximity || NEAR;
    var token = opts.token || (root.mapboxgl && root.mapboxgl.accessToken) || '';
    if (!parsed.norm || parsed.norm.length < 2) return Promise.resolve({ results: [], online: false, hint: '' });

    var local = localSearch(parsed, proximity, 8);
    var cat = category(parsed.raw);
    var vs = variants(parsed);
    var primary = vs[0], coreV = vs[vs.length - 1];
    var jobs = [], errors = 0;

    function track(p) { return p.then(function (r) { return r; }, function () { errors++; return []; }); }

    if (cat) {
      // Category query ("gas station", "botika", "palengke") -> POIs near the
      // current map centre, exactly like Google Maps does.
      var catOpts = { token: token, proximity: proximity, autocomplete: false, cat: { term: cat.term, icon: cat.icon, label: cat.label } };
      if (token) jobs.push(track(mapboxSearch(cat.term, catOpts)));
      jobs.push(track(photonSearch(cat.term, catOpts)));
    } else {
      if (token) jobs.push(track(mapboxSearch(primary, { token: token, proximity: proximity })));
      jobs.push(track(photonSearch(primary, { proximity: proximity })));
      if (coreV !== primary) jobs.push(track(photonSearch(coreV, { proximity: proximity })));
    }

    return Promise.all(jobs).then(function (lists) {
      var remote = [];
      lists.forEach(function (l) { remote = remote.concat(l); });
      var merged = merge(local, remote, proximity, 14);

      // Nothing at all? Go deeper: Nominatim (OSM) + the rawest query form.
      if (!merged.length) {
        var deep = [];
        if (token) deep.push(track(mapboxSearch(coreV, { token: token, proximity: proximity, types: 'place,locality,neighborhood,address,poi' })));
        deep.push(track(nominatimSearch(coreV, { proximity: proximity })));
        if (parsed.norm !== coreV) deep.push(track(nominatimSearch(parsed.norm, { proximity: proximity })));
        return Promise.all(deep).then(function (dl) {
          var dremote = [];
          dl.forEach(function (l) { dremote = dremote.concat(l); });
          return finish(merge(local, dremote, proximity, 14), errors, cat);
        });
      }
      return finish(merged, errors, cat);
    }).catch(function () {
      return finish(merge(local, [], proximity, 14), 1, cat);
    });

    function finish(results, errCount, categoryHit) {
      var hint = '';
      if (!results.length) {
        hint = errCount
          ? 'Walang resulta. Suriin ang internet o i-tap ang mapa para mag-pin ng eksaktong lokasyon.'
          : 'Walang nakitang lugar. I-tap ang mapa para mag-pin ng eksaktong lokasyon.';
      } else if (results[0].approx) {
        hint = 'Tinatayang lokasyon lang ito — i-tap ang mapa para itama ang eksaktong pin.';
      } else if (categoryHit) {
        hint = categoryHit.label + ' na pinakamalapit sa gitna ng mapa.';
      }
      return { results: results, online: errCount < 3, hint: hint, category: categoryHit || null };
    }
  }

  /* --------------------------------------------------- reverse geocoding */
  function nearestKnown(lat, lng, maxM) {
    buildHay();
    if (!HAY) return null;
    var best = null, bestD = maxM || 500;
    HAY.forEach(function (h) {
      var d = haversine(lat, lng, h.p.lat, h.p.lng);
      if (d < bestD) { bestD = d; best = h.p; }
    });
    return best ? { label: 'Near ' + best.n, sub: best.c || '', lat: lat, lng: lng, k: best.k, src: 'local', rel: 0.5 } : null;
  }

  function reverse(lat, lng, opts) {
    opts = opts || {};
    var token = opts.token || (root.mapboxgl && root.mapboxgl.accessToken) || '';
    var fallback = function () {
      return nearestKnown(lat, lng, 600) || {
        label: lat.toFixed(5) + ', ' + lng.toFixed(5),
        sub: 'Pinned location', lat: lat, lng: lng, k: 'pin', src: 'local', rel: 0.5
      };
    };
    if (!token) return Promise.resolve(fallback());
    var url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + lng + ',' + lat + '.json' +
      '?limit=1&types=address,poi,place,locality,neighborhood,postcode' +
      '&access_token=' + encodeURIComponent(token);
    return jsonFetch(url, 7000).then(function (d) {
      var f = (d.features || [])[0];
      if (!f) return fallback();
      var sp = splitName(f.place_name || '');
      var known = nearestKnown(lat, lng, 350);
      return {
        label: sp.label, sub: shortSub(sp.sub) || (known ? known.label : 'Pinned location'),
        lat: lat, lng: lng, k: (f.place_type && f.place_type[0]) || 'pin', src: 'mapbox', rel: 0.8
      };
    }).catch(function () { return fallback(); });
  }

  root.TrafficSearch = {
    normalize: normalize, parse: parse, localSearch: localSearch, search: search,
    reverse: reverse, category: category, haversine: haversine, fmtDist: fmtDist,
    NEAR: NEAR
  };
})(window);
