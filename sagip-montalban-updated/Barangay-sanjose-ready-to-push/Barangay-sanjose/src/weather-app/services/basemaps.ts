/**
 * Keyless basemap sources for the AuraCast weather map.
 *
 * The available choices are Satellite Imagery and Street View. Every source
 * is free to use without an account, sign-up, or API key.
 *
 * Each style keeps an ordered list of providers. `WeatherMap` mounts the first
 * one and automatically falls back to the next if tiles fail, so a provider
 * hiccup does not leave a blank map.
 */

import L from 'leaflet';

import type { MapBaseStyle } from '../types/weather';

export interface BasemapSource {
  /** Short id, handy for debugging which provider is on screen. */
  id: string;
  /** Raster tile URL template. */
  url: string;
  subdomains?: string;
  /** Native max zoom of the provider; Leaflet upscales beyond it. */
  maxNativeZoom?: number;
  maxZoom?: number;
  /** Plain-text credit shown in the map's attribution strip. */
  attribution: string;
}

const OSM_ATTRIBUTION = '© OpenStreetMap contributors';
const ESRI_ATTRIBUTION =
  'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ESRI_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_IMAGERY_ALT =
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_STREETS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

/**
 * Ordered provider chains per remaining style. Index 0 is preferred; later
 * entries are fallbacks if a provider is blocked or temporarily unavailable.
 */
const BASEMAP_CHAINS: Record<MapBaseStyle, BasemapSource[]> = {
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
    : BASEMAP_CHAINS.satellite;
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
