import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { forecastFixture, radarFixture } from './weather-fixture.mjs';

// Run against dev OR built preview. External providers are mocked because CI
// must not depend on their availability, quota, or unrestricted internet.
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader']
});
try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let failWeather = false;
    let failRadar = false;
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname === 'api.open-meteo.com') {
        if (failWeather) return route.fulfill({ status: 503, body: '{}' });
        const count = url.searchParams.get('latitude').split(',').length;
        const fixtures = Array.from({ length: count }, forecastFixture);
        return route.fulfill({ json: count === 1 ? fixtures[0] : fixtures });
      }
      if (url.hostname === 'api.rainviewer.com') {
        return route.fulfill({ status: failRadar ? 503 : 200, json: failRadar ? {} : radarFixture() });
      }
      if (url.origin !== new URL(base).origin) return route.abort();
      return route.continue();
    });
    await page.goto(`${base}/weather.html`);
    await page.locator('.city-marker-pin').first().waitFor();
    assert.equal(await page.locator('.leaflet-container').count(), 1);
    assert.ok(await page.locator('.city-marker-pin').count() >= 10);
    for (const mode of ['Temperature', 'Wind', 'Rain', 'Weather']) {
      await page.getByRole('button', { name: mode, exact: true }).click();
      await page.waitForTimeout(100);
    }
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
    await page.locator('.city-marker-pin').filter({ hasText: 'Manila' }).first().click({ force: true });
    await page.getByRole('heading', { name: 'Manila', exact: true }).waitFor();
    assert.equal(await page.getByText(/\bNaN\b/).count(), 0);
    await page.getByRole('button', { name: 'Close dialog' }).click();
    assert.equal(await page.getByText('Updated:', { exact: false }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Refresh weather' }).count(), 0);
    failWeather = true;
    await page.reload();
    await page.getByText('Hindi ma-load', { exact: false }).waitFor();
    assert.equal(await page.locator('.city-marker-pin').count(), 0, 'no fabricated fallback');
    failWeather = false;
    failRadar = true;
    await page.reload();
    await page.locator('.city-marker-pin').first().waitFor();
    await page.getByRole('button', { name: 'Rain', exact: true }).click();
    await page.getByText('Walang radar data', { exact: false }).waitFor();
    failRadar = false;
    await page.reload();
    await page.locator('.city-marker-pin').first().waitFor();
    // Exercise the actual host app / iframe boundary, not only weather.html.
    await page.goto(base);
    const hostLayers = page.getByTitle('Layers', { exact: true });
    await hostLayers.click();
    await page.getByRole('button', { name: 'Weather', exact: true }).click();
    const weather = page.frameLocator('iframe[title="Panahon weather map and radar"]');
    await weather.locator('.city-marker-pin').first().waitFor();
    assert.equal(await weather.locator('.leaflet-container').count(), 1);
    await weather.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await weather.getByRole('button', { name: 'Layers', exact: true }).click();
    await weather.getByRole('button', { name: 'Streets', exact: true }).click();
    await page.locator('iframe[title="Panahon weather map and radar"]').waitFor({ state: 'detached' });
    await hostLayers.click();
    await page.getByRole('button', { name: 'Weather', exact: true }).click();
    await weather.locator('.city-marker-pin').first().waitFor();
    assert.deepEqual(errors, []);
    console.log(`PASS weather rendering, 4 modes, zoom, modal, provider errors and hidden status bar (${viewport.width}px)`);
    await page.close();
  }
} finally {
  await browser.close();
}
