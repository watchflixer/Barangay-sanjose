import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const key = 'san-jose-report-store-v1';
const fixture = {
  id: 'browser-report',
  title: 'Browser test flooding',
  type: 'flood',
  severity: 'high',
  streetName: 'Test Street',
  sitio: 'San Jose',
  coordinates: [14.743, 121.133],
  status: 'active',
  timeReported: 'Test report',
  reportedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  reportedBy: 'Demo Private Reporter',
  reporterEmail: 'reporter@example.test',
  contactNumber: '09000000000',
  description: 'Detailed incident report <img src=x onerror="window.injected=true">',
};
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('dialog', (dialog) => dialog.accept());
    await page.route('**/*', (route) => {
      if (new URL(route.request().url()).origin !== new URL(base).origin) return route.abort();
      return route.continue();
    });
    await page.addInitScript(
      ({ key, fixture }) => {
        try {
          localStorage.setItem('hazardsync:visits-offline', '1');
        } catch {}
        if (!localStorage.getItem('admin-browser-seeded')) {
          localStorage.setItem('san-jose-alerts', JSON.stringify([fixture]));
          localStorage.setItem('admin-browser-seeded', '1');
        }
      },
      { key, fixture },
    );
    await page.goto(base);
    const search = page.getByRole('searchbox', { name: 'Search incident feeds' });
    const openFeed = async () => {
      const button = page.getByRole('button', {
        name: width < 640 ? 'Open incident feeds' : 'Show incident feeds',
        exact: true,
      });
      if (await button.isVisible()) await button.click();
    };
    await openFeed();
    await search.fill('flooding');
    assert.equal(await page.locator('#alert-card-browser-report').count(), 1);
    assert.equal(await page.getByText(fixture.reportedBy, { exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Resolve', exact: true }).count(), 0);
    await search.fill('Admin street');
    assert.equal(await page.getByRole('dialog', { name: 'Admin login' }).count(), 0);
    await search.fill(' Admin ');
    let portal = page.getByRole('dialog');
    await portal.getByRole('heading', { name: 'Admin login', exact: true }).waitFor();
    await portal.getByLabel('Email', { exact: true }).fill('admin');
    await portal.getByLabel('Password', { exact: true }).fill('wrong');
    await portal.getByRole('button', { name: 'Sign in' }).click();
    await portal.getByRole('alert').waitFor();
    await portal.getByLabel('Password', { exact: true }).fill('admin');
    await portal.getByRole('button', { name: 'Sign in' }).click();
    await portal.getByRole('heading', { name: 'Incident administration' }).waitFor();
    assert.equal(await portal.getByText(fixture.reporterEmail, { exact: true }).count(), 1);
    assert.equal(await portal.getByText(fixture.contactNumber, { exact: true }).count(), 1);
    assert.equal(
      await portal
        .getByRole('region', { name: 'Selected report details' })
        .getByText('2 days ago', { exact: true })
        .count(),
      1,
    );
    assert.equal(await page.evaluate(() => window.injected), undefined);
    assert.equal(await portal.locator('img').count(), 0); // All report details remain text.
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await portal.getByLabel('Display reporter name publicly').click();
    await portal.getByRole('alertdialog').getByRole('button', { name: 'Show name publicly' }).click();
    await portal.getByLabel(`Status for ${fixture.title}`).selectOption('resolved');
    await portal.getByRole('button', { name: 'Close admin' }).click();
    assert.equal(await page.getByText(`Reported by: ${fixture.reportedBy}`, { exact: true }).count(), 1);
    await search.fill('admin');
    await portal.getByRole('heading', { name: 'Incident administration' }).waitFor();
    await portal.getByLabel('Display reporter name publicly').uncheck();
    await portal.getByRole('button', { name: 'Remove incident', exact: true }).click();
    await portal.getByRole('alertdialog').getByRole('button', { name: 'Confirm removal' }).click();
    assert.equal(await portal.getByRole('heading', { name: fixture.title, exact: true }).count(), 0);
    await portal.getByLabel('Report archive filter').selectOption('archived');
    await portal.getByText(fixture.reporterEmail, { exact: true }).waitFor();
    await portal.getByRole('button', { name: 'View report history' }).click();
    await portal.getByText('Removed from website (archived)', { exact: true }).waitFor();
    assert.equal(await portal.getByText('Reporter name hidden', { exact: true }).count(), 1);
    await portal.getByRole('button', { name: 'Logout', exact: true }).click();
    await page.reload();
    await openFeed();
    assert.equal(await page.locator('#alert-card-browser-report').count(), 0);
    await search.fill('ADMIN');
    await portal.getByRole('heading', { name: 'Admin login', exact: true }).waitFor();
    await portal.getByLabel('Email', { exact: true }).fill('admin');
    await portal.getByLabel('Password', { exact: true }).fill('admin');
    await portal.getByRole('button', { name: 'Sign in' }).click();
    await portal.getByLabel('Report archive filter').selectOption('archived');
    await portal.getByRole('button', { name: 'Restore incident' }).click();
    await portal.getByLabel('Report archive filter').selectOption('current');
    await portal.getByRole('heading', { name: fixture.title, exact: true }).waitFor();
    await portal.getByRole('button', { name: /^History \(/ }).click();
    await portal.getByText('Restored to website', { exact: true }).waitFor();
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(stored.alerts[0].status, 'resolved');
    assert.equal(stored.alerts[0].showReporter, false);
    assert.equal(stored.history.length, 5);
    assert.equal(await page.evaluate(() => localStorage.getItem('san-jose-alerts')), null);
    await portal.getByRole('button', { name: 'Close admin' }).click();
    await search.fill('Admin');
    await portal.getByRole('heading', { name: 'Incident administration' }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await portal.count(), 0);
    await openFeed();
    await page.locator('#alert-card-browser-report').click();
    await page.locator('#popup-desc-short-browser-report').waitFor();
    assert.equal(await page.locator('#popup-desc-short-browser-report').innerText(), fixture.description);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    assert.equal(await page.locator('.leaflet-popup-content img').count(), 0);
    await page.locator('.leaflet-popup-close-button').click();
    await openFeed();
    await page.locator('button[aria-label="Report a hazard"]:visible').first().click();
    await page
      .getByPlaceholder('e.g. Waist-deep flood along river dike / Snapped electrical cable')
      .fill('New submitted test hazard');
    await page.getByPlaceholder('e.g. Juan Dela Cruz').fill('New Demo Reporter');
    await page.getByPlaceholder('e.g. 09171234567').fill('09000000001');
    await page.getByPlaceholder('e.g. sanjose12@gmail.com').fill('new@example.test');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'proof.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
        'base64',
      ),
    });
    await page.getByText('Photo Proof Attached', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Submit hazard report' }).click();
    await page.getByRole('status').filter({ hasText: 'Report submitted for admin review' }).waitFor();
    await openFeed();
    // A pending community report must stay off the public map until accepted.
    assert.equal(await page.getByRole('heading', { name: 'New submitted test hazard' }).count(), 0);
    await search.fill('Admin');
    await portal.getByRole('button', { name: /^Reports \(/ }).click();
    await portal.getByLabel('Report archive filter').selectOption('pending');
    await portal.getByRole('heading', { name: 'New submitted test hazard' }).waitFor();
    await portal.getByText('new@example.test', { exact: true }).waitFor();
    const created = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(created.alerts[0].reportedBy, 'New Demo Reporter');
    assert.ok(Number.isFinite(Date.parse(created.alerts[0].reportedAt)));
    assert.equal(created.alerts[0].showReporter, false);
    assert.equal(created.alerts[0].reviewStatus, 'pending');
    assert.equal(created.history[0].action, 'Hazard report submitted');
    assert.equal(created.history[0].actor, 'reporter');
    await portal.getByRole('button', { name: 'Accept report', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Report accepted and published' }).waitFor();
    await portal.getByRole('button', { name: 'Close admin' }).click();
    await openFeed();
    await page.getByRole('heading', { name: 'New submitted test hazard', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Dismiss report confirmation' }).click();
    assert.deepEqual(errors, []);
    console.log(`Admin flow passed at ${width}px`);
    await context.close();
  }
} finally {
  await browser.close();
}
