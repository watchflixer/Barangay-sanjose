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

test('laptop/desktop is pulled at least one zoom level further out', () => {
  const out = numberFor('OVERVIEW_ZOOM_OUT');
  assert.ok(out >= 1, `expected at least 1 zoom level of extra overview, got ${out}`);
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
