import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * TRAFFIC MAP — NO QUOTA BANNERS, ALWAYS A WORKING MAP
 *
 * The traffic map (public/rizal_traffic_map.html) used to surface Mapbox
 * account problems to visitors: an exhausted monthly quota painted a red
 * "Naubos na ang Mapbox quota ngayong buwan" pill across the map, and an
 * invalid token showed its own message. Those strings are end-user-visible
 * reminders that the site's billing is a problem — the visitor's map should
 * simply keep working.
 *
 * This suite locks in the replacement behaviour:
 *   1. no Mapbox quota / token banner text exists anywhere in the page,
 *   2. 401 / 403 / 429 errors switch the basemap to keyless OSM raster tiles
 *      instead of showing a notice,
 *   3. directions fall back to keyless OSRM routers when Mapbox Directions
 *      refuses the request, so routes and ETAs survive the quota.
 */

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAP_FILE = path.join(APP, 'public', 'rizal_traffic_map.html');
const html = readFileSync(MAP_FILE, 'utf8');

/** Text of one `map.on('error', (e) => { ... })` handler, braces balanced. */
function errorHandlerSource(source: string): string {
  const start = source.indexOf("map.on('error'");
  assert.notEqual(start, -1, 'the traffic map must still listen for map errors');
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  throw new Error('unterminated map error handler');
}

const handler = errorHandlerSource(html);

test('no Mapbox quota or token banner is shown to visitors', () => {
  const forbidden = [
    'Naubos na ang Mapbox quota',
    'Hindi valid ang Mapbox token',
    'VITE_MAPBOX_TRAFFIC_TOKEN.',
  ];
  for (const text of forbidden) {
    assert.equal(html.includes(text), false, `banner text must be gone: ${text}`);
  }
});

test('map errors trigger the keyless basemap instead of a notice', () => {
  assert.match(handler, /status === 401 \|\| status === 403 \|\| status === 429/);
  assert.match(handler, /useKeylessBasemap\(\)/);
  assert.equal(/showNotice|notice\.style/.test(handler), false, 'the error handler must stay silent');
});

test('keyless basemap styles exist and need no Mapbox token', () => {
  assert.match(html, /const KEYLESS_STYLES/);
  assert.match(html, /tile\.openstreetmap\.org/);
  assert.match(html, /World_Imagery\/MapServer\/tile/);
  assert.match(html, /World_Street_Map\/MapServer\/tile/);
  assert.match(html, /function useKeylessBasemap\(\)/);
  assert.match(html, /map\.setStyle\(keylessStyleFor\(currentBase\)/);
});

test('directions fall back to keyless OSRM routing', () => {
  assert.match(html, /const OSRM_ROUTERS/);
  assert.match(html, /router\.project-osrm\.org/);
  assert.match(html, /routing\.openstreetmap\.de\/routed-car/);
  assert.match(html, /function fetchOsrmRoutes\(/);
  assert.match(html, /return fetchOsrmRoutes\(profile, pts, alt\)/);
  // Every Mapbox Directions call must live inside fetchMapboxRoutes so the
  // fallback wrapper can catch a dead account in one place.
  const mapboxDirectionCalls = html.match(/api\.mapbox\.com\/directions\/v5/g) || [];
  assert.equal(mapboxDirectionCalls.length, 1, 'only fetchMapboxRoutes may call Mapbox Directions');
});

test('OSRM routes are normalised into the shape the route UI reads', () => {
  assert.match(html, /function osrmRoute\(r\)/);
  assert.match(html, /duration_typical: r\.duration/);
  assert.match(html, /maneuver: \{ type: OSRM_MANEUVER\[m\.type\] \|\| 'turn'/);
});
