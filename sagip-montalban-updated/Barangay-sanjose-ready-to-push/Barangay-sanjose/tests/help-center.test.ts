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
