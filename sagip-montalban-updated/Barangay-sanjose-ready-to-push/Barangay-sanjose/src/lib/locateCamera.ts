import type L from 'leaflet';

/**
 * "Show your location" camera move — ONE definition for every basemap style.
 *
 * The hazard (Streets) map is the reference behaviour: it does not snap, it
 * *flies* to the user's pin — a slow, smooth zoom-in that arcs out and settles
 * at street level. Every other basemap style has to feel the same when the
 * button is tapped:
 *
 *   streets   → this module (the GIS Leaflet map, `flyToUserLocation`)
 *   satellite → Help Center (`HelpCenterView`, same helper)
 *   light     → public/rizal_flood_100yr_map.html
 *   dark      → public/rizal_traffic_map.html (Mapbox GL camera)
 *   weather   → weather-source (the Panahon document)
 *
 * The plain-HTML map pages and the Panahon bundle live in their own documents
 * and cannot import this module, so they keep a copy of these rules.
 * tests/locate-camera-parity.test.ts fails if those copies ever drift.
 */
export const LOCATE_ZOOM = 16;

/** Seconds. The hazard map's own flight (`duration: 1.6`). */
export const LOCATE_DURATION_SECONDS = 1.6;

/** Leaflet's fly-arc easing — what makes the zoom-in glide, not dive. */
export const LOCATE_EASE_LINEARITY = 0.25;

/**
 * The hazard map flies zoom 13 → 16 in LOCATE_DURATION_SECONDS. That is one
 * zoom level every ~0.53s, which is the pace the user reads as "mabagal".
 */
const REFERENCE_ZOOM_SPAN = 3;

/** Upper bound so a whole-country flight never turns into a long wait. */
export const MAX_LOCATE_DURATION_SECONDS = 2.6;

/**
 * How long the locate flight should take, given where the camera is now.
 *
 * Matching only the *numbers* is not enough: the Weather map starts on the
 * whole Philippines, so travelling to street level covers ~11 zoom levels —
 * the same 1.6s would rush through it and feel snappier than the hazard map.
 * The duration therefore keeps the hazard map's per-zoom-level pace, and is
 * never shorter than the hazard flight. The hazard map itself (3 levels) still
 * gets exactly LOCATE_DURATION_SECONDS, so its flight is unchanged.
 */
export function locateFlightDuration(
  currentZoom: number,
  targetZoom: number = LOCATE_ZOOM,
): number {
  const span = Math.abs(targetZoom - currentZoom);
  const paced = (span / REFERENCE_ZOOM_SPAN) * LOCATE_DURATION_SECONDS;
  return Math.min(MAX_LOCATE_DURATION_SECONDS, Math.max(LOCATE_DURATION_SECONDS, paced));
}

/**
 * Slow fly-in to `coords` on any Leaflet map (GIS map, Help Center), exactly
 * like the hazard map's locate button.
 */
export function flyToUserLocation(map: L.Map, coords: L.LatLngExpression): void {
  map.flyTo(coords, LOCATE_ZOOM, {
    duration: locateFlightDuration(map.getZoom()),
    easeLinearity: LOCATE_EASE_LINEARITY,
  });
}
