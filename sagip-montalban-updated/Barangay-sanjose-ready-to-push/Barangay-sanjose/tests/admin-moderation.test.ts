import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHazardDraft } from '../src/lib/admin';
import {
  changeReportRemote,
  createReportRemote,
  reviewFlagRemote,
  setHiddenTypesRemote,
  submitResolveFlag,
} from '../src/lib/reportsApi';
import { filterAdminReports, reportCounts } from '../src/lib/adminDashboard';
import { readVisits, recordLocalVisit, VISIT_KEY } from '../src/lib/visits';
import type { HazardAlert, HazardDraft } from '../src/types';

const draft: HazardDraft = {
  type: 'flood',
  title: 'Riverside flooding',
  streetName: 'Riverside Drive',
  sitio: 'Kasiglahan',
  coordinates: [14.743, 121.133],
  status: 'active',
  severity: 'high',
  description: 'Knee-deep water near the bridge.',
  reportedBy: 'Barangay administrator',
  reporterEmail: '',
  contactNumber: '',
  photoUrl: '',
};

interface Call {
  name: string;
  args: Record<string, unknown>;
}
const recorder = (data: unknown = null) => {
  const calls: Call[] = [];
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data, error: null };
    },
  };
  return { calls, client };
};

test('every moderation action is sent to the shared server, never to localStorage', async () => {
  const { calls, client } = recorder();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = client as any;
  await changeReportRemote(api, 'admin', 'hz-001', { type: 'status', value: 'resolved' });
  await changeReportRemote(api, 'admin', 'hz-001', { type: 'visibility', value: true });
  await changeReportRemote(api, 'admin', 'hz-001', { type: 'delete' });
  await changeReportRemote(api, 'admin', 'hz-001', { type: 'restore' });
  await changeReportRemote(api, 'admin', 'hz-002', {
    type: 'review',
    value: 'declined',
    reason: ' Duplicate report ',
  });

  assert.deepEqual(
    calls.map((call) => [call.name, call.args.p_id, call.args.p_change]),
    [
      ['admin_change', 'hz-001', { type: 'status', value: 'resolved' }],
      ['admin_change', 'hz-001', { type: 'visibility', value: true }],
      ['admin_change', 'hz-001', { type: 'delete' }],
      ['admin_change', 'hz-001', { type: 'restore' }],
      ['admin_change', 'hz-002', { type: 'review', value: 'declined', reason: 'Duplicate report' }],
    ],
  );
  assert.ok(calls.every((call) => call.args.p_password === 'admin'));
});

test('guest resolve requests wait for an admin decision', async () => {
  const { calls, client } = recorder();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await submitResolveFlag(client as any, 'hz-001', '  Street is dry now  ');
  assert.equal(calls[0].name, 'flag_resolved');
  assert.deepEqual(calls[0].args, { p_report_id: 'hz-001', p_note: 'Street is dry now' });

  const review = recorder();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await reviewFlagRemote(review.client as any, 'admin', 'flag-1', 'accepted');
  assert.deepEqual(review.calls[0].args, {
    p_password: 'admin',
    p_flag_id: 'flag-1',
    p_decision: 'accepted',
  });
});

test('hiding a category persists every type and returns to the public feed', async () => {
  const { calls, client } = recorder(['fire', 'power']);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hidden = await setHiddenTypesRemote(client as any, 'admin', ['fire', 'power']);
  assert.deepEqual(hidden, ['fire', 'power']);
  assert.deepEqual(calls[0].args, { p_password: 'admin', p_types: ['fire', 'power'] });
});

test('admin-created incidents publish immediately without resident contact fields', async () => {
  const { calls, client } = recorder({ id: 'hz-new' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const created = await createReportRemote(client as any, 'admin', draft);
  assert.equal(created.id, 'hz-new');
  assert.equal(created.reviewStatus, 'accepted');
  assert.equal(created.source, 'admin');
  assert.equal(calls[0].name, 'admin_create');
  const payload = calls[0].args.payload as Record<string, unknown>;
  assert.equal(payload.contact_number, '');
  assert.equal(payload.reporter_email, '');
  assert.equal(validateHazardDraft(draft), '');
});

test('legacy incidents stay published; queues and totals exclude unpublished reports', () => {
  const make = (id: string, changes: Partial<HazardAlert> = {}): HazardAlert => ({
    id,
    title: `Report ${id}`,
    type: 'flood',
    streetName: 'Riverside Street',
    sitio: 'San Jose',
    coordinates: [14.74, 121.13],
    timeReported: 'Just now',
    status: 'active',
    severity: 'high',
    description: 'Text-only description',
    reportedBy: 'Maria Santos',
    ...changes,
  });
  const legacy = make('legacy');
  const pending = make('pending', { reviewStatus: 'pending', source: 'community' });
  const declined = make('declined', { reviewStatus: 'declined', source: 'community' });
  const archived = make('archived', { deletedAt: '2026-10-29T10:00:00Z' });
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
      filterAdminReports(alerts, scope, 'all', '', 'newest').map((alert) => alert.id),
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
