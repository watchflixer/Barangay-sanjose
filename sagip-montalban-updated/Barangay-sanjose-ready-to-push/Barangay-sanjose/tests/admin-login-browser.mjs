import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
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
    await page.addInitScript(() => {
      try {
        localStorage.setItem('hazardsync:visits-offline', '1');
      } catch {}
    });
    await page.goto(base);
    const openButton = page.getByRole('button', {
      name: viewport.width < 640 ? 'Open incident feeds' : 'Show incident feeds',
      exact: true,
    });
    if (await openButton.isVisible()) await openButton.click();
    const search = page.getByRole('searchbox', { name: 'Search incident feeds' });
    await search.fill('Admin');
    const portal = page.getByRole('dialog', { name: 'Admin login', exact: true });
    const email = portal.getByLabel('Email', { exact: true });
    const password = portal.getByLabel('Password', { exact: true });
    await portal.waitFor();
    assert.equal(await email.evaluate((node) => node === document.activeElement), true);
    assert.equal(await portal.evaluate((node) => getComputedStyle(node).animationName), 'none');
    const bounds = await portal.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y >= 0);
    assert.ok(bounds.x + bounds.width <= viewport.width);
    assert.ok(bounds.y + bounds.height <= viewport.height);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await portal.evaluate((node) => node.scrollWidth > node.clientWidth), false);
    if (viewport.width < 640)
      assert.ok((await email.evaluate((node) => parseFloat(getComputedStyle(node).fontSize))) >= 16);
    await email.fill('admin');
    await password.fill('wrong');
    await portal.getByRole('button', { name: 'Show password', exact: true }).click();
    assert.equal(await password.getAttribute('type'), 'text');
    assert.equal(await password.inputValue(), 'wrong');
    assert.equal(
      await portal.getByRole('button', { name: 'Hide password', exact: true }).getAttribute('aria-pressed'),
      'true',
    );
    await portal.getByRole('button', { name: 'Hide password', exact: true }).click();
    assert.equal(await password.getAttribute('type'), 'password');
    await portal.getByRole('button', { name: 'Sign in', exact: true }).click();
    await portal.getByRole('alert').waitFor();
    assert.equal(await password.getAttribute('aria-invalid'), 'true');
    assert.equal(await password.evaluate((node) => node === document.activeElement), true);
    await password.fill('admin');
    assert.equal(await portal.getByRole('alert').count(), 0);
    // Tab navigation stays within the dialog in both directions.
    await portal.getByRole('button', { name: 'Sign in', exact: true }).focus();
    await page.keyboard.press('Tab');
    assert.equal(
      await portal
        .getByRole('button', { name: 'Close admin' })
        .evaluate((node) => node === document.activeElement),
      true,
    );
    await page.keyboard.press('Shift+Tab');
    assert.equal(
      await portal
        .getByRole('button', { name: 'Sign in', exact: true })
        .evaluate((node) => node === document.activeElement),
      true,
    );
    await page.keyboard.press('Escape');
    assert.equal(await portal.count(), 0);
    assert.equal(await search.evaluate((node) => node === document.activeElement), true);
    await search.fill('Admin');
    await portal.waitFor();
    assert.equal(await email.inputValue(), '');
    assert.equal(await password.inputValue(), '');
    assert.equal(await password.getAttribute('type'), 'password');
    await email.fill('admin');
    await password.fill('admin');
    await portal.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('heading', { name: 'Incident administration', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(`Login UX passed at ${viewport.width}×${viewport.height}`);
    await context.close();
  }
} finally {
  await browser.close();
}
