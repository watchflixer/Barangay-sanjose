import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const base = process.env.TEST_BASE_URL || 'http://localhost:4173';
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 },
      geolocation: { latitude: 14.745, longitude: 121.135 }, permissions: ['geolocation'] });
    const page = await context.newPage();
    const errors = [];
    let failLive = false;
    let calls = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/interpreter') {
        calls++;
        assert.equal(route.request().method(), 'POST');
        return route.fulfill({ status: failLive ? 503 : 200, json: failLive ? {} : { elements: [
          { type: 'node', id: 123456, lat: 14.749, lon: 121.14,
            tags: { amenity: 'pharmacy', name: 'Browser Test Pharmacy', phone: '+63 123456', opening_hours: '24/7' } }
        ] } });
      }
      if (url.origin !== new URL(base).origin) return route.abort();
      return route.continue();
    });
    await page.goto(base);
    // Help Center used to be disabled in Weather's Layers menu.
    await page.getByTitle('Layers', { exact: true }).click();
    await page.getByRole('button', { name: 'Weather', exact: true }).click();
    const weather = page.frameLocator('iframe[title="Panahon weather map and radar"]');
    await weather.getByRole('button', { name: 'Layers', exact: true }).click();
    await weather.getByRole('button', { name: 'Help Center', exact: true }).click();
    await page.getByRole('heading', { name: 'Choose what you want to filter' }).waitFor();
    // The picker's X is a back button: without any category picked it opens
    // the Help Center map instead of leaving Help Center.
    await page.getByRole('button', { name: 'Close Help Center filters' }).click();
    await page.locator('#help-center-map-root').waitFor();
    // Dismissing lands on a clean map: no "Selected places" sheet, only the
    // List pill that can bring it back.
    assert.equal(await page.locator('#hc-sheet').count(), 0);
    await page.getByRole('button', { name: /^List \(/ }).waitFor();
    // A plain reload while Help Center is open asks the filter question again.
    await page.reload();
    await page.getByRole('heading', { name: 'Choose what you want to filter' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Pick at least one filter' }).isDisabled(), true);
    await page.getByRole('textbox', { name: 'Search filters' }).fill('pharmacy');
    await page.locator('.hc-cat').click();
    await page.getByRole('button', { name: /Open the map/ }).click();
    await page.getByText('Browser Test Pharmacy', { exact: true }).waitFor();
    assert.ok(await page.locator('#help-center-map-root .hc-pin').count() >= 5);
    const directions = page.getByRole('link', { name: 'Directions to Browser Test Pharmacy' });
    assert.ok((await directions.getAttribute('href')).includes('destination=14.749,121.14'));
    await page.getByRole('button', { name: 'View all', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search the list' }).fill('Browser Test');
    assert.equal(await page.locator('.hc-sheet-row').count(), 1);
    await page.getByRole('button', { name: 'Show Browser Test Pharmacy on the map' }).click();
    await page.locator('.hc-popup').waitFor();
    assert.ok((await page.locator('.hc-popup').innerText()).includes('SOURCE: OPENSTREETMAP'));
    await page.locator('.leaflet-popup-close-button').click();
    if (width === 390) await page.getByRole('button', { name: /^List \(/ }).click();
    await page.getByRole('tab', { name: 'Near me', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.includes('Near me'));
    await page.getByRole('button', { name: 'Satellite', exact: true }).click();
    await page.getByRole('button', { name: 'Street', exact: true }).click();
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search filters' }).fill('water');
    await page.locator('.hc-cat').click();
    await page.getByRole('button', { name: /Open the map/ }).click();
    // The old list search must not hide a newly selected category's results.
    await page.locator('.hc-sheet-row').filter({ hasText: 'Water Refilling' }).first().waitFor();
    await page.getByRole('button', { name: 'Refresh pins' }).waitFor();
    failLive = true;
    await page.getByRole('button', { name: 'Refresh pins' }).click();
    await page.locator('.hc-sheet-foot').filter({ hasText: 'Cannot reach OpenStreetMap' }).waitFor();
    assert.ok(await page.locator('.hc-sheet-row').count() > 0, 'community pins survive API failure');
    // Let the "Refreshing…" toast expire: the red OSM banner used to take the
    // notice slot after 4.2 seconds — it must never come back.
    await page.waitForTimeout(4500);
    assert.equal(
      await page.getByText('Cannot reach OpenStreetMap — try again.').count(),
      0,
      'OSM error banner removed from the notice slot',
    );
    failLive = false;
    // Retry through the sheet header's refresh button (what the banner did).
    await page.getByRole('button', { name: 'Refresh pins' }).click();
    await page.locator('.hc-sheet-foot').filter({ hasText: 'Cannot reach OpenStreetMap' }).waitFor({ state: 'detached' });
    await page.getByText('Browser Test Pharmacy', { exact: true }).waitFor();
    assert.ok(calls >= 5);
    assert.deepEqual(errors, []);
    console.log(`PASS Help Center entry, filters, pins, search, popup, directions, location, fallback/retry (${width}px)`);
    await context.close();
  }
} finally { await browser.close(); }
