import { CATEGORY_BY_ID, type Place, type PlaceCategoryId, type OverpassElement } from '../data/helpCenterPlaces';

export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

/** POST avoids URL length limits when many categories are selected. Each
 * mirror gets a bounded attempt; cancellation stops retries and stale updates. */
export async function fetchOverpassElements(query: string, signal: AbortSignal): Promise<OverpassElement[]> {
  let lastError: unknown = new Error('Overpass unavailable');
  for (const endpoint of OVERPASS_ENDPOINTS) {
    signal.throwIfAborted();
    const attempt = new AbortController();
    const abort = () => attempt.abort();
    signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 10000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: new URLSearchParams({ data: query }),
        signal: attempt.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      // Overpass can return HTTP 200 with a timeout remark and partial results.
      // Do not cache that as a successful empty result.
      if (!Array.isArray(payload?.elements) || payload.remark) throw new Error('Incomplete Overpass response');
      signal.throwIfAborted();
      return payload.elements.filter((element: OverpassElement) => element &&
        ['node', 'way', 'relation'].includes(element.type) && Number.isFinite(element.id) &&
        (!element.tags || Object.values(element.tags).every(value => typeof value === 'string')));
    } catch (error) {
      signal.throwIfAborted();
      lastError = error;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
    }
  }
  throw lastError;
}

// Public browser credentials only. Never use a service_role key here.
//
// Resolution order: build-time env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY,
// which is how the Pages deploy ships them) and then a runtime override that
// the Help Center can save in localStorage. The anon key is a public client
// key by design, so storing it in the browser is safe; writes stay in the
// Supabase dashboard.
export interface SupabaseConfig {
  url: string;
  key: string;
}

export const SUPABASE_RUNTIME_KEY = 'hazardsync:supabase-config';

const ENV_URL = (import.meta.env?.VITE_SUPABASE_URL as string | undefined)?.trim()
  .replace(/\/+$/, '');
const ENV_KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

const normalise = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

function readRuntimeConfig(): SupabaseConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SUPABASE_RUNTIME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SupabaseConfig> | null;
    const url = normalise(parsed?.url).replace(/\/+$/, '');
    const key = normalise(parsed?.key);
    if (!/^https?:\/\//.test(url) || !key) return null;
    return { url, key };
  } catch {
    return null;
  }
}

let runtimeConfig: SupabaseConfig | null = readRuntimeConfig();

/** The credentials in use right now, or null when Supabase is not set up. */
export function getSupabaseConfig(): SupabaseConfig | null {
  if (ENV_URL && ENV_KEY) return { url: ENV_URL, key: ENV_KEY };
  return runtimeConfig;
}

export function isSupabaseEnabled(): boolean {
  return getSupabaseConfig() !== null;
}

/** Saves a runtime override (browser only) and forgets the cached layout. */
export function setSupabaseConfig(config: SupabaseConfig): SupabaseConfig | null {
  const url = normalise(config.url).replace(/\/+$/, '');
  const key = normalise(config.key);
  if (!/^https?:\/\//.test(url) || !key) return null;
  runtimeConfig = { url, key };
  detectedSchema = null;
  try {
    window.localStorage.setItem(SUPABASE_RUNTIME_KEY, JSON.stringify(runtimeConfig));
  } catch {
    /* private mode: the override still lives for this page */
  }
  return runtimeConfig;
}

export function clearSupabaseConfig() {
  runtimeConfig = null;
  detectedSchema = null;
  try {
    window.localStorage.removeItem(SUPABASE_RUNTIME_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** True when the credentials come from the build (env), not the browser. */
export function supabaseConfigFromEnv(): boolean {
  return Boolean(ENV_URL && ENV_KEY);
}

export interface HelpPlaceRow {
  id: string;
  name: string;
  latitude: number | string;
  longitude: number | string;
  address?: string | null;
  hours?: string | null;
  phone?: string | null;
  note?: string | null;
  approx?: boolean | null;
  replaces_id?: string | null;
}

/**
 * Two supported Supabase layouts — the map reads whichever the project has:
 *
 *   'single'     one table, `help_places`, with a `category` column holding
 *                the filter id (police, pharmacy, school, …). Simplest to
 *                maintain, and what "my data in Supabase" usually means.
 *   'per-filter' one table per filter, `<group>_<category>`
 *                (emergency_police, community_school, …), created by
 *                supabase/help_places.sql.
 *
 * Detection runs once per session: if `help_places` answers, it wins.
 */
export type HelpPlacesSchema = 'single' | 'per-filter';
export const HELP_PLACES_TABLE = 'help_places';

let detectedSchema: HelpPlacesSchema | null = null;

/** Forgets the detected layout (retry, or a test resetting state). */
export function resetHelpPlacesSchema() {
  detectedSchema = null;
}

export function supabaseTableFor(category: PlaceCategoryId): string {
  const group = CATEGORY_BY_ID[category]?.group;
  if (!group) throw new Error(`Unknown Help Center filter "${category}"`);
  return `${group}_${category}`;
}

/** Table the rows for this filter live in, for the detected layout. */
export function supabaseTableForSchema(category: PlaceCategoryId, schema: HelpPlacesSchema): string {
  return schema === 'single' ? HELP_PLACES_TABLE : supabaseTableFor(category);
}

/** Query string for one page of rows in either layout. */
export function supabaseQueryFor(
  category: PlaceCategoryId,
  schema: HelpPlacesSchema,
  offset = 0,
): string {
  const params = new URLSearchParams({
    select: 'id,name,latitude,longitude,address,hours,phone,note,approx,replaces_id',
    is_active: 'eq.true',
    order: 'id.asc',
    limit: '1000',
    offset: String(offset),
  });
  if (schema === 'single') params.set('category', `eq.${category}`);
  return params.toString();
}

export function supabaseRowsToPlaces(category: PlaceCategoryId, rows: HelpPlaceRow[]): Place[] {
  if (!CATEGORY_BY_ID[category]) return [];
  const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  return rows.flatMap((row): Place[] => {
    if (!row || !text(row.id) || !text(row.name) || row.latitude == null || row.longitude == null ||
        String(row.latitude).trim() === '' || String(row.longitude).trim() === '') return [];
    const lat = Number(row.latitude), lng = Number(row.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 4 || lat > 22 || lng < 116 || lng > 128) return [];
    return [{
      id: `sb-${category}-${row.id}`, category, name: text(row.name), coords: [lat, lng],
      address: text(row.address) || 'Brgy. San Jose, Rodriguez, Rizal',
      hours: text(row.hours) || undefined, phone: text(row.phone) || undefined,
      note: text(row.note) || undefined, approx: row.approx === true,
      replaces: text(row.replaces_id) || undefined, source: 'supabase',
    }];
  });
}

function supabaseHeaders(): HeadersInit {
  const key = getSupabaseConfig()?.key ?? '';
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
  };
}

/**
 * Which layout the project uses. A single `help_places` table wins; a 404
 * (table missing) means the per-filter tables from help_places.sql are used.
 * Other HTTP errors bubble up so the caller can show its retry state.
 */
export async function detectHelpPlacesSchema(signal: AbortSignal): Promise<HelpPlacesSchema> {
  const config = getSupabaseConfig();
  if (!config) return 'per-filter';
  if (detectedSchema) return detectedSchema;
  // Select the category column on purpose: a table that merely shares the
  // name (but has no `category`) must not be mistaken for the single-table
  // layout — Supabase answers 400 for an unknown column.
  const response = await fetch(`${config.url}/rest/v1/${HELP_PLACES_TABLE}?select=id,category&limit=1`, {
    signal,
    headers: supabaseHeaders(),
  });
  if (response.ok) {
    detectedSchema = 'single';
  } else if (response.status === 404 || response.status === 400) {
    detectedSchema = 'per-filter';
  } else {
    throw new Error(`Supabase ${HELP_PLACES_TABLE}: HTTP ${response.status}`);
  }
  return detectedSchema;
}

export interface CategoryFetchResult {
  category: PlaceCategoryId;
  /** Table that was queried, e.g. `community_school` or `help_places`. */
  table: string;
  places: Place[];
  status: 'ok' | 'empty' | 'missing' | 'error' | 'disabled';
  /** Short human-readable outcome, shown in the sheet's diagnostics. */
  detail: string;
}

/**
 * Same read as fetchSupabasePlaces, but reports what happened — which table was
 * queried and whether it was missing, empty, or answered. That is what the
 * Help Center shows under "Why no pins?", so an empty Supabase filter is never
 * a silent blank map.
 */
export async function fetchSupabaseCategory(
  category: PlaceCategoryId,
  signal: AbortSignal,
  schema: HelpPlacesSchema = detectedSchema ?? 'per-filter',
): Promise<CategoryFetchResult> {
  const table = supabaseTableForSchema(category, schema);
  const config = getSupabaseConfig();
  if (!config) return { category, table, places: [], status: 'disabled', detail: 'no Supabase credentials' };
  const places: Place[] = [];
  try {
    for (let offset = 0; ; offset += 1000) {
      signal.throwIfAborted();
      const response = await fetch(`${config.url}/rest/v1/${table}?${supabaseQueryFor(category, schema, offset)}`, {
        signal,
        headers: supabaseHeaders(),
      });
      if (!response.ok) {
        return {
          category,
          table,
          places: [],
          status: response.status === 404 ? 'missing' : 'error',
          detail: response.status === 404 ? 'table not found' : `HTTP ${response.status}`,
        };
      }
      const rows = await response.json();
      if (!Array.isArray(rows)) return { category, table, places: [], status: 'error', detail: 'unexpected response' };
      places.push(...supabaseRowsToPlaces(category, rows));
      if (rows.length < 1000) break;
    }
  } catch (error) {
    if (signal.aborted) throw error;
    return { category, table, places: [], status: 'error', detail: 'network error' };
  }
  return {
    category,
    table,
    places,
    status: places.length > 0 ? 'ok' : 'empty',
    detail: places.length === 0 ? 'table is empty' : `${places.length} row${places.length === 1 ? '' : 's'}`,
  };
}

export async function fetchSupabasePlaces(
  category: PlaceCategoryId,
  signal: AbortSignal,
  schema: HelpPlacesSchema = detectedSchema ?? 'per-filter',
): Promise<Place[]> {
  const config = getSupabaseConfig();
  if (!config) return [];
  const table = supabaseTableForSchema(category, schema);
  const places: Place[] = [];
  for (let offset = 0; ; offset += 1000) {
    signal.throwIfAborted();
    const response = await fetch(`${config.url}/rest/v1/${table}?${supabaseQueryFor(category, schema, offset)}`, {
      signal,
      headers: supabaseHeaders(),
    });
    if (!response.ok) throw new Error(`Supabase ${table}: HTTP ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Unexpected Supabase response');
    places.push(...supabaseRowsToPlaces(category, rows));
    if (rows.length < 1000) return places;
  }
}
