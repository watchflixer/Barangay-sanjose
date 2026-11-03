import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * FLOOD PRONE MAP — WALANG PUTI/ABO SA SATELLITE
 *
 * Sintomas: sa satellite view, kapag naka-zoom, may malaking puti/abo na banda
 * sa gitna ng imagery. Dalawa ang pinagmulan:
 *
 *   1. ang Esri ay nagbabalik ng tile na "walang imagery dito" — halos
 *      pantay-pantay ang kulay (pale grey) at 200 OK, kaya hindi ito error at
 *      walang ma-fallback; at
 *   2. ang butas sa tiles ay nagpapakita ng page/container background
 *      (Leaflet's #ddd), na puti/abo rin ang dating.
 *
 * Ang fix: isang kumpletong coverage na Sentinel-2 underlay SA ILALIM ng Esri,
 * tinatago ang mga blangkong Esri tile para lumitaw ang underlay, at madilim
 * na canvas bilang huling panagip. Naka-lock ito sa suite na ito.
 */

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(APP, 'public', 'rizal_flood_100yr_map.html');
const html = readFileSync(FILE, 'utf8');

test('may kumpletong Sentinel-2 underlay sa ilalim ng Esri', () => {
  assert.match(html, /const SENTINEL2_TILES = 'https:\/\/tiles\.maps\.eox\.at\/wmts\?layer=s2cloudless-2020/);
  assert.match(html, /tilematrixset=GoogleMapsCompatible/, 'parehong WebMercator matrix ng Esri');
  assert.match(html, /const satelliteUnderlay = L\.tileLayer\(SENTINEL2_TILES/);
  // 16 lang ang totoong tile ng Sentinel-2; lampas doon ay upscale (aligned).
  const underlay = html.slice(html.indexOf('const satelliteUnderlay'), html.indexOf('let underlayReady'));
  assert.match(underlay, /maxNativeZoom:\s*16/);
  assert.match(underlay, /zIndex:\s*1/);
});

test('ang underlay ay laging nasa ILALIM ng Esri tiles', () => {
  const setBasemap = html.slice(html.indexOf('function setBasemap'), html.indexOf('setBasemap(true);'));
  const underlayIndex = setBasemap.indexOf('satelliteUnderlay.addTo(map)');
  const esriIndex = setBasemap.indexOf('satelliteLayer.addTo(map)');
  assert.notEqual(underlayIndex, -1, 'kailangang i-attach ang underlay');
  assert.notEqual(esriIndex, -1, 'kailangang i-attach ang Esri');
  assert.ok(underlayIndex < esriIndex, 'underlay muna bago ang Esri');
  assert.match(html, /setBasemap\(true\);/, 'satellite ang default na base');
});

test('ang blangkong Esri tile ay tinatago, hindi ipinapakita', () => {
  assert.match(html, /function tileLooksEmpty\(img\)/);
  assert.match(html, /satelliteLayer\.on\('tileload'/);
  assert.match(html, /e\.tile\.dataset\.blank = '1'/);
  assert.match(html, /#map \.leaflet-tile\[data-blank="1"\]\{opacity:0 !important;\}/);
  // Kung cross-origin (tainted canvas) o wala pang underlay, hindi ito gagalaw.
  assert.match(html, /catch \(err\) \{\s*blankProbeUsable = false;/);
  assert.match(html, /if \(!underlayReady \|\| !e\.tile\) return;/);
});

test('hindi na puting banda ang background kapag may butas', () => {
  assert.match(html, /#map\{[^}]*background:#0b1220/);
  assert.match(html, /\.leaflet-container\{background:#0b1220;\}/);
});

test('hindi na hinahalo ang ibang zoom matrix (Google / NASA GIBS)', () => {
  assert.doesNotMatch(html, /mt1\.google\.com/);
  assert.doesNotMatch(html, /gibs\.earthdata\.nasa\.gov/);
  // Isang same-service retry lang ang natitira.
  assert.match(html, /server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery/);
  assert.doesNotMatch(html, /dataset\.retryStep\)\s*;/);
});

test('street basemap at ang selector ay buo pa rin', () => {
  assert.match(html, /const streetLayer = L\.tileLayer\('https:\/\/tile\.openstreetmap\.org/);
  assert.match(html, /referrerPolicy: 'strict-origin-when-cross-origin'/);
  assert.match(html, /setBasemap\(button\.dataset\.base === 'satellite'\)/);
  assert.match(html, /streetLayer\.addTo\(map\)/);
});
