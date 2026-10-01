/*
 * Optional, LIVE Google Places UI Kit connector for Directions.
 * Requires an administrator-owned browser key with Places UI Kit and Maps
 * JavaScript API enabled and billing configured. No key is included here.
 *
 * Uses Google's official UI components (not Places REST scraping, not a
 * downloaded list). UI Kit may accompany a non-Google map; ordinary Places
 * API content must not be rendered on our Mapbox map. Google names/addresses
 * and attribution stay INSIDE the official components. Only the selected
 * place ID and geometry are handed to the routing UI, in memory.
 *
 * Docs and current service terms: docs/traffic-destination-search.md.
 */
(function (root) {
  'use strict';
  var libraryPromise = null;
  function load(key) {
    if (libraryPromise) return libraryPromise;
    if (!key) return Promise.reject(new Error('Google search is not configured'));
    libraryPromise = new Promise(function (resolve, reject) {
      if (root.google && root.google.maps && root.google.maps.importLibrary) {
        root.google.maps.importLibrary('places').then(resolve, reject);
        return;
      }
      var script = document.createElement('script'), settled = false;
      var timeout = setTimeout(function () { fail(); }, 15000);
      function fail() {
        if (settled) return;
        settled = true; clearTimeout(timeout);
        script.remove();
        reject(new Error('Google Places UI Kit did not load'));
      }
      root.__trafficGoogleMapsReady = function () {
        if (settled) return;
        root.google.maps.importLibrary('places').then(function (lib) {
          if (settled) return;
          settled = true; clearTimeout(timeout); resolve(lib);
        }, fail);
      };
      var previousAuthFailure = root.gm_authFailure;
      root.gm_authFailure = function () { fail(); if (previousAuthFailure) previousAuthFailure(); };
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) +
        '&v=weekly&libraries=places&loading=async&callback=__trafficGoogleMapsReady&language=en&region=PH';
      script.async = true;
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      script.onerror = fail;
      document.head.appendChild(script);
    }).catch(function (e) { libraryPromise = null; throw e; });
    return libraryPromise;
  }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }
  function locationOf(place) {
    if (!place || !place.location) return null;
    var loc = place.location, lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat, lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
    return root.TrafficSearch.validCoords(lat, lng) ? { lat: lat, lng: lng } : null;
  }
  function detailsFor(id) {
    var details = el('gmp-place-details-compact');
    details.setAttribute('orientation', 'horizontal');
    var request = el('gmp-place-details-place-request');
    var config = el('gmp-place-content-config');
    // Name and address are built into this component. Keep Google's official
    // attribution/disclosures intact; avoid photos/reviews we don't need.
    config.appendChild(el('gmp-place-attribution'));
    details.appendChild(request); details.appendChild(config);
    return { details: details, request: request, id: id };
  }
  function create(options) {
    var key = String(options.key || '').trim(), host = options.host;
    var generation = 0, records = {}, chosenHost = options.selectedHost, routeHost = options.routeHost;
    var group = el('div', 'dir-google-selections'), routeView = false;
    function moveSelections() {
      (routeView ? routeHost : chosenHost).appendChild(group);
      chosenHost.hidden = routeView || !Object.keys(records).length;
      routeHost.hidden = !routeView || !Object.keys(records).length;
    }
    function clearSearch() { generation++; host.textContent = ''; host.hidden = true; }
    function status(text) { var node = el('div', 'dir-google-status', text); node.setAttribute('role', 'status'); node.setAttribute('aria-live', 'polite'); return node; }
    function select(place, context, ticket, parent) {
      if (ticket !== generation || !context.isCurrent() || !place || !place.id) return;
      var preview = el('div', 'dir-google-confirm');
      var display = detailsFor(place.id);
      var help = status('I-check ang Google Maps address/pin bago gamitin sa Directions.');
      var use = el('button', 'dir-google-use', context.field === 'from' ? 'Use as starting point' : context.slot === 'stop' ? 'Add this stop' : 'Use as destination');
      use.type = 'button'; use.disabled = true;
      preview.appendChild(display.details); preview.appendChild(help); preview.appendChild(use);
      // One selection preview per query. The search list and its attribution stay.
      var old = parent.querySelector('.dir-google-confirm'); if (old) old.remove();
      parent.appendChild(preview);
      var coords = locationOf(place), loaded = false;
      display.details.addEventListener('gmp-load', function () {
        if (ticket !== generation || !context.isCurrent()) return;
        coords = locationOf(display.details.place) || coords;
        loaded = true; use.disabled = !coords;
        help.textContent = coords ? 'Google Maps pin. I-check pa rin ang bahay/entrance, lalo na sa Blk/Lot.' : 'Walang routable pin para sa lugar na ito. Pumili ng ibang resulta o i-pin sa mapa.';
      });
      display.details.addEventListener('gmp-error', function () {
        loaded = false; use.disabled = true;
        help.textContent = 'Hindi makuha ang Google place details. Subukan ulit o gamitin ang map pin.';
      });
      use.addEventListener('click', function () {
        if (!loaded || !coords || ticket !== generation || !context.isCurrent()) return;
        var slot = context.slot === 'stop' ? 'stop-' + Date.now() : context.field;
        if (records[slot]) records[slot].remove();
        var record = el('div', 'dir-google-selected-place');
        record.appendChild(status(context.field === 'from' ? 'Starting point · Google Maps' : context.slot === 'stop' ? 'Stop · Google Maps' : 'Destination · Google Maps'));
        record.appendChild(display.details);
        records[slot] = record;
        group.appendChild(record); moveSelections();
        // Do not copy Google's names/addresses into our own list or localStorage.
        // The official compact card above displays the actual selected name.
        options.onSelect({ label: context.field === 'from' ? 'Google Maps starting point' : context.slot === 'stop' ? 'Google Maps stop' : 'Google Maps destination',
          sub: 'See the official Google Maps place card', lat: coords.lat, lng: coords.lng,
          src: 'google-ui-kit', googlePlaceId: place.id, k: 'pin', precision: 'provider' }, context);
      });
      // Assign after adding listeners/attaching the component, to capture loads.
      display.request.place = place.id;
      if (preview.scrollIntoView) preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    async function search(query, proximity, context) {
      var ticket = ++generation;
      host.textContent = ''; host.hidden = !key || String(query || '').trim().length < 3;
      if (host.hidden) return;
      host.appendChild(status('Kinukuha ang live Google Maps places…'));
      try {
        await load(key);
        if (ticket !== generation || !context.isCurrent()) return;
        host.textContent = '';
        var container = el('section', 'dir-google-results');
        container.setAttribute('aria-label', 'Live Google Maps place results');
        var heading = status('Google Maps places · piliin at i-check ang address');
        var list = el('gmp-place-search'); list.setAttribute('selectable', '');
        // Use the supported official search component. No custom rendering of
        // Google's response, no prefetching a town/country's entire database.
        list.appendChild(el('gmp-place-all-content'));
        var request = el('gmp-place-text-search-request');
        request.setAttribute('max-result-count', '20');
        list.appendChild(request);
        container.appendChild(heading); container.appendChild(list); host.appendChild(container);
        list.addEventListener('gmp-select', function (event) { select(event.place, context, ticket, container); });
        list.addEventListener('gmp-load', function () {
          if (ticket !== generation || !context.isCurrent()) return;
          heading.textContent = list.places && !list.places.length ? 'Walang Google place match. Subukan ang buong pangalan o Google Maps link/pin.' : 'Google Maps places · piliin at i-check ang address';
        });
        list.addEventListener('gmp-error', function () {
          if (ticket !== generation || !context.isCurrent()) return;
          heading.textContent = 'Google search unavailable. I-check ang API/billing/referrer setup; gumagana pa rin ang ibang provider sa ibaba.';
        });
        // Soft bias only. Do NOT restrict to San Jose, Rizal or the Philippines.
        request.locationBias = { center: proximity, radius: 50000 };
        request.textQuery = String(query).trim();
      } catch (e) {
        if (ticket !== generation || !context.isCurrent()) return;
        host.textContent = '';
        host.appendChild(status('Hindi ma-load ang Google search. Gumamit muna ng ibang provider o Open Google Maps; i-check ng admin ang key/API setup.'));
      }
    }
    function clearSelection(field) {
      Object.keys(records).forEach(function (slot) {
        if (slot === field || field === 'stops' && slot.indexOf('stop-') === 0 || field === 'all') {
          records[slot].remove(); delete records[slot];
        }
      });
      moveSelections();
    }
    function swapSelections() {
      var from = records.from, to = records.to;
      delete records.from; delete records.to;
      if (to) { records.from = to; to.querySelector('.dir-google-status').textContent = 'Starting point · Google Maps'; }
      if (from) { records.to = from; from.querySelector('.dir-google-status').textContent = 'Destination · Google Maps'; }
      moveSelections();
    }
    moveSelections();
    return { enabled: !!key, search: search, clearSearch: clearSearch, clearSelection: clearSelection, swapSelections: swapSelections,
      setRouteView: function (value) { routeView = value; moveSelections(); } };
  }
  root.TrafficGoogle = { create: create };
})(window);
