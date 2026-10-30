import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { baseReport, createBackend } from './supabase-mock.mjs';

/**
 * AN OPEN PIN CARD ALWAYS RETURNS TO THE CENTRE AFTER VIEW MOVEMENT STOPS
 *
 * Whenever a hazard pin card is open on the streets hazard map and the resident
 * moves the view — left, right, up, down, diagonally, via scroll-wheel zoom in
 * or out, double-click zoom, or viewport resize — the card stays put under
 * their finger while they are actively holding/moving the map, and smoothly
 * glides back to the centre of the map as soon as movement stops.
 */
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';

const REPORTS = [
  baseReport('hz-001', {
    title: 'Kasiglahan riverside flooding',
    description:
      'Water keeps rising along the riverside path near the basketball court. Residents cannot pass through the alley going to the main road, and the dike wall is already leaking.',
    photo_url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
    lat: 14.7468,
    lng: 121.1378,
  }),
  baseReport('hz-002', {
    title: 'Litex transformer fire',
    type: 'fire',
    lat: 14.735,
    lng: 121.125,
  }),
];

const CARD_TOLERANCE = 8; // px from exact map centre

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const readCardAlignment = (page) =>
  page.evaluate(() => {
    const map = document.querySelector('#leaflet-map-root')?.getBoundingClientRect();
    const card = document.querySelector('.leaflet-popup')?.getBoundingClientRect();
    const pin1 = document.querySelector('#map-pin-hz-001')?.getBoundingClientRect();
    const pin2 = document.querySelector('#map-pin-hz-002')?.getBoundingClientRect();
    if (!map) return null;
    const mapCx = map.x + map.width / 2;
    const mapCy = map.y + map.height / 2;
    return {
      map: { x: map.x, y: map.y, w: map.width, h: map.height, cx: mapCx, cy: mapCy },
      card: card
        ? {
            x: card.x,
            y: card.y,
            w: card.width,
            h: card.height,
            dx: card.x + card.width / 2 - mapCx,
            dy: card.y + card.height / 2 - mapCy,
          }
        : null,
      pinOffset: pin1
        ? [
            Math.round(pin1.x + pin1.width / 2 - mapCx),
            Math.round(pin1.y + pin1.height / 2 - mapCy),
          ]
        : null,
      pinSpread:
        pin1 && pin2
          ? Math.round(
              Math.hypot(
                pin2.x + pin2.width / 2 - (pin1.x + pin1.width / 2),
                pin2.y + pin2.height / 2 - (pin1.y + pin1.height / 2),
              ),
            )
          : null,
    };
  });

const assertCardCentred = async (page, label) => {
  const snap = await readCardAlignment(page);
  assert.ok(snap?.card, `${label}: pin card is open`);
  const dx = Math.abs(snap.card.dx);
  const dy = Math.abs(snap.card.dy);
  assert.ok(
    dx <= CARD_TOLERANCE && dy <= CARD_TOLERANCE,
    `${label}: pin card returned to centre (off by ${snap.card.dx.toFixed(1)}x${snap.card.dy.toFixed(1)}px)`,
  );
  return snap;
};

/**
 * Find an unobstructed point on `#leaflet-map-root` (verified via
 * `elementFromPoint` so narrow 320px screens never start a drag on top of the
 * 250px popup card or a floating button), drag by `(deltaX, deltaY)`,
 * optionally hold still before releasing, then release.
 */
const dragMapBy = async (page, deltaX, deltaY, { holdMs = 0 } = {}) => {
  const start = await page.evaluate(
    ({ dx, dy }) => {
      const root = document.querySelector('#leaflet-map-root');
      if (!root) return null;
      const r = root.getBoundingClientRect();
      // Prefer points where both start and end stay comfortably inside the viewport.
      const candidates = [
        [0.5, 0.9],
        [0.5, 0.1],
        [0.82, 0.82],
        [0.22, 0.86],
        [0.78, 0.14],
        [0.5, 0.85],
      ];
      for (const [fx, fy] of candidates) {
        const x = Math.round(r.left + r.width * fx);
        const y = Math.round(r.top + r.height * fy);
        const ex = x + dx;
        const ey = y + dy;
        if (ex < 4 || ex > window.innerWidth - 4 || ey < 4 || ey > window.innerHeight - 4) continue;
        const hit = document.elementFromPoint(x, y);
        if (hit && root.contains(hit) && !hit.closest('.leaflet-popup, .custom-hazard-divicon')) {
          return { x, y };
        }
      }
      // Fallback: scan a grid for any unobstructed map pixel whose drag stays in viewport.
      for (let fy = 0.08; fy <= 0.94; fy += 0.06) {
        for (let fx = 0.12; fx <= 0.9; fx += 0.08) {
          const x = Math.round(r.left + r.width * fx);
          const y = Math.round(r.top + r.height * fy);
          const ex = x + dx;
          const ey = y + dy;
          if (ex < 4 || ex > window.innerWidth - 4 || ey < 4 || ey > window.innerHeight - 4) continue;
          const hit = document.elementFromPoint(x, y);
          if (hit && root.contains(hit) && !hit.closest('.leaflet-popup, .custom-hazard-divicon')) {
            return { x, y };
          }
        }
      }
      return { x: Math.round(r.left + r.width * 0.5), y: Math.round(r.bottom - 18) };
    },
    { dx: deltaX, dy: deltaY },
  );
  assert.ok(start, 'found unobstructed map drag point');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + deltaX, start.y + deltaY, { steps: 14 });
  const whileHeld = await readCardAlignment(page);
  let afterHold = whileHeld;
  if (holdMs > 0) {
    await page.waitForTimeout(holdMs);
    afterHold = await readCardAlignment(page);
  }
  await page.mouse.up();
  return { whileHeld, afterHold };
};

const openReportCard = async (page) => {
  const drawer = page.getByRole('button', { name: 'Open incident feeds', exact: true });
  if (await drawer.isVisible().catch(() => false)) {
    await drawer.click();
    await page.waitForTimeout(350);
  }
  const alertCard = page.locator('#alert-card-hz-001');
  if (await alertCard.isVisible().catch(() => false)) {
    await alertCard.click();
  } else {
    await page.locator('#map-pin-hz-001').click({ force: true });
  }
  await page.waitForTimeout(1600);
};

try {
  for (const vp of [
    { width: 412, height: 915, tag: 'Android phone portrait', touch: true },
    { width: 320, height: 568, tag: 'Compact phone portrait (320x568)', touch: true },
    { width: 800, height: 380, tag: 'Phone landscape', touch: true },
    { width: 1440, height: 960, tag: 'Desktop', touch: false },
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.touch,
      isMobile: vp.touch,
    });
    const backend = createBackend(REPORTS);
    await backend.install(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(base);
    await page.locator('#map-pin-hz-001').waitFor({ state: 'attached' });
    await page.waitForTimeout(700);

    const defaultSnap = await readCardAlignment(page);
    assert.ok(defaultSnap?.pinOffset, `${vp.tag}: default view rendered`);

    await openReportCard(page);
    await assertCardCentred(page, `${vp.tag}: initial open`);

    /* 1. Drag LEFT (pakaliwa) + hold check before release */
    {
      const { whileHeld, afterHold } = await dragMapBy(page, -110, 0, { holdMs: 650 });
      assert.ok(
        Math.abs(whileHeld.card.dx) >= 60,
        `${vp.tag}: dragging left moved the pin card off-centre (${Math.round(whileHeld.card.dx)}px)`,
      );
      assert.ok(
        Math.abs(afterHold.card.dx - whileHeld.card.dx) <= 6,
        `${vp.tag}: card does not yank while finger/mouse is still holding the map`,
      );
      await page.waitForTimeout(1500);
      await assertCardCentred(page, `${vp.tag}: after dragging left`);
    }

    /* 2. Drag RIGHT (pakanan) */
    {
      const { whileHeld } = await dragMapBy(page, 110, 0);
      assert.ok(
        Math.abs(whileHeld.card.dx) >= 60,
        `${vp.tag}: dragging right moved the pin card off-centre (${Math.round(whileHeld.card.dx)}px)`,
      );
      await page.waitForTimeout(1500);
      await assertCardCentred(page, `${vp.tag}: after dragging right`);
    }

    /* 3. Drag UP (pataas) */
    {
      const { whileHeld } = await dragMapBy(page, 0, -95);
      assert.ok(
        Math.abs(whileHeld.card.dy) >= 50,
        `${vp.tag}: dragging up moved the pin card off-centre (${Math.round(whileHeld.card.dy)}px)`,
      );
      await page.waitForTimeout(1500);
      await assertCardCentred(page, `${vp.tag}: after dragging up`);
    }

    /* 4. Drag DOWN (pababa) */
    {
      const { whileHeld } = await dragMapBy(page, 0, 95);
      assert.ok(
        Math.abs(whileHeld.card.dy) >= 50,
        `${vp.tag}: dragging down moved the pin card off-centre (${Math.round(whileHeld.card.dy)}px)`,
      );
      await page.waitForTimeout(1500);
      await assertCardCentred(page, `${vp.tag}: after dragging down`);
    }

    /* 5. Diagonal / arbitrary movement ("or kung ano") */
    {
      const { whileHeld } = await dragMapBy(page, -95, 80);
      assert.ok(
        Math.hypot(whileHeld.card.dx, whileHeld.card.dy) >= 75,
        `${vp.tag}: diagonal drag moved the pin card off-centre`,
      );
      await page.waitForTimeout(1500);
      await assertCardCentred(page, `${vp.tag}: after diagonal drag`);
    }

    /* 6. Zoomed-out & zoomed-in views ("sa kahit anong view") */
    if (!vp.touch) {
      const beforeZoom = await readCardAlignment(page);
      // Scroll-wheel zoom OUT around a corner of the map (knocks card off-centre + changes zoom).
      await page.mouse.move(beforeZoom.map.x + beforeZoom.map.w * 0.85, beforeZoom.map.y + beforeZoom.map.h * 0.85);
      await page.mouse.wheel(0, 360);
      await page.waitForTimeout(1750);
      const zoomedOut = await assertCardCentred(page, `${vp.tag}: after wheel zoom out`);
      assert.ok(
        zoomedOut.pinSpread < beforeZoom.pinSpread,
        `${vp.tag}: stayed in zoomed-out view (${beforeZoom.pinSpread} -> ${zoomedOut.pinSpread}) while re-centring card`,
      );

      // Drag while zoomed out — still returns to centre in that view!
      await dragMapBy(page, 130, -90);
      await page.waitForTimeout(1500);
      await assertCardCentred(page, `${vp.tag}: after dragging in zoomed-out view`);

      // Scroll-wheel zoom IN around an off-centre spot — still returns to centre!
      await page.mouse.move(beforeZoom.map.x + beforeZoom.map.w * 0.8, beforeZoom.map.y + beforeZoom.map.h * 0.2);
      await page.mouse.wheel(0, -480);
      await page.waitForTimeout(1750);
      await assertCardCentred(page, `${vp.tag}: after wheel zoom in`);

      // Viewport resize while card is open — returns to centre of the resized map!
      await page.setViewportSize({ width: 1200, height: 820 });
      await page.waitForTimeout(1600);
      await assertCardCentred(page, `${vp.tag}: after viewport resize`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(1600);
      await assertCardCentred(page, `${vp.tag}: after restoring viewport size`);
    }

    /* 7. Closing with X right after dragging still resets back to barangay default view */
    await dragMapBy(page, -80, 60);
    const closeBtn = await page.locator('.leaflet-popup-close-button').first().boundingBox();
    assert.ok(closeBtn, `${vp.tag}: close X button is reachable`);
    await page.mouse.click(closeBtn.x + closeBtn.width / 2, closeBtn.y + closeBtn.height / 2);
    await page.waitForTimeout(1400);
    const afterClose = await readCardAlignment(page);
    assert.equal(afterClose.card, null, `${vp.tag}: X closed the pin card`);
    assert.ok(
      Math.abs(afterClose.pinOffset[0] - defaultSnap.pinOffset[0]) <= 4 &&
        Math.abs(afterClose.pinOffset[1] - defaultSnap.pinOffset[1]) <= 4,
      `${vp.tag}: X returned to default barangay view (${JSON.stringify(defaultSnap.pinOffset)} -> ${JSON.stringify(afterClose.pinOffset)})`,
    );

    assert.deepEqual(errors, [], `${vp.tag}: zero page errors`);
    await context.close();
  }

  console.log('Open pin card returns to map centre after any view movement across all views');
} finally {
  await browser.close();
}
