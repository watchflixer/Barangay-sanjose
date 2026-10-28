import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { SAN_JOSE_CENTER, SAN_JOSE_POLYGON_COORDS } from '../data/geoData';
import { TILE_SERVERS } from '../data/tileServers';
import { mountTileLayer } from '../lib/tileLayer';
import type { ManagedHazard } from './types';

const MARKER_COLORS: Record<string, string> = {
  flood: '#2878d0', fire: '#ea694b', power: '#e0a62c',
  streetlight: '#8d6db7', water: '#3a9a9b', road: '#d98750',
};
const MARKER_SYMBOLS: Record<string, string> = {
  flood: '≈', fire: '♨', power: 'ϟ', streetlight: '✦', water: '●', road: '!',
};

interface AdminMapProps {
  hazards: ManagedHazard[];
  onSelect?: (hazard: ManagedHazard) => void;
  onPick?: (coordinates: [number, number]) => void;
  pickedCoordinates?: [number, number];
  compact?: boolean;
}

/** Real, zoomable Leaflet map. Coordinates are the same ones used on the public map. */
export function AdminMap({ hazards, onSelect, onPick, pickedCoordinates, compact = false }: AdminMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  const selectRef = useRef(onSelect);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  pickRef.current = onPick;
  selectRef.current = onSelect;

  useEffect(() => {
    if (!container.current) return;
    const map = new L.Map(container.current, {
      center: SAN_JOSE_CENTER, zoom: compact ? 12.8 : 13, zoomSnap: 0.25,
      zoomControl: false, attributionControl: true, scrollWheelZoom: false,
    });
    mapRef.current = map;
    let fallbackErrors = 0;
    const tiles = mountTileLayer(map, TILE_SERVERS.streets, {
      onFallback: () => {
        tiles.layer.on('tileerror', () => {
          fallbackErrors += 1;
          if (fallbackErrors >= 3) setTilesUnavailable(true);
        });
        tiles.layer.on('tileload', () => setTilesUnavailable(false));
      },
    });
    new L.Polygon(SAN_JOSE_POLYGON_COORDS, {
      color: '#438b70', weight: 1.5, opacity: 0.65, fillColor: '#a9d0b8', fillOpacity: 0.08,
      dashArray: '5 5', interactive: false,
    }).addTo(map);
    markersRef.current = new L.LayerGroup().addTo(map);
    map.on('click', (event: L.LeafletMouseEvent) => {
      if (pickRef.current) pickRef.current([Number(event.latlng.lat.toFixed(5)), Number(event.latlng.lng.toFixed(5))]);
    });
    const resize = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      tiles.dispose();
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, [compact]);

  useEffect(() => {
    const group = markersRef.current;
    if (!group) return;
    group.clearLayers();
    hazards.forEach(hazard => {
      if (!Array.isArray(hazard.coordinates) || !hazard.coordinates.every(Number.isFinite)) return;
      const color = MARKER_COLORS[hazard.type] || '#55776d';
      const symbol = MARKER_SYMBOLS[hazard.type] || '!';
      const icon = new L.DivIcon({
        className: 'admin-map-marker-wrap',
        html: `<span class="admin-map-marker" style="--pin-color:${color}"><span>${symbol}</span></span>`,
        iconSize: [34, 40], iconAnchor: [17, 35],
      });
      const marker = new L.Marker(hazard.coordinates, { icon, title: hazard.title });
      marker.on('click', (event: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(event);
        selectRef.current?.(hazard);
      });
      marker.addTo(group);
    });
    if (pickedCoordinates) {
      const icon = new L.DivIcon({
        className: 'admin-map-marker-wrap',
        html: '<span class="admin-map-marker picked-marker"><span>+</span></span>',
        iconSize: [34, 40], iconAnchor: [17, 35],
      });
      new L.Marker(pickedCoordinates, { icon, title: 'Selected location' }).addTo(group);
    }
  }, [hazards, pickedCoordinates]);

  return <div className={`admin-map-shell ${compact ? 'is-compact' : ''}`}>
    <div ref={container} className={`admin-leaflet-map ${onPick ? 'is-picking' : ''}`} aria-label={onPick ? 'Click the map to select a location' : 'Hazard street map preview'} />
    {tilesUnavailable && <div className="tile-warning">Map tiles unavailable · pins still use saved coordinates</div>}
    <div className="admin-map-zoom" aria-label="Map zoom controls">
      <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>+</button>
      <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>−</button>
    </div>
    {onPick && <div className="map-pick-hint">Click the map to set the pin</div>}
  </div>;
}
