// DOM harness: runs the REAL inline script from public/rizal_traffic_map.html
// against a minimal DOM so the destination-search UI can be exercised offline.
// Run: node scripts/test-traffic-ui.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const GOOGLE = process.argv.includes('--google');

/* ------------------------------------------------------------------ DOM */
class ClassList {
  constructor(el) { this.el = el; this.set = new Set(); }
  add(...c) { c.forEach((x) => x && this.set.add(x)); }
  remove(...c) { c.forEach((x) => this.set.delete(x)); }
  contains(c) { return this.set.has(c); }
  toggle(c, force) { const on = force === undefined ? !this.set.has(c) : !!force; on ? this.set.add(c) : this.set.delete(c); return on; }
  get value() { return [...this.set].join(' '); }
  toString() { return this.value; }
}
class Style { constructor() { return new Proxy(this, { get: (t, k) => (k in t ? t[k] : ''), set: (t, k, v) => { t[k] = v; return true; } }); } }

class El {
  constructor(tag, doc) {
    this.tagName = (tag || 'div').toUpperCase();
    this.doc = doc;
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.dataset = {};
    this.style = new Style();
    this.classList = new ClassList(this);
    this.listeners = {};
    this._text = '';
    this._html = '';
    this.value = '';
    this.placeholder = '';
    this.hidden = false;
    this.offsetHeight = 40;
    this.id = '';
    this.type = '';
  }
  get className() { return this.classList.value; }
  set className(v) { this.classList.set = new Set(String(v || '').split(/\s+/).filter(Boolean)); }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v == null ? '' : v); this.children.forEach((c) => { c.parentNode = null; }); this.children = []; }
  // innerHTML in this harness only records the string; real parsing is not needed
  // except for `document.querySelectorAll('[data-i]')` icon injection.
  get innerHTML() { return this._html; }
  set innerHTML(v) {
    this._html = String(v == null ? '' : v);
    const m = /data-i="([a-zA-Z]+)"/.exec(this._html);
    if (m) this.dataset.i = m[1];
  }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  removeEventListener(t, fn) { if (this.listeners[t]) this.listeners[t] = this.listeners[t].filter((f) => f !== fn); }
  dispatch(t, ev) { (this.listeners[t] || []).forEach((f) => f(ev || { type: t, preventDefault() {}, data: null })); }
  click() { this.dispatch('click'); }
  focus() { this.doc.activeElement = this; }
  blur() { if (this.doc.activeElement === this) this.doc.activeElement = null; }
  select() {}
  setAttribute(k, v) { this.attributes[k] = v; if (k === 'id') this.id = v; if (k === 'class') this.className = v; }
  getAttribute(k) { return this.attributes[k]; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const out = [];
    const want = String(sel).trim();
    const walk = (n) => n.children.forEach((c) => {
      const cm = want.match(/^\.([\w-]+)(?:\[data-([\w-]+)=["']([^"']*)["']\])?$/);
      if (cm && c.classList.contains(cm[1]) && (!cm[2] || c.dataset[cm[2]] === cm[3])) out.push(c);
      else if (want.startsWith('#') && c.id === want.slice(1)) out.push(c);
      else if (want.startsWith('[data-') && c.dataset[want.slice(6, -1)]) out.push(c);
      else if (/^[a-z][a-z0-9-]*$/i.test(want) && c.tagName === want.toUpperCase()) out.push(c);
      walk(c);
    });
    walk(this);
    return out;
  }
  contains() { return false; }
  getBoundingClientRect() { return { top: 0, left: 0, width: 390, height: 700, bottom: 700, right: 390 }; }
}

/* --------------------------------------------------------- globals stubs */
const doc = new El('document');
doc.documentElement = new El('html', doc);
doc.body = new El('body', doc);
doc.head = new El('head', doc);
doc.activeElement = null;
doc.createElement = (t) => new El(t, doc);
doc.createElementNS = (ns, t) => new El(t, doc);
doc.getElementById = (id) => doc.body.querySelector('#' + id);
doc.querySelector = (s) => doc.body.querySelector(s);
doc.querySelectorAll = (s) => doc.body.querySelectorAll(s);
doc.addEventListener = El.prototype.addEventListener.bind(doc);
doc.listeners = {};
doc.visibilityState = 'visible';

const els = {};
const IDS = ['notice', 'traffic-zoom', 'base-switch', 'legend', 'directions-btn', 'dir-panel', 'dir-back',
  'dir-swap', 'dir-from', 'dir-to', 'dir-body', 'dir-hint', 'dir-search-submit', 'dir-google-link', 'dir-coverage',
  'dir-google', 'dir-google-selected', 'dir-scroll', 'rt-google-place', 'dir-pin', 'dir-pin-picker', 'dir-pin-instruction', 'dir-pin-cancel', 'rt-pin-note', 'rt-top', 'rt-edit', 'rt-from', 'rt-to',
  'rt-side', 'rt-dots', 'rt-swap', 'rt-menu', 'rt-layers', 'rt-sheet', 'rt-layers2', 'rt-locate', 'rt-title',
  'rt-tune', 'rt-pricing', 'rt-share', 'rt-close', 'rt-time', 'rt-dist', 'rt-sub', 'rt-gas', 'rt-start',
  'rt-stop', 'rt-share2', 'rt-save', 'rt-opts', 'o-toll', 'o-hwy', 'o-ferry', 'o-done', 'rt-fare',
  'fare-close', 'fare-body', 'fare-minus', 'fare-count', 'fare-plus', 'fare-unit', 'fare-money',
  'fare-total', 'fare-change', 'fare-mode-label', 'rt-driver', 'driver-close', 'driver-binayad',
  'driver-fare', 'driver-change', 'driver-gas-liters', 'driver-gas-price', 'driver-gas-breakdown',
  'driver-gas-total', 'map'];
IDS.forEach((id) => { const e = new El('div', doc); e.id = id; doc.body.appendChild(e); els[id] = e; });
// zoom control markup that the script queries
const z = els['traffic-zoom'];
[['a', 'leaflet-control-zoom-in'], ['a', 'leaflet-control-zoom-out']].forEach(([t, c]) => {
  const e = new El(t, doc); e.className = c; z.appendChild(e);
});
// panel internals
const modes = new El('div', doc); modes.className = 'dir-modes';
['car', 'moto', 'transit', 'walk'].forEach((m) => { const b = new El('button', doc); b.dataset.mode = m; modes.appendChild(b); });
els['dir-panel'].appendChild(modes);
const sheet = els['rt-sheet'];
['rt-tune', 'rt-pricing', 'rt-share', 'rt-close'].forEach((id) => { const b = new El('button', doc); b.id = id; b.className = 'rt-cb'; sheet.appendChild(b); });
['rt-time', 'rt-dist', 'rt-sub'].forEach((id) => { const s = new El('span', doc); s.id = id; sheet.appendChild(s); });
const tabs = new El('div', doc); tabs.className = 'rt-tabs';
['car', 'moto', 'transit', 'walk'].forEach((m) => { const b = new El('button', doc); b.className = 'rt-tab'; b.dataset.m = m; b.appendChild(new El('span', doc)); tabs.appendChild(b); });
sheet.appendChild(tabs);
const chip = new El('div', doc); chip.className = 'rt-chips';
[['rt-start', 'nav'], ['rt-stop', 'addstop'], ['rt-share2', 'share'], ['rt-save', 'bookmark']].forEach(([id, i]) => {
  const b = new El('button', doc); b.id = id; b.className = 'rt-chip';
  const sp = new El('span', doc); sp.dataset.i = i; b.appendChild(sp);
  const em = new El('em', doc); b.appendChild(em); chip.appendChild(b);
});
sheet.appendChild(chip);
const gasRow = new El('div', doc); gasRow.id = 'rt-gas'; gasRow.appendChild(new El('em', doc)); sheet.appendChild(gasRow);

/* ---- mapbox-gl stub (records handlers so we can fire map clicks) ---- */
const mapHandlers = {};
function mkMap() {
  const center = { lat: 14.7425, lng: 121.1310 };
  return {
    on(ev, layer, fn) {
      const cb = typeof layer === 'function' ? layer : fn;
      (mapHandlers[ev] = mapHandlers[ev] || []).push({ layer: typeof layer === 'string' ? layer : null, cb });
      return this;
    },
    off() {},
    getCenter: () => center,
    getZoom: () => 13,
    getMinZoom: () => 1,
    getMaxZoom: () => 19,
    setMaxBounds() { return this; },
    fitBounds() { return this; },
    easeTo() { return this; },
    jumpTo() { return this; },
    flyTo() { return this; },
    addControl() { return this; },
    addSource() {}, getSource() { return null; }, addLayer() {}, getLayer() { return null; },
    removeLayer() {}, removeSource() {}, setPaintProperty() {}, setLayoutProperty() {},
    isStyleLoaded: () => true, queryRenderedFeatures: () => [],
    getContainer: () => new El('div', doc), setBearing() { return this; }, setCenter() { return this; },
    resize() {}, once(ev, fn) { if (ev === 'load') return; fn && fn(); }
  };
}
const sandbox = {
  console, setTimeout, clearTimeout, setInterval: () => 0, clearInterval,
  Math, Date, JSON, Promise, Object, Array, String, Number, Boolean, Error, RegExp, isFinite, isNaN, parseFloat, parseInt,
  AbortController, URL, Map,
  URLSearchParams,
  localStorage: { store: {}, getItem(k) { return this.store[k] ?? null; }, setItem(k, v) { this.store[k] = String(v); }, removeItem(k) { delete this.store[k]; } },
  location: { search: GOOGLE ? '?gkey=browser-fixture-key' : '', origin: 'https://example.org', pathname: '/rizal_traffic_map.html', href: 'https://example.org/rizal_traffic_map.html' },
  navigator: { geolocation: undefined, permissions: undefined, maxTouchPoints: 1, userAgent: 'node-harness', share: undefined },
  performance: { now: () => Date.now() },
  google: GOOGLE ? { maps: { importLibrary: () => Promise.resolve({}) } } : undefined,
  requestAnimationFrame: (fn) => { try { fn(Date.now()); } catch (e) {} return 0; },
  cancelAnimationFrame: () => {},
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  document: doc,
  speechSynthesis: { speak() {}, cancel() {} },
  SpeechSynthesisUtterance: function () {},
  fetch: () => Promise.reject(new Error('offline')),
  mapboxgl: {
    accessToken: 'pk.harness-token',
    Map: function () { return mkMap(); },
    Marker: function () { return { setLngLat() { return this; }, addTo() { return this; }, remove() {}, getElement: () => new El('div', doc) }; },
    LngLatBounds: function () { return { extend() { return this; }, isEmpty: () => true }; },
    NavigationControl: function () {}
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.parent = { postMessage() {} };
sandbox.addEventListener = () => {};
sandbox.mapboxgl.Map.prototype = {};
vm.createContext(sandbox);

/* ------------------------------------------------------------- load app */
const APP = path.resolve('public');
vm.runInContext(fs.readFileSync(path.join(APP, 'traffic-places.js'), 'utf8'), sandbox, { filename: 'traffic-places.js' });
vm.runInContext(fs.readFileSync(path.join(APP, 'traffic-search.js'), 'utf8'), sandbox, { filename: 'traffic-search.js' });
vm.runInContext(fs.readFileSync(path.join(APP, 'traffic-google.js'), 'utf8'), sandbox, { filename: 'traffic-google.js' });

const html = fs.readFileSync(path.join(APP, 'rizal_traffic_map.html'), 'utf8');
const inline = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/)[1];

let fail = 0;
const check = (name, cond, extra = '') => {
  console.log('  [' + (cond ? 'PASS' : 'FAIL') + '] ' + name + (extra ? '  -> ' + extra : ''));
  if (!cond) fail++;
};

try {
  vm.runInContext(inline, sandbox, { filename: 'rizal_traffic_map.inline.js' });
  console.log('inline script evaluated OK');
} catch (e) {
  console.log('INLINE SCRIPT THREW: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 6).join('\n'));
  process.exit(1);
}

/* ------------------------------------------------- drive the directions UI */
const body = els['dir-body'];
const panel = els['dir-panel'];
const toIn = els['dir-to'];
const fromIn = els['dir-from'];

els['directions-btn'].dispatch('click');            // open the Directions panel
check('directions panel opens', !panel.hidden);
check('empty state shows nearby places', body.querySelectorAll('.dir-row').length > 0,
  body.querySelectorAll('.dir-row').length + ' suggestion rows');

const textOf = (el) => el._text;
const rowText = (r) => r.querySelector('.dir-row-title')._text + ' | ' + (r.querySelector('.dir-row-sub') ? r.querySelector('.dir-row-sub')._text : '');

// Type the user's exact query.
toIn.value = 'blk 4 phase 1a sub-urban sanjose rodriguez rizal';
toIn.dispatch('focus');
toIn.dispatch('input');

const rows = body.querySelectorAll('.dir-row');
console.log('\nresults for "' + toIn.value + '":');
rows.forEach((r, i) => console.log('  ' + (i + 1) + '. ' + rowText(r) + (r.querySelector('.dir-badge') ? '  [' + r.querySelector('.dir-badge')._text + ']' : '')));
check('query returns results', rows.length > 0, rows.length + ' rows');
check('top result is the Sub-Urban place', rows.length > 0 && /Sub Urban/i.test(rowText(rows[0])), rows.length ? rowText(rows[0]) : '');

// Clicking the top result must start a route (go() -> Mapbox directions fetch
// fails offline, but it must not throw and must fill the destination field).
let threw = null;
try { rows[0].dispatch('click'); } catch (e) { threw = e; }
check('clicking a result does not throw', !threw, threw ? threw.message : '');
check('destination field filled', /Sub Urban/i.test(toIn.value), toIn.value);
await new Promise((r) => setTimeout(r, 60));     // let applyPlace/go settle

// Map tap -> pin an exact spot (reverse geocode falls back to nearest known).
const clickHandlers = (mapHandlers['click'] || []).filter((h) => !h.layer);
check('map click handler registered', clickHandlers.length > 0);
if (clickHandlers.length) {
  try {
    clickHandlers[0].cb({ point: { x: 100, y: 100 }, lngLat: { lat: 14.7534, lng: 121.1380 } });
  } catch (e) { threw = e; }
  check('map tap does not throw', !threw, threw ? threw.message : '');
  await new Promise((r) => setTimeout(r, 60));   // let the reverse-geocode settle
}

// The map tap must have set a destination without wiping the results list
els['directions-btn'].dispatch('click');
toIn.value = 'kasiglahan';
toIn.dispatch('input');
await new Promise((r) => setTimeout(r, 60));
check('typing after a map tap searches normally',
  body.querySelectorAll('.dir-row').some === undefined ? false : /Kasiglahan/i.test(rowText(body.querySelectorAll('.dir-row')[0] || new El('div', doc))),
  (body.querySelectorAll('.dir-row')[0] ? rowText(body.querySelectorAll('.dir-row')[0]) : '(no rows)'));

// ---- live providers (fixtures, not a live-coverage claim) -----------------
const urls = [];
const geo = (name, extra = {}) => ({ type: 'Feature', geometry: { coordinates: [121.1377678, 14.7536035] },
  properties: { name, district: 'San Isidro', city: 'Montalban', state: 'Rizal', country: 'Philippines', ...extra } });
sandbox.fetch = (url) => {
  const u = new URL(url); urls.push(u);
  const q = u.searchParams.get('q') || '';
  const data = u.hostname.includes('mapbox') ? { features: [{ geometry: { coordinates: [121.13524, 14.731221] },
    properties: { name: 'San Jose', feature_type: 'locality', place_formatted: 'Rodriguez, Rizal, Philippines' } }] } :
    u.pathname === '/reverse' ? { features: [geo('Fixture Fuel', { osm_key: 'amenity', osm_value: 'fuel' })] } :
    /jollibee/i.test(q) ? { features: [geo('Jollibee Montalban', { osm_key: 'amenity', osm_value: 'fast_food' }), geo('Chowking', { osm_key: 'amenity', osm_value: 'fast_food' })] } :
    { features: [geo('Phase 1-A Sub Urban', { osm_key: 'landuse', osm_value: 'residential', type: 'locality' }), geo('Jollibee', { osm_key: 'amenity', osm_value: 'fast_food' })] };
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
};

els['directions-btn'].dispatch('click');
toIn.value = 'blk 4 phase 1a sub-urban sanjose rodriguez rizal';
toIn.dispatch('input');
await new Promise((r) => setTimeout(r, 700));
const onRows = body.querySelectorAll('.dir-row');
check('whole address reaches Mapbox and Photon before normalization fallback',
  urls.some((u) => u.hostname.includes('mapbox') && u.searchParams.get('q') === toIn.value) &&
  urls.some((u) => u.hostname.includes('photon') && u.searchParams.get('q') === toIn.value));
check('online duplicate of the Phase 1-A area is deduped', onRows.filter((r) => /Phase 1-A Sub Urban/.test(rowText(r))).length === 1);
check('unrelated Jollibee and generic San Jose are not shown for a Sub Urban query',
  onRows.every((r) => !/Jollibee|^San Jose \|/.test(rowText(r))));
check('Blk/Lot uncertainty is plainly visible, not a fabricated exact block label',
  onRows[0].querySelector('.dir-row-note') && /hindi verified/i.test(onRows[0].querySelector('.dir-row-note')._text) &&
  !/^Blk 4,/.test(rowText(onRows[0])));
const attr = body.querySelector('.dir-attr');
check('OSM attribution is rendered', !!attr && /OpenStreetMap/.test(attr._html));
check('live search settles and reports aria-busy=false', body.getAttribute('aria-busy') === 'false');
check('Google Maps fallback retains the full query',
  new URL(els['dir-google-link'].href).searchParams.get('query') === toIn.value);

toIn.value = 'Jollibee'; toIn.dispatch('input');
await new Promise((r) => setTimeout(r, 700));
check('businesses absent from the fixed list are live-searchable', body.querySelectorAll('.dir-row').some((r) => /Jollibee/.test(rowText(r))));
check('brand searches are not changed into all restaurants',
  body.querySelectorAll('.dir-row').every((r) => !/Chowking/.test(rowText(r))) &&
  urls.some((u) => u.searchParams.get('q') === 'Jollibee'));

toIn.value = 'gas station'; toIn.dispatch('input');
await new Promise((r) => setTimeout(r, 700));
check('category search uses nearest POIs with an actual fuel tag',
  urls.some((u) => u.pathname === '/reverse' && u.searchParams.get('osm_tag') === 'amenity:fuel'));
check('category header and matching fuel result render',
  !!body.querySelector('.dir-cat') && body.querySelectorAll('.dir-row').some((r) => /Fixture Fuel/.test(rowText(r))));

// Direct point input does not need any service, and can be selected by keyboard.
toIn.value = '14.7534, 121.1380'; toIn.dispatch('input');
check('coordinates immediately produce a selectable result', body.querySelectorAll('.dir-row').length === 1 && /14.753400/.test(rowText(body.querySelectorAll('.dir-row')[0])));
toIn.dispatch('keydown', { key: 'ArrowDown', preventDefault() {} });
check('keyboard navigation highlights a result', body.querySelector('.dir-row').style.background === '#e8f0fe');
toIn.dispatch('keydown', { key: 'Enter', preventDefault() {} });
check('Enter selects a resolved coordinate, not an unfinished centroid', toIn.value === '14.753400, 121.138000');
await new Promise((r) => setTimeout(r, 20));

// Explicit map picking actually exposes the canvas (the search is full-screen).
els['directions-btn'].dispatch('click'); els['dir-pin'].dispatch('click');
check('Pin sa mapa exposes the map and shows picking instructions', panel.hidden && !els['dir-pin-picker'].hidden && doc.body.classList.contains('choosing-pin'));
els['dir-pin-cancel'].dispatch('click');
check('cancelling map picking restores search without losing Your location', !panel.hidden && els['dir-pin-picker'].hidden && fromIn.value === 'Your location');
els['dir-pin'].dispatch('click');
clickHandlers[0].cb({ point: { x: 100, y: 100 }, lngLat: { lat: 14.7534, lng: 121.1380 } });
await new Promise((r) => setTimeout(r, 50));
check('choosing an exact map pin exits picking mode and restores Directions', !panel.hidden && els['dir-pin-picker'].hidden && !doc.body.classList.contains('choosing-pin'));
const recentPins = JSON.parse(sandbox.localStorage.getItem('traffic_recent'));
check('map-picked coordinates remain the user point, not a provider centroid', recentPins.some((p) => p.lat === 14.7534 && p.lng === 121.1380 && p.pinned));

// A delayed reverse response must not override typing, focus changes or closure.
let finishReverse;
sandbox.fetch = (url) => String(url).includes('/reverse?longitude=') ? new Promise((resolve) => { finishReverse = resolve; }) : Promise.reject(new Error('offline'));
els['dir-pin'].dispatch('click');
clickHandlers[0].cb({ point: { x: 90, y: 90 }, lngLat: { lat: 14.75, lng: 121.13 } });
await new Promise((r) => setTimeout(r, 0));
els['dir-pin-cancel'].dispatch('click'); toIn.value = 'kasiglahan'; toIn.dispatch('input');
finishReverse({ ok: true, json: () => Promise.resolve({ features: [{ properties: { name: 'Stale reverse address' } }] }) });
await new Promise((r) => setTimeout(r, 20));
check('stale reverse geocoding cannot overwrite a newer destination search',
  toIn.value === 'kasiglahan' && body.querySelectorAll('.dir-row').some((r) => /Kasiglahan/.test(rowText(r))));
// Enter must wait for the live search rather than silently choosing a local area.
toIn.dispatch('keydown', { key: 'Enter', preventDefault() {} });
check('Enter during live lookup does not instantly route to a local centroid', toIn.value === 'kasiglahan');
await new Promise((r) => setTimeout(r, 40));
els['dir-back'].dispatch('click');
check('closing Directions clears pending requests and hides the panel', panel.hidden && !doc.body.classList.contains('directions-open'));

if (GOOGLE) {
  console.log('\nGoogle UI Kit integration (mocked official elements):');
  sandbox.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ features: [] }) });
  els['directions-btn'].dispatch('click'); toIn.value = 'Example Google-only place'; toIn.dispatch('input');
  els['dir-search-submit'].dispatch('click');
  await new Promise((r) => setTimeout(r, 50));
  const host = els['dir-google'], list = host.querySelector('gmp-place-search');
  const request = host.querySelector('gmp-place-text-search-request');
  check('configured Google search uses the attributed official UI Kit list', !!list && !!list.querySelector('gmp-place-all-content'));
  check('Google receives the original query and a soft bias, no country restriction',
    request && request.textQuery === 'Example Google-only place' && request.locationBias.radius === 50000 && !request.locationRestriction);
  list.places = []; list.dispatch('gmp-load');
  check('a Google no-match is stated honestly', /Walang Google place match/.test(host.querySelector('.dir-google-status')._text));
  list.dispatch('gmp-select', { place: { id: 'fixture-place-id', location: { lat: () => 14.756, lng: () => 121.141 } } });
  const detail = host.querySelector('gmp-place-details-compact'), use = host.querySelector('.dir-google-use');
  check('Google place selection requests official details before use', !!detail && use.disabled &&
    detail.querySelector('gmp-place-details-place-request').place === 'fixture-place-id');
  detail.place = { id: 'fixture-place-id', location: { lat: () => 14.756, lng: () => 121.141 } };
  detail.dispatch('gmp-load');
  check('confirmed Google geometry enables selection', !use.disabled);
  use.dispatch('click'); await new Promise((r) => setTimeout(r, 20));
  check('Google-selected point fills the correct destination and retains its official name/address card',
    toIn.value === 'Google Maps destination' && !!els['dir-google-selected'].querySelector('gmp-place-details-compact'));
  check('Google place content and geometry are not written to offline history',
    !sandbox.localStorage.getItem('traffic_recent').includes('fixture-place-id'));
  els['dir-swap'].dispatch('click');
  check('swapping Google-selected origin/destination keeps the official card in sync',
    fromIn.value === 'Google Maps starting point' && /Starting point/.test(els['dir-google-selected'].querySelector('.dir-google-status')._text));

  // Old Google selection events must never affect a newer query/field.
  toIn.dispatch('focus'); toIn.value = 'New Google query'; toIn.dispatch('input');
  list.dispatch('gmp-select', { place: { id: 'stale-google-place', location: { lat: 1, lng: 2 } } });
  check('stale Google events do not clobber a newer field/query', toIn.value === 'New Google query');
  els['dir-search-submit'].dispatch('click'); await new Promise((r) => setTimeout(r, 30));
  const newList = host.querySelector('gmp-place-search'); newList.dispatch('gmp-error');
  check('Google authorization/provider errors have an actionable fallback message', /unavailable|API\/billing/.test(host.querySelector('.dir-google-status')._text));
  els['dir-back'].dispatch('click');
} else {
  check('without a Google key no Google API script is loaded or result promised', !doc.head.querySelector('script') && !els['dir-google'].querySelector('gmp-place-search'));
}
console.log('\n' + (fail ? 'FAILURES: ' + fail : 'All UI checks passed.' + (GOOGLE ? ' (Google connector mocked)' : '')));
process.exit(fail ? 1 : 0);
