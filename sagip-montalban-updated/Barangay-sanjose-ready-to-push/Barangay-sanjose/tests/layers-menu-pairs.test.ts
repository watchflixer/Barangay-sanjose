import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * LAYERS MENU — PAIRED ROWS
 *
 * The Layers menu lists every basemap style beside the map it belongs to, in
 * this order:
 *
 *   1. Streets      | Help Center
 *   2. Traffic      | Weather
 *   3. Flood Prone  | Coming Soon
 *
 * The grid is rendered from LAYER_MENU_ROWS (pairs), not from a flat list, so
 * rows cannot split when a slot is edited. This suite locks in both the pair
 * order and the disabled "Coming Soon" cell that keeps row 3 full.
 */

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAP_VIEWER = path.join(APP, 'src', 'components', 'MapViewer.tsx');
const source = readFileSync(MAP_VIEWER, 'utf8');

/** The `LAYER_MENU_ROWS` declaration, braces balanced from its opening bracket. */
function rowsDeclaration(): string {
  const start = source.indexOf('const LAYER_MENU_ROWS');
  assert.notEqual(start, -1, 'LAYER_MENU_ROWS must exist — the grid is built from pairs');
  const open = source.indexOf('[', source.indexOf('=', start));
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '[') depth += 1;
    else if (source[i] === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  throw new Error('unterminated LAYER_MENU_ROWS');
}

/** `['streets', 'satellite']` → [['streets', 'satellite'], …] in source order. */
function pairs(): string[][] {
  const body = rowsDeclaration().slice(rowsDeclaration().indexOf('\n'));
  return [...body.matchAll(/\[\s*'([a-z-]+)'\s*,\s*'([a-z-]+)'\s*\]/g)].map((m) => [m[1], m[2]]);
}

test('the Layers menu is three pairs, in the requested order', () => {
  assert.deepEqual(pairs(), [
    ['streets', 'satellite'], // Streets     | Help Center
    ['dark', 'weather'],      // Traffic     | Weather
    ['light', 'coming-soon'], // Flood Prone | Coming Soon
  ]);
  assert.equal(pairs().length, 3, 'exactly six cells: three styles, three partners');
});

test('each basemap style keeps its own visible label', () => {
  const labels: Record<string, string> = {
    streets: 'Streets',
    light: 'Flood Prone',
    dark: 'Traffic',
    satellite: 'Help Center',
    weather: 'Weather',
  };
  for (const [key, label] of Object.entries(labels)) {
    assert.match(
      source,
      new RegExp(`\\b${key}:\\s*'${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`),
      `${key} must read "${label}"`,
    );
  }
});

test('the grid renders the flattened pairs, never a flat slot list', () => {
  assert.match(source, /LAYER_MENU_ROWS\.flatMap\(/);
  assert.match(source, /partner === 'coming-soon' \? renderComingSoonCell\(\) : renderLayerCell\(partner\)/);
  // The old flat array (with Help Center last) must not come back.
  assert.doesNotMatch(source, /\(\['streets', 'dark', 'weather', 'light', 'satellite'\] as const\)/);
});

test('Coming Soon is a disabled cell in row 3, beside Flood Prone', () => {
  const comingSoon = source.slice(source.indexOf('const renderComingSoonCell'));
  assert.match(comingSoon.slice(0, 700), /\bdisabled\b/);
  assert.match(comingSoon.slice(0, 700), /Coming Soon/);
  assert.match(source, /data-layer="coming-soon"/);
});

test('every slot still opens the map it names', () => {
  const cell = source.slice(source.indexOf('const renderLayerCell'), source.indexOf('const renderComingSoonCell'));
  assert.match(cell, /setShowTrafficMap\(true\)/, 'Traffic opens the realtime traffic map');
  assert.match(cell, /setShowWeather\(true\)/, 'Weather opens Panahon');
  assert.match(cell, /setShowFloodProneBlank\(true\)/, 'Flood Prone opens the 100-year flood map');
  assert.match(cell, /setShowHelpCenter\(true\)/, 'Help Center opens the filterable directory');
  assert.match(cell, /onUpdateMapSettings\(\{ tileLayer: layer \}\)/, 'Streets keeps the hazard basemap');
});
