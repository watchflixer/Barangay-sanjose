import { HazardDraft, HazardStatus } from '../types';

/** One audit-trail entry; mirrors a row of the shared `report_events` table. */
export interface ReportAction {
  id: string;
  reportId: string;
  title: string;
  action: string;
  at: string;
  actor: 'admin' | 'reporter' | 'public';
}

export type AdminChange =
  | { type: 'review'; value: 'accepted' | 'declined'; reason?: string }
  | { type: 'status'; value: HazardStatus }
  | { type: 'visibility'; value: boolean }
  | { type: 'delete' }
  | { type: 'restore' };

/** Typing "Admin" in the incident-feed search reveals the hidden admin entry point. */
export function isAdminSearch(query: string) {
  return query.trim().toLowerCase() === 'admin';
}

export function reportAge(reportedAt?: string, now = Date.now()): string {
  if (!reportedAt || !Number.isFinite(Date.parse(reportedAt))) return 'Exact report date unavailable';
  const minutes = Math.max(0, Math.floor((now - Date.parse(reportedAt)) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
export function reportDate(at?: string): string {
  return at && Number.isFinite(Date.parse(at))
    ? new Date(at).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short',
      }) + ' (PH)'
    : 'Not recorded';
}

/** Shared by the admin form; the database re-validates every field. */
export function validateHazardDraft(draft: HazardDraft): string {
  if (!draft.title.trim() || !draft.streetName.trim() || !draft.sitio.trim() || !draft.description.trim())
    return 'Complete the incident title, street, sitio and description.';
  const [lat, lng] = draft.coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180)
    return 'Enter valid latitude and longitude coordinates.';
  if (
    !['fire', 'flood', 'power', 'streetlight', 'water', 'road'].includes(draft.type) ||
    !['critical', 'high', 'moderate', 'low'].includes(draft.severity) ||
    !['active', 'monitoring', 'resolved'].includes(draft.status)
  )
    return 'Choose a valid incident type, severity and status.';
  return '';
}
