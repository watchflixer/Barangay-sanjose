// Offline test harness for the destination search engine.
// Run: node scripts/test-traffic-search.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const dir = path.resolve(process.cwd(), 'public');
const sandbox = { console, setTimeout, clearTimeout, Math, Promise, fetch: () => Promise.reject(new Error('offline')) };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, 'traffic-places.js'), 'utf8'), sandbox, { filename: 'traffic-places.js' });
vm.runInContext(fs.readFileSync(path.join(dir, 'traffic-search.js'), 'utf8'), sandbox, { filename: 'traffic-search.js' });

const TS = sandbox.TrafficSearch;
const NEAR = TS.NEAR;
console.log('gazetteer entries:', sandbox.TRAFFIC_PLACES.length);

const queries = [
  'blk 4 phase 1a sub-urban sanjose rodriguez rizal',
  'sub urban san jose rodriguez rizal',
  'sub-urban',
  'phase 1a sub urban',
  'kasiglahan',
  'amityville',
  'blk 41 lot 11',
  'eastwood greenview',
  'metro manila hills',
  'sitio balite',
  'san jose',
  'puregold',
  'mercury drug',
  'wawa dam',
  'litex',
  'francesca',
  'zuniga subdivision',
  'e rodriguez highway',
  'gas station',
  'school',
  'xyzzy nope not a place',
];

let fail = 0;
for (const q of queries) {
  const p = TS.parse(q);
  const res = TS.localSearch(q, NEAR, 4);
  const cat = TS.category(q);
  console.log('\n=== "' + q + '"');
  console.log('   norm: ' + p.norm);
  console.log('   core: [' + p.core.join(' ') + ']' + (p.block ? '  block=' + p.block : '') + (p.phase ? '  phase=' + p.phase : ''));
  if (cat) console.log('   category: ' + cat.label + '  -> term "' + cat.term + '"');
  if (!res.length) console.log('   (local: none)');
  res.forEach((r, i) => console.log('   ' + (i + 1) + '. ' + r.label + '  [' + TS.fmtDist(r.dist) + ']  ' + (r.approx ? '~approx  ' : '') + r.sub));
}

// ---- assertions for the user's exact case ---------------------------------
const target = TS.localSearch('blk 4 phase 1a sub-urban sanjose rodriguez rizal', NEAR, 3);
const okUser = target.length && /Sub Urban/i.test(target[0].label) && target[0].approx;
console.log('\n[CHECK] blk 4 phase 1a sub-urban -> top hit is Sub Urban (approx): ' + (okUser ? 'PASS' : 'FAIL') + '  => ' + (target[0] && target[0].label));
if (!okUser) fail++;

const okPhase = TS.localSearch('phase 1a sub urban', NEAR, 1)[0]?.label || '';
console.log('[CHECK] phase 1a sub urban exact name: ' + (/Sub Urban/i.test(okPhase) ? 'PASS' : 'FAIL') + '  => ' + okPhase);
if (!/Sub Urban/i.test(okPhase)) fail++;

const okKas = TS.localSearch('kasiglahan', NEAR, 1)[0]?.label || '';
console.log('[CHECK] kasiglahan: ' + (/Kasiglahan/i.test(okKas) ? 'PASS' : 'FAIL') + '  => ' + okKas);
if (!/Kasiglahan/i.test(okKas)) fail++;

// A bare block/lot is a house address, not a place — it must NOT be answered
// with a made-up pin. The UI shows "tap the map to pin it" instead.
const bareAddr = TS.localSearch('blk 41 lot 11', NEAR, 3);
console.log('[CHECK] bare "blk 41 lot 11" -> no invented local pin: ' + (bareAddr.length === 0 ? 'PASS' : 'FAIL'));
if (bareAddr.length) fail++;

const okNone = TS.localSearch('xyzzy nope not a place', NEAR, 3).length === 0;
console.log('[CHECK] gibberish -> no local results: ' + (okNone ? 'PASS' : 'FAIL'));
if (!okNone) fail++;

// ---- merged search with stubbed providers --------------------------------
const calls = [];
sandbox.fetch = (url) => {
  calls.push(String(url));
  const u = String(url);
  const body =
    u.includes('mapbox.com') ? { features: [
      { place_name: 'San Jose, Rodriguez, Rizal, Philippines', center: [121.13524, 14.731221], place_type: ['locality'], relevance: 0.71 },
      { place_name: 'Jollibee E. Rodriguez, Rodriguez, Rizal, Philippines', center: [121.1348, 14.7313], place_type: ['poi'], relevance: 0.92 }
    ] } :
    u.includes('photon') ? { features: [
      // same place as the local gazetteer hit, in OSM spelling -> must dedupe
      { properties: { name: 'Phase 1-A Sub Urban', district: 'San Isidro', city: 'Montalban', state: 'Rizal' }, geometry: { coordinates: [121.1377678, 14.7536035] } },
      { properties: { name: 'Jollibee', street: 'E. Rodriguez Highway', city: 'Montalban', state: 'Rizal' }, geometry: { coordinates: [121.1348, 14.7313] } }
    ] } : [];
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
};

const merged = await TS.search('blk 4 phase 1a sub-urban sanjose rodriguez rizal', { token: 'pk.test', proximity: NEAR });
console.log('\n=== merged search (stubbed online) ===');
merged.results.forEach((r, i) => console.log('   ' + (i + 1) + '. [' + r.src + '] ' + r.label + '  ' + TS.fmtDist(r.dist) + '  ' + r.sub));
console.log('   hint: ' + (merged.hint || '(none)'));
console.log('   providers called: ' + calls.map((c) => (c.includes('mapbox') ? 'mapbox' : c.includes('photon') ? 'photon' : 'osm')).join(', '));

const okOrder = /Sub Urban/i.test(merged.results[0].label) && merged.results[0].src === 'local';
console.log('[CHECK] local gazetteer result ranks above online matches: ' + (okOrder ? 'PASS' : 'FAIL'));
if (!okOrder) fail++;

const dupes = merged.results.filter((r) => /Sub Urban/i.test(r.label));
console.log('[CHECK] online duplicate of the subdivision is de-duplicated: ' + (dupes.length === 1 ? 'PASS' : 'FAIL') + ' (' + dupes.length + ')');
if (dupes.length !== 1) fail++;

const hasJollibee = merged.results.some((r) => /Jollibee/i.test(r.label));
console.log('[CHECK] online-only places still appear (Jollibee): ' + (hasJollibee ? 'PASS' : 'FAIL'));
if (!hasJollibee) fail++;

// ---- reverse geocode fallback --------------------------------------------
sandbox.fetch = () => Promise.reject(new Error('offline'));
const rev = await TS.reverse(14.7534, 121.1380, { token: '' });
console.log('\n=== reverse (offline) ===\n   ' + rev.label + ' | ' + rev.sub);
const okRev = /Sub Urban/i.test(rev.label);
console.log('[CHECK] offline map-tap names the nearest known place: ' + (okRev ? 'PASS' : 'FAIL'));
if (!okRev) fail++;

console.log('\n' + (fail ? 'FAILURES: ' + fail : 'All checks passed.'));
process.exit(fail ? 1 : 0);
