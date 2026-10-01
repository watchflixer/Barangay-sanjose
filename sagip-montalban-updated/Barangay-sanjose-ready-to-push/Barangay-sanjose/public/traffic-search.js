/* ============================================================================
 * Traffic destination search. Local places + live, worldwide providers.
 *
 * Mapbox Geocoding v6 searches ADDRESSES/AREAS, not business POIs. Photon
 * searches OSM places/businesses. Neither has Google's private Places coverage.
 * The optional, separately attributed Google Places UI Kit lives in
 * traffic-google.js; Google content is not copied into this gazetteer/results.
 *
 * API: normalize, parse, localSearch, search, reverse, category, directPlace,
 *      haversine, fmtDist, validCoords, forStorage, NEAR.
 * Result: {label, sub, lat, lng, k, src, approx, precision, note, dist, id}.
 * Area centroids are not house/block/lot pins. No synthetic exact addresses.
 *
 * The public Nominatim server is intentionally NOT used: its policy forbids
 * client-side autocomplete and limits aggregate app traffic to 1 request/s.
 * An administrator may deliberately configure a self-hosted/commercial
 * Nominatim-compatible endpoint for explicit submitted searches only.
 * See docs/traffic-destination-search.md for coverage, setup and usage policies.
 * OSM-derived data: © OpenStreetMap contributors, https://osm.org/copyright.
 * ========================================================================== */
(function (root) {
  'use strict';

  var NEAR = { lat: 14.7425, lng: 121.1310 };
  var AREA_KINDS = /^(subdivision|sitio|barangay|town|road|street|place|locality|neighborhood|neighbourhood|district|region|country|postcode|residential|administrative|city|county|state|village|hamlet|suburb)$/;

  function deaccent(s) {
    return s && s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : String(s || '');
  }
  function validCoords(lat, lng) {
    return typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  }
  function haversine(aLat, aLng, bLat, bLng) {
    if (!validCoords(aLat, aLng) || !validCoords(bLat, bLng)) return Infinity;
    var rad = Math.PI / 180;
    var dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad;
    var a = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  }
  function fmtDist(m) {
    if (m == null || !isFinite(m)) return '';
    return m < 950 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(m < 9500 ? 1 : 0) + ' km';
  }
  function withBounds(hay, token) {
    if (!token) return false;
    var i = hay.indexOf(token);
    while (i > -1) {
      if (i === 0 || hay.charAt(i - 1) === ' ') {
        var end = i + token.length;
        if (token.length >= 4 || end === hay.length || hay.charAt(end) === ' ') return true;
      }
      i = hay.indexOf(token, i + 1);
    }
    return false;
  }
  var SUBS = [
    [/\b(brgy|bgy|brg|barrangay|baranggay|barangy)\b/g, 'barangay'],
    [/\b(blck|blk|blok|bloke)\b/g, 'block'],
    [/\b(phs|ph|pha)\b/g, 'phase'],
    [/\b(subd|subdivisions)\b/g, 'subdivision'],
    [/\b(suburban|sub urb)\b/g, 'sub urban'],
    [/\b(montalban|montalbn|montonban)\b/g, 'rodriguez'],
    [/\b(sanjose|sj)\b/g, 'san jose'],
    [/\b(st|str)\b/g, 'street'],
    [/\b(ave|av)\b/g, 'avenue'],
    [/\b(rd|rds)\b/g, 'road'],
    [/\b(hwy|hi way|high way)\b/g, 'highway'],
    [/\b(natl)\b/g, 'national'],
    [/\b(sition|sito)\b/g, 'sitio'],
    [/\b(pruok|porok)\b/g, 'purok'],
    [/\b(eskwelahan|paaralan)\b/g, 'school'],
    [/\b(ospital|pagamutan)\b/g, 'hospital'],
    [/\b(botika|botica)\b/g, 'pharmacy'],
    [/\b(palengke)\b/g, 'market'],
    [/\b(simbahan)\b/g, 'church'],
    [/\b(bangko)\b/g, 'bank'],
    [/\b(kainan)\b/g, 'restaurant'],
    [/\b(pilipinas|phils|phl)\b/g, 'philippines']
  ];
  function normalize(s) {
    // Keep non-Latin place names, e.g. 東京, instead of reducing them to "".
    var t = deaccent(String(s == null ? '' : s).toLowerCase()).replace(/[^\p{L}\p{N}]+/gu, ' ');
    SUBS.forEach(function (sub) { t = t.replace(sub[0], sub[1]); });
    return t.replace(/\b(\d+)\s+([a-z])\b/g, '$1$2').replace(/\s+/g, ' ').trim();
  }
  var GENERIC = ('rodriguez rizal philippines barangay san jose street road avenue sitio purok subdivision near the of and').split(' ').reduce(function (o, w) { o[w] = 1; return o; }, {});
  function stripAddress(norm) {
    return norm.replace(/\b(block|lot)\s*\d+[a-z]?\b/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function parse(q) {
    var raw = String(q == null ? '' : q).trim(), norm = normalize(raw);
    var tokens = norm ? norm.split(' ') : [];
    var core = tokens.filter(function (t) { return !GENERIC[t]; });
    if (!core.length) core = tokens.slice();
    var place = stripAddress(norm).split(' ').filter(function (t) { return t && !GENERIC[t]; });
    var block = norm.match(/\bblock\s*(\d+[a-z]?)\b/), lot = norm.match(/\blot\s*(\d+[a-z]?)\b/), phase = norm.match(/\bphase\s*(\d+[a-z]?)\b/);
    return { raw: raw, norm: norm, tokens: tokens, core: core, place: place, match: place.length ? place : core,
      block: block ? block[1] : null, lot: lot ? lot[1] : null, phase: phase ? phase[1] : null };
  }

  // Direct input is exact ONLY when the user provided explicit coordinates.
  // Google Maps' @lat,lng is a CAMERA CENTRE, not a destination, so ignore it.
  function coordinatePair(s) {
    var m = String(s || '').trim().match(/^([+-]?\d{1,3}(?:\.\d+)?)\s*[,;]\s*([+-]?\d{1,3}(?:\.\d+)?)$/);
    return m && validCoords(+m[1], +m[2]) ? { lat: +m[1], lng: +m[2] } : null;
  }
  function googleURL(s) {
    try {
      var u = new URL(s);
      if (!/^https?:$/.test(u.protocol)) return null;
      var domain = u.hostname.replace(/^(www|maps)\./, '');
      if (['google.com', 'google.com.ph', 'google.co.uk', 'google.co.jp', 'google.co.in', 'google.com.sg', 'google.com.au', 'google.ca', 'google.fr', 'google.de', 'google.es'].indexOf(domain) < 0) return null;
      return /^\/maps(?:\/|$)/.test(u.pathname) || u.hostname === 'maps.google.com' ? u : null;
    } catch (e) { return null; }
  }
  function mapsQuery(s) {
    var u = googleURL(s);
    if (!u) return '';
    var term = u.searchParams.get('destination') || u.searchParams.get('query') || u.searchParams.get('q');
    if (!term) {
      var name = u.pathname.match(/^\/maps\/place\/([^/]+)/);
      if (name) { try { term = decodeURIComponent(name[1]).replace(/\+/g, ' '); } catch (e) {} }
    }
    return term && !/^https?:|^@/i.test(term) ? term.slice(0, 256).trim() : '';
  }
  function queryText(s) { return mapsQuery(s) || String(s || '').trim(); }
  function googleMapsUrl(q) {
    var u = googleURL(q);
    if (u) return u.href;
    try {
      var short = new URL(q);
      if (short.protocol === 'https:' && (short.hostname === 'maps.app.goo.gl' || short.hostname === 'goo.gl' && /^\/maps\//.test(short.pathname))) return short.href;
    } catch (e) {}
    return String(q || '').trim() ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : 'https://www.google.com/maps/';
  }
  function mapsLink(s) {
    var u = googleURL(s);
    if (!u) return null;
    var pair = coordinatePair(mapsQuery(s));
    if (pair) return pair;
    // Opaque multi-point route URLs are ambiguous. Only accept one explicit
    // marker pair in a place URL, not a route/camera/collection of points.
    if (!/^\/maps\/place\//.test(u.pathname)) return null;
    var re = /!3d([+-]?\d+(?:\.\d+)?)!4d([+-]?\d+(?:\.\d+)?)/g, m, points = [];
    try {
      var decoded = decodeURIComponent(u.pathname + u.search);
      while ((m = re.exec(decoded))) if (validCoords(+m[1], +m[2])) points.push({ lat: +m[1], lng: +m[2] });
    } catch (e) {}
    return points.length === 1 ? points[0] : null;
  }
  // Full Open Location Codes (Plus Codes): decode the standard grid's centre.
  // Short codes require locality resolution; never assume the current map is it.
  function plusCode(s) {
    var code = String(s || '').trim().toUpperCase();
    if (!/^[23456789CFGHJMPQRVWX0]{8}\+[23456789CFGHJMPQRVWX]{0,7}$/.test(code) || code.length === 10) return null;
    var clean = code.replace('+', ''), zero = clean.indexOf('0');
    if (zero >= 0) {
      if (code.length !== 9 || zero < 2 || zero % 2 || !/^0+$/.test(clean.slice(zero))) return null;
      clean = clean.slice(0, zero);
    }
    if (clean.length < 2 || clean.length < 10 && clean.length % 2) return null;
    var alphabet = '23456789CFGHJMPQRVWX';
    if (alphabet.indexOf(clean[0]) > 8 || alphabet.indexOf(clean[1]) > 17) return null;
    var lat = -90, lng = -180, latSize = 20, lngSize = 20;
    var pairLength = Math.min(10, clean.length);
    for (var i = 0; i < pairLength; i += 2) {
      lat += alphabet.indexOf(clean[i]) * latSize;
      lng += alphabet.indexOf(clean[i + 1]) * lngSize;
      if (i + 2 < pairLength) { latSize /= 20; lngSize /= 20; }
    }
    for (var j = 10; j < clean.length; j++) {
      var val = alphabet.indexOf(clean[j]);
      latSize /= 5; lngSize /= 4;
      lat += Math.floor(val / 4) * latSize; lng += val % 4 * lngSize;
    }
    return { lat: lat + latSize / 2, lng: lng + lngSize / 2 };
  }
  function directPlace(q) {
    var pair = coordinatePair(q) || mapsLink(q), codeText = queryText(q), code = pair ? null : plusCode(codeText);
    if (!pair && !code) return null;
    var c = pair || code;
    return { label: code ? codeText.toUpperCase() : c.lat.toFixed(6) + ', ' + c.lng.toFixed(6),
      sub: code ? 'Full Plus Code · centre of the encoded area' : 'Coordinates supplied by you',
      lat: c.lat, lng: c.lng, src: 'coordinates', k: 'pin', rel: 1, score: 1500,
      precision: code ? 'area' : 'coordinate', approx: false, pinned: true,
      note: code ? 'Plus Code area centre — i-check ang entrance/pin bago bumiyahe.' : '' };
  }

  var HAY = null;
  function buildHay() {
    if (HAY || !root.TRAFFIC_PLACES) return;
    HAY = root.TRAFFIC_PLACES.filter(function (p) { return validCoords(p.lat, p.lng); }).map(function (p) {
      var aliases = String(p.a || '').split('|').map(normalize);
      return { p: p, nHay: normalize(p.n), aliases: aliases,
        aHay: aliases.join(' '), hay: normalize(p.n + ' ' + (p.a || '') + ' ' + (p.c || '')) };
    });
  }
  var KIND_BOOST = { barangay: 45, town: 30, subdivision: 10, sitio: 8 };
  function scorePlace(entry, q, proximity) {
    var match = q.match, score = 0, inName = 0, inAlias = 0;
    if (q.norm && entry.nHay.indexOf(q.norm) === 0) score += 260;
    else if (q.norm && entry.nHay.indexOf(q.norm) > -1) score += 225;
    else if (entry.aliases.indexOf(q.norm) > -1) score += 240;
    else if (q.norm && entry.aHay.indexOf(q.norm) > -1) score += 175;
    else if (q.norm && entry.hay.indexOf(q.norm) > -1) score += 110;
    match.forEach(function (t) {
      if (withBounds(entry.nHay, t)) inName++;
      if (withBounds(entry.aHay, t)) inAlias++;
    });
    score += inName / match.length * 420 + inAlias / match.length * 130;
    if (inName === match.length) score += 130;
    score += 12 * Math.max(0, 4 - entry.nHay.split(' ').length) + (KIND_BOOST[entry.p.k] || 0);
    var d = haversine(proximity.lat, proximity.lng, entry.p.lat, entry.p.lng);
    score += 45 * Math.max(0, 1 - d / 25000);
    // An alias must match as one phrase, not words scattered over all aliases.
    var aliasExact = entry.aliases.some(function (a) { return a && (a === q.norm || a === match.join(' ')); });
    if (aliasExact) score = Math.max(score, 750);
    return { score: score, dist: d, inName: inName, aliasExact: aliasExact };
  }
  function localSearch(q, proximity, limit) {
    var parsed = typeof q === 'string' ? parse(q) : q;
    var direct = directPlace(parsed.raw);
    if (direct) return [direct];
    buildHay();
    if (!HAY || parsed.norm.length < 2 || !parsed.match.length) return [];
    var out = [];
    HAY.forEach(function (entry) {
      var r = scorePlace(entry, parsed, proximity || NEAR), p = entry.p;
      if (r.score < 190 || !r.aliasExact && r.inName < Math.ceil(parsed.match.length * 0.6)) return;
      // A local name match must not erase a supplied city/province/other word.
      // Only unknown numeric phase details may fall back to a labelled area.
      if (parsed.match.some(function (word) { return !withBounds(entry.hay, word) && !/^\d+[a-z]?$/.test(word); })) return;
      // Explicit numbered phases must not be answered with a different phase.
      var namedPhase = normalize(p.n).match(/\bphase\s*(\d+[a-z]?)\b/);
      if (parsed.phase && namedPhase && namedPhase[1] !== parsed.phase && !p.ap) return;
      var area = AREA_KINDS.test(p.k), addressRequested = !!(parsed.block || parsed.lot);
      out.push({ label: p.n, sub: p.c || 'Rodriguez (Montalban), Rizal', lat: p.lat, lng: p.lng,
        k: p.k || 'pin', src: 'local', rel: r.score / 1000, score: r.score, dist: r.dist,
        approx: !!p.ap || addressRequested, precision: area ? 'area' : p.ap ? 'approximate' : 'provider',
        note: addressRequested ? 'Lugar/phase lang ito — hindi verified ang eksaktong Blk/Lot. I-pin ang eksaktong bahay sa mapa.' : area ? 'Area pin; hindi house/entrance coordinates.' : p.ap ? 'Tinatayang lokasyon; i-check ang pin.' : '',
        requestedAddress: addressRequested ? parsed.raw : '' });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, limit || 10);
  }

  function abortError() { var e = new Error('Search cancelled'); e.name = 'AbortError'; return e; }
  function throwIfAborted(signal) { if (signal && signal.aborted) throw abortError(); }
  // Cache ONLY OSM responses. Mapbox temporary geocoding may not be cached.
  var osmCache = new Map();
  function jsonFetch(url, opts) {
    opts = opts || {};
    var signal = opts.signal;
    try { throwIfAborted(signal); } catch (e) { return Promise.reject(e); }
    var cached = opts.cacheOSM && osmCache.get(url);
    if (cached && Date.now() - cached.time < 120000) return Promise.resolve(cached.data);
    return new Promise(function (resolve, reject) {
      var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, done = false;
      var timer = setTimeout(function () { finish(new Error('Search provider timed out')); if (ctl) ctl.abort(); }, opts.timeout || 6500);
      function cancel() { finish(abortError()); if (ctl) ctl.abort(); }
      function finish(err, data) {
        if (done) return;
        done = true; clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', cancel);
        if (err) reject(err);
        else {
          if (opts.cacheOSM) {
            if (osmCache.size >= 40) osmCache.delete(osmCache.keys().next().value);
            osmCache.set(url, { time: Date.now(), data: data });
          }
          resolve(data);
        }
      }
      if (signal) signal.addEventListener('abort', cancel, { once: true });
      var request = { signal: ctl ? ctl.signal : signal, headers: { Accept: 'application/json' } };
      Promise.resolve().then(function () { throwIfAborted(signal); return fetch(url, request); })
        .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(function (data) { finish(null, data); }, function (e) { finish(e); });
    });
  }
  function shortSub(sub) {
    // Keep the country/province: identical names exist in different regions.
    return String(sub || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 5).join(', ');
  }
  function mapboxSearch(term, opts) {
    var url = 'https://api.mapbox.com/search/geocode/v6/forward?q=' + encodeURIComponent(term.replace(/;/g, ',').slice(0, 256)) +
      '&limit=10&autocomplete=' + (opts.submitted ? 'false' : 'true') +
      '&proximity=' + opts.proximity.lng + ',' + opts.proximity.lat +
      '&access_token=' + encodeURIComponent(opts.token);
    if (opts.country) url += '&country=' + encodeURIComponent(opts.country);
    if (opts.permanent) url += '&permanent=true';
    return jsonFetch(url, opts).then(function (data) {
      return (data.features || []).map(function (f) {
        var pr = f.properties || {}, c = f.geometry && f.geometry.coordinates;
        if (!c || !validCoords(c[1], c[0])) return null;
        var coord = pr.coordinates || {}, kind = pr.feature_type || 'address';
        var accuracy = coord.accuracy || '', approximate = /^(approximate|interpolated)$/i.test(accuracy);
        return { label: pr.name_preferred || pr.name || pr.address || '', sub: shortSub(pr.place_formatted || pr.full_address || ''),
          lat: c[1], lng: c[0], k: kind, src: 'mapbox', id: pr.mapbox_id || f.id,
          rel: pr.match_code && pr.match_code.confidence === 'exact' ? 1 : 0.75,
          precision: AREA_KINDS.test(kind) ? 'area' : approximate ? 'approximate' : 'provider', approx: approximate,
          note: approximate ? 'Interpolated/approximate address — i-check ang pin.' : '', persistable: !!opts.permanent };
      }).filter(Boolean);
    });
  }
  function photonSearch(term, opts) {
    var base = opts.photonUrl || 'https://photon.komoot.io/api/';
    var cat = opts.category, tagged = cat && cat.tags && /\/api\/?$/.test(base);
    // A category is a tag query, NOT a place literally named "gas station".
    // Photon reverse supports nearest POIs filtered by principal OSM tags.
    if (tagged) base = base.replace(/\/api\/?$/, '/reverse');
    var url = base + (base.indexOf('?') > -1 ? '&' : '?') + 'limit=25&lang=en' +
      '&lat=' + opts.proximity.lat + '&lon=' + opts.proximity.lng;
    if (tagged) url += '&radius=25';
    else url += '&q=' + encodeURIComponent(term);
    // Ordinary name/address search has soft proximity, not a PH bounding box.
    if (cat && cat.tags) cat.tags.forEach(function (tag) { url += '&osm_tag=' + encodeURIComponent(tag); });
    return jsonFetch(url, Object.assign({}, opts, { cacheOSM: true })).then(function (data) {
      return (data.features || []).map(function (f) {
        var pr = f.properties || {}, c = f.geometry && f.geometry.coordinates;
        if (!c || !validCoords(c[1], c[0])) return null;
        var street = [pr.housenumber, pr.street].filter(Boolean).join(' ');
        var sub = [street, pr.locality, pr.district, pr.city, pr.state, pr.country]
          .filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i && v !== pr.name; }).join(', ');
        var kind = pr.osm_value || pr.type || (pr.housenumber ? 'address' : 'poi');
        return { label: pr.name || street || pr.city || '', sub: shortSub(sub), lat: c[1], lng: c[0], k: kind,
          src: 'photon', id: pr.osm_id ? pr.osm_type + ':' + pr.osm_id : '', rel: 0.7,
          precision: AREA_KINDS.test(kind) || pr.type === 'locality' ? 'area' : 'provider', osmKey: pr.osm_key, osmValue: pr.osm_value,
          typeLabel: { bus_stop: 'Bus stop', bus_station: 'Bus terminal', fuel: 'Gas station', retail: 'Retail/mall area', school: 'School', hospital: 'Hospital', pharmacy: 'Pharmacy', fast_food: 'Fast food', restaurant: 'Restaurant', cafe: 'Cafe' }[kind] || '' };
      }).filter(Boolean);
    });
  }
  function customNominatimSearch(term, opts) {
    // No calls to the public OSM server, even if misconfigured as an endpoint.
    var endpoint;
    try { endpoint = new URL(opts.nominatimUrl, root.location && root.location.href); }
    catch (e) { return Promise.resolve([]); }
    if (endpoint.hostname === 'nominatim.openstreetmap.org') return Promise.resolve([]);
    if (!/^https?:$/.test(endpoint.protocol)) return Promise.resolve([]);
    var url = endpoint.href + (endpoint.search ? '&' : '?') + 'format=jsonv2&limit=20&addressdetails=1&q=' + encodeURIComponent(term);
    return jsonFetch(url, Object.assign({}, opts, { cacheOSM: true })).then(function (data) {
      return (Array.isArray(data) ? data : []).map(function (f) {
        var lat = +f.lat, lng = +f.lon;
        if (!validCoords(lat, lng)) return null;
        var kind = f.type || 'poi';
        return { label: f.name || String(f.display_name || '').split(',')[0], sub: shortSub(f.display_name || ''),
          lat: lat, lng: lng, k: kind, src: 'nominatim', id: f.osm_type + ':' + f.osm_id, rel: 0.7,
          precision: AREA_KINDS.test(kind) ? 'area' : 'provider' };
      }).filter(Boolean);
    });
  }

  // Categories are actual categories, not brand names. "Jollibee" must NEVER
  // turn into "restaurant"; "Shell" must NEVER turn into all gas stations.
  var CATEGORIES = [
    { re: /^(gas|gasoline|gasolinahan|gas station|fuel)$/, term: 'gas station', icon: 'fuel', label: 'Gas stations', tags: ['amenity:fuel'] },
    { re: /^(hospital|ospital|pagamutan|medical center)$/, term: 'hospital', icon: 'health', label: 'Hospitals', tags: ['amenity:hospital'] },
    { re: /^(clinic|health center|infirmary)$/, term: 'clinic', icon: 'health', label: 'Clinics', tags: ['amenity:clinic'] },
    { re: /^(school|eskwelahan|paaralan)$/, term: 'school', icon: 'school', label: 'Schools', tags: ['amenity:school'] },
    { re: /^(college|university)$/, term: 'university', icon: 'school', label: 'Colleges & universities' },
    { re: /^(mall|shopping mall|department store)$/, term: 'mall', icon: 'shop', label: 'Malls' },
    { re: /^(palengke|market|public market)$/, term: 'market', icon: 'shop', label: 'Markets', tags: ['amenity:marketplace'] },
    { re: /^(supermarket|grocery)$/, term: 'supermarket', icon: 'shop', label: 'Supermarkets', tags: ['shop:supermarket'] },
    { re: /^(restaurant|kainan|food|karinderya|carenderia)$/, term: 'restaurant', icon: 'food', label: 'Restaurants', tags: ['amenity:restaurant'] },
    { re: /^(fast food)$/, term: 'fast food', icon: 'food', label: 'Fast food', tags: ['amenity:fast_food'] },
    { re: /^(cafe|coffee shop|kapihan)$/, term: 'cafe', icon: 'food', label: 'Cafes', tags: ['amenity:cafe'] },
    { re: /^(pharmacy|botika|botica|drugstore|drug store)$/, term: 'pharmacy', icon: 'health', label: 'Pharmacies', tags: ['amenity:pharmacy'] },
    { re: /^(bank|bangko)$/, term: 'bank', icon: 'shop', label: 'Banks', tags: ['amenity:bank'] },
    { re: /^(atm)$/, term: 'ATM', icon: 'shop', label: 'ATMs', tags: ['amenity:atm'] },
    { re: /^(hotel|inn|motel|pension house|transient|lodge)$/, term: 'hotel', icon: 'pin', label: 'Hotels & stays' },
    { re: /^(resort)$/, term: 'resort', icon: 'pin', label: 'Resorts' },
    { re: /^(church|simbahan|chapel|cathedral|parish)$/, term: 'church', icon: 'worship', label: 'Places of worship', tags: ['amenity:place_of_worship'] },
    { re: /^(police|pulis|police station|presinto|precinct)$/, term: 'police station', icon: 'gov', label: 'Police stations', tags: ['amenity:police'] },
    { re: /^(fire station|bumbero|bfp)$/, term: 'fire station', icon: 'gov', label: 'Fire stations', tags: ['amenity:fire_station'] },
    { re: /^(barangay hall|hall|municipal hall|city hall|town hall|munisipyo)$/, term: 'town hall', icon: 'gov', label: 'Barangay & municipal halls' },
    { re: /^(terminal|transport terminal|sakayan|bus terminal|jeepney|tricycle|van terminal|bus stop)$/, term: 'bus station', icon: 'transit', label: 'Terminals & stops' },
    { re: /^(bakery|panaderia|panderia)$/, term: 'bakery', icon: 'shop', label: 'Bakeries', tags: ['shop:bakery'] },
    { re: /^(hardware)$/, term: 'hardware', icon: 'shop', label: 'Hardware stores', tags: ['shop:hardware'] },
    { re: /^(water station|refilling station)$/, term: 'water refilling station', icon: 'shop', label: 'Water stations' },
    { re: /^(laundry|laundromat)$/, term: 'laundry', icon: 'shop', label: 'Laundry shops', tags: ['shop:laundry'] },
    { re: /^(salon|barber|barbershop)$/, term: 'hairdresser', icon: 'shop', label: 'Salons & barbers', tags: ['shop:hairdresser'] },
    { re: /^(gym|fitness)$/, term: 'fitness centre', icon: 'shop', label: 'Gyms & fitness' },
    { re: /^(parking|car park)$/, term: 'parking', icon: 'pin', label: 'Parking', tags: ['amenity:parking'] }
  ];
  function category(q) {
    var text = deaccent(String(q || '').toLowerCase().trim()).replace(/\s+/g, ' ').replace(/\s+(?:near me|nearby|near here|malapit sa akin|malapit dito)$/, '');
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].re.test(text)) return CATEGORIES[i];
    return null;
  }
  function sigWords(label) {
    return normalize(label).split(' ').filter(function (t) { return t && !GENERIC[t]; });
  }
  function samePlace(a, b) {
    if (a.id && b.id && a.src === b.src && a.id === b.id) return true;
    var d = haversine(a.lat, a.lng, b.lat, b.lng);
    if (d > 120) return false;
    // A POI must not disappear into an area's centroid or another branch.
    if ((a.precision === 'area') !== (b.precision === 'area')) return false;
    var na = normalize(a.label), nb = normalize(b.label);
    if (na === nb) return a.precision === 'area' && b.precision === 'area' ? d < 120 : d < 35;
    var sa = sigWords(a.label), sb = sigWords(b.label), small = sa.length <= sb.length ? sa : sb, big = sa.length <= sb.length ? sb : sa;
    if (!small.length || !big.length) return d < 20;
    // Distinct numbered phases/branches remain distinct.
    var numsA = sa.filter(function (w) { return /\d/.test(w); }), numsB = sb.filter(function (w) { return /\d/.test(w); });
    if (numsA.length && numsB.length && numsA.join(' ') !== numsB.join(' ')) return false;
    var hit = small.filter(function (w) { return big.indexOf(w) > -1; }).length;
    return hit / small.length === 1 && hit / big.length >= 0.6;
  }
  function remoteFits(r, parsed, cat) {
    if (!r.label || !validCoords(r.lat, r.lng)) return false;
    if (cat) {
      if (r.precision === 'area') return false;
      if (cat.tags && r.osmKey && r.osmValue) return cat.tags.indexOf(r.osmKey + ':' + r.osmValue) >= 0;
      return withBounds(normalize(r.label + ' ' + r.k), normalize(cat.term)) || cat.tags && cat.tags.some(function (tag) { return tag.split(':')[1] === r.k; });
    }
    var words = parsed.match;
    if (!words.length) return false;
    var hay = normalize(r.label + ' ' + r.sub), name = normalize(r.label);
    var hits = words.filter(function (w) { return withBounds(hay, w); }).length;
    // Don't show "San Jose" as an exact answer to "Sub Urban", or an
    // unrelated Jollibee simply because both are near the map centre.
    if (hits < Math.ceil(words.length * 0.75)) return false;
    var nameHits = words.filter(function (w) { return withBounds(name, w); }).length;
    if (!nameHits) return false;
    var phase = normalize(r.label).match(/\bphase\s*(\d+[a-z]?)\b/);
    if (parsed.phase && phase && phase[1] !== parsed.phase) return false;
    if ((parsed.block || parsed.lot) && r.precision === 'area') {
      r.approx = true;
      r.note = 'Area result lang — hindi verified ang eksaktong Blk/Lot. I-check o i-pin ang bahay.';
    }
    // Keep lower-level fallback addresses honest when a house number is absent.
    if (parsed.block || parsed.lot) {
      var namedBlock = hay.match(/\bblock\s*(\d+[a-z]?)\b/), namedLot = hay.match(/\blot\s*(\d+[a-z]?)\b/);
      if (parsed.block && namedBlock && namedBlock[1] !== parsed.block || parsed.lot && namedLot && namedLot[1] !== parsed.lot) return false;
      var blockFound = !parsed.block || new RegExp('\\bblock\\s*' + parsed.block + '\\b').test(hay);
      var lotFound = !parsed.lot || new RegExp('\\blot\\s*' + parsed.lot + '\\b').test(hay);
      if (r.k !== 'address' || !blockFound || !lotFound) {
        r.approx = true;
        r.note = 'Hindi verified ang hinihinging Blk/Lot sa resultang ito. I-check ang address at eksaktong pin.';
      }
    }
    // Respect explicitly supplied geography instead of dropping those words.
    if (/\brodriguez rizal\b/.test(parsed.norm) && !/\brodriguez\b/.test(hay)) return false;
    if (/\bphilippines$/.test(parsed.norm) && !/\bphilippines\b/.test(hay)) return false;
    r.textMatch = hits / words.length;
    return true;
  }
  function merge(local, remote, parsed, proximity, cat) {
    var out = [];
    function push(r, isLocal) {
      if (!isLocal && !remoteFits(r, parsed, cat)) return;
      var d = haversine(proximity.lat, proximity.lng, r.lat, r.lng), s = r.score || 0;
      r.dist = d;
      r.rank = isLocal ? (s >= 300 ? 0.60 + 0.40 * Math.min(1, s / 1000) : 0.25 * (s / 300)) : (r.rel || 0.5) * 0.60 + (r.textMatch || 1) * 0.18 + 0.06 * Math.max(0, 1 - d / 30000);
      if (!isLocal && normalize(r.label) === parsed.norm) r.rank += 0.35;
      if (!isLocal && /^(bus_stop|bus_station)$/.test(r.k) && !/\b(bus|terminal|stop|sakayan)\b/.test(parsed.norm)) r.rank -= 0.15;
      // An address pin outranks a centroid for an address-style query.
      if (!isLocal && r.k === 'address' && !r.approx && (parsed.block || parsed.lot || /^\d+\b/.test(parsed.norm))) r.rank += 0.4;
      if (cat) r.icon = cat.icon;
      out.push(r);
    }
    local.forEach(function (r) { push(r, true); });
    remote.forEach(function (r) { push(r, false); });
    out.sort(function (a, b) { return cat ? a.dist - b.dist : b.rank - a.rank; });
    var unique = [];
    out.forEach(function (r) { if (!unique.some(function (existing) { return samePlace(existing, r); })) unique.push(r); });
    return unique.slice(0, 30);
  }
  function variants(parsed) {
    // Send the ORIGINAL whole query first: never discard a house number,
    // brand, diacritics, country, block or lot before checking the provider.
    var list = [parsed.raw];
    if (parsed.norm && normalize(parsed.raw) !== parsed.raw.toLowerCase().replace(/\s+/g, ' ')) list.push(parsed.norm);
    var noAddr = stripAddress(parsed.norm);
    if ((parsed.block || parsed.lot) && noAddr !== parsed.norm) list.push(noAddr);
    if (parsed.block || parsed.lot || /\bsub urban\b/.test(parsed.norm)) {
      var core = parsed.place.join(' ');
      // OSM calls the municipality Montalban, but its search indexes aliases.
      if (/\b(rodriguez|rizal)\b/.test(parsed.norm)) core += ' Rodriguez Rizal';
      if (core.length > 2) list.push(core);
    }
    return list.filter(function (s, i, a) { return s && a.indexOf(s) === i; }).slice(0, 4);
  }
  function search(q, opts) {
    opts = opts || {};
    var parsed = typeof q === 'string' ? parse(queryText(q)) : q, proximity = opts.proximity || NEAR;
    if (!validCoords(proximity.lat, proximity.lng)) proximity = NEAR;
    try { throwIfAborted(opts.signal); } catch (e) { return Promise.reject(e); }
    var direct = directPlace(typeof q === 'string' ? q : parsed.raw);
    if (direct) return Promise.resolve({ results: [direct], online: false, direct: true, hint: direct.note, category: null });
    if (parsed.raw.length < 2) return Promise.resolve({ results: [], online: false, hint: '', category: null });
    if (/^https?:\/\//i.test(parsed.raw)) return Promise.resolve({ results: [], online: false, hint: 'Hindi destination coordinates ang link na ito. Buksan sa Google Maps at kopyahin ang pin coordinates (lat, lng), hindi ang map centre.', category: null });
    var token = opts.token || (root.mapboxgl && root.mapboxgl.accessToken) || '';
    var cat = category(parsed.raw), local = localSearch(parsed, proximity, 15), vs = variants(parsed);
    if (cat) local = local.filter(function (r) { return remoteFits(r, parsed, cat); });
    var providerOpts = Object.assign({}, opts, { token: token, proximity: proximity, category: cat });
    var successes = 0, errors = 0;
    function track(p) { return p.then(function (r) { successes++; return r; }, function (e) { if (e.name === 'AbortError') throw e; errors++; return []; }); }
    var jobs = [track(photonSearch(cat ? cat.term : vs[0], providerOpts))];
    if (token && !cat) jobs.push(track(mapboxSearch(vs[0], Object.assign({}, providerOpts, { permanent: opts.mapboxPermanent === true }))));
    return Promise.all(jobs).then(function (lists) {
      throwIfAborted(opts.signal);
      var remote = lists.flat();
      // Even when the local list has a hit, continue to look for a better live
      // address instead of stopping at a generic barangay/subdivision centroid.
      if (!cat && !remote.some(function (r) { return remoteFits(r, parsed, null); }) && vs.length > 1) {
        var alternate = vs[vs.length - 1];
        var fallback = [track(photonSearch(alternate, providerOpts))];
        if (opts.submitted && opts.nominatimUrl) fallback.push(track(customNominatimSearch(parsed.raw, providerOpts)));
        return Promise.all(fallback).then(function (more) { return finish(remote.concat(more.flat())); });
      }
      if (!remote.length && opts.submitted && opts.nominatimUrl) return track(customNominatimSearch(parsed.raw, providerOpts)).then(function (more) { return finish(more); });
      return finish(remote);
    });
    function finish(remote) {
      throwIfAborted(opts.signal);
      var results = merge(local, remote, parsed, proximity, cat), hint = '';
      if (!results.length) hint = errors && !successes ? 'Hindi makontak ang live search. Suriin ang internet, subukan ulit, o i-pin sa mapa.' : 'Walang verified match sa mga provider. Subukan ang buong pangalan/address, Google Maps, o i-pin sa mapa.';
      else if (results[0].approx) hint = results[0].note || 'Tinatayang lokasyon — hindi verified house/entrance pin. I-check sa mapa.';
      else if (cat) hint = cat.label + ' — inayos ayon sa layo mula sa gitna ng mapa.';
      else if (results[0].precision === 'area') hint = 'Area pin ang resultang ito; hindi ang eksaktong bahay o entrance.';
      if (results.length && errors) hint += (hint ? ' ' : '') + 'May provider na hindi tumugon; maaaring kulang ang mga resulta.';
      return { results: results, online: successes > 0, hint: hint, category: cat || null, partial: errors > 0, providers: successes };
    }
  }

  function nearestKnown(lat, lng, maxM) {
    buildHay();
    if (!HAY) return null;
    var best = null, distance = maxM || 600;
    HAY.forEach(function (h) { var d = haversine(lat, lng, h.p.lat, h.p.lng); if (d < distance) { distance = d; best = h.p; } });
    return best ? { label: 'Pin near ' + best.n, sub: best.c || '', lat: lat, lng: lng, k: 'pin', src: 'coordinates', precision: 'coordinate', pinned: true, rel: 1 } : null;
  }
  function reverse(lat, lng, opts) {
    opts = opts || {};
    if (!validCoords(lat, lng)) return Promise.reject(new Error('Invalid coordinates'));
    var fallback = function () { return nearestKnown(lat, lng, 600) || { label: lat.toFixed(6) + ', ' + lng.toFixed(6), sub: 'Pinned location', lat: lat, lng: lng, k: 'pin', src: 'coordinates', precision: 'coordinate', pinned: true, rel: 1 }; };
    var token = opts.token || (root.mapboxgl && root.mapboxgl.accessToken) || '';
    if (!token) return Promise.resolve(fallback());
    var url = 'https://api.mapbox.com/search/geocode/v6/reverse?longitude=' + lng + '&latitude=' + lat + '&limit=1&access_token=' + encodeURIComponent(token);
    return jsonFetch(url, opts).then(function (data) {
      var f = (data.features || [])[0], pr = f && f.properties;
      if (!pr || !pr.name) return fallback();
      // The marker stays at the USER'S pin, never snaps to a returned centroid.
      return { label: 'Pin near ' + pr.name, sub: shortSub(pr.place_formatted || ''), lat: lat, lng: lng,
        k: 'pin', src: 'mapbox', precision: 'coordinate', pinned: true, rel: 1, persistable: false };
    }).catch(function (e) { if (e.name === 'AbortError') throw e; return fallback(); });
  }
  function forStorage(p) {
    if (!p || p.src === 'google-ui-kit') return null; // UI Kit content/geometry is not cached.
    if (p.src === 'mapbox' && !p.persistable) {
      // A manually chosen coordinate is user input, independent of the temporary
      // reverse-geocoded name. Store that coordinate only, not Mapbox content.
      return p.pinned ? { label: p.lat.toFixed(6) + ', ' + p.lng.toFixed(6), sub: 'Your pinned location', lat: p.lat, lng: p.lng, k: 'pin', src: 'coordinates', pinned: true, precision: 'coordinate' } : null;
    }
    return Object.assign({}, p);
  }
  root.TrafficSearch = { normalize: normalize, parse: parse, localSearch: localSearch, search: search, reverse: reverse,
    category: category, directPlace: directPlace, queryText: queryText, googleMapsUrl: googleMapsUrl, haversine: haversine, fmtDist: fmtDist, validCoords: validCoords,
    forStorage: forStorage, NEAR: NEAR };
})(window);
