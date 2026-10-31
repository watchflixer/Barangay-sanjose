import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Regression guard for black borders appearing on controls after repeated taps. */
const css = readFileSync(fileURLToPath(new URL('../src/index.css', import.meta.url)), 'utf8');
const mapViewer = readFileSync(fileURLToPath(new URL('../src/components/MapViewer.tsx', import.meta.url)), 'utf8');
const main = readFileSync(fileURLToPath(new URL('../src/main.tsx', import.meta.url)), 'utf8');

const rule = (selector: string) => {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `missing CSS rule: ${selector}`);
  return css.slice(start, css.indexOf('}', start) + 1);
};

test('the existing selected-state colors are preserved', () => {
  assert.match(rule('#hc-base-switch button.active'), /background:\s*#111827/);
  assert.match(rule('#hc-sheet .hc-sheet-filter'), /background:\s*#111827/);
  assert.match(rule('.hc-popup-directions'), /background:\s*#1a73e8/);
  assert.match(mapViewer, /'bg-black text-white border-black'/);
});

test('pointer focus and active states cannot show the browser black outline', () => {
  assert.match(css, /-webkit-tap-highlight-color:\s*transparent/);
  assert.match(css, /:is\(button, \[role='button'\], a, summary, input, select, textarea\):focus,[\s\S]*outline:\s*none/);
  assert.match(css, /:is\(button, \[role='button'\], a, summary, input, select, textarea\):active/);
});

test('keyboard focus remains visible with an on-brand teal indicator', () => {
  assert.match(css, /html\.kb-nav \.hc-cat:focus-visible \{\s*outline: none/);
  assert.match(css, /html\.kb-nav \.hc-cat:focus-visible \.hc-cat-title/);
  assert.match(css, /html\.kb-nav #hc-sheet \.hc-sheet-filter:focus-visible/);
  assert.match(css, /html\.kb-nav :is\(button, \[role='button'\], a, summary, input, select, textarea\):not\(\.hc-cat\):focus-visible/);
  assert.match(css, /outline: 2px solid #00697a/);
  assert.match(main, /classList\.add\('kb-nav'\)/);
  assert.match(main, /classList\.remove\('kb-nav'\)/);
});
