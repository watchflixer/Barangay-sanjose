// Basemap tile servers shared by the GIS map and the Help Center / Weather views.
//
// NOTE: CARTO (basemaps.cartocdn.com) used to serve the `light` and `dark`
// styles, but it now requires an API key and answers keyless requests with a
// placeholder PNG stamped "API KEY REQUIRED" (served as HTTP 200, so it looks
// like a valid tile). Both styles are now built from OpenStreetMap raster
// tiles — no account, no key, no watermark — and tinted with a CSS filter
// (`map-clean-tiles` / `map-dark-tiles` in src/index.css) to keep the same
// light / dark look at full zoom detail.
const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface TileServerConfig {
  url: string;
  attribution: string;
  subdomains?: string | string[];
  /** Native max zoom of the provider; Leaflet upscales beyond it. */
  maxNativeZoom?: number;
  /** CSS class added to the tile container (used for the light/dark tint). */
  className?: string;
}

export const TILE_SERVERS: Record<'streets' | 'light' | 'dark' | 'satellite', TileServerConfig> = {
  streets: {
    url: OSM_URL,
    attribution: OSM_ATTRIBUTION,
    subdomains: 'abc',
  },
  light: {
    url: OSM_URL,
    attribution: OSM_ATTRIBUTION,
    subdomains: 'abc',
    className: 'map-clean-tiles',
  },
  dark: {
    url: OSM_URL,
    attribution: OSM_ATTRIBUTION,
    subdomains: 'abc',
    className: 'map-dark-tiles',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: 'a',
  }
};

/**
 * Live-traffic raster tiles for the Leaflet Traffic view.
 *
 * - `streetTraffic` is the keyless default: Google's street raster with the
 *   live traffic colouring baked in (`lyrs=m,traffic`). It is a STREET-mode
 *   layer, so the Traffic view falls back to a plain basemap in Satellite mode.
 * - `tomtomFlow` is the official, documented option: a transparent traffic-flow
 *   overlay that works on top of either basemap. It activates automatically when
 *   VITE_TOMTOM_TRAFFIC_KEY is present (see .env.example); no key is required to
 *   use the view.
 */
export const TRAFFIC_TILE_SERVERS = {
  streetTraffic: {
    url: 'https://{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
    attribution: 'Live traffic &copy; Google',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxNativeZoom: 20,
  } as TileServerConfig,
  tomtomFlow: (key: string): TileServerConfig => ({
    url: `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`,
    attribution: 'Traffic flow &copy; TomTom',
    subdomains: 'a',
    maxNativeZoom: 18,
  }),
};
