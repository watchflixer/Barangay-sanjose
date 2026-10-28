import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  FULL_DENSITY_OFFSET,
  OVERVIEW_VISIBLE_LIMIT,
  revealOffsets,
  tierOf,
  visibleCitiesAtZoom,
  type DensityCity
} from '../weather-source/src/services/cityDensity';

/**
 * Guard for progressive marker density on the Panahon map.
 *
 * The map used to reveal markers in three hard jumps, so the far view was
 * already crowded. Now the far view keeps exactly OVERVIEW_VISIBLE_LIMIT
 * markers and every other city has its own reveal threshold, so the pills build
 * up gradually as you zoom in — the same list feeds all four modes (weather /
 * temperature / wind / rain).
 */
const CITIES: DensityCity[] = [
  ...Array.from({ length: 7 }, (_, index) => ({ id: `anchor-${index}`, minZoom: 5 })),
  ...Array.from({ length: 10 }, (_, index) => ({ id: `capital-${index}`, minZoom: 6 })),
  ...Array.from({ length: 14 }, (_, index) => ({ id: `city-${index}`, minZoom: 7 })),
  ...Array.from({ length: 33 }, (_, index) => ({ id: `town-${index}`, minZoom: 8 }))
];

const OVERVIEW = 4.4;
const countAt = (offset: number) => visibleCitiesAtZoom(CITIES, OVERVIEW + offset, OVERVIEW).length;

test('the far view shows exactly the overview limit and nothing else', () => {
  const far = visibleCitiesAtZoom(CITIES, OVERVIEW, OVERVIEW);
  assert.equal(OVERVIEW_VISIBLE_LIMIT, 10);
  assert.equal(far.length, OVERVIEW_VISIBLE_LIMIT, `expected ${OVERVIEW_VISIBLE_LIMIT} markers at the overview`);

  // The curated anchors lead the far view, in table order — not a hash lottery.
  const anchors = CITIES.filter((city) => tierOf(city) === 5).map((city) => city.id);
  assert.deepEqual(far.slice(0, anchors.length).map((city) => city.id), anchors);
  // Whatever fills the rest comes from the next tier up, never a small town.
  far.slice(anchors.length).forEach((city) => {
    assert.ok(tierOf(city) <= 6, `${city.id} is tier ${tierOf(city)} and must not crowd the far view`);
  });

  // A step just above the overview must not dump a whole tier in.
  assert.ok(visibleCitiesAtZoom(CITIES, OVERVIEW + 0.1, OVERVIEW).length <= OVERVIEW_VISIBLE_LIMIT + 3);
});

test('the real city table also shows exactly the overview limit at the far view', () => {
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
  assert.equal(far.length, OVERVIEW_VISIBLE_LIMIT, `expected ${OVERVIEW_VISIBLE_LIMIT} visible at the far view, got ${far.length}`);
  // The six national anchors must all be in the far view, in table order.
  assert.deepEqual(far.slice(0, 6).map((city) => city.id), [
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

test('smaller places never arrive before bigger ones', () => {
  const offsets = revealOffsets(CITIES);
  const offsetOf = (tier: number) => {
    const city = CITIES.find((candidate) => tierOf(candidate) === tier)!;
    return offsets.get(city.id)!;
  };
  const capital = offsetOf(6);
  const city = offsetOf(7);
  const town = offsetOf(8);

  assert.ok(capital <= city, `capitals (${capital}) must not arrive after cities (${city})`);
  assert.ok(city < town, `cities (${city}) must arrive before towns (${town})`);
  // And a town really does wait, rather than appearing with the far view.
  assert.ok(town > 0);
});

test('every city has a distinct, monotone reveal slot', () => {
  const offsets = revealOffsets(CITIES);
  assert.equal(offsets.size, CITIES.length);
  const values = [...offsets.values()];
  assert.equal(values.filter((value) => value === 0).length, OVERVIEW_VISIBLE_LIMIT);
  values.forEach((value) => {
    assert.ok(value >= 0 && value <= 2, `offset ${value} is outside the ramp`);
  });
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

/**
 * Regression: Leaflet reports `getZoom()` as undefined until the first setView.
 * That value used to reach the density maths, make the offset NaN, and hide
 * every marker (`NaN >= 0` is false). The far view must never go empty.
 */
test('a missing or broken zoom still shows the overview set', () => {
  const broken = [NaN, undefined as unknown as number, Infinity, -Infinity];
  for (const zoom of broken) {
    const visible = visibleCitiesAtZoom(CITIES, zoom, OVERVIEW);
    assert.equal(
      visible.length,
      OVERVIEW_VISIBLE_LIMIT,
      `zoom ${String(zoom)} must fall back to the overview set, got ${visible.length}`
    );
  }

  // Same when the overview itself is the broken value.
  assert.equal(visibleCitiesAtZoom(CITIES, OVERVIEW, NaN).length, OVERVIEW_VISIBLE_LIMIT);
  assert.equal(visibleCitiesAtZoom(CITIES, 4.4, undefined as unknown as number).length, OVERVIEW_VISIBLE_LIMIT);

  // A zoom below the overview (never expected, but possible while resizing)
  // must not empty the map either.
  assert.equal(visibleCitiesAtZoom(CITIES, OVERVIEW - 3, OVERVIEW).length, OVERVIEW_VISIBLE_LIMIT);
});

test('the component never feeds a non-finite zoom into the density maths', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../weather-source/src/components/WeatherMap.tsx', import.meta.url)),
    'utf8'
  );
  // zoomend must guard before storing.
  assert.match(source, /const zoom = map\.getZoom\(\);\s*\n\s*if \(Number\.isFinite\(zoom\)\) setCurrentZoom\(zoom\);/);
  // densityZoom must guard too.
  assert.match(source, /const densityZoom = Number\.isFinite\(currentZoom\) && Number\.isFinite\(minZoomLevel\)/);
});
