import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildOverpassQuery, osmElementsToPlaces, mergePlaces, distanceKm, HELP_CENTER_PLACES } from '../src/data/helpCenterPlaces';
import { fetchOverpassElements, OVERPASS_ENDPOINTS } from '../src/services/helpCenterService';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const element = { type: 'node' as const, id: 99, lat: 14.745, lon: 121.135,
  tags: { amenity: 'pharmacy', name: 'Test pharmacy' } };

test('Overpass POST query and mirror failover reject malformed and partial responses', async () => {
  const calls: string[] = [];
  globalThis.fetch = async (url, options) => {
    calls.push(String(url));
    assert.equal(options?.method, 'POST');
    assert.ok(String(options?.body).includes('data='));
    if (calls.length === 1) return new Response('', { status: 503 });
    if (calls.length === 2) return Response.json({ elements: [], remark: 'Query timed out' });
    return Response.json({ elements: [element] });
  };
  const result = await fetchOverpassElements(buildOverpassQuery(['pharmacy'])!, new AbortController().signal);
  assert.equal(result[0].id, 99);
  assert.deepEqual(calls, OVERPASS_ENDPOINTS);
});

test('network failure is not cached as empty success and cancellation stops mirrors', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ remark: 'failure' }); };
  await assert.rejects(fetchOverpassElements('query', new AbortController().signal));
  assert.equal(calls, 3);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(fetchOverpassElements('query', controller.signal));
  assert.equal(calls, 3);
});

test('filters and coordinate validation protect map markers', () => {
  assert.equal(buildOverpassQuery([]), null);
  const places = osmElementsToPlaces([element, { ...element, id: 1, lat: NaN },
    { ...element, id: 2, lon: 200 }], ['pharmacy']);
  assert.equal(places.length, 1);
  assert.equal(osmElementsToPlaces([element], ['atm']).length, 0);
  assert.ok(buildOverpassQuery(['pharmacy'])!.includes('out body center 400'));
});

test('same-name branches at different locations remain visible; nearby duplicates collapse', () => {
  const first = osmElementsToPlaces([element], ['pharmacy'])[0];
  const second = { ...first, id: 'branch-2', coords: [14.765, 121.155] as [number, number] };
  assert.ok(distanceKm(first.coords, second.coords) > 1);
  assert.equal(mergePlaces([], [first, second]).length, 2);
  assert.equal(mergePlaces([], [first, { ...first, id: 'way-duplicate' }]).length, 1);
  const otherCategory = { ...first, id: 'clinic', category: 'clinic' as const };
  assert.equal(mergePlaces([], [first, otherCategory]).length, 2);
});

test('community fallback has valid pins even with no external connection', () => {
  assert.ok(HELP_CENTER_PLACES.length > 0);
  assert.ok(HELP_CENTER_PLACES.every(place => place.source === 'curated' && place.coords.every(Number.isFinite)));
});

test('basemap tiles follow the OSM usage policy and keep a backup', async () => {
  const { TILE_SERVERS, tileLayerOptions, OSM_REFERRER_POLICY } = await import('../src/data/tileServers');
  // Canonical host only: the a/b/c subdomains may be withdrawn.
  assert.equal(TILE_SERVERS.streets.url, 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
  assert.ok(!TILE_SERVERS.streets.url.includes('{s}'));
  // OSM rejects tile requests without a Referer ("403r Access blocked").
  assert.equal(tileLayerOptions(TILE_SERVERS.streets).referrerPolicy, OSM_REFERRER_POLICY);
  assert.equal(OSM_REFERRER_POLICY, 'strict-origin-when-cross-origin');
  // A blocked OSM still leaves a working street map (keyless Esri backup).
  const fallback = TILE_SERVERS.streets.fallback;
  assert.ok(fallback);
  assert.ok(fallback!.url.includes('arcgisonline.com'));
  assert.equal(fallback!.referrerPolicy, undefined);
});

test('School filter always has curated pins; OSM school spam stays out', () => {
  const schools = HELP_CENTER_PLACES.filter(place => place.category === 'school');
  // The School filter must never open an empty map, even with no Supabase
  // credentials and no network — the curated list is the offline fallback.
  assert.ok(schools.length >= 20, `expected the curated school list, got ${schools.length}`);
  assert.ok(schools.every(place => place.source === 'curated' && place.coords.every(Number.isFinite)));
  assert.ok(schools.some(place => place.id === 'sc-kasiglahan-nhs'));
  // Live OSM school results are still skipped (they duplicate the curated pins).
  assert.deepEqual(osmElementsToPlaces([{ ...element, tags: { amenity: 'school', name: 'Named school' } }], ['school']), []);
  assert.equal(osmElementsToPlaces([element], ['pharmacy']).length, 1);
});

test('Supabase tables match all filters and rows validate before becoming pins', async () => {
  const { supabaseRowsToPlaces, supabaseTableFor } = await import('../src/services/helpCenterService');
  const { HELP_CENTER_CATEGORIES } = await import('../src/data/helpCenterPlaces');
  for (const cat of HELP_CENTER_CATEGORIES) assert.equal(supabaseTableFor(cat.id), `${cat.group}_${cat.id}`);
  assert.equal(supabaseTableFor('school'), 'community_school');
  const places = supabaseRowsToPlaces('school', [
    { id: 'a', name: ' Test School ', latitude: '14.7435', longitude: 121.1445, replaces_id: 'sc-kasiglahan-elem' },
    { id: 'b', name: 'Invalid', latitude: '', longitude: 121 },
    { id: 'c', name: 'Swapped', latitude: 121, longitude: 14 },
    { id: 'd', name: '', latitude: 14, longitude: 121 },
  ]);
  assert.equal(places.length, 1);
  assert.equal(places[0].name, 'Test School');
  assert.equal(places[0].source, 'supabase');
  assert.equal(places[0].replaces, 'sc-kasiglahan-elem');
  assert.deepEqual(places[0].coords, [14.7435, 121.1445]);
  assert.deepEqual(supabaseRowsToPlaces('nope' as never, []), []);
});
