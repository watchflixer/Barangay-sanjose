import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  FULL_DENSITY_OFFSET,
  revealOffset,
  tierOf,
  visibleCitiesAtZoom,
  type DensityCity
} from '../weather-source/src/services/cityDensity';

/**
 * Guard for progressive marker density on the Panahon map.
 *
 * The map used to reveal markers in three hard jumps, so the far view was
 * already crowded. Now every city has its own reveal threshold: a handful of
 * anchors at the overview, then more and more as you zoom in — the same list
 * feeds all four modes (weather / temperature / wind / rain).
 */
const CITIES: DensityCity[] = [
  ...Array.from({ length: 7 }, (_, index) => ({ id: `anchor-${index}`, minZoom: 5 })),
  ...Array.from({ length: 10 }, (_, index) => ({ id: `capital-${index}`, minZoom: 6 })),
  ...Array.from({ length: 14 }, (_, index) => ({ id: `city-${index}`, minZoom: 7 })),
  ...Array.from({ length: 33 }, (_, index) => ({ id: `town-${index}`, minZoom: 8 }))
];

const OVERVIEW = 4.4;
const countAt = (offset: number) => visibleCitiesAtZoom(CITIES, OVERVIEW + offset, OVERVIEW).length;

test('the far view shows only a handful of anchors', () => {
  const far = countAt(0);
  assert.ok(far >= 7, `the overview must still show the anchors, got ${far}`);
  assert.ok(far <= 14, `the overview must stay sparse, got ${far} of ${CITIES.length}`);
  // Every tier-5 anchor must be there, whatever the hash order says.
  const visibleIds = new Set(visibleCitiesAtZoom(CITIES, OVERVIEW, OVERVIEW).map((city) => city.id));
  CITIES.filter((city) => tierOf(city) === 5).forEach((city) => {
    assert.ok(visibleIds.has(city.id), `anchor ${city.id} must be visible at the overview`);
  });
});

test('markers only ever appear as you zoom in, never in one lump', () => {
  const ramp = Array.from({ length: 23 }, (_, step) => countAt(step * 0.1));
  for (let index = 1; index < ramp.length; index += 1) {
    assert.ok(ramp[index] >= ramp[index - 1], `density dropped between steps: ${ramp.join(', ')}`);
  }
  // The steps must be small — no tier dumping 20 markers at once.
  const biggestJump = Math.max(...ramp.slice(1).map((value, index) => value - ramp[index]));
  assert.ok(biggestJump <= 12, `one zoom step added ${biggestJump} markers at once`);
  // And the count has to climb across the whole range.
  assert.ok(ramp[ramp.length - 1] - ramp[0] > CITIES.length / 2);
});

test('everything is visible once you zoom far enough in', () => {
  const all = visibleCitiesAtZoom(CITIES, OVERVIEW + FULL_DENSITY_OFFSET, OVERVIEW);
  assert.equal(all.length, CITIES.length);
  const deeper = visibleCitiesAtZoom(CITIES, OVERVIEW + 6, OVERVIEW);
  assert.equal(deeper.length, CITIES.length);
});

test('the reveal order is stable and independent of array order', () => {
  const forward = visibleCitiesAtZoom(CITIES, OVERVIEW + 1, OVERVIEW).map((city) => city.id);
  const reversed = visibleCitiesAtZoom([...CITIES].reverse(), OVERVIEW + 1, OVERVIEW)
    .map((city) => city.id)
    .sort();
  assert.deepEqual([...forward].sort(), reversed);
  assert.deepEqual(forward, visibleCitiesAtZoom(CITIES, OVERVIEW + 1, OVERVIEW).map((city) => city.id));
});

test('a tier-8 town is never revealed before a tier-6 capital', () => {
  const town = CITIES.find((city) => tierOf(city) === 8)!;
  const capital = CITIES.find((city) => tierOf(city) === 6)!;
  const townOffset = revealOffset(town, CITIES.filter((city) => tierOf(city) === 8));
  const capitalOffset = revealOffset(capital, CITIES.filter((city) => tierOf(city) === 6));
  assert.ok(townOffset > capitalOffset, `${townOffset} should be > ${capitalOffset}`);
});

test('the map uses progressive density on wide screens and keeps the phone tiers', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../weather-source/src/components/WeatherMap.tsx', import.meta.url)),
    'utf8'
  );
  assert.match(source, /isWideViewport\(\)\s*\n?\s*\?\s*visibleCitiesAtZoom\(cities, densityZoom, minZoomLevel\)/);
  // The three-step tier logic must survive for portrait phones.
  assert.match(source, /: cities\.filter\(\(city\) => \{[\s\S]{0,400}?cityTier === 7/);
  // Quantised zoom keeps the marker layer from rebuilding on every frame.
  assert.match(source, /Math\.round\(currentZoom \* 20\) \/ 20/);
});
