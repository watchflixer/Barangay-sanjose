import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * FLOOD PRONE MAP — WALANG PUTI/ABO SA SATELLITE
 *
 * Sa malalim na zoom (17–19) may mga tile na WALANG imagery ang Esri sa ilang
 * bahagi ng Rizal. 200 OK pa ito at pantay-pantay ang kulay (pale grey), kaya
 * hindi ito "tileerror" — isang buong column ng tiles ang nagiging puting
 * banda, at walang fallback na tumatakbo.
 *
 * Dalawang maling "fix" na naka-dokumento dito para hindi na maulit:
 *   - paghahalo ng ibang provider per tile (Google/GIBS/Sentinel-2) — ibang
 *     zoom matrix, kaya shifted/washed-out ang mga patch, at ang upscaled
 *     lower-zoom tiles ay pale-blur na may visible seams;
 *   - pagtatago ng "blank" tile sa pamamagitan ng pagbasa ng pixels — tainted
 *     ang canvas kapag cross-origin, kaya hindi ito mapagkakatiwalaan.
 *
 * Ang tamang fix: HUWAG hilingin ang mga tile na wala. `maxNativeZoom: 16` ang
 * imagery ceiling ng Esri sa rehiyon; lampas doon ay upscale ng huling totoong
 * tile — malabo pero tuloy-tuloy at aligned.
 */

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(APP, 'public', 'rizal_flood_100yr_map.html');
const html = readFileSync(FILE, 'utf8');

/** The `const satelliteLayer = L.tileLayer(…, { … })` options object. */
function satelliteOptions(): string {
  const start = html.indexOf('const satelliteLayer = L.tileLayer(');
  assert.notEqual(start, -1, 'satelliteLayer must exist');
  const open = html.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    else if (html[i] === '}') {
      depth -= 1;
      if (depth === 0) return html.slice(open, i + 1);
    }
  }
  throw new Error('unterminated satellite options');
}

test('hindi hinihingi ang mga zoom na walang imagery (maxNativeZoom 16)', () => {
  const options = satelliteOptions();
  assert.match(options, /maxNativeZoom:\s*16/, 'z17+ tiles ay blank pale grey — huwag hilingin');
  assert.match(options, /maxZoom:\s*19/, 'upscale pa rin hanggang 19');
  assert.match(options, /errorTileUrl:\s*TRANSPARENT_TILE/, 'bigong tile = transparent, hindi puti');
});

test('isang provider lang — walang pinaghalong tile sa isang screen', () => {
  assert.match(html, /const ESRI_IMAGERY = 'https:\/\/services\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery/);
  assert.equal((html.match(/World_Imagery\/MapServer\/tile/g) || []).length, 2, 'primary + isang same-service retry lang');
  // Walang ibang provider na pinapasok sa satellite view.
  assert.doesNotMatch(html, /mt1\.google\.com/);
  assert.doesNotMatch(html, /gibs\.earthdata\.nasa\.gov/);
  // EOX/Sentinel-2 is allowed ONLY as the zoom<=14 underlay (see the gated test).
  assert.equal((html.match(/tiles\.maps\.eox\.at/g) || []).length, 1);
});

test('ang Sentinel-2 underlay ay hanggang zoom 14 lang (hindi pale-blur sa zoom)', () => {
  assert.match(html, /const UNDERLAY_MAX_ZOOM = 14;/);
  assert.match(html, /const satelliteUnderlay = L\.tileLayer\(SENTINEL2_TILES/);
  const underlay = html.slice(html.indexOf('const satelliteUnderlay'), html.indexOf('function syncUnderlay'));
  assert.match(underlay, /maxNativeZoom: UNDERLAY_MAX_ZOOM/, 'native lang — walang upscaled na pale blur');
  assert.match(underlay, /errorTileUrl: TRANSPARENT_TILE/);
  // Zoom 15+ → tinatanggal; zoom ≤14 → nakabalik sa ILALIM ng Esri.
  assert.match(html, /const wanted = useSatellite && map\.getZoom\(\) <= UNDERLAY_MAX_ZOOM;/);
  assert.match(html, /else if \(!wanted && attached\) \{\s*map\.removeLayer\(satelliteUnderlay\);/);
  assert.match(html, /map\.on\('zoomend', syncUnderlay\)/);
  const sync = html.slice(html.indexOf('function syncUnderlay'), html.indexOf("map.on('zoomend'"));
  assert.ok(
    sync.indexOf('satelliteUnderlay.addTo(map)') < sync.indexOf('satelliteLayer.addTo(map)'),
    'underlay muna bago ang Esri',
  );
});

test('walang per-tile provider swapping at walang pixel-reading na detector', () => {
  // Ang retry ay dapat same-service lang at isang beses lang.
  const retry = html.slice(html.indexOf("satelliteLayer.on('tileerror'"), html.indexOf('const SENTINEL2_TILES'));
  assert.match(retry, /if \(e\.tile\.dataset\.retryStep\) return;/);
  assert.match(retry, /server\.arcgisonline\.com/);
  assert.doesNotMatch(retry, /google|gibs|eox/i);
  // Tinanggal ang dati nang blank-tile detector / underlay.
  assert.doesNotMatch(html, /tileLooksEmpty/);
  assert.doesNotMatch(html, /data-blank/);
  assert.doesNotMatch(html, /blankProbe/);
});

test('madilim ang canvas para hindi puting banda ang butas', () => {
  assert.match(html, /#map\{[^}]*background:#0b1220/);
  assert.match(html, /\.leaflet-container\{background:#0b1220;\}/);
});

test('street basemap at ang selector ay buo pa rin', () => {
  assert.match(html, /const streetLayer = L\.tileLayer\('https:\/\/tile\.openstreetmap\.org/);
  assert.match(html, /referrerPolicy: 'strict-origin-when-cross-origin'/);
  assert.match(html, /setBasemap\(button\.dataset\.base === 'satellite'\)/);
  assert.match(html, /setBasemap\(true\);/, 'satellite ang default');
  // Street layer may transparent error tile din.
  const street = html.slice(html.indexOf('const streetLayer'), html.indexOf('const ESRI_IMAGERY'));
  assert.match(street, /errorTileUrl:\s*TRANSPARENT_TILE/);
});
