/**
 * Keyless basemap sources for the AuraCast weather map.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * "Meteor Dark" (dark_all) and "Clean Hybrid" (voyager) used to be served by
 * CARTO (basemaps.cartocdn.com). CARTO changed its basemap policy: every
 * request without an API key is answered with HTTP 200 and a placeholder PNG
 * stamped "API KEY REQUIRED". Because it is a valid 200 response, Leaflet
 * never fires `tileerror` for it — the map just silently looks broken, and
 * there is no key anywhere in this project (and none should ever be committed
 * to a public repo).
 *
 * Every source below is free to use with no account, no sign-up and no key.
 *
 * FALLBACK CHAINS
 * ---------------
 * Each style keeps an ordered list of providers. `WeatherMap` mounts the
 * first one and, if tiles keep failing (blocked network, provider hiccup),
 * automatically moves to the next one. That way a single unreachable provider
 * degrades to another map instead of leaving a blank/ watermarked screen —
 * including Satellite Imagery and Street View, which previously had no
 * fallback at all.
 */

import L from 'leaflet';

import type { MapBaseStyle } from '../types/weather';

export interface BasemapSource {
  /** Short id, handy for debugging which provider is on screen. */
  id: string;
  /** Raster tile URL template. */
  url: string;
  /**
   * Optional label/reference overlay drawn on top of the base tiles (Esri
   * "canvas" basemaps ship their labels as a separate service).
   */
  labelsUrl?: string;
  subdomains?: string;
  /** Native max zoom of the provider; Leaflet upscales beyond it. */
  maxNativeZoom?: number;
  maxZoom?: number;
  /** CSS class applied to the tile container (used by the OSM dark filter). */
  className?: string;
  /** Plain-text credit shown in the map's attribution strip. */
  attribution: string;
}

const OSM_ATTRIBUTION =
  '© OpenStreetMap contributors';
const ESRI_ATTRIBUTION =
  'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';
const ESRI_CANVAS_ATTRIBUTION =
  'Tiles © Esri — Esri, DeLorme, NAVTEQ, TOWMaps, OpenStreetMap contributors';

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ESRI_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_IMAGERY_ALT =
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_STREETS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
const ESRI_DARK_BASE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_DARK_LABELS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
const ESRI_LIGHT_BASE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_LIGHT_LABELS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';

/**
 * Ordered provider chains per map style. Index 0 is the preferred look;
 * the rest are safety nets.
 *
 * OpenStreetMap is first for the tinted styles because it has dependable
 * worldwide coverage at every zoom level this app uses (5.5–17), including
 * the ocean-heavy Philippine archipelago. Esri's "canvas" basemaps look
 * closer to the old CARTO styles but only publish real tiles down to ~z12–13
 * outside well-mapped regions; past their coverage they answer with a
 * "Map data not yet available" plate (HTTP 200), so they stay as fallbacks
 * and are capped at their reliably covered zoom.
 */
const BASEMAP_CHAINS: Record<MapBaseStyle, BasemapSource[]> = {
  // 🌙 Meteor Dark
  dark: [
    {
      // Plain OSM raster darkened with a CSS filter (see .weather-dark-tiles).
      id: 'osm-dark',
      url: OSM_URL,
      subdomains: 'abc',
      className: 'weather-dark-tiles',
      attribution: OSM_ATTRIBUTION,
    },
    {
      id: 'esri-dark-gray',
      url: ESRI_DARK_BASE,
      labelsUrl: ESRI_DARK_LABELS,
      subdomains: 'a',
      maxNativeZoom: 13,
      attribution: ESRI_CANVAS_ATTRIBUTION,
    },
  ],

  // 🧭 Clean Hybrid
  voyager: [
    {
      id: 'osm-clean',
      url: OSM_URL,
      subdomains: 'abc',
      className: 'weather-clean-tiles',
      attribution: OSM_ATTRIBUTION,
    },
    {
      id: 'esri-light-gray',
      url: ESRI_LIGHT_BASE,
      labelsUrl: ESRI_LIGHT_LABELS,
      subdomains: 'a',
      maxNativeZoom: 13,
      attribution: ESRI_CANVAS_ATTRIBUTION,
    },
  ],

  // 🗺️ Street View
  streets: [
    {
      id: 'osm',
      url: OSM_URL,
      subdomains: 'abc',
      attribution: OSM_ATTRIBUTION,
    },
    {
      id: 'esri-streets',
      url: ESRI_STREETS,
      subdomains: 'a',
      attribution: ESRI_ATTRIBUTION,
    },
  ],

  // 🛰️ Satellite Imagery
  satellite: [
    {
      id: 'esri-world-imagery',
      url: ESRI_IMAGERY,
      subdomains: 'a',
      attribution: ESRI_ATTRIBUTION,
    },
    {
      id: 'esri-world-imagery-alt',
      url: ESRI_IMAGERY_ALT,
      subdomains: 'a',
      attribution: ESRI_ATTRIBUTION,
    },
    {
      // Last resort so the map still draws something recognisable.
      id: 'osm',
      url: OSM_URL,
      subdomains: 'abc',
      attribution: OSM_ATTRIBUTION,
    },
  ],
};

/** Number of failed tiles before we give up on a provider and fall back. */
export const BASEMAP_ERROR_THRESHOLD = 4;

export function getBasemapChain(style: MapBaseStyle): BasemapSource[] {
  return BASEMAP_CHAINS[style] && BASEMAP_CHAINS[style].length > 0
    ? BASEMAP_CHAINS[style]
    : BASEMAP_CHAINS.dark;
}

export interface MountBasemapCallbacks {
  /** Fired with the provider that is currently on screen. */
  onSourceChange?: (source: BasemapSource) => void;
  /** Fired once every provider in the chain has failed. */
  onFailure?: () => void;
}

export interface BasemapHandle {
  /** Removes every layer that was added and stops listening for errors. */
  dispose(): void;
}

/**
 * Mounts the basemap for `style` on `map`.
 *
 * Starts with the first provider in the chain and moves to the next one when
 * tiles keep failing, so an unreachable provider degrades to another map
 * instead of leaving a blank screen. Returns a handle that cleans everything
 * up (used when the user switches styles or the map unmounts).
 */
export function mountBasemap(
  map: L.Map,
  style: MapBaseStyle,
  callbacks: MountBasemapCallbacks = {},
): BasemapHandle {
  const chain = getBasemapChain(style);
  const group = L.layerGroup().addTo(map);

  let sourceIndex = 0;
  let errorCount = 0;
  let disposed = false;

  const layerOptions = (source: BasemapSource, extra: L.TileLayerOptions = {}): L.TileLayerOptions => ({
    subdomains: source.subdomains ?? 'abc',
    maxZoom: source.maxZoom ?? 19,
    maxNativeZoom: source.maxNativeZoom,
    className: source.className,
    attribution: source.attribution,
    ...extra,
  });

  const mountSource = (index: number) => {
    if (disposed) return;
    const source = chain[index];

    group.clearLayers();
    errorCount = 0;
    callbacks.onSourceChange?.(source);

    const base = L.tileLayer(source.url, layerOptions(source, { zIndex: 100 }));

    base.on('tileerror', () => {
      if (disposed) return;
      errorCount += 1;
      if (errorCount < BASEMAP_ERROR_THRESHOLD) return;

      if (index + 1 < chain.length) {
        // Current provider is unreachable — try the next one.
        sourceIndex += 1;
        mountSource(sourceIndex);
      } else {
        callbacks.onFailure?.();
      }
    });

    base.addTo(group);

    // Esri "canvas" basemaps ship their labels as a separate service.
    if (source.labelsUrl) {
      L.tileLayer(source.labelsUrl, layerOptions(source, { zIndex: 200 })).addTo(group);
    }
  };

  mountSource(sourceIndex);

  return {
    dispose() {
      disposed = true;
      if (map.hasLayer(group)) {
        map.removeLayer(group);
      }
      group.clearLayers();
    },
  };
}
