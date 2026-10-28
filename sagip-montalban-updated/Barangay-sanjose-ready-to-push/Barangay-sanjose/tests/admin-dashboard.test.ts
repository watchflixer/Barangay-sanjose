import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAdminReports, reportCounts } from '../src/lib/adminDashboard';
import type { HazardAlert } from '../src/types';
const make = (id: string, changes: Partial<HazardAlert> = {}): HazardAlert => ({
  id,
  title: `Report ${id}`,
  type: 'flood',
  streetName: 'Riverside Street',
  sitio: 'San Jose',
  coordinates: [14.74, 121.13],
  timeReported: 'Legacy time',
  status: 'active',
  severity: 'high',
  description: 'Text-only description',
  reportedBy: 'Demo Citizen',
  reporterEmail: 'test@example.test',
  contactNumber: '09000000000',
  ...changes,
});
const alerts = [
  make('new', { reportedAt: '2026-10-29T10:00:00Z' }),
  make('old', { status: 'monitoring', severity: 'critical', reportedAt: '2026-10-27T10:00:00Z' }),
  make('undated', { status: 'resolved', severity: 'low' }),
  make('archived', { deletedAt: '2026-10-29T11:00:00Z' }),
];

test('overview counts reflect current reports, not archived ones', () => {
  assert.deepEqual(reportCounts(alerts), {
    total: 3,
    active: 1,
    monitoring: 1,
    resolved: 1,
    archived: 1,
    pending: 0,
    declined: 0,
  });
  assert.deepEqual(reportCounts([]), {
    total: 0,
    active: 0,
    monitoring: 0,
    resolved: 0,
    archived: 0,
    pending: 0,
    declined: 0,
  });
});
test('archive, status and query filters compose without changing original data', () => {
  const snapshot = JSON.stringify(alerts);
  assert.deepEqual(
    filterAdminReports(alerts, 'archived', 'all', '', 'newest').map((a) => a.id),
    ['archived'],
  );
  assert.deepEqual(
    filterAdminReports(alerts, 'current', 'monitoring', ' old ', 'newest').map((a) => a.id),
    ['old'],
  );
  assert.equal(filterAdminReports(alerts, 'current', 'active', 'old', 'newest').length, 0);
  assert.equal(JSON.stringify(alerts), snapshot);
});
test('search matches full name, email, phone, location, ID and description', () => {
  for (const query of [
    ' DEMO CITIZEN ',
    'TEST@EXAMPLE.TEST',
    '09000000000',
    'Riverside',
    'San Jose',
    'Text-only',
  ])
    assert.equal(filterAdminReports(alerts, 'current', 'all', query, 'newest').length, 3);
  assert.deepEqual(
    filterAdminReports(alerts, 'current', 'all', 'undated', 'newest').map((a) => a.id),
    ['undated'],
  );
  assert.equal(filterAdminReports(alerts, 'current', 'all', 'no match', 'newest').length, 0);
});
test('date sorting leaves undated reports last without inventing dates', () => {
  assert.deepEqual(
    filterAdminReports(alerts, 'current', 'all', '', 'newest').map((a) => a.id),
    ['new', 'old', 'undated'],
  );
  assert.deepEqual(
    filterAdminReports(alerts, 'current', 'all', '', 'oldest').map((a) => a.id),
    ['old', 'new', 'undated'],
  );
  assert.deepEqual(
    filterAdminReports(alerts, 'current', 'all', '', 'severity').map((a) => a.id),
    ['old', 'new', 'undated'],
  );
  assert.deepEqual(
    filterAdminReports([make('1'), make('2')], 'current', 'all', '', 'oldest').map((a) => a.id),
    ['1', '2'],
  );
});
