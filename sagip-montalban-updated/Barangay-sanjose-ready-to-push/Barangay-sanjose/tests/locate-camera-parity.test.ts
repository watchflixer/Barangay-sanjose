import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * "Show your location" must look the SAME on every basemap style.
 *
 * The hazard (Streets) map is the reference: it flies slowly in to the user's
 * pin — zoom 16, never faster than 1.6s, one zoom level per ~0.53s, capped at
 * 2.6s, with Leaflet's fly-arc easing — instead of snapping. Every other style
 * has to reproduce exactly that camera move:
 *
 *   streets   → src/lib/locateCamera.ts (used by MapViewer)
 *   satellite → the same helper, driven through HelpCenterView
 *   light     → public/rizal_flood_100yr_map.html   (Leaflet, seconds)
 *   dark      → public/rizal_traffic_map.html        (Mapbox GL, milliseconds)
 *   weather   → weather-source/src/components/WeatherMap.tsx
 *
 * The plain-HTML pages and the Panahon document cannot import the helper, so
 * they keep copies of the numbers. This test is the guard that those copies
 * never drift apart again: the Weather map used to stop at zoom 10 over 1.5s
 * and the Traffic map's own button at zoom 15 / 1200ms, so neither zoomed in
 * on the pin the way the hazard map does.
 */
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const locateCamera = read('../src/lib/locateCamera.ts');
const mapViewer = read('../src/components/MapViewer.tsx');
const helpCenter = read('../src/components/HelpCenterView.tsx');
const floodMap = read('../public/rizal_flood_100yr_map.html');
const trafficMap = read('../public/rizal_traffic_map.html');
const weatherMap = read('../weather-source/src/components/WeatherMap.tsx');

const ZOOM = 16;
const BASE_DURATION = 1.6;
const MAX_DURATION = 2.6;
const EASE_LINEARITY = 0.25;
/** The hazard map's own flight: zoom 13 → 16. */
const REFERENCE_SPAN = 3;

test('the canonical locate camera is the hazard map look', () => {
  assert.match(locateCamera, new RegExp(`LOCATE_ZOOM = ${ZOOM};`));
  assert.match(locateCamera, new RegExp(`LOCATE_DURATION_SECONDS = ${BASE_DURATION};`));
  assert.match(locateCamera, new RegExp(`LOCATE_EASE_LINEARITY = ${EASE_LINEARITY};`));
  assert.match(locateCamera, new RegExp(`MAX_LOCATE_DURATION_SECONDS = ${MAX_DURATION};`));
  assert.match(locateCamera, new RegExp(`REFERENCE_ZOOM_SPAN = ${REFERENCE_SPAN};`));
  // Never faster than the hazard flight, never longer than the cap.
  assert.match(locateCamera, /Math\.min\(\s*MAX_LOCATE_DURATION_SECONDS,\s*Math\.max\(LOCATE_DURATION_SECONDS/);
  // The flight itself, on the map, at street level.
  assert.match(locateCamera, /map\.flyTo\(coords, LOCATE_ZOOM, \{/);
});

test('the GIS map and the Help Center fly with the shared camera', () => {
  // streets
  assert.match(mapViewer, /flyToUserLocation\(map, coordinates\)/);
  // satellite — the host hands its coordinates over; the Help Center flies
  assert.match(helpCenter, /flyToUserLocation\(map, coords\)/);
  // …and its own "Near me" control uses the same helper, not a faster flight
  const nearMe = helpCenter.split('const handleNearMe')[1] ?? '';
  assert.match(nearMe, /flyToUserLocation\(map, coords\)/);
  assert.doesNotMatch(nearMe, /duration: 1\.2/);
});

test('the Flood Prone map flies at zoom 16 with the hazard pace', () => {
  assert.match(
    floodMap,
    new RegExp(
      `map\\.flyTo\\(\\[lat, lng\\], ${ZOOM}, \\{ duration: locateFlightDuration\\(\\), easeLinearity: ${EASE_LINEARITY} \\}\\)`,
    ),
  );
  assert.match(floodMap, /function locateFlightDuration\(\)/);
  assert.match(
    floodMap,
    new RegExp(`Math\\.min\\(${MAX_DURATION}, Math\\.max\\(${BASE_DURATION}, \\(span \\/ ${REFERENCE_SPAN}\\) \\* ${BASE_DURATION}\\)\\)`),
  );
});

test('every Traffic locate flight matches the hazard camera', () => {
  const flights: string[] = trafficMap.match(/map\.flyTo\(\{[\s\S]{0,260}?\}\)/g) ?? [];
  const locateFlights = flights.filter((call) => call.includes('zoom: 16'));
  assert.equal(locateFlights.length, 2, 'expected the host-driven and the on-map locate flights');
  for (const call of locateFlights) {
    assert.match(call, /duration: locateFlightDurationMs\(\)/);
    // Leaflet's fly-arc + a level camera + animation even under reduced motion
    assert.match(call, /curve: 1\.42/);
    assert.match(call, /pitch: 0/);
    assert.match(call, /essential: true/);
  }
  assert.match(trafficMap, /function locateFlightDurationMs\(\)/);
  // The old, snappier camera must not come back.
  assert.doesNotMatch(trafficMap, /zoom: 15, duration: 1200/);
});

test('the weather map zooms in on the pin instead of nudging', () => {
  assert.match(weatherMap, new RegExp(`const LOCATE_ZOOM = ${ZOOM};`));
  assert.match(weatherMap, new RegExp(`const LOCATE_DURATION_SECONDS = ${BASE_DURATION};`));
  assert.match(weatherMap, new RegExp(`const LOCATE_MAX_DURATION_SECONDS = ${MAX_DURATION};`));
  assert.match(weatherMap, new RegExp(`const LOCATE_EASE_LINEARITY = ${EASE_LINEARITY};`));
  assert.match(weatherMap, /map\.flyTo\(userLocationCoords, LOCATE_ZOOM, \{/);
  assert.match(weatherMap, /duration: locateFlightDuration\(map\.getZoom\(\)\)/);
  // The old camera stopped at zoom 10 over 1.5s and never reached the pin.
  assert.doesNotMatch(weatherMap, /map\.flyTo\(userLocationCoords, 10/);
});

test('the flight pace reproduces the hazard map and never rushes past it', async () => {
  // The helper has no runtime dependency on Leaflet (type-only import), so it
  // can be exercised directly.
  const { locateFlightDuration, LOCATE_ZOOM, LOCATE_DURATION_SECONDS, MAX_LOCATE_DURATION_SECONDS } =
    await import('../src/lib/locateCamera');

  // The hazard map itself: zoom 13 → 16 must stay exactly as it always was.
  assert.equal(locateFlightDuration(13), LOCATE_DURATION_SECONDS);
  // A short hop is never faster than the hazard flight.
  assert.equal(locateFlightDuration(15.5), LOCATE_DURATION_SECONDS);
  // A longer hop takes proportionally longer…
  assert.ok(Math.abs(locateFlightDuration(12) - (4 / 3) * 1.6) < 1e-9);
  // …but is capped so nobody waits half a minute.
  assert.equal(locateFlightDuration(4.6), MAX_LOCATE_DURATION_SECONDS);
  assert.equal(locateFlightDuration(0), MAX_LOCATE_DURATION_SECONDS);

  for (let zoom = 0; zoom <= LOCATE_ZOOM + 2; zoom += 0.25) {
    const duration = locateFlightDuration(zoom);
    assert.ok(duration >= LOCATE_DURATION_SECONDS, `zoom ${zoom} flew faster than the hazard map`);
    assert.ok(duration <= MAX_LOCATE_DURATION_SECONDS, `zoom ${zoom} exceeded the cap`);
  }
});
