// Regression tests for the REAL public/traffic-search.js. No network/API key.
// Provider responses are fixtures; passing these is not a live coverage promise.
// Run: node scripts/test-traffic-search.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const files = ['traffic-places.js', 'traffic-search.js'].map((name) => ({ name, code: fs.readFileSync('public/' + name, 'utf8') }));
const offline = () => Promise.reject(new Error('offline'));
const response = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
function app(fetch = offline) {
  const sandbox = { console, setTimeout, clearTimeout, Date, Map, URL, URLSearchParams, AbortController, fetch,
    location: { href: 'https://example.org/rizal_traffic_map.html' } };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  files.forEach(({ name, code }) => vm.runInContext(code, sandbox, { filename: name }));
  return { TS: sandbox.TrafficSearch, places: sandbox.TRAFFIC_PLACES, sandbox };
}
const poi = (name, lat = 14.733, lng = 121.134, extra = {}) => ({
  type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: { name, city: 'Montalban', state: 'Rizal', country: 'Philippines', osm_key: 'amenity', osm_value: 'fast_food', ...extra }
});
const address = (name, lat = 14.7537, lng = 121.1379, extra = {}) => ({
  type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: { name, place_formatted: 'San Jose, Rodriguez, Rizal, Philippines', feature_type: 'address',
    coordinates: { accuracy: 'rooftop' }, match_code: { confidence: 'exact' }, ...extra }
});
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('[PASS] ' + name); }
const { TS, places } = app();
const near = TS.NEAR;
const query = 'blk 4 phase 1a sub-urban sanjose rodriguez rizal';
check('the requested address finds the real Phase 1-A area, not an invented Blk 4 pin', () => {
  const r = TS.localSearch(query, near, 3)[0];
  assert.equal(r.label, 'Phase 1-A Sub Urban'); assert.equal(r.precision, 'area'); assert.equal(r.approx, true);
  assert.match(r.note, /hindi verified.*Blk\/Lot/); assert.equal(r.requestedAddress, query);
});
check('every named local gazetteer entry is searchable with valid coordinates', () => {
  assert.ok(places.length >= 100);
  places.forEach((p) => {
    assert.ok(TS.validCoords(p.lat, p.lng), p.n);
    assert.ok(TS.localSearch(p.n, near, 30).some((r) => r.label === p.n && r.lat === p.lat && r.lng === p.lng), p.n);
  });
});
check('normalization and useful aliases work without asserting surveyed house pins', () => {
  assert.equal(TS.normalize('brgy sanjose blk 4 ph 1 a sub-urban'), 'barangay san jose block 4 phase 1a sub urban');
  assert.match(TS.localSearch('1k1', near, 1)[0].label, /Kasiglahan/);
  assert.match(TS.localSearch('kasiglahan', near, 1)[0].label, /Kasiglahan Village/);
  assert.equal(TS.localSearch('phase 1a sub urban', near, 1)[0].label, 'Phase 1-A Sub Urban');
});
check('bare Blk/Lot and gibberish never fabricate a local pin', () => {
  assert.equal(TS.localSearch('blk 41 lot 11', near, 5).length, 0);
  assert.equal(TS.localSearch('xyzzy nope not a place', near, 5).length, 0);
});
check('a place in another province/country is not replaced with a local namesake', () => {
  assert.equal(TS.localSearch('Amityville New York', near, 5).length, 0);
  assert.equal(TS.localSearch('San Jose Nueva Ecija', near, 5).length, 0);
  assert.equal(TS.localSearch('Mercury Drug Baguio', near, 5).length, 0);
});
check('brands stay brands; different shop categories stay distinct', () => {
  ['Jollibee', 'McDonalds', 'Shell', 'Petron', 'Mercury Drug', 'Puregold'].forEach((q) => assert.equal(TS.category(q), null, q));
  assert.equal(TS.category('bakery').term, 'bakery');
  assert.equal(TS.category('laundry').term, 'laundry');
  assert.equal(TS.category('salon').term, 'hairdresser');
  assert.equal(TS.category('palengke').term, 'market');
  assert.equal(TS.category('atm').term, 'ATM');
  assert.equal(TS.category('gas station near me').term, 'gas station');
});
check('coordinates and explicit Maps destination links return the supplied point', () => {
  const coords = TS.directPlace('14.7534, 121.1380');
  assert.equal(coords.lat, 14.7534); assert.equal(coords.lng, 121.1380);
  const link = TS.directPlace('https://www.google.com/maps/search/?api=1&query=14.7534%2C121.1380');
  assert.equal(link.lat, coords.lat); assert.equal(link.lng, coords.lng);
  const long = TS.directPlace('https://www.google.com/maps/place/Test/@14.7,121.1,15z/data=!3d14.7534!4d121.1380');
  assert.equal(long.lat, coords.lat); assert.equal(long.lng, coords.lng);
  const dir = TS.directPlace('https://www.google.com/maps/dir/?api=1&destination=14.7534,121.1380');
  assert.equal(dir.lng, coords.lng);
});
check('camera centres, short/unsafe links, and invalid coordinates are not mistaken for destinations', () => {
  ['https://www.google.com/maps/@14.7,121.1,15z', 'https://maps.app.goo.gl/example',
    'https://evil.example/maps/?q=14.7,121.1', 'https://www.google.com/maps/place/Example/data=!3d14.7!4d121.1!3d14.8!4d121.2', 'javascript:alert(1)', '999,121.1', '14.7,999'].forEach((q) => assert.equal(TS.directPlace(q), null, q));
});
check('full Plus Codes decode the standard area centre; short codes need locality', () => {
  const code = TS.directPlace('849VCWC8+R9');
  assert.ok(code && Math.abs(code.lat - 37.4220625) < 0.000001 && Math.abs(code.lng + 122.0840625) < 0.000001);
  assert.equal(code.precision, 'area');
  assert.equal(TS.directPlace('CWC8+R9'), null);
  assert.equal(TS.directPlace('ZZZZZZZZ+ZZ'), null);
});
check('worldwide distances are great-circle distances', () => {
  const d = TS.haversine(14.7425, 121.131, 48.8583, 2.2945);
  assert.ok(d > 10000000 && d < 11200000);
  assert.ok(TS.haversine(0, 179.9, 0, -179.9) < 23000);
});

const calls = [];
const targetApp = app((url) => {
  calls.push(new URL(url));
  return response({ features: String(url).includes('mapbox.com') ? [address('San Jose', 14.73, 121.135, { feature_type: 'locality' })] : [
    poi('Phase 1-A Sub Urban', 14.7536035, 121.1377678, { osm_key: 'landuse', osm_value: 'residential', type: 'locality', osm_id: 153318659, osm_type: 'W' }),
    poi('Jollibee', 14.7313, 121.1348)
  ] });
});
const merged = await targetApp.TS.search(query, { token: 'pk.fixture', proximity: near });
check('the original complete address reaches live providers first, including Blk/Phase', () => {
  assert.equal(calls.find((u) => u.hostname === 'api.mapbox.com').searchParams.get('q'), query);
  assert.equal(calls.find((u) => u.hostname === 'photon.komoot.io').searchParams.get('q'), query);
  assert.ok(calls.some((u) => /\/geocode\/v6\/forward/.test(u.pathname)));
});
check('merged results dedupe the same Phase 1-A, and reject unrelated generic/POI matches', () => {
  assert.equal(merged.results.filter((r) => r.label === 'Phase 1-A Sub Urban').length, 1);
  assert.ok(!merged.results.some((r) => /Jollibee|^San Jose$/.test(r.label)));
  assert.match(merged.results[0].label, /Sub Urban/); assert.equal(merged.online, true);
});
const fallbackCalls = [];
const fallbackApp = app((url) => {
  const u = new URL(url); fallbackCalls.push(u);
  const hasCore = u.searchParams.get('q') === 'phase 1a sub urban Rodriguez Rizal';
  return response({ features: hasCore ? [poi('Phase 1-A Sub Urban', 14.7536, 121.1382, { osm_key: 'landuse', osm_value: 'residential' })] : [] });
});
await fallbackApp.TS.search(query, { proximity: near });
check('a local centroid does not stop online lookup; normalized area fallback runs if raw search misses', () => {
  assert.ok(fallbackCalls.some((u) => u.searchParams.get('q') === 'phase 1a sub urban Rodriguez Rizal'));
});
const brands = [];
const brandApp = app((url) => {
  brands.push(new URL(url));
  return response({ features: [poi('Jollibee Montalban'), poi('Chowking Montalban')] });
});
const branded = await brandApp.TS.search('Jollibee', { proximity: near });
check('online-only businesses appear and Jollibee does not become every restaurant', () => {
  assert.ok(branded.results.some((r) => /Jollibee/.test(r.label)));
  assert.ok(!branded.results.some((r) => /Chowking/.test(r.label)));
  assert.ok(brands.every((u) => u.searchParams.get('q') === 'Jollibee'));
});
const worldCalls = [];
const worldApp = app((url) => {
  const u = new URL(url); worldCalls.push(u);
  return response({ features: [poi('Eiffel Tower', 48.8583, 2.2945, { city: 'Paris', state: 'Île-de-France', country: 'France', osm_key: 'man_made', osm_value: 'tower' })] });
});
const world = await worldApp.TS.search('Eiffel Tower Paris', { token: '', proximity: near });
check('search works outside Rizal and the Philippines, with address context intact', () => {
  assert.ok(world.results.some((r) => r.lng === 2.2945 && /France/.test(r.sub)));
  assert.ok(worldCalls.every((u) => !u.searchParams.has('bbox') && !u.searchParams.has('countrycodes') && !u.searchParams.has('country')));
});
const unicodeCalls = [];
const unicodeApp = app((url) => {
  unicodeCalls.push(new URL(url).searchParams.get('q'));
  return response({ features: [poi('東京駅', 35.6812, 139.7671, { city: 'Tokyo', state: 'Tokyo', country: 'Japan', osm_value: 'station' })] });
});
const unicode = await unicodeApp.TS.search('東京駅', { proximity: near });
check('non-Latin place names survive normalization and online search', () => {
  assert.equal(unicodeApp.TS.normalize('東京駅'), '東京駅'); assert.equal(unicodeCalls[0], '東京駅');
  assert.equal(unicode.results[0].label, '東京駅');
});
const categoryCalls = [];
const categoryApp = app((url) => {
  categoryCalls.push(new URL(url));
  return response({ features: [poi('Fixture Fuel', 14.743, 121.131, { osm_value: 'fuel' }), poi('Not a station', 14.744, 121.132, { osm_value: 'restaurant' })] });
});
const gas = await categoryApp.TS.search('gas station', { token: 'pk.fixture', proximity: near });
check('nearby categories use actual OSM tags, not generic name matches or deprecated Mapbox POIs', () => {
  assert.ok(gas.results.some((r) => r.label === 'Fixture Fuel'));
  assert.ok(!gas.results.some((r) => r.label === 'Not a station'));
  assert.equal(categoryCalls[0].pathname, '/reverse'); assert.equal(categoryCalls[0].searchParams.get('osm_tag'), 'amenity:fuel');
  assert.ok(!categoryCalls.some((u) => u.hostname === 'api.mapbox.com'));
});
const preciseApp = app((url) => response({ features: String(url).includes('mapbox.com') ? [address('Blk 4 Lot 11, Phase 1-A Sub Urban')] : [] }));
const precise = await preciseApp.TS.search('blk 4 lot 11 phase 1a sub urban san jose rodriguez rizal', { token: 'pk.fixture', proximity: near });
check('a matching address response outranks a subdivision centroid without rewriting the name', () => {
  assert.equal(precise.results[0].src, 'mapbox'); assert.equal(precise.results[0].label, 'Blk 4 Lot 11, Phase 1-A Sub Urban');
  assert.equal(precise.results[0].precision, 'provider'); assert.equal(precise.results[0].approx, false);
});
const incompleteApp = app((url) => response({ features: String(url).includes('mapbox.com') ? [address('Phase 1-A Sub Urban')] : [] }));
const incomplete = await incompleteApp.TS.search(query, { token: 'pk.fixture', proximity: near });
check('a provider address that omits the requested block is still explicitly approximate', () => {
  const r = incomplete.results.find((r) => r.src === 'mapbox'); assert.ok(r && r.approx); assert.match(r.note, /Hindi verified/);
});
const wrongBlockApp = app((url) => response({ features: String(url).includes('mapbox.com') ? [address('Blk 40 Lot 11, Phase 1-A Sub Urban')] : [] }));
const wrongBlock = await wrongBlockApp.TS.search('blk 4 lot 11 phase 1a sub urban san jose rodriguez rizal', { token: 'pk.fixture', proximity: near });
check('a different explicit block number is rejected instead of being called the requested address', () => assert.ok(!wrongBlock.results.some((r) => /Blk 40/.test(r.label))));
const linkNameApp = app((url) => response({ features: [poi('Jollibee Montalban')] }));
const linkName = await linkNameApp.TS.search('https://www.google.com/maps/search/?api=1&query=Jollibee%20Montalban', { proximity: near });
check('a named Maps query is searched normally without importing its camera centre', () => assert.ok(linkName.results.some((r) => /Jollibee/.test(r.label))));
check('named/short Maps links open only the intended Google destination, not an arbitrary URL', () => {
  assert.equal(TS.queryText('https://www.google.com/maps/place/Jollibee+Montalban/@1,2,15z'), 'Jollibee Montalban');
  assert.equal(TS.googleMapsUrl('https://maps.app.goo.gl/example'), 'https://maps.app.goo.gl/example');
  assert.ok(TS.googleMapsUrl('javascript:alert(1)').startsWith('https://www.google.com/maps/search/'));
  assert.ok(TS.directPlace('https://www.google.com/maps/search/?api=1&query=849VCWC8%2BR9'));
});
const branchApp = app(() => response({ features: [poi('Jollibee Montalban', 14.733, 121.134, { osm_type: 'N', osm_id: 100 }), poi('Jollibee Montalban', 14.7337, 121.134, { osm_type: 'N', osm_id: 101 })] }));
const branches = await branchApp.TS.search('Jollibee', { proximity: near });
check('different nearby business branches are not deduped just because the brand names match', () => assert.equal(branches.results.length, 2));
const cacheCalls = [];
const cacheApp = app((url) => { cacheCalls.push(new URL(url)); return response({ features: [poi('Unique Fixture Cafe', 14.7, 121.1, { osm_value: 'cafe' })] }); });
await cacheApp.TS.search('Unique Fixture Cafe', { token: 'pk.fixture', proximity: near });
await cacheApp.TS.search('Unique Fixture Cafe', { token: 'pk.fixture', proximity: near });
check('OSM cache reduces repeat requests while temporary Mapbox results are always requested afresh', () => {
  assert.equal(cacheCalls.filter((u) => u.hostname.includes('photon')).length, 1);
  assert.equal(cacheCalls.filter((u) => u.hostname.includes('mapbox')).length, 2);
});
const invalidApp = app(() => response({ features: [poi('Bad coordinates', 200, 500), { properties: { name: 'Bad coordinates' } }] }));
const invalid = await invalidApp.TS.search('Bad coordinates', { proximity: near });
check('invalid provider geometries never become selectable pins', () => assert.equal(invalid.results.length, 0));
const missing = await TS.search('some nonexistent place', { proximity: near });
check('all providers offline reports offline, not falsely online', () => { assert.equal(missing.online, false); assert.match(missing.hint, /Hindi makontak/); });
const noPublicCalls = [];
const noPublicApp = app((url) => { noPublicCalls.push(String(url)); return response({ features: [] }); });
await noPublicApp.TS.search('Unindexed Example', { submitted: true, nominatimUrl: 'https://nominatim.openstreetmap.org/search', proximity: near });
check('no forbidden public Nominatim autocomplete/submitted fallback is generated', () => assert.ok(noPublicCalls.every((u) => !u.includes('nominatim.openstreetmap.org'))));
const abortApp = app(() => new Promise(() => {}));
const controller = new AbortController();
const pending = abortApp.TS.search('cancelled query', { signal: controller.signal, proximity: near });
controller.abort();
await assert.rejects(pending, (e) => e.name === 'AbortError');
check('superseded requests cancel and settle promptly, even with a stalled provider', () => assert.ok(controller.signal.aborted));
const rev = await TS.reverse(14.7534, 121.1380, { token: '' });
check('offline map pin keeps the exact user coordinate while naming a nearby known area', () => {
  assert.match(rev.label, /near Phase 1-A Sub Urban/); assert.equal(rev.lat, 14.7534); assert.equal(rev.lng, 121.1380);
});
check('Google/temporary Mapbox content is not saved as an offline database', () => {
  assert.equal(TS.forStorage({ src: 'google-ui-kit', lat: 14.7, lng: 121.1, googlePlaceId: 'id' }), null);
  assert.equal(TS.forStorage({ src: 'mapbox', lat: 14.7, lng: 121.1 }), null);
  const p = TS.forStorage({ src: 'mapbox', pinned: true, label: 'Temporary reverse address', lat: 14.7, lng: 121.1 });
  assert.equal(p.src, 'coordinates'); assert.ok(!p.label.includes('Temporary'));
  assert.equal(TS.forStorage({ src: 'local', label: 'Kasiglahan', lat: 14.7, lng: 121.1 }).label, 'Kasiglahan');
});
console.log(`\nAll ${checks} search checks passed.`);
