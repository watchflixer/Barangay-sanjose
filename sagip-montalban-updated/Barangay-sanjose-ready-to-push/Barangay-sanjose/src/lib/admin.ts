import { HazardAlert, HazardStatus, HazardDraft } from '../types';

export interface ReportAction {
  id: string;
  reportId: string;
  title: string;
  action: string;
  at: string;
  actor: 'admin' | 'reporter';
}
export interface ReportStore {
  alerts: HazardAlert[];
  history: ReportAction[];
}
export const REPORT_STORE_KEY = 'san-jose-report-store-v1';
export type AdminChange =
  | { type: 'review'; value: 'accepted' | 'declined'; reason?: string }
  | { type: 'status'; value: HazardStatus }
  | { type: 'visibility'; value: boolean }
  | { type: 'delete' }
  | { type: 'restore' };

export function isAdminSearch(query: string) {
  return query.trim().toLowerCase() === 'admin';
}
export function isAdminLogin(email: string, password: string) {
  return email === 'admin' && password === 'admin';
}
export function publicReports(alerts: HazardAlert[]): HazardAlert[] {
  return alerts
    .filter((a) => !a.deletedAt && (a.reviewStatus === undefined || a.reviewStatus === 'accepted'))
    .map((a) => ({
      ...a,
      reportedBy: a.showReporter ? a.reportedBy : 'Anonymous reporter',
      reporterEmail: undefined,
      contactNumber: undefined,
    }));
}
export function readReportStore(storage: Pick<Storage, 'getItem'>, initial: HazardAlert[]): ReportStore {
  try {
    const saved = storage.getItem(REPORT_STORE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.alerts) && Array.isArray(parsed.history)) return parsed;
    }
    const legacy = JSON.parse(storage.getItem('san-jose-alerts') || 'null');
    return { alerts: Array.isArray(legacy) ? legacy : initial, history: [] };
  } catch {
    return { alerts: initial, history: [] };
  }
}
export function actionEntry(
  alert: HazardAlert,
  action: string,
  actor: ReportAction['actor'] = 'admin',
  at = new Date().toISOString(),
): ReportAction {
  return { id: crypto.randomUUID(), reportId: alert.id, title: alert.title, action, actor, at };
}
export function changeReport(
  store: ReportStore,
  id: string,
  change: AdminChange,
  at = new Date().toISOString(),
): ReportStore {
  const report = store.alerts.find((a) => a.id === id);
  if (!report || (report.deletedAt && change.type !== 'restore')) return store;
  let patch: Partial<HazardAlert>;
  let action: string;
  switch (change.type) {
    case 'review':
      if ((report.reviewStatus || 'accepted') === change.value) return store;
      patch = {
        reviewStatus: change.value,
        reviewedAt: at,
        declineReason: change.value === 'declined' ? change.reason?.trim().slice(0, 500) : undefined,
      };
      action =
        change.value === 'accepted'
          ? 'Report accepted and published'
          : `Report declined${patch.declineReason ? ': ' + patch.declineReason : ''}`;
      break;
    case 'delete':
      patch = { deletedAt: at };
      action = 'Removed from website (archived)';
      break;
    case 'restore':
      if (!report.deletedAt) return store;
      patch = { deletedAt: undefined };
      action = 'Restored to website';
      break;
    case 'status':
      if (report.status === change.value) return store;
      patch = { status: change.value };
      action = `Status: ${report.status} → ${change.value}`;
      break;
    case 'visibility':
      if (!!report.showReporter === change.value) return store;
      patch = { showReporter: change.value };
      action = change.value ? 'Reporter name made public' : 'Reporter name hidden';
      break;
  }
  return {
    alerts: store.alerts.map((a) => (a.id === id ? { ...a, ...patch, lastUpdated: at } : a)),
    history: [actionEntry(report, action, 'admin', at), ...store.history],
  };
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

/** Preserve text records/history when inline photos exceed the browser quota. */
export function saveReportStore(
  storage: Pick<Storage, 'setItem' | 'removeItem'>,
  store: ReportStore,
): string {
  let warning = '';
  try {
    storage.setItem(REPORT_STORE_KEY, JSON.stringify(store));
  } catch {
    try {
      const compact = {
        ...store,
        alerts: store.alerts.map((a) =>
          a.photoUrl?.startsWith('data:image') ? { ...a, photoUrl: undefined } : a,
        ),
      };
      storage.setItem(REPORT_STORE_KEY, JSON.stringify(compact));
      warning =
        'Report details and history were saved without uploaded photos because browser storage is full. Photos remain in this tab only.';
    } catch {
      return 'Changes could not be saved to this browser. Keep this tab open; storage may be full or blocked.';
    }
  }
  try {
    storage.removeItem('san-jose-alerts');
  } catch {
    /* New store is already saved. */
  }
  return warning;
}

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
export function createHazardReport(
  draft: HazardDraft,
  source: 'community' | 'admin',
  at = new Date().toISOString(),
): HazardAlert {
  const error = validateHazardDraft(draft);
  if (error) throw new Error(error);
  return {
    id: `hz-${crypto.randomUUID()}`,
    title: draft.title.trim(),
    type: draft.type,
    streetName: draft.streetName.trim(),
    sitio: draft.sitio.trim(),
    coordinates: [...draft.coordinates],
    description: draft.description.trim(),
    severity: draft.severity,
    status: draft.status,
    reportedBy: draft.reportedBy.trim() || (source === 'admin' ? 'Barangay administrator' : 'Citizen report'),
    reporterEmail: draft.reporterEmail?.trim(),
    contactNumber: draft.contactNumber?.trim(),
    photoUrl: draft.photoUrl,
    affectedHouseholds: draft.affectedHouseholds?.trim(),
    evacuationCenter: draft.evacuationCenter?.trim(),
    reportedAt: at,
    timeReported: 'Just now',
    lastUpdated: at,
    showReporter: false,
    source,
    reviewStatus: source === 'admin' ? 'accepted' : 'pending',
    reviewedAt: source === 'admin' ? at : undefined,
  };
}
export function appendHazardReport(store: ReportStore, report: HazardAlert): ReportStore {
  return {
    alerts: [report, ...store.alerts],
    history: [
      actionEntry(
        report,
        report.source === 'admin' ? 'Admin incident created and published' : 'Hazard report submitted',
        report.source === 'admin' ? 'admin' : 'reporter',
        report.reportedAt,
      ),
      ...store.history,
    ],
  };
}
