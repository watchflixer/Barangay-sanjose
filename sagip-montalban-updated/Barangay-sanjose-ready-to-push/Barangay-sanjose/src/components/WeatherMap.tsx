import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { SAN_JOSE_BOUNDS, SAN_JOSE_CENTER } from '../data/geoData';
import { TILE_SERVERS } from '../data/tileServers';

type WeatherBasemap = 'streets' | 'satellite';

interface WeatherMapProps {
  /** Mirrors the "Lock Camera Inside Bounds" setting used by the GIS map. */
  lockCameraToBounds: boolean;
  /**
   * Receives the live Leaflet map while the view is open (null once it closes).
   * MapViewer's floating Recenter and Locate buttons use it to drive this map.
   */
  mapRef: React.RefObject<L.Map | null>;
}

/**
 * Weather view: an independent overlay with its OWN Leaflet map, like the
 * Help Center. It mounts only while open, so every visit starts with a fresh
 * map and closing the view destroys the map.
 *
 * Controls on this view:
 *  - Recenter / Layers / Locate: the app's floating stack (top-left). It stays
 *    on top, and Recenter and Locate drive this map (see MapViewer).
 *  - Zoom in / out: Leaflet's native zoom control, placed under that stack
 *    (see index.css, #weather-map-root).
 *  - Street / Satellite switch (top-right): changes only this map's basemap.
 */
export const WeatherMap: React.FC<WeatherMapProps> = ({ lockCameraToBounds, mapRef }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [basemap, setBasemap] = useState<WeatherBasemap>('streets');

  // Create the Leaflet map when the view mounts, and remove it on unmount.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Same strict Barangay San Jose bounding box as the other maps.
    const corner1 = L.latLng(SAN_JOSE_BOUNDS[0][0] - 0.015, SAN_JOSE_BOUNDS[0][1] - 0.015);
    const corner2 = L.latLng(SAN_JOSE_BOUNDS[1][0] + 0.015, SAN_JOSE_BOUNDS[1][1] + 0.015);

    const map = L.map(container, {
      center: SAN_JOSE_CENTER,
      zoom: 13,
      minZoom: 13,
      maxZoom: 18,
      maxBounds: lockCameraToBounds ? L.latLngBounds(corner1, corner2) : undefined,
      maxBoundsViscosity: 1.0, // Hard lock - rubberband bouncing back
      zoomControl: false, // Added below so it sits under the app's control stack
      attributionControl: true,
    });
    L.control.zoom({ position: 'topleft' }).addTo(map);

    mapRef.current = map;
    // The container mounts fresh each time, so make sure Leaflet measures it.
    const sizeTimer = setTimeout(() => map.invalidateSize(), 0);
    return () => {
      clearTimeout(sizeTimer);
      map.remove();
      mapRef.current = null;
    };
  }, [lockCameraToBounds, mapRef]);

  // Basemap tiles follow the Street / Satellite switch. This effect is declared
  // after the init effect, so the map already exists when it runs, and it runs
  // again whenever the map is recreated.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const tileConfig = TILE_SERVERS[basemap];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
    }).addTo(map);
    return () => {
      tileLayer.remove();
    };
  }, [basemap, lockCameraToBounds, mapRef]);

  return (
    <div role="region" aria-label="Weather map" className="absolute inset-0 z-30 bg-white">
      <div
        id="weather-map-root"
        ref={containerRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Street / Satellite switcher, styled like the Help Center's "Map style" card. */}
      <div
        role="group"
        aria-label="Map style"
        className="absolute right-[12px] top-[10px] z-50 flex gap-1 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-md"
      >
        {(['streets', 'satellite'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setBasemap(key)}
            aria-pressed={basemap === key}
            className={`rounded-[5px] border border-transparent px-2.5 py-1 text-[11px] font-bold tracking-[0.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              basemap === key
                ? 'bg-[#111827] text-white'
                : 'bg-transparent text-[#33413a] hover:bg-[#eef1ec]'
            }`}
          >
            {key === 'streets' ? 'Street' : 'Satellite'}
          </button>
        ))}
      </div>
    </div>
  );
};
