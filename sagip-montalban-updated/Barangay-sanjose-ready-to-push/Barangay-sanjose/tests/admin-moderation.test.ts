import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendHazardReport,
  changeReport,
  createHazardReport,
  publicReports,
  validateHazardDraft,
} from '../src/lib/admin';
import { filterAdminReports, reportCounts } from '../src/lib/adminDashboard';
import { readVisits, recordLocalVisit, VISIT_KEY } from '../src/lib/visits';
import type { HazardDraft } from '../src/types';
const draft: HazardDraft = {
  title: 'Demo flood',
  type: 'flood',
  streetName: 'Demo street',
  sitio: 'San Jose',
  coordinates: [14.743, 121.133],
  status: 'active',
  severity: 'high',
  description: 'Test incident',
  reportedBy: 'Demo reporter',
  reporterEmail: 'demo@example.test',
  contactNumber: '09000000000',
};

test('community reports remain private until accepted; resolving cannot bypass review', () => {
  const report = createHazardReport(draft, 'community');
  let store = appendHazardReport({ alerts: [], history: [] }, report);
  assert.equal(report.reviewStatus, 'pending');
  assert.equal(publicReports(store.alerts).length, 0);
  store = changeReport(store, report.id, { type: 'status', value: 'resolved' });
  assert.equal(publicReports(store.alerts).length, 0);
  store = changeReport(store, report.id, { type: 'review', value: 'accepted' });
  assert.equal(publicReports(store.alerts).length, 1);
  assert.equal(publicReports(store.alerts)[0].reporterEmail, undefined);
  assert.equal(store.history[0].action, 'Report accepted and published');
  assert.equal(changeReport(store, report.id, { type: 'review', value: 'accepted' }), store);
});
test('decline retains reporter details and reason; reconsideration clears reason and publishes', () => {
  const report = createHazardReport(draft, 'community');
  let store = appendHazardReport({ alerts: [], history: [] }, report);
  store = changeReport(store, report.id, { type: 'review', value: 'declined', reason: ' Duplicate report ' });
  assert.equal(publicReports(store.alerts).length, 0);
  assert.equal(store.alerts[0].reporterEmail, draft.reporterEmail);
  assert.equal(store.alerts[0].declineReason, 'Duplicate report');
  assert.match(store.history[0].action, /Duplicate report/);
  store = changeReport(store, report.id, { type: 'delete' });
  assert.equal(changeReport(store, report.id, { type: 'review', value: 'accepted' }), store);
  store = changeReport(store, report.id, { type: 'restore' });
  assert.equal(publicReports(store.alerts).length, 0); // Restore does not imply acceptance.
  store = changeReport(store, report.id, { type: 'review', value: 'accepted' });
  assert.equal(store.alerts[0].declineReason, undefined);
  assert.equal(publicReports(store.alerts).length, 1);
});
test('admin creation publishes directly with validated fields and admin history', () => {
  const report = createHazardReport(
    { ...draft, reportedBy: '', reporterEmail: '', contactNumber: '' },
    'admin',
  );
  const store = appendHazardReport({ alerts: [], history: [] }, report);
  assert.equal(report.reviewStatus, 'accepted');
  assert.equal(report.reportedBy, 'Barangay administrator');
  assert.equal(publicReports(store.alerts).length, 1);
  assert.equal(store.history[0].actor, 'admin');
  assert.equal(store.history[0].action, 'Admin incident created and published');
  assert.equal(report.showReporter, false);
  assert.ok(validateHazardDraft({ ...draft, title: '  ' }));
  assert.throws(() => createHazardReport({ ...draft, coordinates: [NaN, 181] }, 'admin'));
  assert.equal(validateHazardDraft(draft), '');
});
test('legacy incidents stay published; queues and totals exclude unpublished reports', () => {
  const legacy = { ...createHazardReport(draft, 'admin'), reviewStatus: undefined };
  const pending = createHazardReport(draft, 'community');
  const declined = { ...createHazardReport(draft, 'community'), reviewStatus: 'declined' as const };
  const archived = { ...createHazardReport(draft, 'community'), deletedAt: '2026-10-29T10:00:00Z' };
  const alerts = [legacy, pending, declined, archived];
  assert.deepEqual(reportCounts(alerts), {
    total: 1,
    active: 1,
    monitoring: 0,
    resolved: 0,
    archived: 1,
    pending: 1,
    declined: 1,
  });
  for (const [scope, id] of [
    ['current', legacy.id],
    ['pending', pending.id],
    ['declined', declined.id],
    ['archived', archived.id],
  ] as const)
    assert.deepEqual(
      filterAdminReports(alerts, scope, 'all', '', 'newest').map((a) => a.id),
      [id],
    );
});
test('visits initialize at exactly 5,000 and increase only on subsequent recorded page loads', () => {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
  assert.equal(readVisits(storage).total, 5000);
  assert.equal(recordLocalVisit(storage).total, 5000);
  assert.equal(recordLocalVisit(storage).total, 5001);
  assert.equal(recordLocalVisit(storage).total, 5002);
  assert.equal(readVisits(storage).total, 5002); // Reading/opening dashboard never increments.
  const failed = recordLocalVisit({
    ...storage,
    setItem: () => {
      throw new Error('quota');
    },
  });
  assert.equal(failed.total, 5002);
  assert.ok(failed.error);
  map.set(VISIT_KEY, '{broken');
  assert.equal(readVisits(storage).total, 5000);
  map.set(VISIT_KEY, JSON.stringify({ additional: -20 }));
  assert.equal(readVisits(storage).total, 5000);
});
