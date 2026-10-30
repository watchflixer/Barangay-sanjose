import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { baseReport, createBackend } from './supabase-mock.mjs';

/**
 * RECENTER AND LEAVING THE STREETS MAP BOTH RESET IT
 *
 * Two "start over" gestures on the streets hazard map:
 *
 *   1. The Recenter button is a reset: an open report card closes with it and
 *      the camera glides back to the barangay's default view.
 *
 *   2. Picking another basemap (Traffic, Weather, Flood Prone, Help Center) in
 *      the Layers menu cleans up the streets map as you leave it — card closed,
 *      camera back at the default view — so coming back to "streets" behaves
 *      like a freshly opened map instead of resuming half-finished state.
 */
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';

const REPORTS = [
  baseReport('hz-001', { title: 'Kasiglahan riverside flooding', type: 'flood', lat: 14.7468, lng: 121.1378 }),
  baseReport('hz-002', { title: 'Litex transformer fire', type: 'fire', lat: 14.735, lng: 121.125 }),
];

const TOLERANCE = 4; // px

const snapshot = (page) =>
  page.evaluate(() => {
    const map = document.querySelector('#leaflet-map-root')?.getBoundingClientRect();
    const pin = document.querySelector('#map-pin-hz-001')?.getBoundingClientRect();
    const weather = document.querySelector('#weather-card');
    return {
      popups: document.querySelectorAll('.leaflet-popup').length,
      pinOffset:
        map && pin
          ? [
              Math.round(pin.x + pin.width / 2 - (map.x + map.width / 2)),
              Math.round(pin.y + pin.height / 2 - (map.y + map.height / 2)),
            ]
          : null,
      traffic: !!document.querySelector('iframe[title="Rizal Realtime Traffic Map"]'),
      flood: !!document.querySelector('iframe[title*="Flood Hazard"]'),
      weatherCard: weather ? getComputedStyle(weather).display !== 'none' : false,
    };
  });

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function openFeed(page) {
  const openDrawer = page.getByRole('button', { name: 'Open incident feeds', exact: true });
  if (await openDrawer.isVisible().catch(() => false)) await openDrawer.click();
  const desktopToggle = page.getByRole('button', { name: 'Show incident feeds', exact: true });
  if (await desktopToggle.isVisible().catch(() => false)) await desktopToggle.click();
  await page.waitForTimeout(450);
}

async function openCard(page) {
  await openFeed(page);
  await page.locator('#alert-card-hz-001').click({ timeout: 5000 });
  await page.waitForTimeout(2400); // the centring glide
}

async function pickLayer(page, label) {
  await page.locator('#btn-toggle-layers-menu').click({ timeout: 5000 });
  await page.waitForTimeout(400);
  await page.locator(`button:text-is("${label}")`).first().click({ timeout: 5000 });
  await page.waitForTimeout(1500);
}

const assertDefaultView = (current, original, label) => {
  assert.ok(current.pinOffset && original.pinOffset, `${label}: the pin is on the map`);
  const [x, y] = current.pinOffset;
  const [ox, oy] = original.pinOffset;
  // Sub-pixel tile rounding can shift the projection by a pixel.
  assert.ok(
    Math.abs(x - ox) <= TOLERANCE && Math.abs(y - oy) <= TOLERANCE,
    `${label}: the map is back at the default view (${JSON.stringify(original.pinOffset)} -> ${JSON.stringify(current.pinOffset)})`,
  );
  assert.equal(current.popups, 0, `${label}: no report card is left open`);
};

try {
  for (const viewport of [
    { width: 412, height: 915, tag: 'phone', touch: true },
    { width: 1440, height: 960, tag: 'desktop', touch: false },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.touch,
      isMobile: viewport.touch,
      reducedMotion: 'reduce',
    });
    const backend = createBackend(REPORTS);
    await backend.install(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base);
    await page.locator('#alert-card-hz-001').waitFor();
    await page.waitForTimeout(900);

    const original = await snapshot(page);
    assert.ok(original.pinOffset, `${viewport.tag}: the default view is drawn before anything else`);

    /* ------------------------------------------------ 1. Recenter resets */
    await openCard(page);
    const opened = await snapshot(page);
    assert.equal(opened.popups, 1, `${viewport.tag}: the report card is open`);
    assert.notDeepEqual(opened.pinOffset, original.pinOffset, `${viewport.tag}: opening moved the camera`);
    if (viewport.touch) {
      assert.equal(opened.weatherCard, false, `${viewport.tag}: the weather card steps aside while it is open`);
    }

    await page.locator('#btn-recenter-gis').click({ timeout: 5000 });
    await page.waitForTimeout(1700); // close is instant, the glide takes 0.75s
    const recentred = await snapshot(page);
    assertDefaultView(recentred, original, `${viewport.tag}: after Recenter`);
    if (viewport.touch) {
      assert.equal(recentred.weatherCard, true, `${viewport.tag}: the weather card returns with the reset`);
    }

    /* --------------------------------- 2. Leaving for Traffic resets it */
    await openCard(page);
    assert.equal((await snapshot(page)).popups, 1, `${viewport.tag}: card open again before switching`);
    await pickLayer(page, 'Traffic');
    const onTraffic = await snapshot(page);
    assert.equal(onTraffic.traffic, true, `${viewport.tag}: the Traffic map is showing`);
    assert.equal(onTraffic.popups, 0, `${viewport.tag}: the streets report card closed on the way out`);

    /* ------------------------- 3. Coming back to streets = a fresh map */
    const trafficFrame = page.frames().find((frame) => frame.url().includes('rizal_traffic_map'));
    assert.ok(trafficFrame, `${viewport.tag}: the Traffic document is mounted`);
    await trafficFrame.evaluate(() =>
      window.parent.postMessage({ type: 'hazardsync-layer-select', layer: 'streets' }, location.origin),
    );
    await page.waitForTimeout(1600);

    const back = await snapshot(page);
    assert.equal(back.traffic, false, `${viewport.tag}: the Traffic map is gone`);
    assertDefaultView(back, original, `${viewport.tag}: back on the streets map`);

    // ...and it still behaves like a normal, freshly opened map.
    await openCard(page);
    const reused = await snapshot(page);
    assert.equal(reused.popups, 1, `${viewport.tag}: a report still opens after the round trip`);
    assert.equal(reused.traffic, false, `${viewport.tag}: still on the streets map`);

    const box = await page.locator('.leaflet-popup-close-button').first().boundingBox();
    assert.ok(box, `${viewport.tag}: the reopened card has its X`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(1600);
    assertDefaultView(await snapshot(page), original, `${viewport.tag}: X still recenters`);

    // The Traffic document may log its own errors in the sandbox (no Mapbox
    // network), so only the streets map's own errors are asserted on.
    const ours = errors.filter((message) => !/mapboxgl|Failed to fetch|NetworkError/i.test(message));
    assert.deepEqual(ours, [], `${viewport.tag}: no page errors from the streets map`);

    await context.close();
  }

  console.log('Recenter closes the report card; leaving the streets map resets it');
} finally {
  await browser.close();
}
