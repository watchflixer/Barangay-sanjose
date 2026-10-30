import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  HazardAlert,
  HazardDraft,
  HazardSeverity,
  HazardStatus,
  HazardType,
  ReviewStatus,
} from '../types';
import type { AdminChange, ReportAction } from './admin';
import { getVisitClient, readDataBackend } from './siteVisits';
import { PROXY_CREDENTIAL, getAdminAccessToken, proxyRpc } from './adminProxy';

/**
 * Sentinel credential for a Supabase Auth session.
 *
 * Unlike the legacy credential this is not a secret and is never sent as
 * `p_password`: the request carries the access token instead and the database
 * authorises it with `is_admin()` (allow-list + `aal2`).
 */
export const JWT_CREDENTIAL = '__supabase_jwt__';

export const HAZARD_TYPES: HazardType[] = ['fire', 'flood', 'power', 'streetlight', 'water', 'road'];
export const TYPE_LABELS: Record<HazardType, string> = {
  fire: 'Fire',
  flood: 'Flood',
  power: 'No power',
  streetlight: 'Streetlights',
  water: 'Water interruption',
  road: 'Road obstruction',
};
export const RATE_MESSAGE = 'Too many reports from this connection. Please try again later.';

export interface PublicFeed {
  reports: HazardAlert[];
  hiddenTypes: HazardType[];
}
export interface ResolveFlag {
  id: string;
  reportId: string;
  title: string;
  note?: string;
  status: 'pending' | 'accepted' | 'ignored';
  createdAt: string;
  reviewedAt?: string;
}
export interface AdminBundle {
  reports: HazardAlert[];
  history: ReportAction[];
  flags: ResolveFlag[];
  hiddenTypes: HazardType[];
}
interface RpcError {
  message?: string;
  details?: string;
  code?: string;
}

type Row = Record<string, unknown>;
const text = (value: unknown) => (typeof value === 'string' ? value : undefined);
const flag = (value: unknown) => value === true;

/** Reads the public backend credentials; tests can point this at a fake. */
export function readReportBackend() {
  return readDataBackend();
}
export function reportClient(): Promise<SupabaseClient> {
  const config = readReportBackend();
  return getVisitClient({
    ...config,
    origin: 'built-in',
    accessToken: getAdminAccessToken() ?? undefined,
  });
}

function coordinates(row: Row): [number, number] {
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  return [Number.isFinite(lat) ? lat : 14.7425, Number.isFinite(lng) ? lng : 121.131];
}

/** Maps a database row to the app's HazardAlert shape. `admin` rows keep contacts. */
export function reportFromRow(row: Row, admin = false): HazardAlert {
  const id = String(row.id ?? '');
  const review = text(row.review_status) as ReviewStatus | undefined;
  return {
    id,
    type: (text(row.type) ?? 'flood') as HazardType,
    title: text(row.title) ?? 'Untitled incident',
    streetName: text(row.street_name) ?? '',
    sitio: text(row.sitio) ?? '',
    coordinates: coordinates(row),
    timeReported: text(row.time_reported) ?? 'Time unavailable',
    reportedAt: text(row.reported_at),
    showReporter: flag(row.show_reporter),
    deletedAt: text(row.deleted_at),
    status: (text(row.status) ?? 'active') as HazardStatus,
    severity: (text(row.severity) ?? 'high') as HazardSeverity,
    description: text(row.description) ?? '',
    reportedBy: text(row.reported_by) ?? 'Anonymous reporter',
    photoUrl: text(row.photo_url),
    affectedHouseholds: text(row.affected_households),
    evacuationCenter: text(row.evacuation_center),
    contactNumber: admin ? text(row.contact_number) : undefined,
    reporterEmail: admin ? text(row.reporter_email) : undefined,
    updatesCount: Number(row.updates_count) || 1,
    lastUpdated: text(row.last_updated),
    reviewStatus: review,
    declineReason: text(row.decline_reason),
    reviewedAt: text(row.reviewed_at),
    source: text(row.source) === 'admin' ? 'admin' : 'community',
    pendingResolveFlags: Number(row.pending_resolve_flags) || 0,
  };
}

export function draftToPayload(draft: HazardDraft) {
  return {
    type: draft.type,
    title: draft.title.trim(),
    street_name: draft.streetName.trim(),
    sitio: draft.sitio.trim(),
    lat: draft.coordinates[0],
    lng: draft.coordinates[1],
    status: draft.status,
    severity: draft.severity,
    description: draft.description.trim(),
    reported_by: draft.reportedBy.trim(),
    contact_number: draft.contactNumber?.trim() ?? '',
    reporter_email: draft.reporterEmail?.trim().toLowerCase() ?? '',
    photo_url: draft.photoUrl ?? '',
    affected_households: draft.affectedHouseholds ?? '',
    evacuation_center: draft.evacuationCenter ?? '',
  };
}

export function isGoogleAccount(value: string): boolean {
  return /^[^\s@]+@(gmail|googlemail)\.com$/i.test(value.trim());
}
export function isPhMobile(value: string): boolean {
  return /^(\+63|0)9\d{9}$/.test(value.replace(/[\s()-]/g, ''));
}

/** Client-side preflight so people get instant feedback; the database re-checks all of it. */
export function reportDraftError(draft: HazardDraft, requirePhoto: boolean): string {
  if (draft.title.trim().length < 3) return 'Enter a short incident title.';
  // Free text: any street, landmark or exact spot is valid. Only the database
  // limits apply (2–200 characters).
  if (draft.streetName.trim().length < 2) return 'Enter the street or landmark.';
  if (draft.streetName.trim().length > 200) return 'Keep the street or landmark under 200 characters.';
  if (!draft.sitio.trim()) return 'Enter the sitio or area.';
  if (draft.description.trim().length < 5) return 'Describe what is happening.';
  if (!Number.isFinite(draft.coordinates[0]) || !Number.isFinite(draft.coordinates[1]))
    return 'Place the incident pin on the map.';
  if (requirePhoto && !draft.photoUrl?.trim()) return 'A photo of the hazard is required.';
  if (draft.reportedBy.trim().length < 2) return 'Enter your full name.';
  if (!isPhMobile(draft.contactNumber ?? ''))
    return 'Enter a valid Philippine cellphone number (e.g. 09171234567).';
  if (!isGoogleAccount(draft.reporterEmail ?? '')) return 'Use your Google account (Gmail) address.';
  return '';
}

function raise(error: RpcError | null): never {
  throw new Error(error?.message || error?.details || 'The server could not complete this request.');
}

/**
 * Every admin RPC goes through here.
 *
 * `__pages_proxy__` means the Cloudflare Function holds the credential and the
 * browser only holds an HttpOnly session cookie, so `p_password` is injected
 * server-side. Any other value is used directly (local dev / direct mode).
 */
async function adminRpc<T>(
  client: SupabaseClient,
  auth: string,
  rpc: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  if (auth === PROXY_CREDENTIAL) return proxyRpc<T>(rpc, args);
  if (auth === JWT_CREDENTIAL) {
    // No password at all: the client carries the admin's access token.
    const { data, error } = await client.rpc(rpc, args);
    if (error) raise(error);
    return data as T;
  }
  const { data, error } = await client.rpc(rpc, { p_password: auth, ...args });
  if (error) raise(error);
  return data as T;
}

export async function fetchPublicFeed(client: SupabaseClient): Promise<PublicFeed> {
  const { data, error } = await client.rpc('public_feed');
  if (error) raise(error);
  const payload = (data ?? {}) as { reports?: Row[]; hidden_types?: string[] };
  return {
    reports: (payload.reports ?? []).map((row) => reportFromRow(row)),
    hiddenTypes: (payload.hidden_types ?? []).filter((type): type is HazardType =>
      HAZARD_TYPES.includes(type as HazardType),
    ),
  };
}

export async function submitReportRemote(
  client: SupabaseClient,
  draft: HazardDraft,
  loadId: string,
): Promise<string> {
  const { data, error } = await client.rpc('submit_report', {
    payload: draftToPayload(draft),
    p_load_id: loadId,
  });
  if (error) raise(error);
  if (typeof data !== 'string') throw new Error('The report could not be saved.');
  return data;
}

export async function submitResolveFlag(
  client: SupabaseClient,
  reportId: string,
  note: string,
): Promise<void> {
  const { error } = await client.rpc('flag_resolved', {
    p_report_id: reportId,
    p_note: note.trim() || null,
  });
  if (error) raise(error);
}

/**
 * The admin credential is `email:password`, not the password alone.
 *
 * The database stores only the SHA-256 hash of that pair, so BOTH fields must
 * match before `admin_login` — and every later admin RPC — accepts the caller.
 * Typing the right password with the wrong email fails, and the reverse too.
 */
export function buildAdminCredential(email: string, password: string): string {
  return `${email.trim().toLowerCase()}:${password}`;
}

export async function loginAdmin(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<boolean> {
  if (!email.trim() || !password) return false;
  const { data, error } = await client.rpc('admin_login', {
    p_password: buildAdminCredential(email, password),
  });
  if (error) throw new Error(error.message || 'Sign in failed.');
  return data === true;
}

export async function fetchAdminBundle(client: SupabaseClient, password: string): Promise<AdminBundle> {
  const data = await adminRpc<Row>(client, password, 'admin_bundle');
  const payload = (data ?? {}) as {
    reports?: Row[];
    history?: ReportAction[];
    flags?: ResolveFlag[];
    hidden_types?: string[];
  };
  return {
    reports: (payload.reports ?? []).map((row) => reportFromRow(row, true)),
    history: payload.history ?? [],
    flags: payload.flags ?? [],
    hiddenTypes: (payload.hidden_types ?? []).filter((type): type is HazardType =>
      HAZARD_TYPES.includes(type as HazardType),
    ),
  };
}

export async function changeReportRemote(
  client: SupabaseClient,
  password: string,
  id: string,
  change: AdminChange,
): Promise<void> {
  const payload =
    change.type === 'review'
      ? { type: 'review', value: change.value, reason: (change.reason ?? '').trim() }
      : change.type === 'status' || change.type === 'visibility'
        ? { type: change.type, value: change.value }
        : { type: change.type };
  await adminRpc(client, password, 'admin_change', { p_id: id, p_change: payload });
}

export async function createReportRemote(
  client: SupabaseClient,
  password: string,
  draft: HazardDraft,
): Promise<HazardAlert> {
  const data = await adminRpc<{ id?: string } | null>(client, password, 'admin_create', {
    payload: draftToPayload(draft),
  });
  const id = (data as { id?: string } | null)?.id;
  if (!id) throw new Error('The incident could not be published.');
  return reportFromRow(
    { ...draftToPayload(draft), id, review_status: 'accepted', source: 'admin', show_reporter: false },
    true,
  );
}

export async function setHiddenTypesRemote(
  client: SupabaseClient,
  password: string,
  types: HazardType[],
): Promise<HazardType[]> {
  const data = await adminRpc<HazardType[]>(client, password, 'admin_set_hidden_types', {
    p_types: types,
  });
  return Array.isArray(data) ? data : types;
}

export async function reviewFlagRemote(
  client: SupabaseClient,
  password: string,
  flagId: string,
  decision: 'accepted' | 'ignored',
): Promise<void> {
  await adminRpc(client, password, 'admin_review_flag', {
    p_flag_id: flagId,
    p_decision: decision,
  });
}
