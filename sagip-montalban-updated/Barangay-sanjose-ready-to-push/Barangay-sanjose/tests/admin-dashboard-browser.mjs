import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const key = 'san-jose-report-store-v1';
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const report = (id, overrides = {}) => ({
  id,
  title: `Report ${id}`,
  type: 'flood',
  severity: 'high',
  status: 'active',
  streetName: 'Riverside Street',
  sitio: 'San Jose',
  coordinates: [14.743, 121.133],
  timeReported: 'Original label',
  reportedAt: '2026-10-28T10:00:00Z',
  reportedBy: `Demo Citizen ${id}`,
  reporterEmail: `${id}@example.test`,
  contactNumber: '09000000000',
  description: 'Details <img src=x onerror="window.injected=true"> ' + 'Long incident details. '.repeat(30),
  ...overrides,
});
const fixtures = [
  report('new', { title: 'Heavy rain near Riverside', reportedAt: '2026-10-29T10:00:00Z' }),
  report('old', {
    title: 'Older critical report',
    status: 'monitoring',
    severity: 'critical',
    reportedAt: '2026-10-27T10:00:00Z',
    contactNumber: '09000000001',
  }),
  report('sample', {
    title: 'Undated sample report',
    reportedAt: undefined,
    status: 'resolved',
    severity: 'low',
    reporterEmail: undefined,
  }),
  report('archive', { title: 'Previously archived report', deletedAt: '2026-10-28T11:00:00Z' }),
];
const initial = {
  alerts: fixtures,
  history: [
    {
      id: 'original',
      reportId: 'new',
      title: fixtures[0].title,
      actor: 'reporter',
      action: 'Hazard report submitted',
      at: fixtures[0].reportedAt,
    },
  ],
};
try {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort(),
    );
    await page.addInitScript(
      ({ key, initial }) => {
        try {
          localStorage.setItem('hazardsync:visits-offline', '1');
        } catch {}
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial));
      },
      { key, initial },
    );
    await page.goto(base);
    const openButton = page.getByRole('button', {
      name: viewport.width < 640 ? 'Open incident feeds' : 'Show incident feeds',
      exact: true,
    });
    if (await openButton.isVisible()) await openButton.click();
    await page.getByRole('searchbox', { name: 'Search incident feeds' }).fill('Admin');
    await page.getByLabel('Email', { exact: true }).fill('admin');
    await page.getByLabel('Password', { exact: true }).fill('admin');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    const portal = page.getByRole('dialog', { name: 'Incident administration' });
    const details = portal.getByRole('region', { name: 'Selected report details' });
    await portal.getByRole('button', { name: 'Reports (3)', exact: true }).waitFor();
    assert.equal(
      await portal.getByRole('button', { name: 'Filter Active incidents: 1', exact: true }).count(),
      1,
    );
    assert.equal(await portal.locator('.sj-admin-report-row').count(), 3);
    await portal.getByLabel('Sort reports').selectOption('oldest');
    assert.match(
      await portal.locator('.sj-admin-report-row').first().getAttribute('aria-label'),
      /Older critical report/,
    );
    await portal.getByLabel('Sort reports').selectOption('severity');
    assert.match(
      await portal.locator('.sj-admin-report-row').first().getAttribute('aria-label'),
      /Older critical report/,
    );
    await portal.getByLabel('Search admin reports').fill('09000000001');
    assert.equal(await portal.locator('.sj-admin-report-row').count(), 1);
    await details.getByText('old@example.test', { exact: true }).waitFor();
    await portal.getByLabel('Search admin reports').fill('missing result');
    await portal.getByText('No matching incidents', { exact: true }).waitFor();
    await portal.getByRole('button', { name: 'Reset filters', exact: true }).click();
    await portal.getByRole('button', { name: 'View report: Undated sample report', exact: true }).click();
    await details.getByText('Exact report date unavailable', { exact: true }).waitFor();
    await details.getByText('Exact date not recorded · Original label', { exact: true }).waitFor();
    if (viewport.width < 1100) {
      await details.getByRole('button', { name: 'Back to incident list', exact: true }).click();
      assert.equal(
        await portal
          .getByRole('button', { name: 'View report: Undated sample report', exact: true })
          .evaluate((node) => node === document.activeElement),
        true,
      );
    }
    await portal.getByRole('button', { name: 'Filter Active incidents: 1', exact: true }).click();
    assert.equal(await portal.locator('.sj-admin-report-row').count(), 1);
    await details.getByText('new@example.test', { exact: true }).waitFor();
    assert.equal(await details.locator('img').count(), 0);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    assert.equal(await portal.evaluate((node) => node.scrollWidth > node.clientWidth), false);
    assert.equal(
      await portal.locator('.sj-admin-main').evaluate((node) => node.scrollWidth > node.clientWidth),
      false,
    );
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

    await details.getByRole('button', { name: 'Remove incident', exact: true }).click();
    let confirmation = portal.getByRole('alertdialog', { name: 'Remove this incident?', exact: true });
    await confirmation.waitFor();
    assert.equal(
      await confirmation
        .getByRole('button', { name: 'Cancel', exact: true })
        .evaluate((node) => node === document.activeElement),
      true,
    );
    await page.keyboard.press('Shift+Tab');
    assert.equal(
      await confirmation
        .getByRole('button', { name: 'Confirm removal', exact: true })
        .evaluate((node) => node === document.activeElement),
      true,
    );
    await page.keyboard.press('Tab');
    assert.equal(
      await confirmation
        .getByRole('button', { name: 'Cancel', exact: true })
        .evaluate((node) => node === document.activeElement),
      true,
    );
    await page.keyboard.press('Escape');
    assert.equal(await confirmation.count(), 0);
    assert.equal(await portal.count(), 1);
    const visibility = details.getByRole('switch');
    await visibility.click();
    await portal.getByRole('alertdialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await visibility.isChecked(), false);
    await visibility.click();
    await portal
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Show name publicly', exact: true })
      .click();
    assert.equal(await visibility.isChecked(), true);
    await details.getByLabel(`Status for ${fixtures[0].title}`).selectOption('monitoring');
    await portal.getByRole('button', { name: 'Filter Active incidents: 0', exact: true }).waitFor();
    await portal.getByRole('button', { name: 'Filter Monitoring: 2', exact: true }).waitFor();
    await portal.getByRole('button', { name: 'Filter Total reports: 3', exact: true }).click();
    await portal.getByRole('button', { name: `View report: ${fixtures[0].title}`, exact: true }).click();
    await details.getByRole('button', { name: 'Remove incident', exact: true }).click();
    await portal
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Confirm removal', exact: true })
      .click();
    await portal.getByRole('button', { name: 'Archive (2)', exact: true }).click();
    await portal.getByRole('button', { name: `View report: ${fixtures[0].title}`, exact: true }).click();
    await details.getByText('new@example.test', { exact: true }).waitFor();
    await details.getByRole('button', { name: 'Restore incident', exact: true }).click();
    await portal.getByRole('button', { name: 'Reports (3)', exact: true }).click();
    await portal.getByRole('button', { name: `View report: ${fixtures[0].title}`, exact: true }).click();
    await details.getByRole('switch').uncheck();
    await details.getByRole('button', { name: 'View report history', exact: true }).click();
    assert.equal(await portal.locator('.sj-admin-event').count(), 6);
    await portal.getByLabel('Filter history by author').selectOption('reporter');
    assert.equal(await portal.locator('.sj-admin-event').count(), 1);
    await portal.getByText('Hazard report submitted', { exact: true }).waitFor();
    await portal.getByLabel('Filter history by author').selectOption('admin');
    assert.equal(await portal.locator('.sj-admin-event').count(), 5);
    await portal
      .getByRole('button', { name: `Review report: ${fixtures[0].title}`, exact: true })
      .first()
      .click();
    await details.getByText('new@example.test', { exact: true }).waitFor();
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(stored.history.length, 6); // Cancelled actions never enter the log.
    assert.equal(stored.alerts.find((alert) => alert.id === 'new').showReporter, false);
    assert.equal(stored.alerts.find((alert) => alert.id === 'new').deletedAt, undefined);
    assert.equal(stored.alerts.find((alert) => alert.id === 'new').status, 'monitoring');
    assert.deepEqual(errors, []);
    console.log(`Dashboard UX passed at ${viewport.width}×${viewport.height}`);
    await context.close();
  }
} finally {
  await browser.close();
}
