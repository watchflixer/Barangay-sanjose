import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { baseReport, createBackend } from './supabase-mock.mjs';

/**
 * THE OPEN REPORT CARD SPRINGS BACK TO THE MIDDLE
 *
 * The card is pinned to its hazard, so any pan or zoom drags it off centre.
 * A resident reading a report could drag it half off screen and not notice.
 *
 * Now: once they stop moving the map, a card that drifted waits half a second
 * and then glides back to the middle of the map. Moving again restarts the
 * wait, and with no card open the map is left exactly where it was dragged.
 */
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';

const REPORTS = [
  baseReport('hz-001', { title: 'Kasiglahan riverside flooding', type: 'flood', lat: 14.7468, lng: 121.1378 }),
  baseReport('hz-002', { title: 'Litex transformer fire', type: 'fire', lat: 14.735, lng: 121.125 }),
];

const SNAP_DELAY = 500; // ms the resident gets before the card comes back
const GLIDE = 600; // ms the correction glide itself takes
const TOLERANCE = 10; // px — "back in the middle"

/** Card centre minus map centre, in px. `null` when no card is open. */
const cardOffset = (page) =>
  page.evaluate(() => {
    const map = document.querySelector('#leaflet-map-root')?.getBoundingClientRect();
    const card = document.querySelector('.leaflet-popup')?.getBoundingClientRect();
    if (!map || !card) return null;
    return [
      Math.round(card.x + card.width / 2 - (map.x + map.width / 2)),
      Math.round(card.y + card.height / 2 - (map.y + map.height / 2)),
    ];
  });

/** Where the first pin sits relative to the map centre. */
const pinOffset = (page) =>
  page.evaluate(() => {
    const map = document.querySelector('#leaflet-map-root')?.getBoundingClientRect();
    const pin = document.querySelector('#map-pin-hz-001')?.getBoundingClientRect();
    if (!map || !pin) return null;
    return [
      Math.round(pin.x + pin.width / 2 - (map.x + map.width / 2)),
      Math.round(pin.y + pin.height / 2 - (map.y + map.height / 2)),
    ];
  });

/** Distance between the two pins, in px — grows as the map zooms in. */
const pinSpread = (page) =>
  page.evaluate(() => {
    const first = document.querySelector('#map-pin-hz-001')?.getBoundingClientRect();
    const second = document.querySelector('#map-pin-hz-002')?.getBoundingClientRect();
    if (!first || !second) return null;
    return Math.round(
      Math.hypot(
        second.x + second.width / 2 - (first.x + first.width / 2),
        second.y + second.height / 2 - (first.y + first.height / 2),
      ),
    );
  });

const dragMap = async (page, dx, dy) => {
  const map = await page.locator('#leaflet-map-root').boundingBox();
  // Start away from the card and the pins so the drag never grabs them.
  const startX = map.x + map.width / 2 - 100;
  const startY = map.y + map.height * 0.82;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(startX + (dx * step) / 12, startY + (dy * step) / 12);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
};

const assertCentred = (offset, label) => {
  assert.ok(offset, `${label}: the report card is on screen`);
  assert.ok(
    Math.abs(offset[0]) <= TOLERANCE && Math.abs(offset[1]) <= TOLERANCE,
    `${label}: the card is back in the middle (${JSON.stringify(offset)})`,
  );
};

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function openCard(page) {
  const openDrawer = page.getByRole('button', { name: 'Open incident feeds', exact: true });
  if (await openDrawer.isVisible().catch(() => false)) await openDrawer.click();
  const desktopToggle = page.getByRole('button', { name: 'Show incident feeds', exact: true });
  if (await desktopToggle.isVisible().catch(() => false)) await desktopToggle.click();
  await page.waitForTimeout(450);
  await page.locator('#alert-card-hz-001').click({ timeout: 5000 });
  await page.waitForTimeout(2400); // the centring glide on open
}

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

    await openCard(page);
    assertCentred(await cardOffset(page), `${viewport.tag}: the card opens centred`);

    /* -------------------------------------- sideways drag springs back */
    await dragMap(page, -150, 0);
    const draggedLeft = await cardOffset(page);
    assert.ok(
      Math.abs(draggedLeft[0]) > 60,
      `${viewport.tag}: the drag really moved the card (${JSON.stringify(draggedLeft)})`,
    );
    // Half a second is grace, not permission: straight after the drag the card
    // is still where the resident put it.
    await page.waitForTimeout(SNAP_DELAY - 220);
    const beforeSnap = await cardOffset(page);
    assert.ok(
      Math.abs(beforeSnap[0]) > 20,
      `${viewport.tag}: nothing moves in the first half second (${JSON.stringify(beforeSnap)})`,
    );
    // ...then it comes home.
    await page.waitForTimeout(SNAP_DELAY + GLIDE + 600);
    assertCentred(await cardOffset(page), `${viewport.tag}: after a sideways drag`);

    /* --------------------------------------- vertical drag springs back */
    await dragMap(page, 0, 170);
    const draggedDown = await cardOffset(page);
    assert.ok(
      Math.abs(draggedDown[1]) > 60,
      `${viewport.tag}: the vertical drag moved the card (${JSON.stringify(draggedDown)})`,
    );
    await page.waitForTimeout(SNAP_DELAY + GLIDE + 600);
    assertCentred(await cardOffset(page), `${viewport.tag}: after a vertical drag`);

    /* ------------------------ moving again restarts the half-second wait */
    await dragMap(page, -120, 0);
    await page.waitForTimeout(300); // still inside the grace period
    await dragMap(page, 0, 120); // a second drag cancels the pending snap
    await page.waitForTimeout(200); // 200ms into the NEW wait
    const midSecondDrag = await cardOffset(page);
    assert.ok(
      Math.abs(midSecondDrag[0]) > 20 || Math.abs(midSecondDrag[1]) > 20,
      `${viewport.tag}: the second drag restarted the wait (${JSON.stringify(midSecondDrag)})`,
    );
    await page.waitForTimeout(SNAP_DELAY + GLIDE + 600);
    assertCentred(await cardOffset(page), `${viewport.tag}: after two quick drags`);

    /* ----------------------------------------- zooming also springs back */
    const spreadBefore = await pinSpread(page);
    const mapBox = await page.locator('#leaflet-map-root').boundingBox();
    await page.mouse.move(mapBox.x + mapBox.width * 0.72, mapBox.y + mapBox.height * 0.78);
    await page.mouse.wheel(0, -900); // wheel-zoom, the way a stray scroll would
    await page.waitForTimeout(300);
    const spreadAfterWheel = await pinSpread(page);
    if (spreadAfterWheel !== spreadBefore) {
      // The zoom really changed; the card must still end up in the middle.
      await page.waitForTimeout(SNAP_DELAY + GLIDE + 900);
      assertCentred(await cardOffset(page), `${viewport.tag}: after a wheel zoom`);
    }

    /* -------------------------- with the card closed, a drag is respected */
    const closeBox = await page.locator('.leaflet-popup-close-button').first().boundingBox();
    assert.ok(closeBox, `${viewport.tag}: the card has its X`);
    await page.mouse.click(closeBox.x + closeBox.width / 2, closeBox.y + closeBox.height / 2);
    await page.waitForTimeout(1600);

    // Zoom in first: at the default zoom the barangay bounds are wider than
    // the viewport, so Leaflet clamps every pan and the assertion below would
    // be meaningless. Three steps in leaves plenty of room to drag.
    for (let step = 0; step < 3; step += 1) {
      await page.locator('#btn-zoom-in').click({ timeout: 5000 });
      await page.waitForTimeout(1200);
    }
    const parked = await pinOffset(page);
    await dragMap(page, -170, 0);
    await page.waitForTimeout(SNAP_DELAY + GLIDE + 600);
    const afterClosedDrag = await pinOffset(page);
    assert.ok(
      Math.abs(afterClosedDrag[0] - parked[0]) > 60,
      `${viewport.tag}: no card open — the map stays where it was dragged (${JSON.stringify(parked)} -> ${JSON.stringify(afterClosedDrag)})`,
    );

    /* ------------------------------- and the next report opens centred */
    await openCard(page);
    assertCentred(await cardOffset(page), `${viewport.tag}: a later report still opens centred`);
    await page.locator('#btn-recenter-gis').click({ timeout: 5000 });
    await page.waitForTimeout(1500);

    assert.deepEqual(errors, [], `${viewport.tag}: no page errors`);
    await context.close();
  }

  console.log('An open report card springs back to the middle after half a second');
} finally {
  await browser.close();
}
