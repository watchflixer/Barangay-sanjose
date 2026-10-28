import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared website visit counter backed by Supabase (project: hazardsync-map-data).
 *
 * Every page load calls the `increment_site_visit` RPC once, so the total is
 * the same for every visitor on every device. The admin dashboard subscribes
 * to Postgres changes, so new visits appear without a reload.
 *
 * The publishable/anon key below is a public browser credential by design. It
 * can only read the counter and call the increment RPC; row writes are blocked
 * by RLS. Never place a service_role key here.
 */
export const SITE_VISITS_BASELINE = 5000;
export const SITE_VISITS_TABLE = 'site_visits';
export const SITE_VISITS_RPC = 'increment_site_visit';
export const SITE_VISITS_EVENT = 'san-jose-shared-visits';
export const SITE_VISITS_OFFLINE_KEY = 'hazardsync:visits-offline';
export const SUPABASE_CONFIG_KEY = 'hazardsync:supabase-config';
export const DEFAULT_SUPABASE_URL = 'https://guxzibsrfyfiuqsgcgyt.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1eHppYnNyZnlmaXVxc2djZ3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzODgyOTcsImV4cCI6MjEwNzk2NDI5N30.RmaSRSb0uWa0anmsPFymJx7EYPIqmhY47bH9s0MD4II';

export interface VisitConfig {
  url: string;
  key: string;
  origin: 'env' | 'built-in';
}
export interface SharedVisitSnapshot {
  total: number;
  updatedAt?: string;
}
export interface VisitRow {
  total?: unknown;
  updated_at?: unknown;
}

const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** Public backend credentials shared by visits and hazard reports. */
export function readDataBackend(
  env: { url?: string; key?: string } = {
    url: import.meta.env?.VITE_SITE_VISITS_SUPABASE_URL as string | undefined,
    key: import.meta.env?.VITE_SITE_VISITS_SUPABASE_ANON_KEY as string | undefined,
  },
) {
  const url = withoutSlash(clean(env.url));
  const key = clean(env.key);
  return url && key
    ? { url, key }
    : { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_ANON_KEY };
}
const withoutSlash = (value: string) => value.replace(/\/+$/, '');

function parseRuntimeConfig(storage: Pick<Storage, 'getItem'>): { url: string; key: string } | null {
  try {
    const raw = storage.getItem(SUPABASE_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { url?: unknown; key?: unknown } | null;
    const url = withoutSlash(clean(parsed?.url));
    const key = clean(parsed?.key);
    return /^https?:\/\//.test(url) && key ? { url, key } : null;
  } catch {
    return null;
  }
}

/**
 * Resolution order: an explicit visits-only override, then this project's
 * built-in public credentials, unless the offline switch is set.
 *
 * The generic VITE_SUPABASE_* variables belong to the Help Center project, so
 * they are deliberately ignored here — pointing the counter at the wrong
 * project would break it.
 */
export function readVisitConfig(
  env: { url?: string; key?: string } = {
    url: import.meta.env?.VITE_SITE_VISITS_SUPABASE_URL as string | undefined,
    key: import.meta.env?.VITE_SITE_VISITS_SUPABASE_ANON_KEY as string | undefined,
  },
  storage?: Pick<Storage, 'getItem'> | null,
): VisitConfig | null {
  let local: Pick<Storage, 'getItem'> | null = storage ?? null;
  if (!local && typeof window !== 'undefined') {
    try {
      local = window.localStorage;
    } catch {
      local = null;
    }
  }
  try {
    if (local?.getItem(SITE_VISITS_OFFLINE_KEY) === '1') return null;
  } catch {
    /* Storage may be blocked; continue with the built-in credentials. */
  }
  const envUrl = withoutSlash(clean(env.url));
  const envKey = clean(env.key);
  if (envUrl && envKey) return { url: envUrl, key: envKey, origin: 'env' };
  return { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_ANON_KEY, origin: 'built-in' };
}

// Loading the client lazily keeps the first paint fast; the counter starts a
// moment later without blocking the map.
const clients = new Map<string, Promise<SupabaseClient>>();
export function getVisitClient(config: VisitConfig): Promise<SupabaseClient> {
  const cacheKey = `${config.url}|${config.key}`;
  const existing = clients.get(cacheKey);
  if (existing) return existing;
  const client = import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }),
  );
  clients.set(cacheKey, client);
  return client;
}

/** Reject malformed or negative totals; PostgREST may return bigint as a string. */
export function parseVisitRow(row: VisitRow | null | undefined): SharedVisitSnapshot | null {
  const total = Number(row?.total);
  if (!Number.isFinite(total) || total < 0 || !Number.isInteger(total)) return null;
  const updatedAt =
    typeof row?.updated_at === 'string' && Number.isFinite(Date.parse(row.updated_at))
      ? row.updated_at
      : undefined;
  return { total, updatedAt };
}

type ReaderClient = Pick<SupabaseClient, 'from'>;
type RpcClient = Pick<SupabaseClient, 'rpc'>;
type ChannelClient = Pick<SupabaseClient, 'channel' | 'removeChannel'>;

interface ReadResult {
  data: VisitRow | null;
  error: { message?: string } | null;
}
interface RpcResult {
  data: unknown;
  error: { message?: string } | null;
}

export async function readSharedVisits(client: ReaderClient): Promise<SharedVisitSnapshot> {
  const { data, error } = (await client
    .from(SITE_VISITS_TABLE)
    .select('total, updated_at')
    .eq('id', 1)
    .maybeSingle()) as ReadResult;
  if (error) throw new Error(error.message || 'Could not read the shared visit counter.');
  const snapshot = parseVisitRow(data);
  if (!snapshot) throw new Error('The shared visit counter returned an unexpected value.');
  return snapshot;
}

export async function addSharedVisit(client: RpcClient, loadId?: string): Promise<SharedVisitSnapshot> {
  const { data, error } = (await client.rpc(SITE_VISITS_RPC, { p_load_id: loadId ?? null })) as RpcResult;
  if (error) throw new Error(error.message || 'Could not record this visit.');
  const total = Number(data);
  if (!Number.isFinite(total) || total < 0)
    throw new Error('The visit counter returned an unexpected value.');
  return { total, updatedAt: new Date().toISOString() };
}

/** Realtime changes, so every open dashboard updates as soon as anyone visits. */
export function watchSharedVisits(
  client: ChannelClient,
  onChange: (snapshot: SharedVisitSnapshot) => void,
  onStatus?: (status: 'subscribed' | 'error') => void,
): () => void {
  const channel = client
    .channel('site-visits-live')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: SITE_VISITS_TABLE, filter: 'id=eq.1' },
      (payload: { new?: VisitRow }) => {
        const snapshot = parseVisitRow(payload?.new);
        if (snapshot) onChange(snapshot);
      },
    )
    .subscribe((status: string) => {
      if (status === 'SUBSCRIBED') onStatus?.('subscribed');
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onStatus?.('error');
    });
  return () => {
    void client.removeChannel(channel);
  };
}

/** One stable ID per document load so a retried request cannot double-count. */
let pageLoadId: string | undefined;
export function currentPageLoadId(): string {
  if (!pageLoadId) {
    pageLoadId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  return pageLoadId;
}

let countedThisPageLoad = false;
/** Count once per document load. Automation is skipped so tests never inflate real totals. */
export function shouldCountVisit(options: { automated?: boolean } = {}): boolean {
  if (countedThisPageLoad) return false;
  const automated =
    options.automated ??
    (typeof navigator !== 'undefined' &&
      (navigator as Navigator & { webdriver?: boolean }).webdriver === true);
  if (automated) return false;
  countedThisPageLoad = true;
  return true;
}
export function resetVisitCountForTests() {
  countedThisPageLoad = false;
  pageLoadId = undefined;
}
