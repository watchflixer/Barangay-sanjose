import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const key = 'san-jose-report-store-v1';
const fixture = (id) => ({
  id,
  title: `Review ${id}`,
  type: 'flood',
  status: 'active',
  severity: 'high',
  streetName: 'Riverside',
  sitio: 'San Jose',
  coordinates: [14.743, 121.133],
  timeReported: 'Original label',
  reportedAt: '2026-10-29T10:00:00Z',
  reportedBy: 'Demo citizen',
  reporterEmail: `${id}@example.test`,
  contactNumber: '09000000000',
  description: 'Incident for admin review',
  reviewStatus: 'pending',
  source: 'community',
});
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort(),
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(
      ({ key, alerts }) => {
        try {
          localStorage.setItem('hazardsync:visits-offline', '1');
        } catch {}
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ alerts, history: [] }));
      },
      {
        key,
        alerts: [fixture('accept'), fixture('decline'), { ...fixture('legacy'), reviewStatus: undefined }],
      },
    );
    const openFeed = async () => {
      const button = page.getByRole('button', {
        name: width < 640 ? 'Open incident feeds' : 'Show incident feeds',
        exact: true,
      });
      if (await button.isVisible()) await button.click();
    };
    const login = async () => {
      await openFeed();
      await page.getByRole('searchbox', { name: 'Search incident feeds' }).fill('Admin');
      await page.getByLabel('Email', { exact: true }).fill('admin');
      await page.getByLabel('Password', { exact: true }).fill('admin');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    };
    await page.goto(base);
    await openFeed();
    assert.equal(await page.locator('#alert-card-accept').count(), 0);
    assert.equal(await page.locator('#alert-card-decline').count(), 0);
    assert.equal(await page.locator('#alert-card-legacy').count(), 1);
    await login();
    const portal = page.getByRole('dialog', { name: 'Incident administration' });
    const details = portal.getByRole('region', { name: 'Selected report details' });
    await portal.getByTestId('visits-total').getByText('5,000', { exact: true }).waitFor();
    await portal.getByRole('button', { name: 'Pending review (2)', exact: true }).click();
    await portal.getByRole('button', { name: 'View report: Review accept', exact: true }).click();
    await details.getByRole('button', { name: 'Accept report', exact: true }).click();
    await portal.getByRole('button', { name: 'Reports (2)', exact: true }).waitFor();
    await portal.getByRole('button', { name: 'View report: Review decline', exact: true }).click();
    await details.getByRole('button', { name: 'Decline report', exact: true }).click();
    await portal
      .getByRole('alertdialog', { name: 'Decline this report?' })
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
    await details.getByRole('button', { name: 'Decline report', exact: true }).click();
    const confirm = portal.getByRole('alertdialog', { name: 'Decline this report?' });
    await confirm.getByLabel('Decline reason').fill('Duplicate of an existing incident');
    await confirm.getByRole('button', { name: 'Confirm decline', exact: true }).click();
    await portal.getByRole('button', { name: 'Declined (1)', exact: true }).click();
    await details.getByText('Reason: Duplicate of an existing incident', { exact: true }).waitFor();
    await details.getByRole('button', { name: 'Remove incident', exact: true }).click();
    await portal.getByRole('alertdialog').getByRole('button', { name: 'Confirm removal' }).click();
    await portal.getByRole('button', { name: 'Archive (1)', exact: true }).click();
    await details.getByRole('button', { name: 'Restore incident', exact: true }).click();
    await portal.getByRole('button', { name: 'Declined (1)', exact: true }).waitFor();
    await portal.getByRole('button', { name: 'Add incident', exact: true }).click();
    const form = portal.getByRole('region', { name: 'Add incident' });
    await form.getByLabel('Incident title').fill('Official admin flood notice');
    await form.getByLabel('Description').fill('Admin-created incident description.');
    await form.getByLabel('Street / landmark').fill('Riverside Road');
    await form.getByLabel('Longitude').fill('181');
    await form.getByRole('button', { name: 'Publish incident', exact: true }).click();
    assert.equal(await form.getByLabel('Longitude').evaluate((node) => node.validity.valid), false);
    await form.getByLabel('Longitude').fill('121.133');
    await form.getByRole('button', { name: 'Publish incident', exact: true }).click();
    await details.getByRole('heading', { name: 'Official admin flood notice', exact: true }).waitFor();
    await portal.getByRole('button', { name: 'Reports (3)', exact: true }).waitFor();
    assert.equal(await portal.getByTestId('visits-total').innerText(), '5,000');
    if (width === 1280) {
      const other = await context.newPage();
      await other.goto(base);
      await portal.getByTestId('visits-total').getByText('5,001', { exact: true }).waitFor();
      await other.reload();
      await portal.getByTestId('visits-total').getByText('5,002', { exact: true }).waitFor();
      await other.close();
    }
    assert.equal(await portal.locator('img').count(), 0);
    assert.equal(
      await portal.locator('.sj-admin-main').evaluate((node) => node.scrollWidth > node.clientWidth),
      false,
    );
    await portal.getByRole('button', { name: 'Close admin', exact: true }).click();
    await openFeed();
    assert.equal(await page.locator('#alert-card-accept').count(), 1);
    assert.equal(await page.locator('#alert-card-decline').count(), 0);
    await page.getByRole('heading', { name: 'Official admin flood notice', exact: true }).waitFor();
    await page.getByRole('searchbox', { name: 'Search incident feeds' }).fill('Admin');
    await portal
      .getByRole('button', { name: 'View report: Official admin flood notice', exact: true })
      .click();
    await details.getByRole('button', { name: 'Remove incident', exact: true }).click();
    await portal.getByRole('alertdialog').getByRole('button', { name: 'Confirm removal' }).click();
    await portal.getByRole('button', { name: 'History (6)', exact: true }).click();
    await portal.getByText('Report accepted and published', { exact: true }).waitFor();
    await portal.getByText('Report declined: Duplicate of an existing incident', { exact: true }).waitFor();
    await portal.getByText('Admin incident created and published', { exact: true }).waitFor();
    await portal.getByRole('button', { name: 'Logout', exact: true }).click();
    await page.reload();
    await openFeed();
    assert.equal(
      await page.getByRole('heading', { name: 'Official admin flood notice', exact: true }).count(),
      0,
    );
    assert.equal(await page.locator('#alert-card-accept').count(), 1);
    assert.equal(await page.locator('#alert-card-decline').count(), 0);
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(stored.alerts.find((a) => a.id === 'decline').reviewStatus, 'declined');
    assert.equal(stored.history.length, 6);
    assert.deepEqual(errors, []);
    console.log(`Moderation, creation, removal and visits passed at ${width}px`);
    await context.close();
  }
} finally {
  await browser.close();
}
