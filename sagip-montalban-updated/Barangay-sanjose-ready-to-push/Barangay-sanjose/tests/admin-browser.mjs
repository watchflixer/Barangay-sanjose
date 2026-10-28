import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { baseReport, createBackend } from './supabase-mock.mjs';

// The hidden door, the server-checked password and the shared workspace:
// everything an admin sees comes from the barangay backend, not this browser.
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      reducedMotion: 'reduce',
    });
    const backend = createBackend([
      baseReport('hz-001', { title: 'Kasiglahan riverside flooding' }),
      baseReport('hz-002', {
        type: 'fire',
        title: 'Litex fire alert',
        severity: 'critical',
        status: 'monitoring',
        show_reporter: true,
      }),
    ]);
    await backend.install(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base);
    await page.locator('#alert-card-hz-001').waitFor();

    const openFeed = async () => {
      const button = page.getByRole('button', {
        name: width < 640 ? 'Open incident feeds' : 'Show incident feeds',
        exact: true,
      });
      if (await button.isVisible()) await button.click();
    };
    const search = page.getByRole('searchbox', { name: 'Search incident feeds' });
    await openFeed();

    // Reporters stay private on the public card even when the name is shown.
    assert.equal(await page.getByText('maria.santos@gmail.com', { exact: true }).count(), 0);
    assert.equal(await page.getByText('09171234567', { exact: true }).count(), 0);

    // The entry point is the exact word "Admin", not a prefix.
    await search.fill('Admin street');
    assert.equal(await page.getByRole('dialog', { name: 'Admin login' }).count(), 0);
    await search.fill(' Admin ');
    const login = page.getByRole('dialog', { name: 'Admin login', exact: true });
    await login.getByRole('heading', { name: 'Admin login', exact: true }).waitFor();

    // The password is verified by the server.
    await login.getByLabel('Email', { exact: true }).fill('admin');
    await login.getByLabel('Password', { exact: true }).fill('wrong');
    await login.getByRole('button', { name: 'Sign in', exact: true }).click();
    await login.getByRole('alert').waitFor();
    assert.equal(backend.state.calls.some((call) => call.name === 'admin_bundle'), false);
    await login.getByLabel('Password', { exact: true }).fill('admin');
    await login.getByRole('button', { name: 'Sign in', exact: true }).click();

    const portal = page.getByRole('dialog', { name: 'Incident administration' });
    await portal.getByRole('heading', { name: 'Incident administration' }).waitFor();
    await portal.getByText('maria.santos@gmail.com', { exact: true }).first().waitFor();
    await portal.getByText('09171234567', { exact: true }).first().waitFor();
    assert.equal(backend.state.calls.some((call) => call.name === 'admin_bundle'), true);

    // The visible reporter name reached the public feed.
    await page.keyboard.press('Escape');
    assert.equal(await portal.count(), 0);
    await openFeed();
    await page.getByText('Reported by: Maria Santos', { exact: true }).first().waitFor();

    // Signing out drops the password and the workspace data.
    await search.fill('Admin');
    await portal.getByRole('heading', { name: 'Incident administration' }).waitFor();
    await portal.getByRole('button', { name: 'Logout', exact: true }).click();
    await search.fill('Admin');
    await page.getByRole('dialog', { name: 'Admin login', exact: true }).waitFor();

    assert.deepEqual(errors, []);
    console.log(`Admin entry, server login and shared workspace passed at ${width}px`);
    await context.close();
  }
} finally {
  await browser.close();
}
