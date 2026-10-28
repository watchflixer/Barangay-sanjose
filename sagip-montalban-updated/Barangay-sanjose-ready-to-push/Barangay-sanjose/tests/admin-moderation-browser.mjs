import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { baseReport, createBackend } from './supabase-mock.mjs';

// Declining keeps a report off the map, every decision lands in the shared
// audit trail, and the history tab reads that trail back from the server.
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    reducedMotion: 'reduce',
  });
  const backend = createBackend([
    baseReport('hz-001', { title: 'Kasiglahan riverside flooding' }),
    baseReport('hz-pending', {
      title: 'Duplicate flood report',
      source: 'community',
      review_status: 'pending',
      reviewed_at: null,
    }),
  ]);
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
  await page.getByRole('searchbox', { name: 'Search incident feeds' }).fill('Admin');
  await page.getByLabel('Email', { exact: true }).fill('admin');
  await page.getByLabel('Password', { exact: true }).fill('admin');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const portal = page.getByRole('dialog', { name: 'Incident administration' });
  await portal.getByRole('heading', { name: 'Incident administration' }).waitFor();

  // --- Declining keeps the report private and records the reason.
  await portal.getByRole('button', { name: /^Pending review \(/ }).click();
  await portal.getByRole('button', { name: 'View report: Duplicate flood report' }).click();
  await portal.getByRole('button', { name: 'Decline report', exact: true }).click();
  const confirm = portal.getByRole('alertdialog');
  await confirm.getByLabel('Decline reason').fill('Duplicate of the riverside flooding report.');
  await confirm.getByRole('button', { name: 'Confirm decline' }).click();
  await page.getByRole('status').filter({ hasText: 'Report declined' }).waitFor();
  const declined = backend.state.reports.find((report) => report.id === 'hz-pending');
  assert.equal(declined.review_status, 'declined');
  assert.equal(declined.decline_reason, 'Duplicate of the riverside flooding report.');

  // --- History is the shared audit trail.
  await portal.getByRole('button', { name: /^History \(/ }).click();
  await portal.getByText('Report declined', { exact: false }).first().waitFor();
  await portal.getByRole('button', { name: /^Reports \(/ }).click();
  await portal.getByLabel('Report archive filter').selectOption('declined');
  await portal.getByRole('button', { name: 'View report: Duplicate flood report' }).click();
  await portal.getByRole('button', { name: 'Accept report', exact: true }).click();
  const accepted = backend.state.reports.find((report) => report.id === 'hz-pending');
  assert.equal(accepted.review_status, 'accepted');
  assert.equal(accepted.decline_reason, null);

  await portal.getByRole('button', { name: 'Close admin' }).click();
  await openFeed();
  await page.locator('#alert-card-hz-pending').waitFor();

  assert.deepEqual(errors, []);
  console.log('Decline, audit trail and reconsideration passed');
  await context.close();
} finally {
  await browser.close();
}
