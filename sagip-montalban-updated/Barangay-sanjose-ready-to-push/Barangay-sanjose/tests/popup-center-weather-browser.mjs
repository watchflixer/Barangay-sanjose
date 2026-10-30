import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { baseReport, createBackend } from './supabase-mock.mjs';

/**
 * THE REPORT CARD IS CENTRED · THE WEATHER CARD STEPS ASIDE ON PHONES
 *
 * Opening a report used to leave its card crowded against the top of the map
 * (clipped outright on a short phone viewport), and on phones the floating
 * weather card sat right on top of it.
 *
 * Now:
 *   - the camera glides until the card's middle sits in the middle of the map,
 *     on phone, iPhone and desktop alike;
 *   - on phones the weather card hides while a report is open and comes back
 *     the moment its X is tapped;
 *   - on desktop the weather card never hides — there is room for both.
 */
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';

const REPORTS = [
  // Tall card: photo + long description, the worst case for clipping.
  baseReport('hz-001', {
    title: 'Kasiglahan riverside flooding',
    description:
      'Water keeps rising along the riverside path near the basketball court. Residents cannot pass through the alley going to the main road, and the dike wall is already leaking.',
    photo_url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
    lat: 14.7468,
    lng: 121.1378,
  }),
  baseReport('hz-002', { title: 'Litex transformer fire', type: 'fire', lat: 14.735, lng: 121.125 }),
];

const CARD_TOLERANCE = 10; // px — "dead centre" as a resident would judge it

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const geometry = (page) =>
  page.evaluate(() => {
    const map = document.querySelector('#leaflet-map-root')?.getBoundingClientRect();
    const card = document.querySelector('.leaflet-popup')?.getBoundingClientRect();
    const weather = document.querySelector('#weather-card');
    return {
      map: map && { x: map.x, y: map.y, w: map.width, h: map.height },
      card: card && { x: card.x, y: card.y, w: card.width, h: card.height },
      weatherVisible: weather ? getComputedStyle(weather).display !== 'none' : false,
    };
  });

const assertCardCentred = async (page, label) => {
  const { map, card } = await geometry(page);
  assert.ok(map && card, `${label}: the report card is on screen`);
  const dx = Math.abs(card.x + card.w / 2 - (map.x + map.w / 2));
  const dy = Math.abs(card.y + card.h / 2 - (map.y + map.h / 2));
  assert.ok(
    dx <= CARD_TOLERANCE && dy <= CARD_TOLERANCE,
    `${label}: card centre is the map centre (off by ${Math.round(dx)}x${Math.round(dy)}px)`,
  );
  const fullyVisible =
    card.x >= map.x - 1 &&
    card.y >= map.y - 1 &&
    card.x + card.w <= map.x + map.w + 1 &&
    card.y + card.h <= map.y + map.h + 1;
  assert.ok(fullyVisible, `${label}: the whole card fits inside the map`);
};

const openFromFeed = async (page) => {
  const drawer = page.getByRole('button', { name: 'Open incident feeds', exact: true });
  if (await drawer.isVisible()) await drawer.click();
  await page.waitForTimeout(400);
  await page.locator('#alert-card-hz-001').click();
  await page.waitForTimeout(2400); // the glide takes about a second
};

const closeWithX = async (page) => {
  const box = await page.locator('.leaflet-popup-close-button').first().boundingBox();
  assert.ok(box, 'the popup has its own X');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(500);
};

try {
  /* ------------------------------------------------- Android / iPhone view */
  for (const phone of [
    { width: 412, height: 915, tag: 'Pixel 7 / Android phone' },
    { width: 375, height: 667, tag: 'iPhone SE' },
  ]) {
    const context = await browser.newContext({
      viewport: { width: phone.width, height: phone.height },
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'reduce',
    });
    const backend = createBackend(REPORTS);
    await backend.install(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base);
    await page.locator('#alert-card-hz-001').waitFor();
    await page.waitForTimeout(800);

    assert.equal((await geometry(page)).weatherVisible, true, `${phone.tag}: weather card starts visible`);

    await openFromFeed(page);
    await assertCardCentred(page, `${phone.tag}: card tap`);
    assert.equal(
      (await geometry(page)).weatherVisible,
      false,
      `${phone.tag}: the weather card steps aside while the report card is open`,
    );

    // A pin tap re-centres the same way.
    const pin = await page.locator('#map-pin-hz-002').boundingBox();
    await page.mouse.click(pin.x + pin.width / 2, pin.y + pin.height / 2);
    await page.waitForTimeout(2400);
    const fire = await geometry(page);
    assert.equal(fire.weatherVisible, false, `${phone.tag}: still hidden after switching reports`);
    assert.ok(
      Math.abs(fire.card.x + fire.card.w / 2 - (fire.map.x + fire.map.w / 2)) <= CARD_TOLERANCE,
      `${phone.tag}: the second report is centred too`,
    );

    // ...and the X brings the weather card straight back.
    await closeWithX(page);
    assert.equal(
      (await geometry(page)).weatherVisible,
      true,
      `${phone.tag}: tapping X brings the weather card back`,
    );

    assert.deepEqual(errors, []);
    await context.close();
  }

  /* ------------------------------------------------------------- desktop */
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      reducedMotion: 'reduce',
    });
    const backend = createBackend(REPORTS);
    await backend.install(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base);
    await page.locator('#alert-card-hz-001').waitFor();
    await page.waitForTimeout(800);

    await page.locator('#map-pin-hz-001').click({ force: true });
    await page.waitForTimeout(2400);
    await assertCardCentred(page, 'desktop: pin tap');
    assert.equal(
      (await geometry(page)).weatherVisible,
      true,
      'desktop: the weather card stays put while a report is open',
    );

    await closeWithX(page);
    assert.equal((await geometry(page)).weatherVisible, true, 'desktop: weather card is still there');

    // Re-opening from the feed centres the card again.
    await openFromFeed(page);
    await assertCardCentred(page, 'desktop: card tap');
    assert.equal((await geometry(page)).weatherVisible, true, 'desktop: weather card never hides');

    assert.deepEqual(errors, []);
    await context.close();
  }

  console.log('Report cards open in the middle; phones tuck the weather card away');
} finally {
  await browser.close();
}
