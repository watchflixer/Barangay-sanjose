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
        if (url.pathname.endsWith('/emergency_clinic')) {
          // A second filter arrives later and farther away than the first.
          await new Promise(resolve => setTimeout(resolve, 1200));
          return route.fulfill({ status: 200, json: [{
            id: 'browser-test-clinic', name: 'Distant Browser Clinic',
            latitude: 14.90, longitude: 121.21,
          }] });
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
            }, {
              id: 'browser-test-second-pharmacy',
              name: 'Second Browser Pharmacy',
              latitude: 14.758,
              longitude: 121.155,
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

    await page.getByRole('textbox', { name: 'Search filters' }).fill('clinic');
    await page.locator('.hc-cat').filter({ hasText: 'Health Center / Clinic' }).click();
    await page.getByRole('textbox', { name: 'Search filters' }).fill('pharmacy');
    await page.locator('.hc-cat').click();
    const openMapButton = page.getByRole('button', { name: /Open the map/ });
    if (width < 768) await openMapButton.evaluate(element => element.click());
    else await openMapButton.click();
    await page.getByText('Browser Test Pharmacy', { exact: true }).waitFor();
    if (isPixel7 || width === 390) {
      assert.equal(await page.locator('.hc-sheet-row').filter({ hasText: 'Browser Test Pharmacy' }).locator('.hc-sheet-sub').innerText(), 'Pharmacy', 'missing address does not leave a separator in the list');
    } else {
      assert.ok((await page.locator('.hc-sheet-row').filter({ hasText: 'Browser Test Pharmacy' }).locator('.hc-sheet-sub').innerText()).includes('Pharmacy · 123 Mabuhay Street'));
    }
    await page.getByText('Distant Browser Clinic', { exact: true }).waitFor();
    assert.equal(await page.locator('#help-center-map-root .hc-pin').count(), 3);
    assert.ok(pharmacyReads > 0, 'the selected filter loads its Supabase table');

    const waitForPinsAboveSheet = () => page.waitForFunction(() => {
      const sheet = document.querySelector('#hc-sheet')?.getBoundingClientRect();
      const map = document.querySelector('#help-center-map-root')?.getBoundingClientRect();
      const pins = [...document.querySelectorAll('#help-center-map-root .hc-pin')];
      return sheet && map && pins.length === 3 && pins.every(pin => {
        const rect = pin.getBoundingClientRect();
        return rect.left >= map.left && rect.right <= map.right &&
          rect.top >= map.top && rect.bottom < sheet.top;
      });
    }, null, { timeout: 6000 });

    // The first selection must fit all pins above the newly measured sheet.
    await waitForPinsAboveSheet();
    // Even after a manual zoom, closing the list re-frames the full map and
    // centres the geographic bounds rather than leaving their sheet offset.
    await page.locator('#help-center-map-root').getByRole('button', { name: 'Zoom in' }).click();
    await page.getByRole('button', { name: 'Close the list' }).click();
    await page.waitForFunction(() => {
      const map = document.querySelector('#help-center-map-root')?.getBoundingClientRect();
      const pins = [...document.querySelectorAll('#help-center-map-root .hc-pin-wrap')].map(pin => pin.getBoundingClientRect());
      if (!map || document.querySelector('#hc-sheet') || pins.length !== 3) return false;
      const xs = pins.map(rect => rect.left + 15), ys = pins.map(rect => rect.top + 30);
      return Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - (map.left + map.width / 2)) < 4 &&
        Math.abs((Math.min(...ys) + Math.max(...ys)) / 2 - (map.top + map.height / 2)) < 4 &&
        pins.every(rect => rect.left >= map.left && rect.right <= map.right && rect.top >= map.top && rect.bottom <= map.bottom);
    }, null, { timeout: 6000 });
    await page.getByRole('button', { name: /^List \(/ }).evaluate(element => element.click());
    await waitForPinsAboveSheet();

    // Re-entering the picker with the same selection still opens and fits the list.
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    const clinicReload = page.waitForResponse(response => response.url().includes('/emergency_clinic'));
    const reopenMapButton = page.getByRole('button', { name: /Open the map/ });
    if (width < 768) await reopenMapButton.evaluate(element => element.click());
    else await reopenMapButton.click();
    await clinicReload;
    await page.getByText('Distant Browser Clinic', { exact: true }).waitFor();
    await waitForPinsAboveSheet();

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

    // The selected-place card takes centre stage; only Recenter stays active.
    await page.locator('#hc-sheet').waitFor({ state: 'detached' });
    assert.ok(await page.getByRole('button', { name: /^List \(/ }).isDisabled());
    assert.ok(await page.locator('#btn-toggle-layers-menu').isDisabled());
    assert.ok(await page.locator('#btn-show-user-location').isDisabled());
    for (const zoom of ['Zoom in', 'Zoom out']) {
      assert.equal(await page.locator('#help-center-map-root').getByRole('button', { name: zoom }).getAttribute('aria-disabled'), 'true');
    }
    assert.ok(await page.locator('#hc-base-switch button').first().isDisabled());
    assert.ok(await page.locator('#btn-recenter-gis').isEnabled());
    const donate = width >= 1024 ? page.locator('.desktop-rail button[aria-label="Donate"]') : page.getByRole('button', { name: 'Donate', exact: true });
    assert.ok(await donate.isDisabled());
    await page.waitForFunction(() => {
      const card = document.querySelector('.hc-popup .leaflet-popup-content-wrapper')?.getBoundingClientRect();
      const map = document.querySelector('#help-center-map-root')?.getBoundingClientRect();
      return card && map && Math.abs((card.left + card.width / 2) - (map.left + map.width / 2)) < 4 &&
        Math.abs((card.top + card.height / 2) - (map.top + map.height / 2 - 32)) < 4;
    }, null, { timeout: 5000 });
    const card = await popup.locator('.hc-popup-card').boundingBox();
    assert.ok(card && card.width <= width - 32, 'popup card fits within the viewport');
    assert.equal(card.width, isPixel7 ? 250 : 304, 'Pixel 7 gets the narrower pin card without changing other screen sizes');
    await page.locator('.leaflet-popup-close-button').click();
    await popup.waitFor({ state: 'detached' });
    assert.ok(await page.locator('#hc-sheet').isVisible());
    // Closing the place card also restores the sheet-aware overview.
    await waitForPinsAboveSheet();
    assert.ok(await page.locator('#btn-toggle-layers-menu').isEnabled());
    assert.ok(await page.locator('#btn-show-user-location').isEnabled());
    assert.ok(await donate.isEnabled());
    assert.equal(await page.locator('#help-center-map-root').getByRole('button', { name: 'Zoom in' }).getAttribute('aria-disabled'), 'false');
    // Zoom out may naturally be disabled at the fitted minimum zoom.

    if (isPixel7) {
      // A direct pin click works too, and Recenter safely closes the card.
      await page.locator('#help-center-map-root .hc-pin').first().click();
      await popup.waitFor();
      assert.ok(await page.locator('#btn-toggle-layers-menu').isDisabled());
      await page.locator('#btn-recenter-gis').click();
      await popup.waitFor({ state: 'detached' });
      assert.ok(await page.locator('#hc-sheet').isVisible());
      assert.ok(await page.locator('#btn-toggle-layers-menu').isEnabled());
    }
    assert.deepEqual(errors, []);
    console.log(`PASS Help Center place popup layout and dynamic content (${width}px)`);
    await context.close();
  }
} finally {
  await browser.close();
}
