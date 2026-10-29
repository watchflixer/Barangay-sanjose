import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildOverpassQuery, osmElementsToPlaces, mergePlaces, distanceKm } from '../src/data/helpCenterPlaces';
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

test('live OSM school results stay out; pins come only from Supabase', async () => {
  // There is no curated/bundled pin list any more: every Help Center pin is a
  // Supabase row the barangay owns. OSM school spam must never sneak in.
  assert.equal('HELP_CENTER_PLACES' in (await import('../src/data/helpCenterPlaces')), false);
  assert.deepEqual(osmElementsToPlaces([{ ...element, tags: { amenity: 'school', name: 'Named school' } }], ['school']), []);
  assert.equal(osmElementsToPlaces([element], ['pharmacy']).length, 1);
});

test('an empty Supabase filter reports which table it read', async () => {
  const svc = await import('../src/services/helpCenterService');
  const signal = new AbortController().signal;
  // With no env and no saved override the built-in directory project is used,
  // so the Help Center never lands in a "not connected" dead end.
  assert.equal(svc.getSupabaseConfig()?.url, svc.DEFAULT_HELP_SUPABASE_URL);
  assert.ok(svc.getSupabaseConfig()?.key);
  // A missing table is reported as missing, not as a silent empty map.
  globalThis.fetch = async () => new Response('', { status: 404 });
  assert.equal(svc.setSupabaseConfig({ url: 'https://demo.supabase.co', key: 'anon-key' }) !== null, true);
  const missing = await svc.fetchSupabaseCategory('school', signal, 'per-filter');
  assert.equal(missing.status, 'missing');
  assert.equal(missing.detail, 'table not found');
  // An existing but empty table is reported as empty.
  globalThis.fetch = async () => Response.json([]);
  const empty = await svc.fetchSupabaseCategory('school', signal, 'single');
  assert.equal(empty.table, 'help_places');
  assert.equal(empty.status, 'empty');
  assert.equal(empty.detail, 'table is empty');
  svc.clearSupabaseConfig();
});

test('Supabase credentials fall back to the built-in directory, and a valid override wins', async () => {
  const svc = await import('../src/services/helpCenterService');
  // Nothing in env, nothing stored in Node: the built-in barangay directory
  // project is the default, so the Help Center is connected out of the box.
  assert.equal(svc.isSupabaseEnabled(), true);
  assert.equal(svc.getSupabaseConfig()?.url, svc.DEFAULT_HELP_SUPABASE_URL);
  assert.ok(svc.getSupabaseConfig()?.key);
  // Bad input is rejected instead of being stored, and the default survives.
  assert.equal(svc.setSupabaseConfig({ url: 'not-a-url', key: 'x' }), null);
  assert.equal(svc.setSupabaseConfig({ url: 'https://demo.supabase.co', key: '' }), null);
  assert.equal(svc.getSupabaseConfig()?.url, svc.DEFAULT_HELP_SUPABASE_URL);
  // A valid runtime override takes precedence; clearing it restores the default.
  assert.deepEqual(svc.setSupabaseConfig({ url: 'https://demo.supabase.co', key: 'anon-key' }), {
    url: 'https://demo.supabase.co',
    key: 'anon-key',
  });
  assert.equal(svc.getSupabaseConfig()?.url, 'https://demo.supabase.co');
  svc.clearSupabaseConfig();
  assert.equal(svc.getSupabaseConfig()?.url, svc.DEFAULT_HELP_SUPABASE_URL);
});

test('both Supabase layouts resolve to the right table and query', async () => {
  const { HELP_PLACES_TABLE, supabaseQueryFor, supabaseTableForSchema } = await import('../src/services/helpCenterService');
  // Per-filter layout: one table per filter, no category filter needed.
  assert.equal(supabaseTableForSchema('school', 'per-filter'), 'community_school');
  const perFilter = new URLSearchParams(supabaseQueryFor('school', 'per-filter', 0));
  assert.equal(perFilter.get('category'), null);
  assert.equal(perFilter.get('is_active'), 'eq.true');
  assert.equal(perFilter.get('select'), 'id,name,latitude,longitude,address,hours,phone,note,approx,replaces_id');
  // Single-table layout: one table, rows narrowed by the category column.
  assert.equal(HELP_PLACES_TABLE, 'help_places');
  assert.equal(supabaseTableForSchema('school', 'single'), 'help_places');
  const single = new URLSearchParams(supabaseQueryFor('school', 'single', 1000));
  assert.equal(single.get('category'), 'eq.school');
  assert.equal(single.get('offset'), '1000');
  assert.equal(single.get('limit'), '1000');
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
