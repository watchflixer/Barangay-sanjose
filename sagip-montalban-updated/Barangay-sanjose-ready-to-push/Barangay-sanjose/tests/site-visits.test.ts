import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addSharedVisit,
  DEFAULT_SUPABASE_ANON_KEY,
  DEFAULT_SUPABASE_URL,
  parseVisitRow,
  readSharedVisits,
  readVisitConfig,
  resetVisitCountForTests,
  shouldCountVisit,
  SITE_VISITS_BASELINE,
  SITE_VISITS_OFFLINE_KEY,
  SUPABASE_CONFIG_KEY,
} from '../src/lib/siteVisits';

const storageFrom = (values: Record<string, string>) => ({
  getItem: (key: string) => values[key] ?? null,
});

test('config prefers an explicit visits override, then the project credentials', () => {
  const runtime = JSON.stringify({ url: 'https://runtime.supabase.co/', key: 'runtime-key' });
  assert.deepEqual(readVisitConfig({ url: 'https://env.supabase.co', key: 'env-key' }, storageFrom({})), {
    url: 'https://env.supabase.co',
    key: 'env-key',
    origin: 'env',
  });
  // Help Center runtime config must never redirect the visit counter.
  assert.deepEqual(readVisitConfig({}, storageFrom({ [SUPABASE_CONFIG_KEY]: runtime })), {
    url: DEFAULT_SUPABASE_URL,
    key: DEFAULT_SUPABASE_ANON_KEY,
    origin: 'built-in',
  });
  assert.deepEqual(readVisitConfig({}, storageFrom({})), {
    url: DEFAULT_SUPABASE_URL,
    key: DEFAULT_SUPABASE_ANON_KEY,
    origin: 'built-in',
  });
  assert.deepEqual(readVisitConfig({}, storageFrom({ [SUPABASE_CONFIG_KEY]: '{broken' })), {
    url: DEFAULT_SUPABASE_URL,
    key: DEFAULT_SUPABASE_ANON_KEY,
    origin: 'built-in',
  });
  assert.equal(
    readVisitConfig({}, storageFrom({ [SUPABASE_CONFIG_KEY]: '{"url":"nope","key":"x"}' }))?.origin,
    'built-in',
  );
});
test('the offline switch disables shared counting without throwing', () => {
  assert.equal(
    readVisitConfig(
      { url: 'https://env.supabase.co', key: 'env-key' },
      storageFrom({ [SITE_VISITS_OFFLINE_KEY]: '1' }),
    ),
    null,
  );
  const blocked = {
    getItem: () => {
      throw new Error('blocked');
    },
  };
  assert.equal(readVisitConfig({}, blocked)?.origin, 'built-in');
});
test('shared rows are parsed strictly, including PostgREST bigint strings', () => {
  assert.deepEqual(parseVisitRow({ total: 5000, updated_at: '2026-10-29T01:00:00.000Z' }), {
    total: 5000,
    updatedAt: '2026-10-29T01:00:00.000Z',
  });
  assert.deepEqual(parseVisitRow({ total: '5012' }), { total: 5012, updatedAt: undefined });
  assert.equal(parseVisitRow({ total: -1 }), null);
  assert.equal(parseVisitRow({ total: 12.5 }), null);
  assert.equal(parseVisitRow({ total: 'many' }), null);
  assert.equal(parseVisitRow(null), null);
  assert.equal(parseVisitRow({ total: 5000, updated_at: 'not-a-date' })?.updatedAt, undefined);
});
type Reader = Parameters<typeof readSharedVisits>[0];
type Rpc = Parameters<typeof addSharedVisit>[0];
const reader = (data: unknown, error: { message?: string } | null = null) =>
  ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error }) }) }) }),
  }) as unknown as Reader;
test('reading and incrementing the shared counter use the expected table and RPC', async () => {
  assert.deepEqual(await readSharedVisits(reader({ total: 5007, updated_at: '2026-10-29T01:00:00.000Z' })), {
    total: 5007,
    updatedAt: '2026-10-29T01:00:00.000Z',
  });
  await assert.rejects(readSharedVisits(reader(null, { message: 'permission denied' })), /permission denied/);
  await assert.rejects(readSharedVisits(reader({ total: 'x' })), /unexpected value/);
  let called = '';
  let args: unknown;
  const rpc = {
    rpc: async (name: string, payload?: unknown) => {
      called = name;
      args = payload;
      return { data: 5001, error: null };
    },
  } as unknown as Rpc;
  const snapshot = await addSharedVisit(rpc, 'load-123');
  assert.equal(called, 'increment_site_visit');
  assert.deepEqual(args, { p_load_id: 'load-123' });
  assert.equal(snapshot.total, 5001);
  assert.ok(Number.isFinite(Date.parse(snapshot.updatedAt || '')));
  await assert.rejects(
    addSharedVisit({ rpc: async () => ({ data: null, error: { message: 'denied' } }) } as unknown as Rpc),
    /denied/,
  );
  await assert.rejects(
    addSharedVisit({ rpc: async () => ({ data: 'NaN', error: null }) } as unknown as Rpc),
    /unexpected/,
  );
});
test('a page load counts at most once and automated browsers never inflate totals', () => {
  resetVisitCountForTests();
  assert.equal(shouldCountVisit({ automated: false }), true);
  assert.equal(shouldCountVisit({ automated: false }), false);
  resetVisitCountForTests();
  assert.equal(shouldCountVisit({ automated: true }), false);
  assert.equal(shouldCountVisit({ automated: false }), true);
  resetVisitCountForTests();
});
test('the seeded baseline is 5,000', () => {
  assert.equal(SITE_VISITS_BASELINE, 5000);
});
