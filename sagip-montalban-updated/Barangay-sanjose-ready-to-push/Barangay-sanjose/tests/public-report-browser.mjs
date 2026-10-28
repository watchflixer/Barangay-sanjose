import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { baseReport, createBackend } from './supabase-mock.mjs';

// Residents talk to the shared barangay server: a hazard report waits for an
// admin decision, and "flag as resolved" is a request, never an instant change.
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  'base64',
);

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
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
  ]);
  await backend.install(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base);
  await page.locator('#alert-card-hz-001').waitFor();

  // --- Reporting requires a photo, full name, PH mobile and a Google account.
  await page.locator('button[aria-label="Report a hazard"]:visible').first().click();
  await page
    .getByPlaceholder('e.g. Waist-deep flood along river dike / Snapped electrical cable')
    .fill('Sampaloc creek overflow');
  await page.getByPlaceholder('Street name or landmark').fill('Sampaloc Street');
  await page.getByPlaceholder('e.g. Juan Dela Cruz').fill('Maria Santos');
  await page.getByPlaceholder('e.g. 09171234567').fill('09171234567');
  await page.getByPlaceholder('e.g. juan@gmail.com').fill('maria.santos@gmail.com');
  await page.getByRole('button', { name: 'Submit hazard report' }).click();
  await page.getByText('Required: upload or add a photo', { exact: false }).waitFor();
  assert.equal(backend.state.calls.filter((call) => call.name === 'submit_report').length, 0);

  await page.locator('input[type="file"]').setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: png });
  await page.getByText('Photo Proof Attached', { exact: true }).waitFor();
  await page.getByPlaceholder('e.g. juan@gmail.com').fill('maria@yahoo.com');
  await page.getByRole('button', { name: 'Submit hazard report' }).click();
  await page.getByText('Use your Google account (Gmail) address.', { exact: true }).waitFor();
  await page.getByPlaceholder('e.g. 09171234567').fill('12345');
  await page.getByPlaceholder('e.g. juan@gmail.com').fill('maria.santos@gmail.com');
  await page.getByRole('button', { name: 'Submit hazard report' }).click();
  await page.getByText('Enter a valid Philippine cellphone number', { exact: false }).waitFor();
  assert.equal(backend.state.calls.filter((call) => call.name === 'submit_report').length, 0);

  await page.getByPlaceholder('e.g. 09171234567').fill('09171234567');
  await page.getByRole('button', { name: 'Submit hazard report' }).click();
  await page.getByRole('status').filter({ hasText: 'Report received' }).waitFor();
  const submitted = backend.state.reports.find((report) => report.title === 'Sampaloc creek overflow');
  assert.equal(submitted.review_status, 'pending');
  assert.equal(submitted.source, 'community');
  assert.equal(submitted.photo_url.startsWith('data:image/'), true);
  // A pending report is not public.
  await page.waitForTimeout(500);
  assert.equal(await page.locator('#alert-card-' + submitted.id).count(), 0);
  await page.getByRole('button', { name: 'Dismiss report confirmation' }).click();

  // Submitting closes the drawer; reopen it before scanning the feed.
  const openFeed = async () => {
    const button = page.getByRole('button', { name: 'Show incident feeds', exact: true });
    if (await button.isVisible()) await button.click();
  };
  await openFeed();

  // --- Residents can only *ask* for an incident to be resolved.
  await page.locator('#alert-card-hz-002').waitFor();
  await page.getByRole('button', { name: 'Flag as resolved' }).first().click();
  const dialog = page.getByRole('dialog', { name: /Ask to mark this incident resolved/ });
  await dialog.waitFor();
  await dialog.getByRole('textbox').fill('Nilinis na po ng barangay.');
  await dialog.getByRole('button', { name: 'Send resolve request' }).click();
  await page.getByRole('status').filter({ hasText: 'Resolve request sent' }).waitFor();

  const flag = backend.state.flags.find((item) => item.reportId === 'hz-002');
  assert.equal(flag.status, 'pending');
  assert.equal(flag.note, 'Nilinis na po ng barangay.');
  const flaggedReport = backend.state.reports.find((report) => report.id === 'hz-002');
  assert.equal(flaggedReport.status, 'monitoring'); // Still open until an admin accepts.
  await page.getByRole('button', { name: 'Request pending' }).first().waitFor();
  assert.equal(backend.state.events.some((event) => event.actor === 'public'), true);

  // --- Hidden categories disappear from the public feed for every visitor.
  backend.state.hiddenTypes = ['fire'];
  await page.reload();
  await page.locator('#alert-card-hz-001').waitFor();
  await page.locator('#alert-card-hz-002').waitFor({ state: 'detached', timeout: 15000 });
  assert.equal(await page.locator('#filter-fire').count(), 0);

  assert.deepEqual(errors, []);
  console.log('Community report, resolve request and category hiding passed');
  await context.close();
} finally {
  await browser.close();
}
