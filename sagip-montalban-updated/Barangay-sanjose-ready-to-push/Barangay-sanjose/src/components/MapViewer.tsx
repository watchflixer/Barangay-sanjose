import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { HazardAlert, MapSettings } from '../types';
import {
  SAN_JOSE_POLYGON_COORDS,
  SAN_JOSE_CENTER,
  SAN_JOSE_BOUNDS,
  SAN_JOSE_SITIOS,
  getInvertedMaskCoordinates
} from '../data/geoData';
import {
  Layers,
  RefreshCw,
  Maximize2,
  RotateCcw,
  Eye,
  Compass,
  MapPin,
  Flame,
  Waves,
  Zap,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  LocateFixed,
  Plus,
  Minus,
  Check,
  ShieldCheck
} from 'lucide-react';

interface MapViewerProps {
  alerts: HazardAlert[];
  selectedAlert: HazardAlert | null;
  onSelectAlert: (alert: HazardAlert | null) => void;
  onToggleAlertStatus: (id: string) => void;
  mapSettings: MapSettings;
  onUpdateMapSettings: (settings: Partial<MapSettings>) => void;
  isAddingPinMode: boolean;
  onMapClickCoordinate: (coords: [number, number]) => void;
  recenterTrigger?: number;
  onOpenMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

// Tile Layer URLs
const TILE_SERVERS = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  }
};

export const MapViewer: React.FC<MapViewerProps> = ({
  alerts,
  selectedAlert,
  onSelectAlert,
  onToggleAlertStatus,
  mapSettings,
  onUpdateMapSettings,
  isAddingPinMode,
  onMapClickCoordinate,
  recenterTrigger,
  onOpenMobileMenu,
  isMobileMenuOpen = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const maskLayerRef = useRef<L.Polygon | null>(null);
  const boundaryLayerRef = useRef<L.Polygon | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const sitiosLayerRef = useRef<L.LayerGroup | null>(null);
  const activePopupsRef = useRef<{ [key: string]: L.Marker }>({});

  const [mouseCoords, setMouseCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [showLayerMenu, setShowLayerMenu] = React.useState(false);

  const toggleLayerMenu = (open?: boolean) => {
    setShowLayerMenu((prev) => (typeof open === 'boolean' ? open : !prev));
  };
  const [showFloodProneBlank, setShowFloodProneBlank] = React.useState(false);
  const [isRecenterSpinning, setIsRecenterSpinning] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const [locationMessage, setLocationMessage] = React.useState('');
  // Banner style for the location message: "success" renders the centered
  // green toast, "error" the matching centered red one; both auto-hide after
  // 3 seconds. Anything else uses the plain hint banner top-left.
  const [locationBanner, setLocationBanner] = React.useState<'none' | 'success' | 'error'>('none');
  const locationMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showLocationPermissionCard, setShowLocationPermissionCard] = React.useState(false);
  const [precisionChoice, setPrecisionChoice] = React.useState<'precise' | 'approximate'>('precise');
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const floodMapFrameRef = useRef<HTMLIFrameElement | null>(null);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Define strict bounding box for Barangay San Jose
    const corner1 = L.latLng(SAN_JOSE_BOUNDS[0][0] - 0.015, SAN_JOSE_BOUNDS[0][1] - 0.015);
    const corner2 = L.latLng(SAN_JOSE_BOUNDS[1][0] + 0.015, SAN_JOSE_BOUNDS[1][1] + 0.015);
    const maxBounds = L.latLngBounds(corner1, corner2);

    const map = L.map(mapContainerRef.current, {
      center: SAN_JOSE_CENTER,
      zoom: 13,
      minZoom: 13,
      maxZoom: 18,
      maxBounds: mapSettings.lockCameraToBounds ? maxBounds : undefined,
      maxBoundsViscosity: 1.0, // Hard lock - rubberband bouncing back
      zoomControl: false, // Zoom buttons are custom buttons in the left control stack, below 'Show your location'
      attributionControl: false,
    });

    // Initial Tile Layer
    const tileConfig = TILE_SERVERS[mapSettings.tileLayer];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Inverted Mask Layer (Blacks out everything except Barangay San Jose)
    const maskCoords = getInvertedMaskCoordinates(SAN_JOSE_POLYGON_COORDS);
    const mask = L.polygon(maskCoords as any, {
      fillColor: mapSettings.maskColor,
      fillOpacity: mapSettings.maskOpacity,
      stroke: false,
      interactive: false,
      className: 'gis-blackout-mask'
    }).addTo(map);
    maskLayerRef.current = mask;

    // Boundary Glow Stroke Layer
    const boundary = L.polygon(SAN_JOSE_POLYGON_COORDS, {
      color: mapSettings.boundaryColor,
      weight: 2.5,
      opacity: 0.9,
      fillOpacity: 0,
      dashArray: '4, 6',
      interactive: false,
    }).addTo(map);
    boundaryLayerRef.current = boundary;

    // Marker Layer Group
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    // Sitios Layer Group
    const sitiosGroup = L.layerGroup().addTo(map);
    sitiosLayerRef.current = sitiosGroup;

    // Mouse movement tracker
    map.on('mousemove', (e) => {
      setMouseCoords({
        lat: Number(e.latlng.lat.toFixed(5)),
        lng: Number(e.latlng.lng.toFixed(5)),
      });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isAddingPinMode) {
        onMapClickCoordinate([e.latlng.lat, e.latlng.lng]);
      }
    };

    mapInstanceRef.current.on('click', handleMapClick);

    return () => {
      mapInstanceRef.current?.off('click', handleMapClick);
    };
  }, [isAddingPinMode, onMapClickCoordinate]);

  // 2. Update Tile Layer on setting change
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const map = mapInstanceRef.current;
    const tileConfig = TILE_SERVERS[mapSettings.tileLayer];

    // Coming back from Flood Prone mode the container was hidden (display:none),
    // so Leaflet cached a zero size and renders a blank map. Recompute now that
    // the container is visible again.
    setTimeout(() => {
      map.invalidateSize();
    }, 50);

    map.removeLayer(tileLayerRef.current);
    const newLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;

    // Ensure mask and boundary stay on top of tile layer in overlayPane
    if (maskLayerRef.current) {
      maskLayerRef.current.bringToFront();
    }
    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.bringToFront();
    }
    if (sitiosLayerRef.current) {
      sitiosLayerRef.current.eachLayer((layer: any) => {
        if (typeof layer.bringToFront === 'function') {
          layer.bringToFront();
        }
      });
    }
    if (markersLayerRef.current) {
      markersLayerRef.current.eachLayer((layer: any) => {
        if (typeof layer.bringToFront === 'function') {
          layer.bringToFront();
        }
      });
    }
  }, [mapSettings.tileLayer]);

  // 3. Update Mask Opacity, Mask Color, and Boundary Stroke
  useEffect(() => {
    if (maskLayerRef.current) {
      maskLayerRef.current.setStyle({
        fillColor: mapSettings.maskColor,
        fillOpacity: mapSettings.maskOpacity,
      });
    }
    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.setStyle({
        color: mapSettings.boundaryColor,
        opacity: mapSettings.showBoundaryStroke ? 0.9 : 0,
      });
    }
  }, [mapSettings.maskOpacity, mapSettings.maskColor, mapSettings.boundaryColor, mapSettings.showBoundaryStroke]);

  // 4. Update Camera Bounds lock
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const corner1 = L.latLng(SAN_JOSE_BOUNDS[0][0] - 0.015, SAN_JOSE_BOUNDS[0][1] - 0.015);
    const corner2 = L.latLng(SAN_JOSE_BOUNDS[1][0] + 0.015, SAN_JOSE_BOUNDS[1][1] + 0.015);
    const maxBounds = L.latLngBounds(corner1, corner2);

    if (mapSettings.lockCameraToBounds) {
      mapInstanceRef.current.setMaxBounds(maxBounds);
    } else {
      mapInstanceRef.current.setMaxBounds(null as any);
    }
  }, [mapSettings.lockCameraToBounds]);

  // 4b. Recompute map size when returning from Flood Prone mode.
  // While Flood Prone is active the real map is display:none, so Leaflet caches
  // a zero size and shows a blank map when the container becomes visible again.
  useEffect(() => {
    if (showFloodProneBlank) return; // entering: container hidden, skip
    if (!mapInstanceRef.current) return;
    // exiting: container is visible again — force Leaflet to remeasure
    const t1 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 60);
    const t2 = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
      // re-center as a safety net in case the view got stuck while hidden
      mapInstanceRef.current?.setView(SAN_JOSE_CENTER, 13, { animate: false });
    }, 250);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [showFloodProneBlank]);

  // 5. Render Sitios Labels
  useEffect(() => {
    if (!sitiosLayerRef.current) return;
    sitiosLayerRef.current.clearLayers();

    if (!mapSettings.showSitioLabels) return;

    SAN_JOSE_SITIOS.forEach((sitio) => {
      const sitioIcon = L.divIcon({
        className: 'sitio-label-container',
        html: `<div class="sitio-map-label">${sitio.name}</div>`,
        iconSize: [120, 20],
        iconAnchor: [60, 10],
      });

      const marker = L.marker(sitio.coordinates, {
        icon: sitioIcon,
        interactive: false,
      });
      sitiosLayerRef.current?.addLayer(marker);
    });
  }, [mapSettings.showSitioLabels]);

  useEffect(() => {
    return () => {
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      if (locationMessageTimerRef.current) clearTimeout(locationMessageTimerRef.current);
    };
  }, []);

  // Opens the Chrome-style in-app permission card. The real geolocation
  // request only fires after the user taps one of the Allow buttons.
  const handleShowUserLocation = () => {
    if (!mapInstanceRef.current) return;
    if (!navigator.geolocation) { setLocationMessage('Location is unavailable.'); return; }
    setShowLocationPermissionCard(true);
  };

  const runLocationRequest = (highAccuracy: boolean) => {
    if (!mapInstanceRef.current || !navigator.geolocation) return;

    // Clear any pending auto-hide timer from a previous run so a new request
    // always starts with a fresh, visible message.
    if (locationMessageTimerRef.current) {
      clearTimeout(locationMessageTimerRef.current);
      locationMessageTimerRef.current = null;
    }

    // Calling getCurrentPosition triggers the browser's native "Allow location?"
    // dialog whenever permission is still undecided ("prompt"). If the user
    // previously tapped "Never allow", Chrome never shows the dialog again —
    // detect that state and guide the user instead of failing silently.
    const requestGeolocation = () => {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates: L.LatLngExpression = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          const locationIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<span class="user-location-dot"></span>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.setLatLng(coordinates);
            userLocationMarkerRef.current.setIcon(locationIcon);
          } else {
            userLocationMarkerRef.current = L.marker(coordinates, {
              icon: locationIcon,
              zIndexOffset: 1000,
              title: 'Your location',
            }).addTo(mapInstanceRef.current!);
          }

          // The location can be outside Barangay San Jose. Temporarily release
          // the GIS boundary lock so the button can always reach the user.
          const map = mapInstanceRef.current;
          if (mapSettings.lockCameraToBounds) map.setMaxBounds(null as any);
          map.flyTo(coordinates, 16, {
            duration: 1.6,
            easeLinearity: 0.25,
          });
          setIsLocating(false);
          setLocationMessage('Location Found!');
          setLocationBanner('success');
          if (locationMessageTimerRef.current) clearTimeout(locationMessageTimerRef.current);
          locationMessageTimerRef.current = setTimeout(() => {
            setLocationMessage('');
            setLocationBanner('none');
          }, 3000);
        },
        (error) => {
          setIsLocating(false);
          setLocationBanner('none');
          if (error.code === error.PERMISSION_DENIED) {
            setLocationMessage('Location access denied!');
            setLocationBanner('error');
            if (locationMessageTimerRef.current) clearTimeout(locationMessageTimerRef.current);
            locationMessageTimerRef.current = setTimeout(() => {
              setLocationMessage('');
              setLocationBanner('none');
            }, 3000);
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setLocationMessage('Your location is currently unavailable. Please try again.');
          } else if (error.code === error.TIMEOUT) {
            setLocationMessage('Location request timed out. Please try again.');
          } else {
            setLocationMessage('Could not get your location. Please try again.');
          }
        },
        { enableHighAccuracy: highAccuracy, timeout: 10000, maximumAge: 60000 },
      );
    };

    // IMPORTANT: the geolocation call must run synchronously from the user's
    // tap on "Allow" so the browser treats it as a direct user gesture. The
    // permissions check below only refines the hint message — it must never
    // delay the actual request, otherwise Safari/iOS suppresses the dialog.
    const askPermissionState = () => {
      if (!navigator.permissions?.query) return;
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permission) => {
          // 'granted' → the location is fetched silently, no dialogs at all.
          // 'prompt'  → the browser's one-time native allow dialog appears.
          if (permission.state === 'prompt') {
            setLocationMessage('Tap "Allow" on the browser popup to share your location.');
          }
        })
        .catch(() => { /* hint only — the request itself is already running */ });
    };
    askPermissionState();

    // Fires the native dialog immediately (still inside the click gesture):
    requestGeolocation();
  };

  const handleAllowLocationRequest = () => {
    setShowLocationPermissionCard(false);
    setLocationBanner('none');
    runLocationRequest(precisionChoice === 'precise');
  };

  const handleNeverAllowLocation = () => {
    setShowLocationPermissionCard(false);
    setLocationMessage('Location access denied!');
    setLocationBanner('error');
    if (locationMessageTimerRef.current) clearTimeout(locationMessageTimerRef.current);
    locationMessageTimerRef.current = setTimeout(() => {
      setLocationMessage('');
      setLocationBanner('none');
    }, 3000);
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  // Location is ONLY requested when the user clicks the "Show your location"
  // button — no automatic geolocation prompt on page load.

  // 6. Render Custom Hazard Markers with SVG / Emoji Icons and Popups
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();
    activePopupsRef.current = {};

    // Filter alerts if filter is active
    const visibleAlerts = alerts.filter((alert) => {
      const matchType = mapSettings.activeFilterType === 'all' || alert.type === mapSettings.activeFilterType;
      const matchStatus = mapSettings.activeFilterStatus === 'all' || alert.status === mapSettings.activeFilterStatus;
      return matchType && matchStatus;
    });

    visibleAlerts.forEach((alert) => {
      // Configure icon badge appearance based on hazard type
      let iconSymbol = '⚠️';
      let bgColor = 'bg-amber-500';
      let ringColor = 'bg-amber-400';
      let labelText = 'Warning';

      if (alert.type === 'fire') {
        iconSymbol = '🔥';
        bgColor = 'bg-red-600';
        ringColor = 'bg-red-500';
        labelText = 'Fire Alert';
      } else if (alert.type === 'flood') {
        iconSymbol = '🌊';
        bgColor = 'bg-blue-600';
        ringColor = 'bg-blue-400';
        labelText = 'Flood Warning';
      } else if (alert.type === 'power') {
        iconSymbol = '⚡';
        bgColor = 'bg-amber-500';
        ringColor = 'bg-amber-400';
        labelText = 'No Electricity';
      } else if (alert.type === 'streetlight') {
        iconSymbol = '💡';
        bgColor = 'bg-indigo-600';
        ringColor = 'bg-indigo-400';
        labelText = 'No Streetlights';
      } else if (alert.type === 'water') {
        iconSymbol = '🚰';
        bgColor = 'bg-cyan-600';
        ringColor = 'bg-cyan-400';
        labelText = 'Water Interruption';
      } else if (alert.type === 'road') {
        iconSymbol = '🚧';
        bgColor = 'bg-orange-600';
        ringColor = 'bg-orange-400';
        labelText = 'Road Obstruction';
      }

      // Check if hazard is resolved
      const isResolved = alert.status === 'resolved';
      const isMonitoring = alert.status === 'monitoring';

      // HTML template for the custom Leaflet Pin
      const customPinHtml = `
        <div class="hazard-pin-container" id="map-pin-${alert.id}">
          ${!isResolved && (alert.severity === 'critical' || alert.severity === 'high') ? `<div class="hazard-pulse-ring ${ringColor}"></div>` : ''}
          <div class="hazard-pin-icon ${isResolved ? 'bg-slate-500 opacity-80' : bgColor}">
            <span>${iconSymbol}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-hazard-divicon',
        html: customPinHtml,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -22],
      });

      const marker = L.marker(alert.coordinates, {
        icon: customIcon,
        title: `${labelText}: ${alert.streetName}`,
      });

      // Status pill styling
      const statusBadge = isResolved
        ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">Resolved</span>'
        : isMonitoring
        ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">Monitoring</span>'
        : '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700">Active Alert</span>';

      const severityBadge = alert.severity === 'critical'
        ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-600 text-white">Critical</span>'
        : alert.severity === 'high'
        ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-500 text-white">High</span>'
        : alert.severity === 'moderate'
        ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500 text-white">Moderate</span>'
        : '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">Low</span>';

      // Rich HTML Popup with Photo Proof
      const photoHtml = alert.photoUrl
        ? `<div class="relative w-full h-20 rounded-md overflow-hidden border border-slate-200 bg-slate-100 mt-1">
            <img src="${alert.photoUrl}" alt="${alert.title}" class="w-full h-full object-cover" />
            <div class="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
              📸 Verified Photo
            </div>
          </div>`
        : '';

      const shortDescription = alert.description.length > 110 ? `${alert.description.slice(0, 110).trim()}…` : alert.description;
      const hasMoreDescription = alert.description.length > 110;

      const popupHtml = `
        <div class="p-2.5 space-y-2 font-sans">
          <!-- Header -->
          <div class="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
            <div class="flex items-center gap-2">
              <span class="text-xl">${iconSymbol}</span>
              <div>
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">${labelText}</div>
                <div class="font-bold text-slate-900 text-xs leading-snug">${alert.title}</div>
              </div>
            </div>
          </div>

          <!-- Photo Proof (if uploaded) -->
          ${photoHtml}

          <!-- Key Details -->
          <div class="space-y-1 text-xs text-slate-700">
            <div class="flex items-center justify-between">
              <span class="text-slate-400 font-medium text-[11px]">Status:</span>
              <div class="flex items-center gap-1.5">
                ${statusBadge}
                ${severityBadge}
              </div>
            </div>

            <div class="flex items-start justify-between pt-0.5">
              <span class="text-slate-400 font-medium text-[11px] shrink-0">Street:</span>
              <span class="font-semibold text-right text-slate-800 text-[11px]">${alert.streetName}</span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-slate-400 font-medium text-[11px]">Reported:</span>
              <span class="text-slate-600 font-mono text-[10px]">${alert.timeReported}</span>
            </div>
          </div>

          <!-- Description -->
          <div class="p-1.5 bg-slate-50 rounded text-[10px] text-slate-600 leading-snug border border-slate-200">
            <span id="popup-desc-short-${alert.id}">${shortDescription}</span>
            <span id="popup-desc-full-${alert.id}" style="display:none">${alert.description}</span>
            ${hasMoreDescription ? `<button id="btn-popup-more-${alert.id}" class="ml-1 text-[10px] font-bold text-blue-600 hover:text-blue-700">See more</button>` : ''}
          </div>

          ${alert.evacuationCenter ? `
            <div class="text-[10px] bg-emerald-50 text-emerald-800 p-1.5 rounded border border-emerald-200">
              <strong>Evacuation Center:</strong> ${alert.evacuationCenter}
            </div>
          ` : ''}

          <!-- Footer Actions -->
          <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-[10px] text-slate-400 truncate max-w-[120px]">By: ${alert.reportedBy}</span>
            <button
              id="btn-popup-toggle-${alert.id}"
              class="px-2.5 py-1 text-xs font-semibold rounded ${isResolved ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'} transition-colors cursor-pointer"
            >
              ${isResolved ? 'Re-open Alert' : 'Mark Resolved'}
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'custom-leaflet-popup',
        maxWidth: 250,
        minWidth: 220,
        closeOnClick: false,
        autoClose: false,
        closeOnEscapeKey: false,
        autoPan: true,
        keepInView: true,
        autoPanPadding: [40, 120],
        autoPanPaddingTopLeft: [40, 100],
        autoPanPaddingBottomRight: [40, 120],
      });

      marker.on('popupopen', () => {
        onSelectAlert(alert);
        // Reposition immediately: no animated delay and enough bottom clearance.
        mapInstanceRef.current?.panBy([0, -500], { animate: false });
        // Attach click listener to the button inside popup
        setTimeout(() => {
          const btn = document.getElementById(`btn-popup-toggle-${alert.id}`);
          if (btn) {
            btn.onclick = (e) => {
              e.stopPropagation();
              onToggleAlertStatus(alert.id);
            };
          }
          const more = document.getElementById(`btn-popup-more-${alert.id}`);
          if (more) {
            more.onclick = (e) => {
              e.stopPropagation();
              const shortText = document.getElementById(`popup-desc-short-${alert.id}`);
              const fullText = document.getElementById(`popup-desc-full-${alert.id}`);
              if (shortText && fullText) {
                shortText.style.display = 'none';
                fullText.style.display = 'inline';
                more.remove();
              }
            };
          }
        }, 50);
      });

      marker.on('click', () => {
        onSelectAlert(alert);
      });

      markersLayerRef.current?.addLayer(marker);
      activePopupsRef.current[alert.id] = marker;
    });
  }, [alerts, mapSettings.activeFilterType, mapSettings.activeFilterStatus]);

  // 7. Auto-fly to selected alert from sidebar
  useEffect(() => {
    if (!selectedAlert || !mapInstanceRef.current) return;
    const targetMarker = activePopupsRef.current[selectedAlert.id];

    mapInstanceRef.current.flyTo(selectedAlert.coordinates, 16, {
      duration: 1.2,
      easeLinearity: 0.25,
    });

    if (targetMarker) {
      setTimeout(() => {
        targetMarker.openPopup();
      }, 700);
    }
  }, [selectedAlert]);

  // 8. Auto-recenter map when triggered externally (e.g. from Navbar)
  useEffect(() => {
    if (!recenterTrigger || recenterTrigger === 0) return;
    handleRecenter();
  }, [recenterTrigger]);

  // Recenter map function
  const handleRecenter = () => {
    setIsRecenterSpinning(true);
    setTimeout(() => setIsRecenterSpinning(false), 550);
    // In Flood Prone mode, recenter inside the flood map instead of closing it.
    if (showFloodProneBlank) {
      floodMapFrameRef.current?.contentWindow?.postMessage({ type: 'flood-recenter' }, '*');
      return;
    }
    if (!mapInstanceRef.current) return;

    // Close any active open popups
    mapInstanceRef.current.closePopup();
    if (mapSettings.lockCameraToBounds) {
      const corner1 = L.latLng(SAN_JOSE_BOUNDS[0][0] - 0.015, SAN_JOSE_BOUNDS[0][1] - 0.015);
      const corner2 = L.latLng(SAN_JOSE_BOUNDS[1][0] + 0.015, SAN_JOSE_BOUNDS[1][1] + 0.015);
      mapInstanceRef.current.setMaxBounds(L.latLngBounds(corner1, corner2));
    }

    // Smooth fast recenter back to Barangay San Jose center
    mapInstanceRef.current.flyTo(SAN_JOSE_CENTER, 13, {
      duration: 0.75,
      easeLinearity: 0.25,
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950">
      {/* The Leaflet Map Canvas */}
      {/* NOTE: the map container is NEVER hidden now. In Flood Prone mode the
          iframe simply renders on top of it (z-30 overlay below). Hiding the
          container made Leaflet cache a zero size and return a blank map. */}
      <div
        id="leaflet-map-root"
        ref={mapContainerRef}
        className={`block w-full h-full ${isAddingPinMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      />

      {showFloodProneBlank && (
        <div className="absolute inset-0 z-30 bg-white" aria-label="Rizal Flood Hazard Map">
          <iframe
            title="Rizal Flood Hazard Map (100-year)"
            src={`${import.meta.env.BASE_URL}rizal_flood_100yr_map.html`}
            ref={floodMapFrameRef}
            className="h-full w-full border-0"
          />
        </div>
      )}

      {/* Adding Pin Active Overlay Banner */}
      {isAddingPinMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-white px-4 py-2 rounded-md shadow-lg border border-emerald-500/60 flex items-center gap-2 animate-bounce">
          <MapPin className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold">Click any street in Barangay San Jose to place hazard pin</span>
        </div>
      )}

      {/* Live Coordinate Display (Bottom Left) — also visible on mobile portrait (Android/iPhone), raised a bit */}
      <div className={`absolute bottom-4 portrait:bottom-10 left-4 z-10 hidden max-w-[calc(100vw-2rem)] flex-wrap sm:flex ${isMobileMenuOpen ? '' : 'portrait:flex'} items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/90 backdrop-blur-md text-slate-200 border border-slate-800 shadow-md text-[10px] font-mono`}>
        <Compass className="w-3.5 h-3.5 text-blue-400" />
        <span className="font-semibold text-white">BRGY. SAN JOSE</span>
        <span className="text-slate-600">|</span>
        {mouseCoords ? (
          <span className="text-slate-300">
            {mouseCoords.lat.toFixed(5)}°N, {mouseCoords.lng.toFixed(5)}°E
          </span>
        ) : (
          <span className="text-slate-400">14.74250°N, 121.13100°E</span>
        )}
      </div>

      {/* Floating GIS Map Controls (Top Left) - hidden in mobile portrait when incident feed is open */}
      <div className={`absolute flex flex-col gap-1.5 ${showFloodProneBlank ? 'left-4 top-4 z-50' : 'left-4 top-4 z-40'} ${isMobileMenuOpen ? 'portrait:hidden' : ''}`}>
        <button
          id="btn-recenter-gis"
          onClick={handleRecenter}
          title="Recenter"
          className="p-2 rounded-md bg-white hover:bg-slate-50 text-slate-800 shadow-xs border border-slate-200 transition-colors active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 transition-transform ${isRecenterSpinning ? 'animate-fast-spin text-slate-900' : 'text-slate-700'}`} />
        </button>

        {/* Layer Selector & Mask Intensity Toggle */}
        <div className="relative">
          <button
            id="btn-toggle-layers-menu"
            onClick={() => toggleLayerMenu()}
            title="Layers"
            className="p-2 rounded-md bg-white hover:bg-slate-50 text-slate-800 shadow-xs border border-slate-200 transition-colors active:scale-95 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-slate-700" />
          </button>

          {showLayerMenu && (
            <>
              {/* Mobile transparent backdrop: tap anywhere outside on phones to close Layers */}
              <div
                className="fixed inset-0 z-30 md:hidden"
                onClick={() => toggleLayerMenu(false)}
              />

              <div className="absolute top-0 left-11 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-2.5 text-[11px] text-slate-800 space-y-2.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">MAP SETTINGS</span>
                  <button
                    onClick={() => toggleLayerMenu(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Base Map Style */}
                <div className="-mt-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    BASEMAP STYLE:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['streets', 'satellite', 'light', 'dark'] as const).map((layer) => (
                      <button
                        key={layer}
                        onClick={() => {
                          if (layer === 'dark') {
                            // Coming Soon is intentionally a no-op; keep the Layers menu open.
                            return;
                          }
                          if (layer === 'light') {
                            setShowFloodProneBlank(true);
                            onUpdateMapSettings({ tileLayer: layer });
                            toggleLayerMenu(false);
                            return;
                          }
                          setShowFloodProneBlank(false);
                          onUpdateMapSettings({ tileLayer: layer });
                        }}
                      className={`relative px-2 py-1 rounded-md text-center text-xs font-semibold capitalize border transition-colors ${
                        layer === 'dark'
                          ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          : (layer === 'light' ? showFloodProneBlank : mapSettings.tileLayer === layer)
                            ? 'bg-black text-white border-black'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {layer === 'light' ? 'Flood Prone' : layer === 'dark' ? 'Comming Soon' : layer}
                    </button>
                  ))}
                </div>
              </div>

              {!showFloodProneBlank && (
                <>
              {/* Inverted Blackout Mask Opacity */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Outside Area Blackout:
                  </label>
                  <span className="font-mono text-xs text-slate-900 font-bold">
                    {Math.round(mapSettings.maskOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.30"
                  max="1.0"
                  step="0.05"
                  value={mapSettings.maskOpacity}
                  onChange={(e) => onUpdateMapSettings({ maskOpacity: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                />
                <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 font-medium">
                  <span>Subtle (30%)</span>
                  <span className="text-slate-700 font-bold">Default 30%</span>
                  <span>Pitch (100%)</span>
                </div>
              </div>

              {/* Boundary Stroke & Labels Toggles */}
              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 font-medium">Show Boundary Line</span>
                  <input
                    type="checkbox"
                    checked={mapSettings.showBoundaryStroke}
                    onChange={(e) => onUpdateMapSettings({ showBoundaryStroke: e.target.checked })}
                    className="w-3.5 h-3.5 accent-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 font-medium">Lock Camera Inside Bounds</span>
                  <input
                    type="checkbox"
                    checked={mapSettings.lockCameraToBounds}
                    onChange={(e) => onUpdateMapSettings({ lockCameraToBounds: e.target.checked })}
                    className="w-3.5 h-3.5 accent-blue-600 rounded"
                  />
                </label>
              </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

        <button
          id="btn-show-user-location"
          onClick={handleShowUserLocation}
          title="Show your location"
          aria-label="Show your location"
          className="rounded-md border border-slate-200 bg-white p-2 text-slate-800 shadow-xs transition-colors hover:bg-slate-50 active:scale-95"
        >
          <LocateFixed className={`h-4 w-4 ${isLocating ? 'animate-pulse text-blue-600' : 'text-slate-700'}`} />
        </button>

        {/* Zoom In / Zoom Out — below "Show your location"; hidden in Flood Prone mode */}
        {!showFloodProneBlank && (
          <>
            <button
              id="btn-zoom-in"
              onClick={handleZoomIn}
              title="Zoom in"
              aria-label="Zoom in"
              className="rounded-md border border-slate-200 bg-white p-2 text-slate-800 shadow-xs transition-colors hover:bg-slate-50 active:scale-95"
            >
              <Plus className="h-4 w-4 text-slate-700" />
            </button>

            <button
              id="btn-zoom-out"
              onClick={handleZoomOut}
              title="Zoom out"
              aria-label="Zoom out"
              className="rounded-md border border-slate-200 bg-white p-2 text-slate-800 shadow-xs transition-colors hover:bg-slate-50 active:scale-95"
            >
              <Minus className="h-4 w-4 text-slate-700" />
            </button>
          </>
        )}
      </div>

      {locationMessage && !isMobileMenuOpen && (
        locationBanner !== 'none' ? (
          // Minimal centered toast — green when found, red when denied —
          // italic monospace, small and subtle, auto-hides after 3 seconds.
          <div className="pointer-events-none absolute inset-x-0 bottom-20 portrait:bottom-28 z-20 flex justify-center px-4">
            <p className={`animate-in fade-in zoom-in-95 font-['JetBrains_Mono',monospace] text-xs font-medium italic tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] duration-300 ${locationBanner === 'success' ? 'text-green-400/90' : 'text-red-400/90'}`}>
              {locationMessage}
            </p>
          </div>
        ) : (
          <div className="absolute left-4 top-44 z-20 rounded-md bg-white/95 px-3 py-2 text-[11px] text-slate-700 shadow-md">
            {locationMessage}
          </div>
        )
      )}

      {/* Chrome-style in-app location permission card — replicates the native
          Android Chrome dialog so the same Precise/Approximate + Allow flow
          appears on every device, even after the browser stops showing its
          own native prompt. */}
      {showLocationPermissionCard && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-[320px] rounded-3xl bg-[#1f2430] p-4 shadow-2xl ring-1 ring-white/10">
            <div className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a73e8]">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <p className="pt-0.5 text-sm leading-snug text-slate-100">
                <span className="font-bold">HazardSync</span> wants to use your device's location
              </p>
            </div>

            {/* Precise option */}
            <button
              onClick={() => setPrecisionChoice('precise')}
              className="mt-3.5 flex w-full items-center gap-2.5 rounded-2xl bg-[#2a303c] p-2.5 text-left ring-1 transition-colors ring-transparent active:scale-[0.99] hover:ring-white/20"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#3a4150]">
                <svg viewBox="0 0 56 56" className="h-full w-full">
                  <rect width="56" height="56" fill="#3c4454" />
                  <path d="M-2 14 L20 2 L34 16 L58 8" stroke="#5a6577" strokeWidth="4" fill="none" />
                  <path d="M-2 34 L14 26 L30 40 L58 30" stroke="#5a6577" strokeWidth="4" fill="none" />
                  <path d="M14 -2 L22 20 L10 38 L18 58" stroke="#5a6577" strokeWidth="3" fill="none" />
                  <path d="M40 -2 L34 22 L46 40 L40 58" stroke="#5a6577" strokeWidth="3" fill="none" />
                  <rect x="2" y="40" width="14" height="10" rx="2" fill="#3f7d5c" />
                  <rect x="42" y="2" width="12" height="10" rx="2" fill="#3f7d5c" />
                  <circle cx="28" cy="26" r="6" fill="#4285f4" stroke="#dfe3ea" strokeWidth="3" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-100">Precise</div>
                <div className="text-xs text-slate-400">Exact location</div>
              </div>
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${precisionChoice === 'precise' ? 'bg-[#4285f4]' : 'border-2 border-slate-500'}`}>
                {precisionChoice === 'precise' && <Check className="h-4 w-4 text-white" />}
              </div>
            </button>

            {/* Approximate option */}
            <button
              onClick={() => setPrecisionChoice('approximate')}
              className="mt-2 flex w-full items-center gap-2.5 rounded-2xl bg-[#2a303c] p-2.5 text-left ring-1 transition-colors ring-transparent active:scale-[0.99] hover:ring-white/20"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#3a4150]">
                <svg viewBox="0 0 56 56" className="h-full w-full">
                  <rect width="56" height="56" fill="#3c4454" />
                  <path d="M-2 14 L20 2 L34 16 L58 8" stroke="#5a6577" strokeWidth="4" fill="none" />
                  <path d="M-2 34 L14 26 L30 40 L58 30" stroke="#5a6577" strokeWidth="4" fill="none" />
                  <path d="M14 -2 L22 20 L10 38 L18 58" stroke="#5a6577" strokeWidth="3" fill="none" />
                  <path d="M40 -2 L34 22 L46 40 L40 58" stroke="#5a6577" strokeWidth="3" fill="none" />
                  <rect x="2" y="40" width="14" height="10" rx="2" fill="#3f7d5c" />
                  <rect x="42" y="2" width="12" height="10" rx="2" fill="#3f7d5c" />
                  <circle cx="28" cy="26" r="20" fill="#4285f4" fillOpacity="0.25" stroke="#a8c7fa" strokeWidth="2" />
                  <circle cx="28" cy="26" r="4" fill="#a8c7fa" />
                </svg></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-100">Approximate</div>
                <div className="text-xs text-slate-400">Neighborhood</div>
              </div>
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${precisionChoice === 'approximate' ? 'bg-[#4285f4]' : 'border-2 border-slate-500'}`}>
                {precisionChoice === 'approximate' && <Check className="h-4 w-4 text-white" />}
              </div>
            </button>

            <div className="mt-3.5 space-y-2">
              <button
                onClick={handleAllowLocationRequest}
                className="w-full rounded-full bg-[#0b57d0] py-2.5 text-[13px] font-semibold text-white shadow-lg transition-colors active:scale-[0.98] hover:bg-[#1a73e8]"
              >
                Allow while visiting the site
              </button>
              <button
                onClick={handleAllowLocationRequest}
                className="w-full rounded-full bg-[#0b57d0] py-2.5 text-[13px] font-semibold text-white shadow-lg transition-colors active:scale-[0.98] hover:bg-[#1a73e8]"
              >
                Allow this time
              </button>
              <button
                onClick={handleNeverAllowLocation}
                className="w-full rounded-full bg-[#0b57d0] py-2.5 text-[13px] font-semibold text-white shadow-lg transition-colors active:scale-[0.98] hover:bg-[#1a73e8]"
              >
                Never allow
              </button>
              <p className="pt-1 text-center text-[10px] leading-relaxed text-slate-400 flex items-start justify-center gap-1.5">
                <ShieldCheck className="w-3 h-3 shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  By continuing, you consent to the use of your device location solely for displaying your position on this map. Your location is never saved, stored, or shared — in accordance with the Data Privacy Act (RA 10173).
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
