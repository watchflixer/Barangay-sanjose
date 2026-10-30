import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Check, LocateFixed, MapPin, X } from 'lucide-react';
import { SAN_JOSE_CENTER } from '../data/geoData';
import { TILE_SERVERS } from '../data/tileServers';
import { mountTileLayer } from '../lib/tileLayer';

/**
 * The dropped pin is an inline SVG DivIcon on purpose.
 *
 * Leaflet's built-in `new L.Marker()` icon is a pair of PNG files that the
 * library locates at runtime by sniffing `url(images/marker-icon.png)` out of
 * leaflet.css. Vite hashes that asset (`marker-icon-a1b2c3.png`) and adds a
 * relative base, so the sniffing fails and the marker renders as an empty
 * white box — in production builds only, which is exactly how this bug
 * shipped. Drawing the pin with SVG removes the image lookup entirely, so the
 * pin looks identical in dev, preview and the GitHub Pages sub-path build.
 */
const PICKER_PIN_HTML = `
  <span class="picker-pin-ring"></span>
  <svg class="picker-pin-svg" viewBox="0 0 32 42" aria-hidden="true" focusable="false">
    <path
      d="M16 40.4c-.8-.8-13.6-13.4-13.6-23.1A13.6 13.6 0 0 1 16 3.7a13.6 13.6 0 0 1 13.6 13.6c0 9.7-12.8 22.3-13.6 23.1Z"
      fill="currentColor"
      stroke="#ffffff"
      stroke-width="2.6"
      stroke-linejoin="round"
    />
    <circle cx="16" cy="17.2" r="5.1" fill="#ffffff" />
  </svg>
`;

const createPickerPin = () =>
  new L.DivIcon({
    className: 'picker-pin',
    html: PICKER_PIN_HTML,
    iconSize: [32, 42],
    iconAnchor: [16, 40],
    popupAnchor: [0, -38],
  });

interface LocationPickerModalProps {
  isOpen: boolean;
  initialCoordinates: [number, number] | null;
  onClose: () => void;
  onSelect: (coordinates: [number, number]) => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  initialCoordinates,
  onClose,
  onSelect,
}) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  // `null` until a point is really chosen. It used to start on the barangay
  // centre, so pressing "Use This Location" without tapping saved the centre
  // instead of the hazard's spot.
  const [coordinates, setCoordinates] = useState<[number, number] | null>(
    initialCoordinates,
  );

  /** Drops/moves the pin at the exact tapped coordinate. */
  const placePin = (next: [number, number]) => {
    setCoordinates(next);
    markerRef.current?.setLatLng(next);
  };

  useEffect(() => {
    if (!isOpen || !mapElementRef.current || mapRef.current) return;

    const start = initialCoordinates ?? SAN_JOSE_CENTER;
    const map = new L.Map(mapElementRef.current, {
      center: start,
      zoom: initialCoordinates ? 16 : 14,
      zoomControl: true,
    });
    mountTileLayer(map, TILE_SERVERS.streets);

    if (initialCoordinates) {
      markerRef.current = new L.Marker(initialCoordinates, {
        icon: createPickerPin(),
        keyboard: false,
        title: 'Selected hazard location',
        alt: 'Selected hazard location',
      }).addTo(map);
    }

    // event.latlng is already the real WGS84 point under the cursor.
    map.on('click', (event) => {
      // 6 decimals ≈ 10 cm; 5 would already round the pin by ~1 m.
      placePin([
        Number(event.latlng.lat.toFixed(6)),
        Number(event.latlng.lng.toFixed(6)),
      ]);
      setLocationMessage('');
    });

    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      userLocationMarkerRef.current = null;
    };
  }, [isOpen]);

  const handleShowUserLocation = () => {
    if (!mapRef.current) return;
    if (!navigator.geolocation) {
      setLocationMessage('Location is unavailable; choose a point on the map.');
      mapRef.current.setView(SAN_JOSE_CENTER, 14);
      return;
    }

    setLocationMessage('Requesting your location…');
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userCoordinates: [number, number] = [
          Number(position.coords.latitude.toFixed(6)),
          Number(position.coords.longitude.toFixed(6)),
        ];
        const locationIcon = new L.DivIcon({
          className: 'user-location-marker',
          html: '<span class="user-location-dot"></span>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.setLatLng(userCoordinates);
        } else {
          userLocationMarkerRef.current = new L.Marker(userCoordinates, {
            icon: locationIcon,
            zIndexOffset: 1000,
            title: 'Your location',
          }).addTo(mapRef.current!);
        }

        // Drop the pin on the fix too, so "Use This Location" saves this point
        // instead of whatever was selected before.
        placePin(userCoordinates);

        mapRef.current?.flyTo(userCoordinates, 16, {
          duration: 1.6,
          easeLinearity: 0.25,
        });
        setIsLocating(false);
        setLocationMessage('Pin placed at your current location. Tap the map to fine-tune.');
      },
      () => {
        setIsLocating(false);
        setLocationMessage('Location permission was unavailable. You can still click the map to choose a location.');
        mapRef.current?.setView(SAN_JOSE_CENTER, 14);
      },
      // A coarse network fix can land hundreds of metres away.
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  // Location is ONLY requested when the user clicks the "Show your location"
  // button — no automatic geolocation prompt when the modal opens.
  useEffect(() => {
    if (!isOpen || !initialCoordinates) return;
    placePin(initialCoordinates);
    const map = mapRef.current;
    if (map) map.setView(initialCoordinates, map.getZoom());
  }, [initialCoordinates, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="location-picker"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
    >
      <div className="flex h-[min(720px,90vh)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900">
              <MapPin className="h-4 w-4 text-emerald-600" /> Choose Hazard Location
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">Click anywhere on the map to place the pin.</p>
          </div>
          <button onClick={onClose} aria-label="Close map picker" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="relative min-h-0 flex-1">
          <div id="location-picker-map" ref={mapElementRef} className="h-full w-full" />
          <button
            onClick={handleShowUserLocation}
            title="Show your location"
            aria-label="Show your location"
            className="absolute right-4 top-4 z-[400] rounded-md border border-slate-200 bg-white p-2 text-slate-800 shadow-md transition-colors hover:bg-slate-50 active:scale-95"
          >
            <LocateFixed className={`h-4 w-4 ${isLocating ? 'animate-pulse text-blue-600' : 'text-slate-700'}`} />
          </button>
          {locationMessage && <div className="absolute bottom-3 left-3 z-[400] rounded-md bg-white/95 px-3 py-2 text-[11px] text-slate-700 shadow-md">{locationMessage}</div>}
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <span className="font-mono text-[11px] text-slate-600">
            {coordinates
              ? `${coordinates[0].toFixed(5)}° N, ${coordinates[1].toFixed(5)}° E`
              : 'Click the map to drop the pin'}
          </span>
          <button
            onClick={() => {
              if (coordinates) onSelect(coordinates);
            }}
            disabled={!coordinates}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            <Check className="h-3.5 w-3.5" /> Use This Location
          </button>
        </footer>
      </div>
    </div>
  );
};
