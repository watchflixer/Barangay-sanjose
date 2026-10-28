import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  FULL_DENSITY_OFFSET,
  OVERVIEW_VISIBLE_LIMIT,
  revealOffset,
  tierOf,
  visibleCitiesAtZoom,
  type DensityCity
} from '../weather-source/src/services/cityDensity';

/**
 * Guard for progressive marker density on the Panahon map.
 *
 * The map used to reveal markers in three hard jumps, so the far view was
 * already crowded. Now the far view keeps exactly six anchors and every other
 * city has its own reveal threshold, so the pills build up gradually as you
 * zoom in — the same list feeds all four modes (weather / temperature / wind /
 * rain).
 */
const CITIES: DensityCity[] = [
  ...Array.from({ length: 7 }, (_, index) => ({ id: `anchor-${index}`, minZoom: 5 })),
  ...Array.from({ length: 10 }, (_, index) => ({ id: `capital-${index}`, minZoom: 6 })),
  ...Array.from({ length: 14 }, (_, index) => ({ id: `city-${index}`, minZoom: 7 })),
  ...Array.from({ length: 33 }, (_, index) => ({ id: `town-${index}`, minZoom: 8 }))
];

const OVERVIEW = 4.4;
const countAt = (offset: number) => visibleCitiesAtZoom(CITIES, OVERVIEW + offset, OVERVIEW).length;

test('the far view shows exactly six anchors and nothing else', () => {
  const far = visibleCitiesAtZoom(CITIES, OVERVIEW, OVERVIEW);
  assert.equal(far.length, OVERVIEW_VISIBLE_LIMIT, `expected ${OVERVIEW_VISIBLE_LIMIT} markers at the overview`);
  assert.equal(far.length, 6);

  // Those six are the curated anchors, in source order — not a hash lottery.
  const anchors = CITIES.filter((city) => tierOf(city) === 5).map((city) => city.id);
  assert.deepEqual(far.map((city) => city.id), anchors.slice(0, OVERVIEW_VISIBLE_LIMIT));

  // A spread of zooms just above the overview must not dump the whole tier in.
  assert.ok(visibleCitiesAtZoom(CITIES, OVERVIEW + 0.1, OVERVIEW).length <= OVERVIEW_VISIBLE_LIMIT + 1);
});

test('the real city table also shows exactly six at the far view', () => {
  // Parsed from the shipped table, so this fails if someone reorders it.
  const table = readFileSync(
    fileURLToPath(new URL('../weather-source/src/services/openMeteoService.ts', import.meta.url)),
    'utf8'
  );
  const cities: DensityCity[] = [...table.matchAll(/id: '([^']+)'[^}]*?minZoom: (\d+)/g)].map((match) => ({
    id: match[1],
    minZoom: Number(match[2])
  }));
  assert.ok(cities.length > 40, `expected the full city table, parsed ${cities.length}`);

  const far = visibleCitiesAtZoom(cities, 4.4, 4.4);
  assert.equal(far.length, 6, `expected 6 visible at the far view, got ${far.length}`);
  assert.deepEqual(far.map((city) => city.id), [
    'manila',
    'baguio',
    'cebu',
    'davao',
    'puerto-princesa',
    'cagayan-de-oro'
  ]);

  // And it climbs steadily from there.
  const ramp = [0, 0.4, 0.8, 1.2, 1.6, 2.0].map((offset) => visibleCitiesAtZoom(cities, 4.4 + offset, 4.4).length);
  for (let index = 1; index < ramp.length; index += 1) {
    assert.ok(ramp[index] > ramp[index - 1], `density must climb: ${ramp.join(', ')}`);
  }
  assert.equal(ramp[ramp.length - 1], cities.length, 'every city must be visible at the end of the ramp');
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
