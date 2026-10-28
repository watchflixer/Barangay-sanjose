import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * MAP PIN ASSET GUARD
 *
 * Leaflet's built-in marker icon is two PNGs that the library finds at runtime
 * by sniffing `url(images/marker-icon.png)` out of leaflet.css. Vite inlines
 * those images as base64 and hashes/rebases the URL, so the lookup misses and
 * a bare `new L.Marker(latlng)` paints an empty white box — in production
 * builds only. That is exactly how the "Choose Hazard Location" pin shipped
 * blank.
 *
 * This suite keeps two promises:
 *   1. every marker in `src/` passes an explicit `icon` (a DivIcon we draw),
 *   2. no source file imports a raster asset from the deleted
 *      `src/assets/images` folder, which used to break `npm run build`.
 */

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(APP, 'src');

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, found);
    else if (/\.(ts|tsx)$/.test(entry)) found.push(full);
  }
  return found;
}

const sourceFiles = walk(SRC).map((file) => ({
  file,
  rel: path.relative(APP, file),
  text: readFileSync(file, 'utf8'),
}));

/** Strip // and block comments so the docs that mention markers don't match. */
const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('every Leaflet marker passes an explicit icon (no blank default PNG pin)', () => {
  const offenders: string[] = [];

  for (const { rel, text } of sourceFiles) {
    const code = stripComments(text);
    // `new L.Marker(x)` or `new L.Marker(x, { ... })` where the options object
    // never mentions `icon`. Multi-line options objects are matched too.
    const pattern = /new L\.Marker\(\s*[^,()]+?\s*(?:,\s*\{([\s\S]*?)\}\s*)?\)/g;
    for (const match of code.matchAll(pattern)) {
      const options = match[1] ?? '';
      if (!/\bicon\s*[:,]/.test(options)) {
        const line = code.slice(0, match.index).split('\n').length;
        offenders.push(`${rel}:${line}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'Markers without an explicit `icon` render as a blank white box in production builds',
  );
});

test('the location picker draws its pin as inline SVG, not an image file', () => {
  const picker = stripComments(
    readFileSync(path.join(SRC, 'components/LocationPickerModal.tsx'), 'utf8'),
  );

  assert.match(picker, /new L\.DivIcon\(/, 'the picker pin must use a DivIcon');
  assert.match(picker, /<svg[\s\S]*?<\/svg>/, 'the DivIcon html must embed an inline SVG pin');
  assert.match(picker, /iconAnchor:\s*\[16,\s*40\]/, 'the pin tip must sit on the chosen point');
  assert.doesNotMatch(
    picker,
    /marker-icon|\.png|\.jpg/,
    'the picker must never depend on Leaflet raster assets',
  );
});

test('the picker pin is styled, and hover scale never fights Leaflet positioning', () => {
  const css = readFileSync(path.join(SRC, 'index.css'), 'utf8');

  for (const selector of ['.picker-pin {', '.picker-pin-svg {', '.picker-pin-ring {']) {
    assert.ok(css.includes(selector), `missing ${selector} styles`);
  }

  // Leaflet writes translate3d() into .leaflet-marker-icon style, so a
  // `transform` on .picker-pin itself would teleport the pin. Scale the SVG.
  const pinRule = css.slice(css.indexOf('.picker-pin {'), css.indexOf('}', css.indexOf('.picker-pin {')));
  assert.doesNotMatch(pinRule, /transform:/, '.picker-pin must not declare transform');
  assert.match(css, /\.picker-pin:hover \.picker-pin-svg \{\s*transform: scale\(/, 'hover scale belongs on the SVG');

  assert.match(css, /prefers-reduced-motion[\s\S]{0,200}picker-pin/, 'the pin animation needs a reduced-motion escape');
});

test('no source file imports the deleted assets/images folder', () => {
  const imageDir = path.join(SRC, 'assets', 'images');
  assert.equal(existsSync(imageDir), false, 'src/assets/images was deleted from the repo');

  const offenders = sourceFiles
    .filter(({ text }) => text.includes('assets/images'))
    .map(({ rel }) => rel);

  assert.deepEqual(offenders, [], 'dangling imports break `npm run build` and the Pages deploy');
});
