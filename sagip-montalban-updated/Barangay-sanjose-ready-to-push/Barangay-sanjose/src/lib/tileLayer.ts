import L from 'leaflet';
import { tileLayerOptions, type TileServerConfig } from '../data/tileServers';

/**
 * Mount a basemap tile layer with its keyless backup in reserve.
 *
 * OpenStreetMap's volunteer tile servers now enforce their usage policy and
 * answer blocked requests with a "403r. Access blocked. Referer is required"
 * tile (https://wiki.openstreetmap.org/wiki/Blocked). Every tile layer we
 * mount sets referrerPolicy on the <img> elements, which is the documented
 * fix — but a corporate proxy, a privacy extension or a captive portal can
 * still strip the header. When a few tiles in a row fail we quietly swap to
 * the config's `fallback` raster (Esri, no Referer needed) so the map is never
 * a wall of "Access blocked" images.
 */
export interface TileMount {
  /** The layer that is on the map right now (the fallback after a swap). */
  readonly layer: L.TileLayer;
  /** Removes whichever layer is current. Safe to call more than once. */
  dispose(): void;
}

export function mountTileLayer(
  map: L.Map,
  config: TileServerConfig,
  handlers: { onFallback?: (fallback: TileServerConfig) => void; errorThreshold?: number } = {},
): TileMount {
  const threshold = handlers.errorThreshold ?? 4;
  let current = new L.TileLayer(config.url, tileLayerOptions(config));
  let errors = 0;
  let swapped = false;
  let disposed = false;

  current.on('tileerror', () => {
    if (disposed || swapped || !config.fallback) return;
    errors += 1;
    if (errors < threshold) return;
    swapped = true;
    map.removeLayer(current);
    current = new L.TileLayer(config.fallback.url, tileLayerOptions(config.fallback));
    current.addTo(map);
    handlers.onFallback?.(config.fallback);
  });

  current.addTo(map);

  return {
    get layer() {
      return current;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (map.hasLayer(current)) map.removeLayer(current);
    },
  };
}
