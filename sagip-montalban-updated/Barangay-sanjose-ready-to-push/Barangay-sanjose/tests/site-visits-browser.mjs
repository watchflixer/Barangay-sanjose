import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

// The sandbox cannot reach Supabase, so this browser test mocks the two REST
// endpoints the monitor uses. It proves that every page load increments the
// shared counter and that an open dashboard picks up new visits without reload.
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const supabase = 'https://guxzibsrfyfiuqsgcgyt.supabase.co';
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
let total = 5000;
let increments = 0;
const routeSupabase = async (context) => {
  await context.route(`${supabase}/**`, async (route) => {
    const url = new URL(route.request().url());
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'content-type': 'application/json',
    };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/rest/v1/rpc/increment_site_visit') {
      increments += 1;
      total += 1;
      return route.fulfill({ status: 200, headers: cors, body: JSON.stringify(total) });
    }
    if (url.pathname === '/rest/v1/site_visits') {
      return route.fulfill({
        status: 200,
        headers: cors,
        body: JSON.stringify([{ total, updated_at: new Date().toISOString() }]),
      });
    }
    // Realtime websocket is unavailable in this sandbox: the poll fallback covers it.
    return route.abort();
  });
};

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  await routeSupabase(context);
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
  await visits.getByText('5,001', { exact: true }).waitFor();
  assert.equal(await portal.getByText('Live · all visitors', { exact: true }).count(), 1);
  assert.equal(increments, 1);

  // A visitor in another tab: one more increment, and the open dashboard updates.
  const visitor = await context.newPage();
  await visitor.goto(base);
  await visitor.waitForTimeout(600);
  assert.equal(increments, 2);
  await visits.getByText('5,002', { exact: true }).waitFor({ timeout: 20000 });
  await visitor.close();

  assert.deepEqual(errors, []);
  console.log('Shared visit counter and live dashboard refresh passed');
  await context.close();
} finally {
  await browser.close();
}
