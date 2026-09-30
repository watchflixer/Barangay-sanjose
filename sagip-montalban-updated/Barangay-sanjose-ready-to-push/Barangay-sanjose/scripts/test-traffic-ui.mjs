// DOM harness: runs the REAL inline script from public/rizal_traffic_map.html
// against a minimal DOM so the destination-search UI can be exercised offline.
// Run: node scripts/test-traffic-ui.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

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
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; }
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
      if (want.startsWith('.') && c.classList.contains(want.slice(1))) out.push(c);
      else if (want.startsWith('#') && c.id === want.slice(1)) out.push(c);
      else if (want.startsWith('[') && c.dataset[want.slice(1, -1)]) out.push(c);
      else if (/^[a-z]+$/i.test(want) && c.tagName === want.toUpperCase()) out.push(c);
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
  'dir-swap', 'dir-from', 'dir-to', 'dir-body', 'dir-hint', 'rt-top', 'rt-edit', 'rt-from', 'rt-to',
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
    getMinZoom: () => 4.5,
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
  AbortController: undefined,
  URLSearchParams: URLSearchParams,
  localStorage: { store: {}, getItem(k) { return this.store[k] ?? null; }, setItem(k, v) { this.store[k] = String(v); }, removeItem(k) { delete this.store[k]; } },
  location: { search: '', origin: 'https://example.org', pathname: '/rizal_traffic_map.html', href: 'https://example.org/rizal_traffic_map.html' },
  navigator: { geolocation: undefined, permissions: undefined, maxTouchPoints: 1, userAgent: 'node-harness', share: undefined },
  performance: { now: () => Date.now() },
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

// ---- online merge path (stubbed Mapbox + Photon) --------------------------
const urls = [];
sandbox.fetch = (url) => {
  const u = String(url);
  urls.push(u);
  const body = u.includes('mapbox.com') ? { features: [
    { place_name: 'Jollibee E. Rodriguez, Rodriguez, Rizal, Philippines', center: [121.1348, 14.7313], place_type: ['poi'], relevance: 0.9 },
    { place_name: 'San Jose, Rodriguez, Rizal, Philippines', center: [121.13524, 14.731221], place_type: ['locality'], relevance: 0.7 }
  ] } : u.includes('photon.komoot.io') ? { features: [
    { properties: { name: 'Phase 1-A Sub Urban', district: 'San Isidro', city: 'Montalban', state: 'Rizal' }, geometry: { coordinates: [121.1377678, 14.7536035] } },
    { properties: { name: 'Jollibee', street: 'E. Rodriguez Highway', city: 'Montalban', state: 'Rizal' }, geometry: { coordinates: [121.1348, 14.7313] } }
  ] } : [];
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
};

els['directions-btn'].dispatch('click');
toIn.value = 'blk 4 phase 1a sub-urban sanjose rodriguez rizal';
toIn.dispatch('input');
await new Promise((r) => setTimeout(r, 800));           // let the debounce + merge run

const onRows = body.querySelectorAll('.dir-row');
console.log('\nresults after online merge:');
onRows.forEach((r, i) => {
  const b = r.querySelector('.dir-badge');
  console.log('  ' + (i + 1) + '. ' + rowText(r) + (b ? '  [' + b._text + ']' : ''));
});
check('online results merged in', onRows.length > 2, onRows.length + ' rows');
check('online providers were called',
  urls.some((u) => u.includes('mapbox.com')) && urls.some((u) => u.includes('photon.komoot.io')),
  urls.length + ' requests');
check('the address-stripped query reaches the providers',
  urls.some((u) => /phase%201a%20sub%20urban/.test(u)), urls[0] || '');
check('online duplicate of the subdivision is de-duplicated',
  onRows.filter((r) => /Sub Urban/i.test(rowText(r))).length === 1);
check('online-only place (Jollibee) shows up', onRows.some((r) => /Jollibee/i.test(rowText(r))));
const attr = body.querySelector('.dir-attr');
check('attribution is rendered', !!attr, attr ? attr._html || attr._text : '(none)');

// ---- category search -----------------------------------------------------
els['directions-btn'].dispatch('click');
toIn.value = 'gas station';
toIn.dispatch('input');
await new Promise((r) => setTimeout(r, 800));
check('category search queries POIs near the map centre',
  urls.some((u) => /gas%20station/.test(u)));
const catLabel = body.querySelector('.dir-cat');
check('category header rendered', !!catLabel, catLabel ? catLabel._text : '(none)');

console.log('\n' + (fail ? 'FAILURES: ' + fail : 'All UI checks passed.'));
process.exit(fail ? 1 : 0);
