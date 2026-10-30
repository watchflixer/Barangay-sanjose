import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { baseReport, createBackend } from './supabase-mock.mjs';

/**
 * A SELECTED REPORT STAYS ON SCREEN
 *
 * Once a resident taps a pin or a feed card, that report's popup must stay
 * open on every device until they tap its own X (or pick another report).
 *
 * Everything below used to dismiss it:
 *   - tapping the same pin again (Leaflet toggles a popup shut on marker click),
 *   - re-rendering the app, because the marker layer was cleared and rebuilt
 *     (Leaflet closes a popup when its marker is removed) — this happened on
 *     drawer toggles and on every live-feed poll,
 *   - re-selecting the same report (the map only reacted to an id change).
 *
 * Tapping the map background, pressing Escape and a live feed refresh must all
 * leave the popup alone now.
 */
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const popupCount = (page) => page.locator('.leaflet-popup').count();
const popupText = async (page) => {
  const popup = page.locator('.leaflet-popup').first();
  return (await popup.textContent()) ?? '';
};
const assertOpenOn = async (page, title, label) => {
  assert.equal(await popupCount(page), 1, `${label}: exactly one popup is open`);
  assert.ok((await popupText(page)).includes(title), `${label}: the popup still shows "${title}"`);
};
const assertClosed = async (page, label) => {
  assert.equal(await popupCount(page), 0, `${label}: no popup is left open`);
};

try {
  /* ------------------------------------------------------------------ phone */
  {
    const context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'reduce',
    });
    const backend = createBackend([
      baseReport('hz-001', { title: 'Kasiglahan riverside flooding', lat: 14.7468, lng: 121.1378 }),
      baseReport('hz-002', { title: 'Litex transformer fire', type: 'fire', lat: 14.735, lng: 121.125 }),
    ]);
    await backend.install(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base);
    await page.locator('#alert-card-hz-001').waitFor();

    // Phones start with the feed drawer shut; open it like a resident would.
    const phoneDrawer = page.getByRole('button', { name: 'Open incident feeds', exact: true });
    if (await phoneDrawer.isVisible()) await phoneDrawer.click();
    await page.waitForTimeout(500);

    // A feed card opens the report and gets the drawer out of the way.
    await page.locator('#alert-card-hz-001').click();
    await page.waitForTimeout(1800);
    await assertOpenOn(page, 'Kasiglahan riverside flooding', 'phone: card tap');

    // Nothing the resident does on the map dismisses it.
    const map = await page.locator('#leaflet-map-root').boundingBox();
    await page.mouse.click(map.x + map.width * 0.8, map.y + map.height * 0.85);
    await page.waitForTimeout(500);
    await assertOpenOn(page, 'Kasiglahan riverside flooding', 'phone: map tap');

    // The X still closes it — that is the one control that may.
    await page.locator('.leaflet-popup-close-button').first().click();
    await page.waitForTimeout(400);
    await assertClosed(page, 'phone: X button');

    // A pin tap on a touch screen must open it too (Leaflet's toggle is gone).
    await page.locator('#map-pin-hz-001').tap({ force: true });
    await page.waitForTimeout(1800);
    await assertOpenOn(page, 'Kasiglahan riverside flooding', 'phone: pin tap');
    await page.locator('#map-pin-hz-001').tap({ force: true });
    await page.waitForTimeout(700);
    await assertOpenOn(page, 'Kasiglahan riverside flooding', 'phone: same pin tapped twice');
    await page.locator('.leaflet-popup-close-button').first().tap();
    await page.waitForTimeout(400);
    await assertClosed(page, 'phone: X button after pin tap');

    // ...and picking the card again re-opens the same report.
    const openDrawer = page.getByRole('button', { name: 'Open incident feeds', exact: true });
    if (await openDrawer.isVisible()) await openDrawer.click();
    await page.locator('#alert-card-hz-001').click();
    await page.waitForTimeout(1800);
    await assertOpenOn(page, 'Kasiglahan riverside flooding', 'phone: card tap after X');

    assert.deepEqual(errors, []);
    await context.close();
  }

  /* ---------------------------------------------------------------- desktop */
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      reducedMotion: 'reduce',
    });
    const backend = createBackend([
      baseReport('hz-001', { title: 'Kasiglahan riverside flooding', lat: 14.7468, lng: 121.1378 }),
      baseReport('hz-002', { title: 'Litex transformer fire', type: 'fire', lat: 14.735, lng: 121.125 }),
    ]);
    await backend.install(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base);
    await page.locator('#alert-card-hz-001').waitFor();
    await page.waitForTimeout(1200);

    await page.locator('#map-pin-hz-001').click({ force: true });
    await page.waitForTimeout(1500);
    await assertOpenOn(page, 'Kasiglahan riverside flooding', 'desktop: pin tap');

    // Tapping the same pin again must NOT toggle it shut.
    await page.locator('#map-pin-hz-001').click({ force: true });
    await page.waitForTimeout(900);
    await assertOpenOn(page, 'Kasiglahan riverside flooding', 'desktop: same pin again');

    // "See more" expands the description in place — the popup must not close.
    const seeMore = page.locator('[id^="btn-popup-more-"]');
    if (await seeMore.count()) {
      await seeMore.first().click();
      await page.waitForTimeout(400);
      await assertOpenOn(page, 'Kasiglahan riverside flooding', 'desktop: see more');
    }

    // Tapping the map background.
    const map = await page.locator('#leaflet-map-root').boundingBox();
    await page.mouse.click(map.x + map.width * 0.85, map.y + map.height * 0.8);
    await page.waitForTimeout(600);
    await assertOpenOn(page, 'Kasiglahan riverside flooding', 'desktop: map background');

    // Escape must not close it either.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await assertOpenOn(page, 'Kasiglahan riverside flooding', 'desktop: Escape');

    // The feed toggle stands down while a report is open (see the lockdown
    // suite), so the drawer cannot be used to re-render underneath the card.
    const drawer = page.getByRole('button', { name: 'Show incident feeds', exact: true });
    if (await drawer.isVisible()) {
      assert.equal(await drawer.isDisabled(), true, 'desktop: the feed toggle waits for the card');
    }
    await assertOpenOn(page, 'Kasiglahan riverside flooding', 'desktop: feed toggle locked');

    // Close it, then pick another report from the feed: it switches the popup
    // rather than adding a second one.
    await page.locator('.leaflet-popup-close-button').first().click();
    await page.waitForTimeout(1600);
    await assertClosed(page, 'desktop: X before switching');
    if (await drawer.isVisible()) await drawer.click();
    await page.waitForTimeout(500);
    await page.locator('#alert-card-hz-002').click();
    await page.waitForTimeout(2000);
    await assertOpenOn(page, 'Litex transformer fire', 'desktop: other report');
    assert.equal(await popupCount(page), 1, 'desktop: only one report is open at a time');

    // The newly opened report survives its own pin being tapped again.
    await page.locator('#map-pin-hz-002').click({ force: true });
    await page.waitForTimeout(900);
    await assertOpenOn(page, 'Litex transformer fire', 'desktop: same pin after switch');

    // A live feed refresh (poll) re-renders the app with a new alerts array;
    // the open report must survive it.
    backend.state.reports.push(
      baseReport('hz-new', { title: 'Fresh community report', lat: 14.742, lng: 121.132 }),
    );
    // (The card may be inside the closed drawer — attached is enough proof
    // that the live feed refreshed the app.)
    await page.locator('#alert-card-hz-new').waitFor({ state: 'attached', timeout: 70000 });
    await assertOpenOn(page, 'Litex transformer fire', 'desktop: live feed refresh');

    await page.locator('.leaflet-popup-close-button').first().click();
    await page.waitForTimeout(400);
    await assertClosed(page, 'desktop: X button');

    // ...and the very same pin can be tapped again to bring it back.
    await page.locator('#map-pin-hz-002').click({ force: true });
    await page.waitForTimeout(1500);
    await assertOpenOn(page, 'Litex transformer fire', 'desktop: pin tap after X');

    assert.deepEqual(errors, []);
    await context.close();
  }

  console.log('Selected report stays open on every device until its X');
} finally {
  await browser.close();
}
