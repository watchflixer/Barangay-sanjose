import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * HAZARD REPORT LOCATION GUARD
 *
 * Two regressions make a report's location wrong, and both used to ship:
 *
 *   1. "Street / Specific Location" had a hard-coded default and the pin
 *      picker overwrote it with the nearest seeded incident, so whatever the
 *      reporter typed was lost. It must accept any text.
 *   2. The map picker started with a pin already sitting on the barangay
 *      centre and its locate button moved only a decorative dot, so
 *      "Use This Location" could save a point the reporter never chose.
 *
 * These tests read the source because both behaviours live in component state
 * and event handlers, not in a pure function.
 */

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative: string) => readFileSync(path.join(APP, relative), 'utf8');
const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const formSource = stripComments(read('src/components/AddHazardModal.tsx'));
const pickerSource = stripComments(read('src/components/LocationPickerModal.tsx'));

test('Street / Specific Location accepts any text and is never overwritten', () => {
  assert.match(
    formSource,
    /const \[streetName, setStreetName\] = useState\(''\)/,
    'the field starts empty instead of pretending a known street was chosen',
  );
  assert.doesNotMatch(
    formSource,
    /setStreetName\(\s*nearest/,
    'moving the pin must never replace the street the reporter typed',
  );
  assert.doesNotMatch(
    formSource,
    /setStreetName\(\s*(?:alert|sitio)\b/,
    'nothing else may write into the street field',
  );
  assert.match(formSource, /value=\{streetName\}/, 'the input is bound to the typed text');
  assert.match(formSource, /id="hazard-street"/, 'the input stays addressable for tests');
});

test('the picker keeps the pin exactly where it was clicked', () => {
  // 6 decimals ≈ 10 cm; fewer decimals round the pin away from the tap.
  assert.match(pickerSource, /toFixed\(6\)/, 'coordinates keep 6 decimals');
  assert.doesNotMatch(pickerSource, /toFixed\(2\)/, 'no coarse rounding of a picked point');
  assert.match(
    pickerSource,
    /iconAnchor:\s*\[16,\s*40\]/,
    'the pin tip must sit on the picked coordinate',
  );
});

test('the picker starts unselected and requires a real choice', () => {
  assert.match(
    pickerSource,
    /useState<\[number, number\] \| null>\(\s*initialCoordinates,?\s*\)/,
    'no pin is dropped until the reporter actually picks a point',
  );
  assert.match(pickerSource, /disabled=\{!coordinates\}/, 'Use This Location waits for a pick');
  assert.match(pickerSource, /enableHighAccuracy: true/, 'a coarse network fix is not accurate enough');
  assert.match(
    pickerSource,
    /placePin\(userCoordinates\)/,
    'the locate button must move the pin itself, not only a decorative dot',
  );
});
