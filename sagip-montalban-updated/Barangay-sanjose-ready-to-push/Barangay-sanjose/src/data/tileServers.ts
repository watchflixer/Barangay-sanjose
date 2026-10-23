// Basemap tile servers shared by the GIS map and the Help Center / Weather views.
//
// NOTE: CARTO (basemaps.cartocdn.com) used to serve the `light` and `dark`
// styles, but it now requires an API key and answers keyless requests with a
// placeholder PNG stamped "API KEY REQUIRED" (served as HTTP 200, so it looks
// like a valid tile). Both styles are now built from OpenStreetMap raster
// tiles — no account, no key, no watermark — and tinted with a CSS filter
// (`map-clean-tiles` / `map-dark-tiles` in src/index.css) to keep the same
// light / dark look at full zoom detail.
// Canonical OSM host, exactly as the tile usage policy prescribes —
// https://operations.osmfoundation.org/policies/tiles/ says to use
// tile.openstreetmap.org (the a/b/c subdomains may be withdrawn).
const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * OSM now rejects browser tile requests that arrive without a Referer
 * ("403r. Access blocked. Referer is required by tile usage policy",
 * https://wiki.openstreetmap.org/wiki/Blocked). A restrictive document or
 * proxy Referrer-Policy would strip it, so every tile layer sets this on the
 * <img> itself — that attribute wins over any document policy. It only ever
 * sends the site origin, never the page path.
 */
export const OSM_REFERRER_POLICY = 'strict-origin-when-cross-origin' as const;

/** Keyless backup street raster, used if the OSM tiles get blocked. */
const ESRI_STREET_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
const ESRI_STREET_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, HERE, Garmin, &copy; OpenStreetMap contributors';

export interface TileServerConfig {
  url: string;
  attribution: string;
  subdomains?: string | string[];
  /** Native max zoom of the provider; Leaflet upscales beyond it. */
  maxNativeZoom?: number;
  /** CSS class added to the tile container (used for the light/dark tint). */
  className?: string;
  /** Referrer policy set on each tile <img> (OSM requires one). */
  referrerPolicy?: typeof OSM_REFERRER_POLICY;
  /** Mounted automatically when the primary tiles keep failing. */
  fallback?: TileServerConfig;
}

/** Leaflet options for one of the configs above, referrer policy included. */
export function tileLayerOptions(config: TileServerConfig) {
  return {
    attribution: config.attribution,
    subdomains: config.subdomains ?? 'abc',
    maxZoom: 20,
    maxNativeZoom: config.maxNativeZoom ?? 19,
    className: config.className,
    referrerPolicy: config.referrerPolicy ?? OSM_REFERRER_POLICY,
  };
}

const ESRI_STREET_FALLBACK: TileServerConfig = {
  url: ESRI_STREET_URL,
  attribution: ESRI_STREET_ATTRIBUTION,
  subdomains: 'a',
  maxNativeZoom: 19,
};

export const TILE_SERVERS: Record<'streets' | 'light' | 'dark' | 'satellite', TileServerConfig> = {
  streets: {
    url: OSM_URL,
    attribution: OSM_ATTRIBUTION,
    maxNativeZoom: 19,
    referrerPolicy: OSM_REFERRER_POLICY,
    fallback: ESRI_STREET_FALLBACK,
  },
  light: {
    url: OSM_URL,
    attribution: OSM_ATTRIBUTION,
    maxNativeZoom: 19,
    className: 'map-clean-tiles',
    referrerPolicy: OSM_REFERRER_POLICY,
    fallback: ESRI_STREET_FALLBACK,
  },
  dark: {
    url: OSM_URL,
    attribution: OSM_ATTRIBUTION,
    maxNativeZoom: 19,
    className: 'map-dark-tiles',
    referrerPolicy: OSM_REFERRER_POLICY,
    fallback: ESRI_STREET_FALLBACK,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: 'a',
    maxNativeZoom: 19,
    referrerPolicy: OSM_REFERRER_POLICY,
    // If the imagery is unreachable, fall back to a street raster rather than
    // leaving an empty dark canvas.
    fallback: ESRI_STREET_FALLBACK,
  }
};
