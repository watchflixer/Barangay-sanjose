import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * "Nagka-black yung button pag clinick" regression guard
 * ------------------------------------------------------
 * Two things used to turn a control black the moment it was tapped:
 *   1. The selected basemap / filter buttons were filled with near-black
 *      (#111827 / bg-black) instead of the app's teal accent.
 *   2. Chrome on Android / iOS Safari painted their default dark focus ring on
 *      whatever was tapped, because nothing suppressed it.
 * These assertions keep both from coming back.
 */

const cssPath = fileURLToPath(new URL('../src/index.css', import.meta.url));
const mapViewerPath = fileURLToPath(new URL('../src/components/MapViewer.tsx', import.meta.url));
const mainPath = fileURLToPath(new URL('../src/main.tsx', import.meta.url));

const css = readFileSync(cssPath, 'utf8');
const mapViewer = readFileSync(mapViewerPath, 'utf8');
const main = readFileSync(mainPath, 'utf8');

const rule = (selector: string) => {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `missing CSS rule: ${selector}`);
  return css.slice(start, css.indexOf('}', start) + 1);
};

test('selected basemap pill uses the brand teal, never black', () => {
  const active = rule('#hc-base-switch button.active');
  assert.match(active, /#00697a/);
  assert.doesNotMatch(active, /#111827|#000000|#000\b/);
});

test('the results-sheet Filters button and popup CTA use the brand teal', () => {
  assert.match(rule('#hc-sheet .hc-sheet-filter'), /background:\s*#00697a/);
  assert.match(rule('.hc-popup-btn--primary'), /background:\s*#00697a/);
});

test('Map Settings basemap buttons no longer fill with black when selected', () => {
  assert.doesNotMatch(mapViewer, /'bg-black text-white border-black'/);
  assert.match(mapViewer, /bg-\[#00697a\] text-white border-\[#00697a\]/);
});

test('taps do not paint a focus ring; keyboard users still get one', () => {
  assert.match(css, /-webkit-tap-highlight-color:\s*transparent/);
  // Rings are gated behind the keyboard-navigation class…
  assert.match(css, /html\.kb-nav\s+\.hc-cat:focus-visible/);
  assert.match(css, /html\.kb-nav\s+:is\(button, \[role='button'\], a, summary, input, select, textarea\):focus-visible/);
  // …which main.tsx only adds on keyboard input.
  assert.match(main, /classList\.add\('kb-nav'\)/);
  assert.match(main, /classList\.remove\('kb-nav'\)/);
});
