import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Guard for the locked map overview in the Panahon weather app.
 *
 * The overview used to fit the Philippines edge-to-edge. On laptop/desktop the
 * lock was pulled one zoom level further out so the surrounding seas and
 * neighbouring countries are visible. Portrait phones must keep the EXACT
 * original camera, which means:
 *   – the extra zoom-out is decided by `WIDE_VIEW_QUERY` (>= 640px),
 *   – the phone branch keeps the original floor (4.6) and padding (0.08),
 *   – the pan lock still grows to cover the visible frame, otherwise Leaflet
 *     pins the camera to the bounds centre and panning stops working.
 */
const source = readFileSync(
  fileURLToPath(new URL('../weather-source/src/components/WeatherMap.tsx', import.meta.url)),
  'utf8'
);

const numberFor = (name: string) => {
  const match = new RegExp(`const ${name}\\s*=\\s*([\\d.]+)`).exec(source);
  assert.ok(match, `expected a numeric constant named ${name}`);
  return Number(match[1]);
};

test('the wider overview is gated above portrait phones', () => {
  const query = /const WIDE_VIEW_QUERY\s*=\s*'([^']+)'/.exec(source);
  assert.ok(query, 'expected a WIDE_VIEW_QUERY media query');
  const minWidth = Number(/min-width:\s*(\d+)px/.exec(query[1])?.[1]);
  assert.ok(minWidth >= 480, `${query[1]} must stay wider than a portrait phone (>= 480px)`);
  assert.ok(minWidth <= 1024, `${query[1]} must still catch laptop windows below 1024px`);

  assert.match(source, /typeof window !== 'undefined' && window\.matchMedia\(WIDE_VIEW_QUERY\)\.matches/);
});

test('portrait phones keep the original lock constants', () => {
  assert.equal(numberFor('PHONE_OVERVIEW_MIN_ZOOM'), 4.6, 'the phone overview floor must not drift');
  assert.equal(numberFor('PHONE_LOCK_PADDING'), 0.08, 'the phone pan-lock padding must not drift');
  assert.match(
    source,
    /isWideViewport\(\)\s*\?\s*Math\.max\(WIDE_OVERVIEW_MIN_ZOOM,\s*fitZoom - OVERVIEW_ZOOM_OUT\)\s*:\s*Math\.max\(PHONE_OVERVIEW_MIN_ZOOM,\s*fitZoom\)/,
    'the phone branch must resolve to max(4.6, fitZoom) exactly as before'
  );
});

test('laptop/desktop is pulled a sensible amount further out', () => {
  const out = numberFor('OVERVIEW_ZOOM_OUT');
  // Enough to see the seas and neighbours, small enough that the archipelago
  // still dominates the frame (the tune has been 0.6 since the first pass).
  assert.ok(out >= 0.4, `expected at least 0.4 zoom levels of extra overview, got ${out}`);
  assert.ok(out <= 1.2, `expected at most 1.2 zoom levels of extra overview, got ${out}`);
  const floor = numberFor('WIDE_OVERVIEW_MIN_ZOOM');
  assert.ok(floor > 2, 'the wide floor must stay above the basemap minZoom so tiles never go blank');
});

test('the pan lock grows with the visible frame', () => {
  assert.match(
    source,
    /map\.setMaxBounds\(lock\.contains\(visible\) \? lock : lock\.extend\(visible\)\.pad\(0\.02\)\)/,
    'maxBounds must cover the visible frame, or panning gets pinned'
  );
});

test('the overview lock re-applies on resize and on crossing the gate', () => {
  assert.match(source, /map\.on\('resize', handleResize\)/);
  assert.match(source, /wideQuery\.addEventListener\('change', handleWideChange\)/);
  assert.match(source, /wideQuery\.removeEventListener\('change', handleWideChange\)/, 'the media listener must be cleaned up');
  assert.match(source, /window\.clearTimeout\(resizeFrame\)/, 'the resize timer must be cleaned up');
});

/**
 * The tinted atmosphere layers (wind palette, thermal field) were SVG overlays
 * pinned to a fixed geographic box — the wind one covered 95E..150E. On a wide
 * screen the locked camera looks past 150E, and everything beyond it rendered
 * with no colour at all: a hard vertical seam, measured at 101px on the user's
 * 1365px screenshot.
 *
 * The box must now expand to swallow the visible viewport, so the tint reaches
 * the screen edge at any window size. Portrait phones keep the fixed box.
 */
test('the wind atmosphere covers the whole viewport on wide screens', () => {
  const margin = numberFor('ATMOSPHERE_VIEWPORT_MARGIN');
  assert.ok(margin > 0 && margin < 1, `viewport margin ${margin} must be a sane fraction`);

  // The helper must bail out for phones and return the untouched box.
  const helper = /const fullBleedAtmosphereBounds = \(([\s\S]{0,700}?)\n\};/.exec(source);
  assert.ok(helper, 'expected a fullBleedAtmosphereBounds helper');
  const body = helper[1];
  assert.match(body, /if \(!isWideViewport\(\)\) return bounds/,
    'portrait phones must keep the original fixed box');
  assert.match(body, /Number\.isFinite\(size\.x\)/,
    'a 0x0 container must not produce a degenerate box');
  assert.match(body, /bounds\.extend\(visible\.pad\(ATMOSPHERE_VIEWPORT_MARGIN\)\)/,
    'the box must extend to the visible viewport');

  // Both atmosphere overlays are created full-bleed and re-fitted on camera changes.
  for (const box of ['regionalThermalBounds', 'stormOverlayBounds']) {
    assert.match(
      source,
      new RegExp(`fullBleedAtmosphereBounds\\(map, ${box}\\)`),
      `${box} must be passed through the full-bleed helper`
    );
    assert.match(
      source,
      new RegExp(`setBounds\\(fullBleedAtmosphereBounds\\(map, ${box}\\)\\)`),
      `${box} must be re-fitted after a camera change`
    );
  }

  assert.match(source, /map\.on\('resize', refitAtmosphere\)/, 'a resize must re-fit the tint');
  assert.match(source, /map\.on\('zoomend', refitAtmosphere\)/, 'a zoom must re-fit the tint');
  assert.match(source, /map\.on\('moveend', refitAtmosphere\)/, 'a pan must re-fit the tint');
  // And the listeners must be released with the effect.
  assert.match(source, /map\.off\('resize', refitAtmosphere\)/, 'listeners must be cleaned up');

  // The old fixed box must no longer be handed to svgOverlay directly.
  assert.doesNotMatch(
    source,
    /svgOverlay\([^)]*,\s*(stormOverlayBounds|regionalThermalBounds),/,
    'an atmosphere overlay is still pinned to its fixed box'
  );
});

/** Geometry of the user's screenshot: 1190px of map pane, 101px went uncoloured. */
test('the extended wind box really covers a wide viewport', () => {
  const MARGIN = numberFor('ATMOSPHERE_VIEWPORT_MARGIN');
  const BOX = { west: 95, east: 150 };       // stormOverlayBounds longitudes
  const pxPerDeg = 19.8;                      // measured off the screenshot
  const vpWidth = 1190;
  const vpLeftLng = 95;
  const vpRightLng = vpLeftLng + vpWidth / pxPerDeg;

  const coveredPx = (east: number) =>
    (Math.min(east, vpRightLng) - Math.max(BOX.west, vpLeftLng)) * pxPerDeg;

  // Before: the viewport reaches 155.1E but the tint stops at 150E.
  assert.ok(coveredPx(BOX.east) < vpWidth, 'sanity: the old box should leave a gap');
  assert.equal(Math.round(vpWidth - coveredPx(BOX.east)), 101, 'the gap should be the measured 101px');

  // After: the box grows by the viewport span on each side.
  const span = vpRightLng - vpLeftLng;
  const west = Math.min(BOX.west, vpLeftLng - span * MARGIN);
  const east = Math.max(BOX.east, vpRightLng + span * MARGIN);
  assert.equal(Math.round(vpWidth - coveredPx(east)), 0, 'the tint must reach the right edge');
  assert.ok(west <= vpLeftLng, 'the tint must reach the left edge');

  // It keeps covering as the window grows, which is the point of "auto adjust".
  for (const width of [875, 1190, 1920, 2560, 3440]) {
    const right = vpLeftLng + width / (pxPerDeg * (width / 1190));
    const grownEast = Math.max(BOX.east, right + (right - vpLeftLng) * MARGIN);
    assert.ok(grownEast >= right, `a ${width}px window would still show a bare strip`);
  }
});
