import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { baseReport, createBackend } from './supabase-mock.mjs';

// Every moderation control writes through the shared backend:
// pending reviews, resolve requests, category visibility, archive and restore.
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const communityReport = () =>
  baseReport('hz-community', {
    title: 'Sampaloc creek overflow',
    source: 'community',
    review_status: 'pending',
    reviewed_at: null,
    reported_by: 'Maria Santos',
  });

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    reducedMotion: 'reduce',
  });
  const backend = createBackend([
    baseReport('hz-001', { title: 'Kasiglahan riverside flooding' }),
    baseReport('hz-002', {
      type: 'fire',
      title: 'Litex fire alert',
      severity: 'critical',
      status: 'monitoring',
    }),
    communityReport(),
  ]);
  backend.state.flags.push({
    id: 'flag-001',
    reportId: 'hz-002',
    note: 'Nilinis na po ng barangay.',
    status: 'pending',
    createdAt: new Date().toISOString(),
    reviewedAt: null,
  });
  await backend.install(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base);
  await page.locator('#alert-card-hz-001').waitFor();

  const openFeed = async () => {
    const button = page.getByRole('button', { name: 'Show incident feeds', exact: true });
    if (await button.isVisible()) await button.click();
  };
  await openFeed();
  const search = page.getByRole('searchbox', { name: 'Search incident feeds' });
  await search.fill('Admin');
  await page.getByLabel('Email', { exact: true }).fill('admin');
  await page.getByLabel('Password', { exact: true }).fill('admin');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const portal = page.getByRole('dialog', { name: 'Incident administration' });
  await portal.getByRole('heading', { name: 'Incident administration' }).waitFor();
  await portal.getByRole('button', { name: /^Pending review \(/ }).click();

  // --- A community report is pending until accepted.
  await portal.getByRole('heading', { name: 'Sampaloc creek overflow' }).waitFor();
  await portal.getByText('maria.santos@gmail.com', { exact: true }).first().waitFor();
  await portal.getByRole('button', { name: 'Accept report', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Report accepted and published' }).waitFor();
  const accepted = backend.state.reports.find((report) => report.id === 'hz-community');
  assert.equal(accepted.review_status, 'accepted');
  assert.equal(backend.state.calls.some((call) => call.name === 'admin_change'), true);

  // --- Resolve requests wait for an admin decision.
  await portal.getByRole('button', { name: /^Resolve requests \(/ }).click();
  await portal.getByRole('heading', { name: 'Resolve requests', exact: true }).first().waitFor();
  await portal.getByText('Nilinis na po ng barangay.', { exact: false }).waitFor();
  await portal.getByRole('button', { name: 'Accept & resolve' }).click();
  await page.getByRole('status').filter({ hasText: 'Resolve request accepted' }).waitFor();
  const flagged = backend.state.reports.find((report) => report.id === 'hz-002');
  assert.equal(flagged.status, 'resolved');
  assert.equal(backend.state.flags[0].status, 'accepted');
  await portal.getByText('No resolve requests waiting').waitFor();

  // --- Hiding a category updates the shared feed settings.
  await portal.getByRole('button', { name: /^Reports \(/ }).click();
  await portal.getByLabel('Hide Fire in public feeds').click();
  await page.getByRole('status').filter({ hasText: 'Fire hidden from public feeds' }).waitFor();
  assert.deepEqual(backend.state.hiddenTypes, ['fire']);
  assert.equal(backend.state.calls.some((call) => call.name === 'admin_set_hidden_types'), true);
  await portal.getByLabel('Show Fire in public feeds').waitFor();

  // --- Removing and restoring an incident both persist.
  await portal.getByLabel('Report archive filter').selectOption('current');
  await portal.getByRole('button', { name: 'View report: Kasiglahan riverside flooding' }).click();
  await portal.getByRole('button', { name: 'Remove incident', exact: true }).click();
  await portal.getByRole('alertdialog').getByRole('button', { name: 'Confirm removal' }).click();
  assert.ok(backend.state.reports.find((report) => report.id === 'hz-001').deleted_at);
  await portal.getByLabel('Report archive filter').selectOption('archived');
  await portal.getByRole('button', { name: 'View report: Kasiglahan riverside flooding' }).click();
  await portal.getByRole('button', { name: 'Restore incident' }).click();
  assert.equal(backend.state.reports.find((report) => report.id === 'hz-001').deleted_at, null);

  // --- Admin-created incidents publish immediately, even without contacts.
  await portal.getByRole('button', { name: 'Add incident', exact: true }).click();
  await portal.getByLabel('Incident title *').fill('Barangay clearing operation');
  await portal.getByLabel('Description *').fill('Crews clearing debris along the river dike.');
  await portal.getByLabel('Street / landmark *').fill('Riverside Drive');
  await portal.getByRole('button', { name: 'Publish incident' }).click();
  const created = backend.state.reports.find((report) => report.title === 'Barangay clearing operation');
  assert.equal(created.review_status, 'accepted');
  assert.equal(created.source, 'admin');
  assert.equal(created.contact_number, '');
  assert.equal(backend.state.calls.some((call) => call.name === 'admin_create'), true);

  // The public map reflects the shared state.
  await portal.getByRole('button', { name: 'Close admin' }).click();
  await openFeed();
  await page.locator('#alert-card-hz-001').waitFor();
  await page.locator('#alert-card-hz-002').waitFor({ state: 'detached', timeout: 15000 });
  await page.locator('#alert-card-hz-community').waitFor();
  await page
    .getByText('Barangay clearing operation', { exact: true })
    .first()
    .waitFor();

  assert.deepEqual(errors, []);
  console.log('Admin moderation, resolve requests and feed visibility passed');
  await context.close();
} finally {
  await browser.close();
}
