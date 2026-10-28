import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdminSearch, reportAge, validateHazardDraft } from '../src/lib/admin';
import {
  fetchAdminBundle,
  fetchPublicFeed,
  isGoogleAccount,
  isPhMobile,
  reportDraftError,
  reportFromRow,
  submitReportRemote,
} from '../src/lib/reportsApi';
import { escapeHtml, safeImageUrl } from '../src/lib/html';
import type { HazardDraft } from '../src/types';

const draft: HazardDraft = {
  type: 'flood',
  title: 'Test incident',
  streetName: 'Test Street',
  sitio: 'Test Sitio',
  coordinates: [14.74, 121.13],
  status: 'active',
  severity: 'high',
  description: '<script>not HTML</script>',
  reportedBy: 'Maria Santos',
  reporterEmail: 'maria.santos@gmail.com',
  contactNumber: '09171234567',
  photoUrl: 'data:image/png;base64,AAA',
};

const row = {
  id: 'hz-001',
  type: 'flood',
  title: 'Riverside flooding',
  street_name: 'Riverside Drive',
  sitio: 'Kasiglahan',
  lat: 14.7468,
  lng: 121.1378,
  status: 'active',
  severity: 'high',
  description: 'Knee-deep water',
  reported_by: 'Maria Santos',
  contact_number: '09171234567',
  reporter_email: 'maria.santos@gmail.com',
  photo_url: '',
  updates_count: 2,
  last_updated: '2026-10-28T10:00:00.000Z',
  review_status: 'accepted',
  source: 'community',
  show_reporter: false,
};

test('secret trigger uses exact keyword, ignoring case and surrounding spaces', () => {
  assert.ok(isAdminSearch(' Admin '));
  assert.ok(isAdminSearch('ADMIN'));
  assert.equal(isAdminSearch('administrator'), false);
  assert.equal(isAdminSearch('Admin street'), false);
});

test('report age renders minutes, hours and days without inventing dates', () => {
  const now = Date.parse('2026-10-29T12:00:00.000Z');
  assert.equal(reportAge('2026-10-29T11:59:40.000Z', now), 'Just now');
  assert.equal(reportAge('2026-10-29T11:55:00.000Z', now), '5 minutes ago');
  assert.equal(reportAge('2026-10-29T09:00:00.000Z', now), '3 hours ago');
  assert.equal(reportAge('2026-10-27T12:00:00.000Z', now), '2 days ago');
  assert.equal(reportAge(undefined, now), 'Exact report date unavailable');
});

test('escaped text never becomes markup', () => {
  assert.equal(escapeHtml('<b>x</b>'), '&lt;b&gt;x&lt;/b&gt;');
  assert.equal(safeImageUrl('javascript:alert(1)'), '');
  assert.equal(safeImageUrl('data:image/png;base64,AAA'), 'data:image/png;base64,AAA');
});

test('the database row keeps contacts for admins only and never invents a photo', () => {
  const publicReport = reportFromRow(row);
  assert.equal(publicReport.contactNumber, undefined);
  assert.equal(publicReport.reporterEmail, undefined);
  // Photos live in the database now: no row photo means no photo, never a
  // bundled placeholder, so the admin and the public see the same evidence.
  assert.equal(publicReport.photoUrl, '');
  assert.equal(
    reportFromRow({ ...row, photo_url: 'https://cdn.example/hz-001.jpg' }).photoUrl,
    'https://cdn.example/hz-001.jpg',
  );
  assert.equal(publicReport.lastUpdated, '2026-10-28T10:00:00.000Z');
  assert.deepEqual(publicReport.coordinates, [14.7468, 121.1378]);

  const adminReport = reportFromRow(row, true);
  assert.equal(adminReport.contactNumber, '09171234567');
  assert.equal(adminReport.reporterEmail, 'maria.santos@gmail.com');
  assert.equal(adminReport.pendingResolveFlags, 0);
});

test('photo, Google account, cellphone and full name are all required to report', () => {
  assert.equal(reportDraftError(draft, true), '');
  assert.equal(reportDraftError({ ...draft, photoUrl: '' }, true), 'A photo of the hazard is required.');
  assert.equal(reportDraftError({ ...draft, photoUrl: '' }, false), '');
  assert.equal(reportDraftError({ ...draft, reportedBy: ' ' }, true), 'Enter your full name.');
  assert.equal(
    reportDraftError({ ...draft, contactNumber: '12345' }, true),
    'Enter a valid Philippine cellphone number (e.g. 09171234567).',
  );
  assert.equal(
    reportDraftError({ ...draft, reporterEmail: 'maria@yahoo.com' }, true),
    'Use your Google account (Gmail) address.',
  );
});

test('contact helpers accept Philippine mobiles and Google addresses only', () => {
  assert.ok(isPhMobile('09171234567'));
  assert.ok(isPhMobile('+639171234567'));
  assert.equal(isPhMobile('0917123456'), false);
  assert.equal(isPhMobile('0917 123 4567'), true);
  assert.ok(isGoogleAccount('juan@gmail.com'));
  assert.ok(isGoogleAccount('juan.dela.cruz@googlemail.com'));
  assert.equal(isGoogleAccount('juan@yahoo.com'), false);
});

test('the mobile number accepted by the form reaches the server payload', async () => {
  const calls: Array<{ name: string; args: unknown }> = [];
  const client = {
    rpc: async (name: string, args: unknown) => {
      calls.push({ name, args });
      return { data: 'hz-new', error: null };
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const id = await submitReportRemote(client as any, draft, 'load-1');
  assert.equal(id, 'hz-new');
  assert.equal(calls[0].name, 'submit_report');
  assert.deepEqual(
    (calls[0].args as { payload: Record<string, unknown> }).payload.contact_number,
    '09171234567',
  );
  assert.deepEqual(
    (calls[0].args as { payload: Record<string, unknown> }).payload.reporter_email,
    'maria.santos@gmail.com',
  );
});

test('the public feed only exposes accepted incidents and the hidden categories', async () => {
  const client = {
    rpc: async () => ({
      data: { reports: [row], hidden_types: ['fire', 'nonsense'] },
      error: null,
    }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feed = await fetchPublicFeed(client as any);
  assert.equal(feed.reports.length, 1);
  assert.deepEqual(feed.hiddenTypes, ['fire']);
  assert.equal(feed.reports[0].reporterEmail, undefined);
});

test('the admin bundle carries flags, contacts and hidden categories', async () => {
  const client = {
    rpc: async (name: string) => {
      assert.equal(name, 'admin_bundle');
      return {
        data: {
          reports: [{ ...row, pending_resolve_flags: 1 }],
          history: [{ id: 'e1', reportId: 'hz-test', title: 'x', action: 'y', at: '', actor: 'public' }],
          flags: [{ id: 'f1', reportId: 'hz-test', title: 'x', status: 'pending' }],
          hidden_types: ['power'],
        },
        error: null,
      };
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bundle = await fetchAdminBundle(client as any, 'admin');
  assert.equal(bundle.reports[0].reporterEmail, 'maria.santos@gmail.com');
  assert.equal(bundle.reports[0].pendingResolveFlags, 1);
  assert.equal(bundle.flags.length, 1);
  assert.deepEqual(bundle.hiddenTypes, ['power']);
});

test('server errors surface their message instead of failing silently', async () => {
  const client = {
    rpc: async () => ({ data: null, error: { message: 'Use your Google account (Gmail) address.' } }),
  };
  await assert.rejects(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submitReportRemote(client as any, draft, 'load-2'),
    /Use your Google account/,
  );
});

test('admin form validation still rejects incomplete drafts', () => {
  assert.equal(validateHazardDraft(draft), '');
  assert.equal(
    validateHazardDraft({ ...draft, streetName: '' }),
    'Complete the incident title, street, sitio and description.',
  );
});
