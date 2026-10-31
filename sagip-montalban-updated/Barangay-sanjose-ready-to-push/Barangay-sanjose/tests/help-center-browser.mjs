import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.TEST_BASE_URL || 'http://localhost:4173';
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  for (const width of [1280, 390, 412]) {
    const isPixel7 = width === 412;
    const context = await browser.newContext({
      viewport: { width, height: isPixel7 ? 915 : 900 },
      ...(isPixel7 ? { deviceScaleFactor: 2.625, isMobile: true, hasTouch: true } : {}),
      geolocation: { latitude: 14.745, longitude: 121.135 },
      permissions: ['geolocation'],
    });
    const page = await context.newPage();
    const errors = [];
    let pharmacyReads = 0;
    page.on('pageerror', error => errors.push(error.message));

    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname === 'hnwevhdyvhnavjltyxfy.supabase.co') {
        if (url.pathname.endsWith('/help_places')) {
          // Exercise the per-filter table layout used by the barangay directory.
          return route.fulfill({ status: 404, json: { message: 'table not found' } });
        }
        if (url.pathname.endsWith('/essentials_pharmacy')) {
          pharmacyReads += 1;
          return route.fulfill({
            status: 200,
            json: [{
              id: 'browser-test-pharmacy',
              name: 'Browser Test Pharmacy',
              latitude: 14.749,
              longitude: 121.14,
              address: width === 1280 ? '123 Mabuhay Street, Brgy. San Jose' : '',
              hours: 'Open 24 hours',
              phone: '+63 1234567890',
              note: 'Test directory entry',
            }],
          });
        }
        return route.fulfill({ status: 200, json: [] });
      }
      if (url.origin !== new URL(base).origin) return route.abort();
      return route.continue();
    });

    await page.goto(base);
    await page.getByTitle('Layers', { exact: true }).click();
    await page.getByRole('button', { name: 'Weather', exact: true }).click();
    const weather = page.frameLocator('iframe[title="Panahon weather map and radar"]');
    await weather.getByRole('button', { name: 'Layers', exact: true }).click();
    await weather.getByRole('button', { name: 'Help Center', exact: true }).click();
    await page.getByRole('heading', { name: 'Choose what you want to filter' }).waitFor();

    await page.getByRole('textbox', { name: 'Search filters' }).fill('pharmacy');
    await page.locator('.hc-cat').click();
    const openMapButton = page.getByRole('button', { name: /Open the map/ });
    if (width < 768) await openMapButton.evaluate(element => element.click());
    else await openMapButton.click();
    await page.getByText('Browser Test Pharmacy', { exact: true }).waitFor();
    if (isPixel7 || width === 390) {
      assert.equal(await page.locator('.hc-sheet-sub').innerText(), 'Pharmacy', 'missing address does not leave a separator in the list');
    } else {
      assert.ok((await page.locator('.hc-sheet-sub').innerText()).includes('Pharmacy · 123 Mabuhay Street'));
    }
    assert.equal(await page.locator('#help-center-map-root .hc-pin').count(), 1);
    assert.ok(pharmacyReads > 0, 'the selected filter loads its Supabase table');

    await page.getByRole('button', { name: 'Show Browser Test Pharmacy on the map' }).click();
    const popup = page.locator('.hc-popup');
    await popup.waitFor();
    assert.equal(await popup.locator('.hc-popup-title').innerText(), 'Browser Test Pharmacy');
    assert.equal(await popup.locator('.hc-popup-subtitle').innerText(), 'Pharmacy');
    if (isPixel7 || width === 390) {
      assert.equal(await popup.locator('.hc-popup-address').count(), 0);
      assert.ok(!(await popup.innerText()).includes('Brgy. San Jose, Rodriguez, Rizal'));
    } else {
      assert.ok((await popup.locator('.hc-popup-address').innerText()).includes('123 Mabuhay Street'));
    }
    assert.ok((await popup.locator('.hc-popup-details').innerText()).includes('Open 24 hours'));
    assert.ok((await popup.locator('.hc-popup-details a').getAttribute('href')).includes('tel:+631234567890'));
    assert.ok((await popup.locator('.hc-popup-details').innerText()).includes('Test directory entry'));
    assert.ok(await popup.locator('.hc-popup-divider').isVisible());
    assert.equal(await popup.locator('.hc-popup-source').count(), 0);
    assert.ok(!(await popup.innerText()).includes('Barangay List · Supabase'));
    assert.ok(await popup.locator('.hc-popup-actions').evaluate(element => element.classList.contains('hc-popup-actions--solo')));

    const directions = popup.locator('.hc-popup-directions');
    assert.equal(await directions.innerText(), 'Directions');
    assert.ok((await directions.getAttribute('href')).includes('destination=14.749,121.14'));
    assert.equal(await directions.evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(26, 115, 232)');
    assert.equal(await popup.locator('.hc-popup-place-icon').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(232, 240, 254)');
    assert.ok(await page.locator('.leaflet-popup-close-button').isVisible());

    const card = await popup.locator('.hc-popup-card').boundingBox();
    assert.ok(card && card.width <= width - 32, 'popup card fits within the viewport');
    if (isPixel7) assert.ok(card && card.width <= 284, 'Pixel 7 gets the compact pin card');
    await page.locator('.leaflet-popup-close-button').click();
    await popup.waitFor({ state: 'detached' });
    assert.deepEqual(errors, []);
    console.log(`PASS Help Center place popup layout and dynamic content (${width}px)`);
    await context.close();
  }
} finally {
  await browser.close();
}
