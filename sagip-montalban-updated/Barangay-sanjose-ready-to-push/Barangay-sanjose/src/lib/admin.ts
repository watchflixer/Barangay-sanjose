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

/** Parses ISO 8601 and Postgres space-separated timestamps consistently across browsers. */
export function parseTimestampMs(at?: string): number | null {
  if (!at) return null;
  const direct = Date.parse(at);
  if (Number.isFinite(direct)) return direct;
  const normalized = at
    .trim()
    .replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T')
    .replace(/([+-]\d{2})$/, '$1:00');
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function reportAge(reportedAt?: string, now = Date.now()): string {
  const reportedMs = parseTimestampMs(reportedAt);
  if (reportedMs === null) return 'Exact report date unavailable';
  const minutes = Math.max(0, Math.floor((now - reportedMs) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
export function reportDate(at?: string): string {
  const parsedMs = parseTimestampMs(at);
  return parsedMs !== null
    ? new Date(parsedMs).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short',
      }) + ' (PH)'
    : 'Not recorded';
}

/**
 * Computes an accurate relative age from `reportedAt` when present, falling
 * back to `timeReported` for non-timestamp labels (e.g. live PAGASA feed).
 */
export function formatReportedTime(
  alert: { reportedAt?: string; timeReported?: string },
  now = Date.now(),
): string {
  if (parseTimestampMs(alert.reportedAt) !== null) {
    return reportAge(alert.reportedAt, now);
  }
  return alert.timeReported || 'Time unavailable';
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
