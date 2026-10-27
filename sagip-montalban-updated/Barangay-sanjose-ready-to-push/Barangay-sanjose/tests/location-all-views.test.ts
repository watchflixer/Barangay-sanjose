import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Regression guard: "Show your location" must work on EVERY basemap style.
 *
 * The Layers menu's basemap slots are not all the same kind of map:
 *
 *   streets   → the GIS Leaflet map (the host itself)
 *   light     → Flood Prone  (public/rizal_flood_100yr_map.html, an iframe)
 *   dark      → Traffic      (public/rizal_traffic_map.html, an iframe)
 *   weather   → Panahon      (weather.html → weather-source, an iframe)
 *   satellite → Help Center  (HelpCenterView, its own Leaflet map)
 *
 * Each of them has to end up with the user's coordinates. These assertions
 * pin the hand-off for every one of them, because the failure is silent: the
 * dot simply never appears on the style the user picked.
 */
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const mapViewer = read('../src/components/MapViewer.tsx');
const helpCenter = read('../src/components/HelpCenterView.tsx');
const weatherApp = read('../weather-source/src/App.tsx');
const floodMap = read('../public/rizal_flood_100yr_map.html');
const trafficMap = read('../public/rizal_traffic_map.html');

test('the host answers embedded-map locate requests with the current view', () => {
  // The message listener is registered once, so it must not capture the
  // handler from the first render (that is how the dot used to land on the
  // hidden GIS map instead of the style the user was looking at).
  assert.match(mapViewer, /const showUserLocationRef = useRef<\(\) => void>/);
  assert.match(mapViewer, /showUserLocationRef\.current = handleShowUserLocation/);
  assert.match(mapViewer, /hazardsync-location-request'[\s\S]{0,120}showUserLocationRef\.current\(\)/);
});

test('every basemap style receives the approved coordinates', () => {
  // streets — the GIS map keeps its own marker.
  assert.match(mapViewer, /userLocationMarkerRef\.current = new L\.Marker\(coordinates/);
  // light — Flood Prone iframe.
  assert.match(mapViewer, /type: 'flood-user-location'/);
  assert.match(floodMap, /event\.data\.type === 'flood-user-location'/);
  // dark — Traffic iframe.
  assert.match(mapViewer, /type: 'traffic-user-location'/);
  assert.match(trafficMap, /event\.data\.type === 'traffic-user-location'/);
  // weather — Panahon iframe.
  assert.match(mapViewer, /sendWeatherAction\('location'/);
  assert.match(weatherApp, /event\.data\.action !== 'location'/);
  // satellite — Help Center's own Leaflet map.
  assert.match(mapViewer, /userLocationRequest=\{helpCenterUserLocation\}/);
});

test('the Help Center drops the dot itself (it owns its camera lock)', () => {
  assert.match(helpCenter, /userLocationRequest\?: \{ coords: \[number, number\]; nonce: number \} \| null/);
  // The request is applied once per nonce, and the barangay lock must not
  // clamp the camera straight back and leave the dot off screen.
  assert.match(helpCenter, /appliedLocationNonceRef\.current === request\.nonce/);
  // The flight itself is the shared hazard-map camera (lib/locateCamera.ts).
  assert.match(helpCenter, /className: 'user-location-marker'[\s\S]{0,2000}flyToUserLocation\(map, coords\)/);
  assert.match(helpCenter, /suppressCameraLockRef\.current = true/);
  assert.match(
    helpCenter,
    /cameraLockRef\.current && !programmaticMoveRef\.current && !suppressCameraLockRef\.current/,
  );
});

test('each embedded document answers the host locate request', () => {
  const requesters = [
    ['flood', floodMap],
    ['traffic', trafficMap],
    ['weather', weatherApp],
  ] as const;
  for (const [name, source] of requesters) {
    assert.match(source, /hazardsync-location-request/, `${name} must ask the host to locate`);
  }
});
