import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { baseReport, createBackend } from './supabase-mock.mjs';

// The sandbox cannot reach Supabase, so this browser test mocks the two REST
// endpoints the monitor uses. It proves that every page load increments the
// shared counter and that an open dashboard picks up new visits without reload.
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const backend = createBackend([baseReport('hz-001', { title: 'Kasiglahan riverside flooding' })]);
let increments = 0;
const countIncrement = () => {
  const seen = backend.state.calls.filter((call) => call.name === 'increment_site_visit').length;
  increments = seen;
};

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  await backend.install(context);
  await context.addInitScript(() => {
    try {
      localStorage.removeItem('hazardsync:visits-offline');
    } catch {}
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base);
  const openFeed = page.getByRole('button', { name: 'Show incident feeds', exact: true });
  if (await openFeed.isVisible()) await openFeed.click();
  await page.getByRole('searchbox', { name: 'Search incident feeds' }).fill('Admin');
  await page.getByLabel('Email', { exact: true }).fill('admin');
  await page.getByLabel('Password', { exact: true }).fill('admin');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const portal = page.getByRole('dialog', { name: 'Incident administration' });
  const visits = portal.getByTestId('visits-total');
  await visits.getByText('5,001', { exact: true }).waitFor({ timeout: 20000 });
  countIncrement();
  assert.equal(await portal.getByText('Live · all visitors', { exact: true }).count(), 1);
  assert.equal(increments, 1);

  // A visitor in another tab: one more increment, and the open dashboard updates.
  const visitor = await context.newPage();
  await visitor.goto(base);
  await visitor.locator('#alert-card-hz-001').waitFor();
  await visitor.waitForTimeout(800);
  countIncrement();
  assert.equal(increments, 2);
  await visits.getByText('5,002', { exact: true }).waitFor({ timeout: 20000 });
  await visitor.close();

  assert.deepEqual(errors, []);
  console.log('Shared visit counter and live dashboard refresh passed');
  await context.close();
} finally {
  await browser.close();
}
