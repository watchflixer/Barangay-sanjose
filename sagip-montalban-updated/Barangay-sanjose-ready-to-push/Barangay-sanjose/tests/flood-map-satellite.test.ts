import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * FLOOD PRONE MAP — SATELLITE BASEMAP MUST LOOK LIKE ONE IMAGE
 *
 * The satellite view used to patch single tiles from other services when the
 * Esri request failed (other Esri host → Google → NASA GIBS). GIBS only
 * publishes "GoogleMapsCompatible_Level9", so at the zooms this map opens on
 * those tiles were either rejected or came back at a different scale — the
 * result was washed-out/shifted patches, and failed tiles left an empty <img>
 * that showed the white page background as a pale vertical band.
 *
 * This suite locks in the replacement rules:
 *   1. providers are swapped at the LAYER level (whole layer), never per tile,
 *   2. every failed tile resolves to a transparent errorTileUrl on a dark
 *      canvas, so a gap can never read as a white band,
 *   3. each provider declares its own maxNativeZoom (aligned upscaling),
 *   4. the mismatched-zoom sources (Google / NASA GIBS Level 9) are gone.
 */

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(APP, 'public', 'rizal_flood_100yr_map.html');
const html = readFileSync(FILE, 'utf8');

/** Source of `const BASE_PROVIDERS = { … }`, braces balanced. */
function providersBlock(): string {
  const start = html.indexOf('const BASE_PROVIDERS');
  assert.notEqual(start, -1, 'BASE_PROVIDERS must exist');
  const open = html.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    else if (html[i] === '}') {
      depth -= 1;
      if (depth === 0) return html.slice(open, i + 1);
    }
  }
  throw new Error('unterminated BASE_PROVIDERS');
}

const providers = providersBlock();

test('satellite providers are keyless and share one WebMercator matrix', () => {
  // Primary + same-service alternate host…
  assert.match(providers, /services\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery/);
  assert.match(providers, /server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery/);
  // …then a genuinely aligned keyless fallback.
  assert.match(providers, /tiles\.maps\.eox\.at\/wmts\?layer=s2cloudless-2020/);
  assert.match(providers, /tilematrixset=GoogleMapsCompatible/);
});

test('the mismatched-zoom sources are gone', () => {
  assert.doesNotMatch(html, /mt1\.google\.com/, 'Google tiles are not a licensed fallback');
  assert.doesNotMatch(html, /gibs\.earthdata\.nasa\.gov/, 'GIBS Level 9 cannot serve zooms above 9');
  assert.doesNotMatch(html, /GoogleMapsCompatible_Level9/);
});

test('tiles are never patched one-by-one from another provider', () => {
  // The old handler reassigned img.src per tile — the source of the seams.
  assert.doesNotMatch(html, /\.tile\.src\s*=/, 'no per-tile src rewriting');
  assert.doesNotMatch(html, /dataset\.retryStep/);
});

test('a failed tile can never paint a white band', () => {
  assert.match(html, /errorTileUrl:\s*TRANSPARENT_TILE/, 'failed tiles must resolve to a transparent image');
  assert.match(html, /const TRANSPARENT_TILE = 'data:image\/gif;base64,/);
  assert.match(html, /#map\{[^}]*background:#0b1220/, 'the canvas behind the tiles is dark, not white');
});

test('provider fallback swaps the whole layer and keeps it attached', () => {
  const factory = html.slice(html.indexOf('function createBasemap'), html.indexOf('const streetBasemap'));
  assert.match(factory, /next\.on\('tileerror'/);
  assert.match(factory, /if \(errors < PROVIDER_SWAP_AFTER\) return;/);
  assert.match(factory, /map\.removeLayer\(next\)/);
  assert.match(factory, /layer = build\(\)/);
  assert.match(factory, /if \(onMap\) attach\(layer\)/);
  // Swapping only once the threshold is hit means one bad tile never reshuffles.
  assert.match(html, /const PROVIDER_SWAP_AFTER = \d+/);
});

test('each provider declares its own native zoom ceiling', () => {
  const entries = providers.match(/maxNativeZoom:\s*\d+/g) ?? [];
  assert.ok(entries.length >= 5, 'every street + satellite entry needs maxNativeZoom');
  // Sentinel-2 tops out at 16 — Leaflet upscales from there, staying aligned.
  assert.match(providers, /tiles\.maps\.eox\.at[\s\S]{0,400}?maxNativeZoom:\s*16/);
});

test('street tiles keep the OSM referrer policy and an Esri street backup', () => {
  assert.match(providers, /referrerPolicy:\s*'strict-origin-when-cross-origin'/);
  assert.match(providers, /World_Street_Map\/MapServer\/tile/);
});

test('the selector still toggles the two basemaps', () => {
  assert.match(html, /const streetBasemap = createBasemap\('streets'\)/);
  assert.match(html, /const satelliteBasemap = createBasemap\('satellite'\)/);
  assert.match(html, /satelliteBasemap\.attach\(\);/);
  assert.match(html, /if \(!nextBasemap\.isAttached\(\)\) nextBasemap\.attach\(\);/);
});
