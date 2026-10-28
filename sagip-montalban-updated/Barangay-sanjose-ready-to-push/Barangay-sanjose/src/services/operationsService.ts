import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { INITIAL_HAZARDS, EMERGENCY_CONTACTS } from '../data/geoData';
import { SAN_JOSE_EVACUATION_CENTERS } from '../data/evacuationCenters';
import { getSupabaseConfig } from './helpCenterService';
import { ADMIN_SESSION_KEY, ADMIN_GATE_EVENT } from '../admin/gate';
import { DEFAULT_MAP_DISPLAY, type ActivityEntry, type ManagedHazard, type ManagedPlace, type MapDisplaySettings, type OperationsData } from '../admin/types';
import type { HazardAlert } from '../types';
export { visibleHazards } from '../admin/visibility';
export { ADMIN_GATE_EVENT };

// Demo data is explicitly local to this browser. It is never used when a
// Supabase project is configured or when a remote request fails.
export const DEMO_STORAGE_KEY = 'hazardsync:operations-demo:v1';
export const OPERATIONS_CHANGED_EVENT = 'hazardsync:operations-changed';
let clientCache: { identity: string; client: SupabaseClient } | null = null;

export function isDemoMode(): boolean {
  return !getSupabaseConfig();
}

export function getOperationsClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;
  const identity = `${config.url}\n${config.key}`;
  if (clientCache?.identity !== identity) {
    clientCache = {
      identity,
      client: createClient(config.url, config.key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      }),
    };
  }
  return clientCache.client;
}

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export { makeId };

function initialDemo(): OperationsData {
  const now = new Date().toISOString();
  const hazards: ManagedHazard[] = INITIAL_HAZARDS.map((alert, index) => {
    // Spread the demo timestamps so "x minuto / oras ang nakalipas" is real.
    const createdAt = new Date(Date.now() - (index + 1) * 37 * 60_000).toISOString();
    return {
      ...alert, visibility: 'published', source: 'sample', createdAt, updatedAt: createdAt,
      showReporterName: true,
    };
  });
  // These are labelled sample records, not live or verified reports.
  hazards.unshift(
    { ...hazards[0], id: 'sample-review-1', title: 'Water collecting along Riverside Drive',
      streetName: 'Riverside Drive, Kasiglahan', description: 'Sample community submission for review.',
      reportedBy: 'Maria Santos', reporterEmail: 'maria.santos@example.com', contactNumber: '0917-000-1122',
      visibility: 'pending', source: 'community', showReporterName: false,
      timeReported: 'Sample report', createdAt: now, updatedAt: now },
    { ...hazards[5], id: 'sample-review-2', title: 'Road obstruction near Sub-Urban',
      description: 'Sample community submission for review.', visibility: 'pending', source: 'community',
      reportedBy: 'Juan Dela Cruz', reporterEmail: 'juan.dc@example.com', contactNumber: '0918-555-3344',
      showReporterName: false, timeReported: 'Sample report', createdAt: now, updatedAt: now },
  );
  // Preserve old reports without publishing unreviewed community submissions.
  try {
    const legacy = JSON.parse(localStorage.getItem('san-jose-alerts') || '[]');
    if (Array.isArray(legacy)) {
      for (const alert of legacy) {
        if (alert && typeof alert.id === 'string' && !hazards.some(item => item.id === alert.id) && alert.id !== 'auto-pagasa-flood') {
          hazards.unshift({
            ...alert, visibility: 'pending', source: 'community',
            showReporterName: false, createdAt: now, updatedAt: now,
          });
        }
      }
    }
  } catch { /* old storage is optional */ }
  return {
    hazards,
    map: { ...DEFAULT_MAP_DISPLAY, types: { ...DEFAULT_MAP_DISPLAY.types } },
    evacuationCenters: SAN_JOSE_EVACUATION_CENTERS.map(center => ({ ...center })),
    emergencyContacts: EMERGENCY_CONTACTS.map(contact => ({ ...contact, numbers: [...contact.numbers] })),
    liveStreamUrl: '',
    places: [],
    // Sample history so the History screen is never an unexplained blank.
    activity: hazards.slice(0, 8).map((hazard, index) => ({
      id: `seed-${index}`,
      at: new Date(Date.now() - (index + 1) * 47 * 60_000).toISOString(),
      actor: hazard.reportedBy,
      action: 'reported',
      title: hazard.title,
      detail: `${hazard.type.toUpperCase()} · ${hazard.streetName}`,
    })),
  };
}

export function currentAdminActor(): string {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY) || localStorage.getItem(ADMIN_SESSION_KEY);
    const email = raw ? (JSON.parse(raw) as { email?: string }).email : '';
    return email || 'Admin';
  } catch {
    return 'Admin';
  }
}

/** Records one admin action for the History screen. Never throws. */
export async function logActivity(action: string, title: string, detail?: string): Promise<void> {
  const entry: ActivityEntry = {
    id: makeId(), at: new Date().toISOString(), actor: currentAdminActor(), action, title, detail,
  };
  const client = getOperationsClient();
  try {
    if (!client) {
      const data = readDemoData();
      data.activity = [entry, ...(data.activity || [])].slice(0, 500);
      writeDemoData(data);
      return;
    }
    await client.from('admin_activity').insert({
      id: entry.id, actor: entry.actor, action: entry.action, title: entry.title, detail: entry.detail ?? null,
    });
  } catch {
    // A failed audit row must never block the actual admin action.
  }
}

export function readDemoData(): OperationsData {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as OperationsData;
      if (Array.isArray(data.hazards) && data.map && Array.isArray(data.evacuationCenters) && Array.isArray(data.emergencyContacts)) {
        return {
          ...data, map: normaliseMap(data.map),
          places: Array.isArray(data.places) ? data.places : [],
          activity: Array.isArray(data.activity) ? data.activity : [],
          liveStreamUrl: data.liveStreamUrl || '',
        };
      }
    }
  } catch { /* unavailable storage: start a fresh, clearly marked demo */ }
  return initialDemo();
}

function writeDemoData(data: OperationsData) {
  // Do not claim success on quota or privacy errors.
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(OPERATIONS_CHANGED_EVENT));
}

function normaliseMap(value: Partial<MapDisplaySettings> | undefined): MapDisplaySettings {
  return {
    ...DEFAULT_MAP_DISPLAY,
    ...value,
    types: { ...DEFAULT_MAP_DISPLAY.types, ...(value?.types || {}) },
  };
}

interface HazardRow {
  id: string;
  data: HazardAlert & { source?: ManagedHazard['source'] };
  visibility?: ManagedHazard['visibility'];
  created_at: string;
  updated_at: string;
}
function fromRow(row: HazardRow, published = false): ManagedHazard {
  const createdAt = row.created_at || new Date().toISOString();
  return {
    ...row.data,
    id: row.id,
    timeReported: row.data.timeReported || new Date(createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
    source: row.data.source || 'community',
    visibility: published ? 'published' : (row.visibility || 'pending'),
    createdAt,
    updatedAt: row.updated_at || createdAt,
  };
}

function toRow(item: ManagedHazard) {
  const { id, visibility, createdAt, updatedAt, ...data } = item;
  return { id, visibility, data, created_at: createdAt, updated_at: new Date().toISOString() };
}

function unwrap<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function contentFromRows(rows: { key: string; value: unknown }[]) {
  const byKey = Object.fromEntries(rows.map(row => [row.key, row.value]));
  return {
    map: normaliseMap(byKey.map_settings as Partial<MapDisplaySettings> | undefined),
    evacuationCenters: Array.isArray(byKey.evacuation_centers) ? byKey.evacuation_centers as OperationsData['evacuationCenters'] : [],
    emergencyContacts: Array.isArray(byKey.emergency_contacts) ? byKey.emergency_contacts as OperationsData['emergencyContacts'] : [],
    liveStreamUrl: typeof byKey.broadcast_url === 'string' ? byKey.broadcast_url : '',
  };
}

/** Admin reads include private reporter details; the database enforces admin membership. */
export async function loadAdminData(): Promise<OperationsData> {
  const client = getOperationsClient();
  if (!client) return readDemoData();
  const [hazards, content, places, activity] = await Promise.all([
    client.from('hazard_reports').select('id,data,visibility,created_at,updated_at').order('created_at', { ascending: false }),
    client.from('site_content').select('key,value'),
    client.from('help_places').select('id,category,name,latitude,longitude,address,phone,hours,note,approx,is_active').order('name'),
    client.from('admin_activity').select('id,at:created_at,actor,action,title,detail').order('created_at', { ascending: false }).limit(500),
  ]);
  return {
    hazards: (unwrap(hazards) as HazardRow[]).map(row => fromRow(row)),
    ...contentFromRows(unwrap(content) as { key: string; value: unknown }[]),
    places: (unwrap(places) || []) as ManagedPlace[],
    activity: (unwrap(activity) || []) as ActivityEntry[],
  };
}

/** The public view deliberately contains only published rows and no contact/email. */
export async function loadPublicData(): Promise<OperationsData> {
  const client = getOperationsClient();
  if (!client) {
    const demo = readDemoData();
    return { ...demo, hazards: demo.hazards.filter(hazard => hazard.visibility === 'published') };
  }
  const [hazards, content] = await Promise.all([
    client.from('published_hazards').select('id,data,created_at,updated_at').order('created_at', { ascending: false }),
    client.from('site_content').select('key,value'),
  ]);
  return {
    hazards: (unwrap(hazards) as HazardRow[]).map(row => fromRow(row, true)),
    ...contentFromRows(unwrap(content) as { key: string; value: unknown }[]),
    places: [],
    activity: [],
  };
}


export async function saveHazard(hazard: ManagedHazard): Promise<void> {
  const client = getOperationsClient();
  if (!client) {
    const data = readDemoData();
    const index = data.hazards.findIndex(item => item.id === hazard.id);
    const updated = { ...hazard, updatedAt: new Date().toISOString() };
    if (index < 0) data.hazards.unshift(updated); else data.hazards[index] = updated;
    writeDemoData(data);
    return;
  }
  unwrap(await client.from('hazard_reports').upsert(toRow(hazard)));
}

export async function deleteHazard(id: string): Promise<void> {
  const client = getOperationsClient();
  if (!client) {
    const data = readDemoData();
    data.hazards = data.hazards.filter(item => item.id !== id);
    writeDemoData(data);
    return;
  }
  unwrap(await client.from('hazard_reports').delete().eq('id', id));
}

export async function submitCommunityReport(report: Omit<HazardAlert, 'id' | 'timeReported'>): Promise<void> {
  const client = getOperationsClient();
  if (!client) {
    const now = new Date().toISOString();
    const data = readDemoData();
    data.hazards.unshift({
      ...report, id: makeId(), timeReported: 'Just now', status: 'active',
      showReporterName: false,
      visibility: 'pending', source: 'community', createdAt: now, updatedAt: now,
    });
    writeDemoData(data);
    return;
  }
  // The RPC ignores client-supplied visibility, id and status, and validates
  // input server-side. It is the only anonymous write path.
  unwrap(await client.rpc('submit_community_hazard', { payload: report }));
}

export async function saveContent<K extends 'map' | 'evacuationCenters' | 'emergencyContacts' | 'liveStreamUrl'>(key: K, value: OperationsData[K]): Promise<void> {
  const client = getOperationsClient();
  if (!client) {
    const data = readDemoData();
    data[key] = value as never;
    writeDemoData(data);
    return;
  }
  const dbKey = { map: 'map_settings', evacuationCenters: 'evacuation_centers', emergencyContacts: 'emergency_contacts', liveStreamUrl: 'broadcast_url' }[key];
  unwrap(await client.from('site_content').upsert({ key: dbKey, value }));
}

export async function savePlace(place: ManagedPlace): Promise<void> {
  const client = getOperationsClient();
  if (!client) throw new Error('Connect Supabase to manage Help Center pins.');
  unwrap(await client.from('help_places').upsert(place));
}
export async function deletePlace(id: string): Promise<void> {
  const client = getOperationsClient();
  if (!client) throw new Error('Connect Supabase to manage Help Center pins.');
  unwrap(await client.from('help_places').delete().eq('id', id));
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const client = getOperationsClient();
  if (!client) return false;
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return false;
  const result = await client.from('hazardsync_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return Boolean(result.data);
}
