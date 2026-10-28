import type { HazardAlert, HazardStatus } from '../types';

export type ReportScope = 'current' | 'archived' | 'pending' | 'declined';
export type StatusFilter = HazardStatus | 'all';
export type ReportSort = 'newest' | 'oldest' | 'severity';

export function reportCounts(alerts: HazardAlert[]) {
  const current = alerts.filter(
    (alert) => !alert.deletedAt && (!alert.reviewStatus || alert.reviewStatus === 'accepted'),
  );
  return {
    total: current.length,
    active: current.filter((alert) => alert.status === 'active').length,
    monitoring: current.filter((alert) => alert.status === 'monitoring').length,
    resolved: current.filter((alert) => alert.status === 'resolved').length,
    archived: alerts.filter((a) => !!a.deletedAt).length,
    pending: alerts.filter((a) => !a.deletedAt && a.reviewStatus === 'pending').length,
    declined: alerts.filter((a) => !a.deletedAt && a.reviewStatus === 'declined').length,
  };
}

export function filterAdminReports(
  alerts: HazardAlert[],
  scope: ReportScope,
  status: StatusFilter,
  query: string,
  sort: ReportSort,
): HazardAlert[] {
  const search = query.trim().toLowerCase();
  const severityRank = { critical: 0, high: 1, moderate: 2, low: 3 };
  return alerts
    .filter(
      (alert) =>
        (scope === 'archived'
          ? !!alert.deletedAt
          : !alert.deletedAt &&
            (scope === 'current'
              ? !alert.reviewStatus || alert.reviewStatus === 'accepted'
              : alert.reviewStatus === scope)) &&
        (status === 'all' || alert.status === status) &&
        [
          alert.title,
          alert.reportedBy,
          alert.reporterEmail,
          alert.contactNumber,
          alert.streetName,
          alert.sitio,
          alert.id,
          alert.description,
        ].some((value) => value?.toLowerCase().includes(search)),
    )
    .sort((a, b) => {
      if (sort === 'severity') return severityRank[a.severity] - severityRank[b.severity];
      const aTime = Date.parse(a.reportedAt || '');
      const bTime = Date.parse(b.reportedAt || '');
      // Undated sample/legacy reports stay last, in their original order.
      if (!Number.isFinite(aTime)) return Number.isFinite(bTime) ? 1 : 0;
      if (!Number.isFinite(bTime)) return -1;
      return sort === 'newest' ? bTime - aTime : aTime - bTime;
    });
}
