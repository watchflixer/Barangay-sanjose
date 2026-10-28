import test from 'node:test';
import assert from 'node:assert/strict';
import {
  actionEntry,
  changeReport,
  isAdminSearch,
  isAdminLogin,
  publicReports,
  readReportStore,
  reportAge,
  saveReportStore,
  REPORT_STORE_KEY,
} from '../src/lib/admin';
import { escapeHtml, safeImageUrl } from '../src/lib/html';
import type { HazardAlert } from '../src/types';

const alert: HazardAlert = {
  id: 'report-one',
  type: 'flood',
  title: 'Test incident',
  streetName: 'Test Street',
  sitio: 'Test Sitio',
  coordinates: [14.74, 121.13],
  timeReported: 'Just now',
  reportedAt: '2026-10-28T10:00:00.000Z',
  status: 'active',
  severity: 'high',
  description: '<script>not HTML</script>',
  reportedBy: 'Demo Reporter',
  reporterEmail: 'demo@example.test',
  contactNumber: '09000000000',
};
const initial = () => ({ alerts: [{ ...alert }], history: [] });

test('secret trigger uses exact keyword, ignoring case and surrounding spaces', () => {
  assert.ok(isAdminSearch(' Admin '));
  assert.ok(isAdminSearch('ADMIN'));
  assert.equal(isAdminSearch('administrator'), false);
  assert.equal(isAdminSearch('Admin street'), false);
});
test('login requires both exact admin credentials', () => {
  assert.ok(isAdminLogin('admin', 'admin'));
  for (const pair of [
    ['admin', 'bad'],
    ['bad', 'admin'],
    ['', ''],
    ['Admin', 'admin'],
  ])
    assert.equal(isAdminLogin(...(pair as [string, string])), false);
});
test('default public projection hides name, email and phone without changing admin record', () => {
  const projected = publicReports([alert])[0];
  assert.equal(projected.reportedBy, 'Anonymous reporter');
  assert.equal(projected.reporterEmail, undefined);
  assert.equal(projected.contactNumber, undefined);
  assert.equal(alert.reportedBy, 'Demo Reporter');
});
test('visibility controls public name only and records audit entry', () => {
  const changed = changeReport(initial(), alert.id, { type: 'visibility', value: true });
  const publicAlert = publicReports(changed.alerts)[0];
  assert.equal(publicAlert.reportedBy, alert.reportedBy);
  assert.equal(publicAlert.reporterEmail, undefined);
  assert.equal(publicAlert.contactNumber, undefined);
  assert.equal(changed.history.length, 1);
  assert.equal(changeReport(changed, alert.id, { type: 'visibility', value: true }), changed);
});
test('status, deletion and restore persist details and ordered history', () => {
  const at = '2026-10-28T11:00:00.000Z';
  let changed = changeReport(initial(), alert.id, { type: 'status', value: 'monitoring' }, at);
  assert.equal(changed.alerts[0].status, 'monitoring');
  changed = changeReport(changed, alert.id, { type: 'delete' }, at);
  assert.equal(publicReports(changed.alerts).length, 0);
  assert.equal(changed.alerts[0].reporterEmail, alert.reporterEmail);
  assert.equal(changed.alerts[0].deletedAt, at);
  assert.equal(changeReport(changed, alert.id, { type: 'status', value: 'active' }), changed);
  changed = changeReport(changed, alert.id, { type: 'restore' }, at);
  assert.equal(publicReports(changed.alerts).length, 1);
  assert.equal(changed.history.length, 3);
  assert.match(changed.history[0].action, /Restored/);
  assert.equal(changed.history[0].actor, 'admin');
  assert.equal(changeReport(changed, 'missing', { type: 'delete' }), changed);
});
test('new report action records reporter and exact timestamp', () => {
  const event = actionEntry(alert, 'Hazard report submitted', 'reporter', alert.reportedAt);
  assert.equal(event.actor, 'reporter');
  assert.equal(event.at, alert.reportedAt);
  assert.equal(event.reportId, alert.id);
});
test('storage reads new store, migrates legacy data and recovers corrupted JSON', () => {
  const storage = (data: Record<string, string>) => ({ getItem: (key: string) => data[key] ?? null });
  const migrated = readReportStore(storage({ 'san-jose-alerts': JSON.stringify([alert]) }), []);
  assert.deepEqual(migrated, initial());
  const saved = changeReport(migrated, alert.id, { type: 'delete' });
  assert.deepEqual(readReportStore(storage({ [REPORT_STORE_KEY]: JSON.stringify(saved) }), []), saved);
  assert.deepEqual(readReportStore(storage({ [REPORT_STORE_KEY]: 'broken json' }), [alert]), initial());
  assert.deepEqual(readReportStore(storage({}), [alert]), initial());
});
test('age is calculated from actual timestamps, not invented for legacy records', () => {
  const now = Date.parse(alert.reportedAt!);
  assert.equal(reportAge(alert.reportedAt, now), 'Just now');
  assert.equal(reportAge(alert.reportedAt, now + 120000), '2 minutes ago');
  assert.equal(reportAge(alert.reportedAt, now + 3 * 3600000), '3 hours ago');
  assert.equal(reportAge(alert.reportedAt, now + 2 * 86400000), '2 days ago');
  assert.equal(reportAge(undefined, now), 'Exact report date unavailable');
  assert.equal(reportAge('invalid', now), 'Exact report date unavailable');
});
test('Leaflet popup text is escaped and unsafe photo schemes are rejected', () => {
  assert.equal(escapeHtml('<img onerror="bad">'), '&lt;img onerror=&quot;bad&quot;&gt;');
  assert.equal(safeImageUrl('javascript:alert(1)'), '');
  assert.equal(safeImageUrl('data:text/html,bad'), '');
  assert.equal(safeImageUrl('/photo.jpg" onerror="bad'), '/photo.jpg&quot; onerror=&quot;bad');
});

test('quota recovery saves text and history without dropping reporter details', () => {
  const store = initial();
  store.alerts[0].photoUrl = 'data:image/jpeg;base64,DEMO';
  let persisted = '';
  const warning = saveReportStore(
    {
      setItem: (_, value) => {
        if (value.includes('data:image')) throw new Error('quota');
        persisted = value;
      },
      removeItem: () => {},
    },
    store,
  );
  assert.match(warning, /without uploaded photos/);
  assert.equal(JSON.parse(persisted).alerts[0].reporterEmail, alert.reporterEmail);
  assert.equal(JSON.parse(persisted).alerts[0].photoUrl, undefined);
  assert.ok(store.alerts[0].photoUrl); // In-memory photo is not mutated.
  assert.match(
    saveReportStore(
      {
        setItem: () => {
          throw new Error('blocked');
        },
        removeItem: () => {},
      },
      store,
    ),
    /could not be saved/,
  );
});
