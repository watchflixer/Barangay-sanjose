import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { baseReport, createBackend } from './supabase-mock.mjs';

/**
 * ONE REPORT CARD AT A TIME — EVERYTHING ELSE WAITS
 *
 * While a report card is open on the streets hazard map, only Recenter stays
 * live. Layers, Show your location, Zoom in/out, Donate and the incident-feed
 * toggle are switched off, so a stray tap cannot knock the report off screen
 * or bury it under another panel.
 *
 * Both exits hand the map back:
 *   - the card's own X, and
 *   - the Recenter button (which also closes the card and recenters).
 *
 * After either one every control is usable again.
 */
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';

const REPORTS = [
  baseReport('hz-001', { title: 'Kasiglahan riverside flooding', type: 'flood', lat: 14.7468, lng: 121.1378 }),
  baseReport('hz-002', { title: 'Litex transformer fire', type: 'fire', lat: 14.735, lng: 121.125 }),
];

/** Every control that has to stand down while a card is open. */
const LOCKED = [
  'btn-toggle-layers-menu', // Layers
  'btn-show-user-location', // Show your location
  'btn-zoom-in',
  'btn-zoom-out',
  'btn-mobile-sidebar-toggle-arrow', // incident feeds, phone handle
  'btn-desktop-feed-toggle', // incident feeds, laptop/desktop chevron
  'btn-donate', // Donate (navbar / phone)
];

const RECENTER = 'btn-recenter-gis';

const state = (page) =>
  page.evaluate(
    ({ locked, recenter }) => {
      const read = (id) => {
        const element = document.querySelector(`#${id}`);
        if (!element) return null;
        return {
          disabled: element.disabled === true,
          shown: !!(element.offsetWidth || element.offsetHeight),
        };
      };
      const out = { popups: document.querySelectorAll('.leaflet-popup').length, controls: {} };
      for (const id of [...locked, recenter]) out.controls[id] = read(id);
      // The desktop rail carries its own Donate item, next to the navbar one.
      out.railDonate = [...document.querySelectorAll('.desktop-rail__item')]
        .filter((element) => element.getAttribute('aria-label') === 'Donate')
        .map((element) => ({ disabled: element.disabled === true, shown: !!(element.offsetWidth || element.offsetHeight) }));
      // A stable fingerprint of the map camera, read off the pins themselves:
      // where hz-001 sits relative to the map centre (the pan) and how far
      // apart the two pins are (the zoom).
      const root = document.querySelector('#leaflet-map-root').getBoundingClientRect();
      const pinBox = (id) => document.querySelector(`#map-pin-${id}`)?.getBoundingClientRect();
      const first = pinBox('hz-001');
      const second = pinBox('hz-002');
      out.pinOffset = first
        ? [
            Math.round(first.x + first.width / 2 - (root.x + root.width / 2)),
            Math.round(first.y + first.height / 2 - (root.y + root.height / 2)),
          ]
        : null;
      out.pinSpread =
        first && second
          ? Math.round(
              Math.hypot(
                second.x + second.width / 2 - (first.x + first.width / 2),
                second.y + second.height / 2 - (first.y + first.height / 2),
              ),
            )
          : null;
      out.layerMenuOpen = [...document.querySelectorAll('button')].some(
        (element) => element.textContent?.trim() === 'Coming Soon' && !!(element.offsetWidth || element.offsetHeight),
      );
      return out;
    },
    { locked: LOCKED, recenter: RECENTER },
  );

const assertAllEnabled = (snapshot, label) => {
  for (const id of [...LOCKED, RECENTER]) {
    const control = snapshot.controls[id];
    if (!control) continue; // not mounted at this breakpoint (phone vs desktop)
    assert.equal(control.disabled, false, `${label}: #${id} is usable again`);
  }
  for (const donate of snapshot.railDonate) {
    assert.equal(donate.disabled, false, `${label}: the rail Donate item is usable again`);
  }
};

const assertAllLocked = (snapshot, label) => {
  assert.equal(snapshot.controls[RECENTER]?.disabled, false, `${label}: Recenter stays live`);
  for (const id of LOCKED) {
    const control = snapshot.controls[id];
    if (!control) continue; // not mounted at this breakpoint (phone vs desktop)
    assert.equal(control.disabled, true, `${label}: #${id} is switched off`);
  }
  for (const donate of snapshot.railDonate) {
    assert.equal(donate.disabled, true, `${label}: the rail Donate item is switched off`);
  }
  assert.equal(snapshot.popups, 1, `${label}: the report card is still on screen`);
};

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

async function closeWithX(page) {
  const box = await page.locator('.leaflet-popup-close-button').first().boundingBox();
  assert.ok(box, 'the report card has its own X');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(1600); // close + the recenter glide
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

    /* ------------------------------------------------ nothing is locked yet */
    const pristine = await state(page);
    assertAllEnabled(pristine, `${viewport.tag}: before any report is open`);

    /* ------------------------------------- opening a card locks everything */
    await openCard(page);
    const locked = await state(page);
    assertAllLocked(locked, `${viewport.tag}: report card open`);

    /* ------------------- a tap on a locked control is a no-op, card stays */
    await page.locator('#btn-zoom-in').click({ force: true, timeout: 3000 }).catch(() => {});
    await page.locator('#btn-toggle-layers-menu').click({ force: true, timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(900);
    const afterPokes = await state(page);
    assert.equal(afterPokes.pinSpread, locked.pinSpread, `${viewport.tag}: Zoom did not zoom`);
    assert.deepEqual(afterPokes.pinOffset, locked.pinOffset, `${viewport.tag}: the camera did not move`);
    assert.equal(afterPokes.layerMenuOpen, false, `${viewport.tag}: the Layers menu did not open`);
    assert.equal(afterPokes.popups, 1, `${viewport.tag}: the report card is still there`);

    /* ----------------------------------------------- 1. the X unlocks all */
    await closeWithX(page);
    const afterX = await state(page);
    assert.equal(afterX.popups, 0, `${viewport.tag}: the X closed the card`);
    assertAllEnabled(afterX, `${viewport.tag}: after the X`);

    // ...and the controls really respond again.
    const beforeZoom = afterX.pinSpread;
    await page.locator('#btn-zoom-in').click({ timeout: 5000 });
    await page.waitForTimeout(1400);
    assert.notEqual((await state(page)).pinSpread, beforeZoom, `${viewport.tag}: Zoom works again`);

    /* ---------------------------- 2. Recenter unlocks all (and recenters) */
    await openCard(page);
    assertAllLocked(await state(page), `${viewport.tag}: card open a second time`);
    await page.locator('#btn-recenter-gis').click({ timeout: 5000 });
    await page.waitForTimeout(1700);
    const afterRecenter = await state(page);
    assert.equal(afterRecenter.popups, 0, `${viewport.tag}: Recenter closed the card`);
    assertAllEnabled(afterRecenter, `${viewport.tag}: after Recenter`);
    assert.equal(afterRecenter.pinSpread, pristine.pinSpread, `${viewport.tag}: Recenter put the zoom back`);
    assert.ok(
      Math.abs(afterRecenter.pinOffset[0] - pristine.pinOffset[0]) <= 4 &&
        Math.abs(afterRecenter.pinOffset[1] - pristine.pinOffset[1]) <= 4,
      `${viewport.tag}: Recenter put the centre back (${JSON.stringify(pristine.pinOffset)} -> ${JSON.stringify(afterRecenter.pinOffset)})`,
    );

    /* --------------------------------------- a report still opens normally */
    await openCard(page);
    assert.equal((await state(page)).popups, 1, `${viewport.tag}: a report opens after the round trip`);
    await closeWithX(page);

    assert.deepEqual(errors, [], `${viewport.tag}: no page errors`);
    await context.close();
  }

  console.log('Only Recenter stays live while a report card is open');
} finally {
  await browser.close();
}
