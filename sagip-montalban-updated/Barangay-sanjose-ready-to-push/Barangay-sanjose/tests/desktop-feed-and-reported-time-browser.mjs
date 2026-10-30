import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { baseReport, createBackend } from './supabase-mock.mjs';

/**
 * END-TO-END VERIFICATION:
 * 1. Accurate `Reported:` timestamps in Incident Feeds AND Map Pin Cards —
 *    even when database rows carry literal `time_reported: 'Just now'`.
 * 2. Desktop Incident Feeds <-> Pin Card flow:
 *    - Incident Feeds starts OPEN on desktop load.
 *    - Clicking a map pin OR an incident card CLOSES Incident Feeds to show
 *      the centred Pin Card.
 *    - Clicking the Pin Card's `X` (back) button RECENTERS the map AND
 *      REOPENS Incident Feeds on desktop (while keeping phone drawers closed).
 */
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';

const nowMs = Date.now();
const isoAgo = (ms) => new Date(nowMs - ms).toISOString();

const REPORTS = [
  baseReport('hz-just-now', {
    title: 'Fresh streetlight outage along Rodriguez Hwy',
    type: 'streetlight',
    time_reported: 'Just now',
    reported_at: isoAgo(15 * 1000), // 15 seconds ago -> Just now
    created_at: isoAgo(15 * 1000),
    lat: 14.7425,
    lng: 121.131,
  }),
  baseReport('hz-25m', {
    title: 'Low-pressure water interruption in Kasiglahan',
    type: 'water',
    time_reported: 'Just now',
    reported_at: isoAgo(25 * 60 * 1000), // 25 minutes ago
    created_at: isoAgo(25 * 60 * 1000),
    lat: 14.7468,
    lng: 121.1378,
  }),
  baseReport('hz-4h', {
    title: 'Dark Streets Increase Risk of Accidents and Crime',
    type: 'streetlight',
    time_reported: 'Just now',
    reported_at: isoAgo(4 * 60 * 60 * 1000 + 5 * 60 * 1000), // 4 hours ago
    created_at: isoAgo(4 * 60 * 60 * 1000 + 5 * 60 * 1000),
    lat: 14.739,
    lng: 121.128,
  }),
  baseReport('hz-2d', {
    title: 'Fallen tree limb partially blocking alley',
    type: 'road',
    time_reported: 'Just now',
    reported_at: isoAgo(2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 2 days ago
    created_at: isoAgo(2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
    lat: 14.735,
    lng: 121.125,
  }),
];

const readDesktopState = (page) =>
  page.evaluate(() => {
    const panel = document.querySelector('#app-sidebar-panel');
    const panelStyle = panel ? getComputedStyle(panel) : null;
    const panelRect = panel?.getBoundingClientRect();
    const feedVisible = !!(
      panel &&
      panelStyle &&
      panelStyle.display !== 'none' &&
      panelRect &&
      panelRect.width > 100 &&
      panelRect.right > 40
    );

    const map = document.querySelector('#leaflet-map-root')?.getBoundingClientRect();
    const popup = document.querySelector('.leaflet-popup')?.getBoundingClientRect();
    const popupText = document.querySelector('.leaflet-popup')?.textContent ?? '';
    const pin = document.querySelector('#map-pin-hz-4h')?.getBoundingClientRect();

    return {
      feedVisible,
      hasFeedOpenClass: panel?.classList.contains('is-feed-open') ?? false,
      popupOpen: !!popup,
      popupText,
      cardCentred:
        map && popup
          ? Math.abs(popup.x + popup.width / 2 - (map.x + map.width / 2)) <= 10 &&
            Math.abs(popup.y + popup.height / 2 - (map.y + map.height / 2)) <= 10
          : false,
      pinOffset:
        map && pin
          ? [
              Math.round(pin.x + pin.width / 2 - (map.x + map.width / 2)),
              Math.round(pin.y + pin.height / 2 - (map.y + map.height / 2)),
            ]
          : null,
    };
  });

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  /* ========================================================================
   * 1. DESKTOP VIEW: Reported timestamps + Open/Close/Recenter Pin Card Flow
   * ======================================================================== */
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: 'reduce',
    });
    const backend = createBackend(REPORTS);
    await backend.install(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(base);
    await page.locator('#alert-card-hz-4h').waitFor();
    await page.waitForTimeout(900);

    // A) Desktop opens with Incident Feeds automatically OPEN
    const initial = await readDesktopState(page);
    assert.equal(initial.feedVisible, true, 'desktop: Incident Feeds starts open on load');
    assert.equal(initial.hasFeedOpenClass, true, 'desktop: sidebar carries .is-feed-open on load');
    assert.ok(initial.pinOffset, 'desktop: default recentered pin offset recorded');

    // B) Incident Feeds shows accurate relative timestamps instead of stale "Just now"
    const justNowCard = await page.locator('#alert-card-hz-just-now').textContent();
    const minsCard = await page.locator('#alert-card-hz-25m').textContent();
    const hoursCard = await page.locator('#alert-card-hz-4h').textContent();
    const daysCard = await page.locator('#alert-card-hz-2d').textContent();

    assert.ok(justNowCard?.includes('Just now'), `fresh report says Just now: ${justNowCard}`);
    assert.ok(
      minsCard?.includes('25 minutes ago') || minsCard?.includes('26 minutes ago'),
      `25m report shows accurate minutes ago instead of Just now: ${minsCard}`,
    );
    assert.ok(!minsCard?.includes('Just now'), '25m report does NOT show stale Just now');
    assert.ok(
      hoursCard?.includes('4 hours ago'),
      `4h report shows "4 hours ago" instead of Just now: ${hoursCard}`,
    );
    assert.ok(!hoursCard?.includes('Just now'), '4h report does NOT show stale Just now');
    assert.ok(
      daysCard?.includes('2 days ago'),
      `2d report shows "2 days ago" instead of Just now: ${daysCard}`,
    );

    // C) Clicking a MAP PIN closes Incident Feeds and opens the centred Pin Card
    await page.locator('#map-pin-hz-4h').click({ force: true });
    await page.waitForTimeout(2000);

    const afterPinClick = await readDesktopState(page);
    assert.equal(afterPinClick.popupOpen, true, 'desktop: clicking pin opens pin card');
    assert.equal(afterPinClick.feedVisible, false, 'desktop: clicking pin closes Incident Feeds');
    assert.equal(afterPinClick.cardCentred, true, 'desktop: pin card is centred on the widened map');
    assert.ok(
      afterPinClick.popupText.includes('Reported:') && afterPinClick.popupText.includes('4 hours ago'),
      `desktop pin card shows accurate "Reported: 4 hours ago": ${afterPinClick.popupText}`,
    );
    assert.ok(
      !afterPinClick.popupText.includes('Just now'),
      'desktop pin card does NOT show stale "Just now"',
    );

    // D) Clicking X on the Pin Card recenters the map AND reopens Incident Feeds
    const closeBtn1 = await page.locator('.leaflet-popup-close-button').first().boundingBox();
    assert.ok(closeBtn1, 'desktop: pin card has X close button');
    await page.mouse.click(closeBtn1.x + closeBtn1.width / 2, closeBtn1.y + closeBtn1.height / 2);
    await page.waitForTimeout(1600);

    const afterClose1 = await readDesktopState(page);
    assert.equal(afterClose1.popupOpen, false, 'desktop: X closes the pin card');
    assert.equal(afterClose1.feedVisible, true, 'desktop: X reopens Incident Feeds');
    assert.equal(afterClose1.hasFeedOpenClass, true, 'desktop: .is-feed-open restored after X');
    assert.ok(
      afterClose1.pinOffset &&
        Math.abs(afterClose1.pinOffset[0] - initial.pinOffset[0]) <= 4 &&
        Math.abs(afterClose1.pinOffset[1] - initial.pinOffset[1]) <= 4,
      `desktop: X recenters map back to default view (${JSON.stringify(initial.pinOffset)} -> ${JSON.stringify(afterClose1.pinOffset)})`,
    );

    // E) Clicking an INCIDENT CARD inside Incident Feeds ALSO closes Incident Feeds
    //    to show the Pin Card, and clicking X recenters + reopens Incident Feeds again
    await page.locator('#alert-card-hz-25m').click();
    await page.waitForTimeout(2000);

    const afterFeedCardClick = await readDesktopState(page);
    assert.equal(afterFeedCardClick.popupOpen, true, 'desktop: feed card click opens pin card');
    assert.equal(afterFeedCardClick.feedVisible, false, 'desktop: feed card click closes Incident Feeds');
    assert.equal(afterFeedCardClick.cardCentred, true, 'desktop: pin card centred after feed card click');
    assert.ok(
      afterFeedCardClick.popupText.includes('25 minutes ago') ||
        afterFeedCardClick.popupText.includes('26 minutes ago'),
      `desktop pin card shows accurate minutes ago: ${afterFeedCardClick.popupText}`,
    );

    const closeBtn2 = await page.locator('.leaflet-popup-close-button').first().boundingBox();
    assert.ok(closeBtn2, 'desktop: second pin card has X close button');
    await page.mouse.click(closeBtn2.x + closeBtn2.width / 2, closeBtn2.y + closeBtn2.height / 2);
    await page.waitForTimeout(1600);

    const afterClose2 = await readDesktopState(page);
    assert.equal(afterClose2.popupOpen, false, 'desktop: second X closes pin card');
    assert.equal(afterClose2.feedVisible, true, 'desktop: second X reopens Incident Feeds');
    assert.ok(
      afterClose2.pinOffset &&
        Math.abs(afterClose2.pinOffset[0] - initial.pinOffset[0]) <= 4 &&
        Math.abs(afterClose2.pinOffset[1] - initial.pinOffset[1]) <= 4,
      `desktop: second X recenters map (${JSON.stringify(initial.pinOffset)} -> ${JSON.stringify(afterClose2.pinOffset)})`,
    );

    assert.deepEqual(errors, [], 'desktop: zero page errors');
    await context.close();
  }

  /* ========================================================================
   * 2. MOBILE PORTRAIT: X recenters map while keeping mobile drawer closed
   * ======================================================================== */
  {
    const context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'reduce',
    });
    const backend = createBackend(REPORTS);
    await backend.install(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(base);
    await page.locator('#alert-card-hz-4h').waitFor({ state: 'attached' });
    await page.waitForTimeout(900);

    const initialMobile = await readDesktopState(page);
    assert.equal(initialMobile.hasFeedOpenClass, false, 'phone: drawer starts closed');

    await page.locator('#map-pin-hz-4h').tap({ force: true });
    await page.waitForTimeout(2000);
    assert.equal((await readDesktopState(page)).popupOpen, true, 'phone: pin tap opens pin card');

    await page.locator('.leaflet-popup-close-button').first().tap();
    await page.waitForTimeout(1600);
    const afterPhoneClose = await readDesktopState(page);
    assert.equal(afterPhoneClose.popupOpen, false, 'phone: X closes pin card');
    assert.equal(afterPhoneClose.hasFeedOpenClass, false, 'phone: drawer stays closed after X');

    assert.deepEqual(errors, [], 'phone: zero page errors');
    await context.close();
  }

  console.log('Accurate Reported timestamps & Desktop Incident Feeds <-> Pin Card flow verified');
} finally {
  await browser.close();
}
