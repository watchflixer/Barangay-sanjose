import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { clearRefreshView, readRefreshView } from '../lib/refreshView';
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
  ShieldCheck,
  X,
  Radio,
  LightbulbOff
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
  /** Lets the parent app know the Flood Prone map is open (for navbar gating). */
  onFloodProneChange?: (isOpen: boolean) => void;
  /** Lets the parent app know the Traffic map is open (for navbar gating). */
  onTrafficChange?: (isOpen: boolean) => void;
  /** Lets the parent app know the Help Center view is open (for navbar gating). */
  onHelpCenterChange?: (isOpen: boolean) => void;
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
  onFloodProneChange,
  onTrafficChange,
  onHelpCenterChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const maskLayerRef = useRef<L.Polygon | null>(null);
  const boundaryLayerRef = useRef<L.Polygon | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const sitiosLayerRef = useRef<L.LayerGroup | null>(null);
  const activePopupsRef = useRef<{ [key: string]: L.Marker }>({});
  // Read the one-time view snapshot set by the HazardSync brand refresh.
  const [refreshView] = React.useState(readRefreshView);
  React.useEffect(() => {
    if (refreshView !== null) clearRefreshView();
  }, [refreshView]);

  const [mouseCoords, setMouseCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [showLayerMenu, setShowLayerMenu] = React.useState(false);

  const toggleLayerMenu = (open?: boolean) => {
    setShowLayerMenu((prev) => (typeof open === 'boolean' ? open : !prev));
  };
  const [showFloodProneBlank, setShowFloodProneBlank] = React.useState(refreshView === 'flood');

  // Notify the parent app whenever the Flood Prone map opens or closes.
  React.useEffect(() => {
    onFloodProneChange?.(showFloodProneBlank);
  }, [showFloodProneBlank, onFloodProneChange]);

  // True while the Flood Prone iframe has navigated away to the external
  // Leaflet site (leafletjs.com): the floating controls hide and an X
  // button appears (all devices) to come back.
  const [floodOnExternalSite, setFloodOnExternalSite] = React.useState(false);
  // Bumped to remount the Flood Prone iframe, resetting it to the map.
  const [floodMapNonce, setFloodMapNonce] = React.useState(0);
  // The Traffic iframe's full-screen Directions screen reports open/close so
  // the app's floating controls don't cover its back arrow and search fields.
  const [trafficDirectionsOpen, setTrafficDirectionsOpen] = React.useState(false);

  // The Flood Prone iframe reports taps on its underlined "Leaflet" credit.
  // The credit still navigates the iframe to leafletjs.com; the app answers
  // by hiding its floating controls (Recenter/Layers/Show your location) and
  // raising an X button that returns to the Flood Prone map.
  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | null)?.type === 'flood-leaflet-click') {
        setFloodOnExternalSite(true);
      }
      const type = (event.data as { type?: string } | null)?.type;
      if (type === 'traffic-directions-open') setTrafficDirectionsOpen(true);
      if (type === 'traffic-directions-close') setTrafficDirectionsOpen(false);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Closing Flood Prone by any other means (streets/satellite basemap) also
  // resets the external-site state so a stale X never comes back later.
  React.useEffect(() => {
    if (!showFloodProneBlank) setFloodOnExternalSite(false);
  }, [showFloodProneBlank]);

  // X button: remount the iframe so the Flood Prone map loads fresh and
  // bring the floating controls back.
  const handleBackToFloodProne = () => {
    setFloodOnExternalSite(false);
    setFloodMapNonce((n) => n + 1);
  };

  // Realtime Traffic map (the former "Comming Soon" Layers slot). A second
  // full-map overlay rendered on top of the GIS map, mutually exclusive with
  // the Flood Prone overlay.
  // A shared link (?traffic=1&sfrom=lat,lng&sto=lat,lng&smode=car) opens the
  // Traffic map on load with the shared route pre-computed — the in-app
  // Share button builds exactly this URL so recipients land on the website,
  // not on Google Maps.
  const sharedRoute = React.useMemo(() => {
    const q = new URLSearchParams(window.location.search);
    return {
      open: q.get('traffic') === '1',
      sfrom: q.get('sfrom') || '',
      sto: q.get('sto') || '',
      smode: q.get('smode') || '',
    };
  }, []);
  const [showTrafficMap, setShowTrafficMap] = React.useState(
    refreshView === null ? sharedRoute.open : refreshView === 'traffic',
  );
  const trafficMapFrameRef = useRef<HTMLIFrameElement | null>(null);
  // Help Center — an INDEPENDENT view with its OWN Leaflet map (plain OSM
  // tiles, no iframe), fully separate from the Traffic feature, so changing
  // Help Center never affects Traffic (and vice versa).
  const [showHelpCenter, setShowHelpCenter] = React.useState(refreshView === 'helpcenter');
  const helpCenterMapRef = useRef<HTMLDivElement | null>(null);
  const helpCenterMapInstanceRef = useRef<L.Map | null>(null);
  // Help Center's OWN Streets/Satellite basemap switcher (same idea as the
  // Traffic map's Street/Satellite switch) — affects only the Help Center map.
  const [helpCenterBasemap, setHelpCenterBasemap] = React.useState<'streets' | 'satellite'>('satellite');
  const helpCenterTileLayerRef = useRef<L.TileLayer | null>(null);
  // Opening Help Center closes the Flood Prone and Traffic maps.
  React.useEffect(() => {
    if (showHelpCenter) {
      setShowFloodProneBlank(false);
      setShowTrafficMap(false);
    }
  }, [showHelpCenter]);
  // Notify the parent app whenever the Help Center view opens or closes.
  React.useEffect(() => {
    onHelpCenterChange?.(showHelpCenter);
  }, [showHelpCenter, onHelpCenterChange]);
  // Create the Help Center Leaflet map when the view opens; destroy it on
  // close so every visit starts fresh and Leaflet re-measures the container.
  React.useEffect(() => {
    if (!showHelpCenter) return;
    const container = helpCenterMapRef.current;
    if (!container || helpCenterMapInstanceRef.current) return;

    // Same strict Barangay San Jose bounding box as the main GIS map.
    const corner1 = L.latLng(SAN_JOSE_BOUNDS[0][0] - 0.015, SAN_JOSE_BOUNDS[0][1] - 0.015);
    const corner2 = L.latLng(SAN_JOSE_BOUNDS[1][0] + 0.015, SAN_JOSE_BOUNDS[1][1] + 0.015);
    const maxBounds = L.latLngBounds(corner1, corner2);

    const map = L.map(container, {
      center: SAN_JOSE_CENTER,
      zoom: 13,
      minZoom: 13,
      maxZoom: 18,
      maxBounds: mapSettings.lockCameraToBounds ? maxBounds : undefined,
      maxBoundsViscosity: 1.0, // Hard lock - rubberband bouncing back
      zoomControl: false, // Added explicitly below, like the Flood Prone map
      attributionControl: true, // Leaflet copyright/attribution at the bottom, like the Flood Prone map
    });

    // Native Leaflet zoom control — same as the Flood Prone map
    // (L.control.zoom({ position: 'topleft' })). index.css pushes it below
    // the app's floating control stack.
    L.control.zoom({ position: 'topleft' }).addTo(map);

    helpCenterMapInstanceRef.current = map;
    // The container mounts fresh each time the view opens — make sure
    // Leaflet measures it instead of caching a zero size.
    const sizeTimer = setTimeout(() => map.invalidateSize(), 0);
    return () => {
      clearTimeout(sizeTimer);
      map.remove();
      helpCenterMapInstanceRef.current = null;
      helpCenterTileLayerRef.current = null;
    };
  }, [showHelpCenter, mapSettings.lockCameraToBounds]);
  // The Help Center tile layer is owned here: (re)created whenever the view
  // opens or the Streets/Satellite switcher changes. Declared after the init
  // effect above, so the map instance already exists when this fires.
  React.useEffect(() => {
    const map = helpCenterMapInstanceRef.current;
    if (!showHelpCenter || !map) return;
    if (helpCenterTileLayerRef.current) {
      map.removeLayer(helpCenterTileLayerRef.current);
      helpCenterTileLayerRef.current = null;
    }
    const tileConfig = TILE_SERVERS[helpCenterBasemap];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
    }).addTo(map);
    helpCenterTileLayerRef.current = tileLayer;
  }, [helpCenterBasemap, showHelpCenter]);
  React.useEffect(() => {
    if (showTrafficMap) {
      setShowFloodProneBlank(false);
      setShowHelpCenter(false);
    }
  }, [showTrafficMap]);
  // Conversely, opening Flood Prone closes the Traffic map (and Help Center).
  React.useEffect(() => {
    if (showFloodProneBlank) {
      setShowTrafficMap(false);
      setShowHelpCenter(false);
    }
  }, [showFloodProneBlank]);
  // Notify the parent app whenever the Traffic map opens or closes.
  React.useEffect(() => {
    onTrafficChange?.(showTrafficMap);
  }, [showTrafficMap, onTrafficChange]);
  // Leaving the Traffic map also resets its Directions state, so a stale
  // "controls hidden" flag can't survive into the next visit. This must sit
  // after the showTrafficMap declaration: the dependency array is evaluated
  // during render, so reading it earlier throws a TDZ ReferenceError.
  React.useEffect(() => {
    if (!showTrafficMap) setTrafficDirectionsOpen(false);
  }, [showTrafficMap]);
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

          // While the Flood Prone map is open the location goes into the
          // iframe instead of the hidden GIS map behind it.
          if (showFloodProneBlank) {
            floodMapFrameRef.current?.contentWindow?.postMessage(
              { type: 'flood-user-location', lat: position.coords.latitude, lng: position.coords.longitude },
              '*'
            );
          } else if (showTrafficMap) {
            trafficMapFrameRef.current?.contentWindow?.postMessage(
              { type: 'traffic-user-location', lat: position.coords.latitude, lng: position.coords.longitude },
              '*'
            );
          } else if (showHelpCenter) {
            // While the Help Center Leaflet map is open, fly it to the user.
            const helpMap = helpCenterMapInstanceRef.current;
            if (helpMap) {
              if (mapSettings.lockCameraToBounds) helpMap.setMaxBounds(null as any);
              helpMap.flyTo(coordinates, 16, {
                duration: 1.6,
                easeLinearity: 0.25,
              });
            }
          } else {
            // The location can be outside Barangay San Jose. Temporarily release
            // the GIS boundary lock so the button can always reach the user.
            const map = mapInstanceRef.current;
            if (mapSettings.lockCameraToBounds) map.setMaxBounds(null as any);
            map.flyTo(coordinates, 16, {
              duration: 1.6,
              easeLinearity: 0.25,
            });
          }
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
    // tap so the browser treats it as a direct user gesture, otherwise
    // Safari/iOS suppresses its native dialog.
    const askPermissionState = () => {
      if (!navigator.permissions?.query) return;
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permission) => {
          // 'granted' → the location is fetched silently, no dialogs at all.
          // 'prompt'  → the browser's native allow dialog appears on its own;
          //             hindi na tayo nagpapakita ng "Tap Allow..." na text.
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
    // In Traffic mode, recenter inside the traffic map the same way.
    if (showTrafficMap) {
      trafficMapFrameRef.current?.contentWindow?.postMessage({ type: 'traffic-recenter' }, '*');
      return;
    }
    // In Help Center mode, recenter its own Leaflet map.
    if (showHelpCenter) {
      helpCenterMapInstanceRef.current?.flyTo(SAN_JOSE_CENTER, 13, {
        duration: 0.75,
        easeLinearity: 0.25,
      });
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
            key={floodMapNonce}
            title="Rizal Flood Hazard Map (100-year)"
            src={`${import.meta.env.BASE_URL}rizal_flood_100yr_map.html`}
            ref={floodMapFrameRef}
            className="h-full w-full border-0"
          />
        </div>
      )}

      {/* Realtime Traffic map overlay (Leaflet 2.0.0-alpha.1 inside). The
          TomTom key travels as a query parameter so the iframe picks it up
          without any build-time injection into public/ files. */}
      {showTrafficMap && (
        <div className="absolute inset-0 z-30 bg-white" aria-label="Rizal Realtime Traffic Map">
          <iframe
            title="Rizal Realtime Traffic Map"
            src={`${import.meta.env.BASE_URL}rizal_traffic_map.html?${[
              import.meta.env.VITE_MAPBOX_TRAFFIC_TOKEN ? `key=${encodeURIComponent(import.meta.env.VITE_MAPBOX_TRAFFIC_TOKEN)}` : '',
              sharedRoute.sfrom ? `sfrom=${encodeURIComponent(sharedRoute.sfrom)}` : '',
              sharedRoute.sto ? `sto=${encodeURIComponent(sharedRoute.sto)}` : '',
              sharedRoute.smode ? `smode=${encodeURIComponent(sharedRoute.smode)}` : '',
            ].filter(Boolean).join('&')}`}
            ref={trafficMapFrameRef}
            className="h-full w-full border-0"
          />
        </div>
      )}

      {/* Help Center overlay — an INDEPENDENT view with its OWN Leaflet map
          (plain tiles, no iframe), fully separate from the Traffic feature,
          so editing it never touches Traffic. */}
      {showHelpCenter && (
        <div className="absolute inset-0 z-30 bg-white" aria-label="Help Center">
          <div
            id="help-center-map-root"
            ref={helpCenterMapRef}
            className="block w-full h-full cursor-grab active:cursor-grabbing"
          />
        </div>
      )}

      {/* Help Center Street/Satellite switcher — mimics the Flood Prone map's
          #base-switch: same order (Satellite | Street), same default
          (satellite active), and same card/button styling. Sits above the
          overlay (z-50) and only changes the Help Center map's basemap. */}
      {showHelpCenter && (
        <div
          role="group"
          aria-label="Map style"
          className="absolute right-[12px] top-[10px] z-50 flex gap-1 rounded-lg border border-slate-200 bg-white/95 p-[4px] shadow-md"
        >
          <button
            type="button"
            onClick={() => setHelpCenterBasemap('satellite')}
            aria-pressed={helpCenterBasemap === 'satellite'}
            className={`rounded-[5px] border border-transparent px-2.5 py-[3px] text-[11px] font-bold leading-[14px] tracking-[0.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              helpCenterBasemap === 'satellite'
                ? 'bg-[#111827] text-white'
                : 'bg-transparent text-[#33413a] hover:bg-[#eef1ec]'
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setHelpCenterBasemap('streets')}
            aria-pressed={helpCenterBasemap === 'streets'}
            className={`rounded-[5px] border border-transparent px-2.5 py-[3px] text-[11px] font-bold leading-[14px] tracking-[0.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              helpCenterBasemap === 'streets'
                ? 'bg-[#111827] text-white'
                : 'bg-transparent text-[#33413a] hover:bg-[#eef1ec]'
            }`}
          >
            Street
          </button>
        </div>
      )}

      {/* Help Center bottom-right stack — mimics the Traffic map's
          #legend-stack: two placeholder buttons (bold "3D" text and
          find-location icon — white with a 1px gray border, same size as the
          Directions button, no action on click) sit above the Directions
          button (Traffic's #directions-btn), which sits directly above
          the flood legend (Flood Prone's #legend). */}
      {showHelpCenter && (
        <div className="absolute right-[12px] bottom-6 z-50 flex flex-col items-end gap-2.5 portrait:bottom-14">
          {/* Placeholder button — plain bold "3D" text (no 3D effect).
              White with a 1px solid gray border, same size as the
              Directions button. No action on click (placeholder only). */}
          <button
            type="button"
            title="3D"
            aria-label="3D"
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-[14px] border border-gray-400 bg-white p-0 shadow-md transition-transform hover:shadow-lg active:scale-[.94] focus-visible:outline-2 focus-visible:outline-gray-500"
          >
            <span className="text-[15px] font-extrabold leading-none text-black">3D</span>
          </button>

          {/* Placeholder button — find-location icon (folded map with a
              magnifying glass). White with a 1px solid gray border, same
              size as the Directions button. No action on click (placeholder
              only). */}
          <button
            type="button"
            title="Find location"
            aria-label="Find location"
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-[14px] border border-gray-400 bg-white p-0 shadow-md transition-transform hover:shadow-lg active:scale-[.94] focus-visible:outline-2 focus-visible:outline-gray-500"
          >
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="block h-6 w-6">
              <defs>
                {/* Cuts a gap around the magnifier so it stays transparent on any background */}
                <mask id="hc-find-location-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
                  <rect width="512" height="512" fill="#fff" />
                  <circle cx="385" cy="385" r="96" fill="#000" />
                  <line x1="440" y1="440" x2="488" y2="488" stroke="#000" strokeWidth="64" strokeLinecap="round" />
                </mask>
              </defs>
              {/* Folded map panels (exact reference icon) */}
              <g fill="#000" mask="url(#hc-find-location-cut)">
                <path d="M18 78 Q18 38 54 42 L158 78 L158 492 L18 442 Z" />
                <path d="M187 78 L297 20 L297 438 L187 492 Z" />
                <path d="M327 20 L440 62 Q467 72 467 100 L467 440 L327 492 Z" />
              </g>
              {/* Magnifying glass */}
              <circle cx="385" cy="385" r="62" fill="none" stroke="#000" strokeWidth="26" />
              <line x1="440" y1="440" x2="488" y2="488" stroke="#000" strokeWidth="26" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            title="Directions"
            aria-label="Directions"
            onClick={() => {
              // Open Google Maps directions to the Help Center map's current
              // center (fallback: Barangay San Jose center).
              const center = helpCenterMapInstanceRef.current?.getCenter();
              const lat = center ? center.lat : SAN_JOSE_CENTER[0];
              const lng = center ? center.lng : SAN_JOSE_CENTER[1];
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                '_blank',
                'noopener,noreferrer'
              );
            }}
            className="h-12 w-12 cursor-pointer rounded-[14px] border-0 bg-[#0b7a87] p-0 shadow-md transition-transform hover:shadow-lg active:scale-[.94] focus-visible:outline-2 focus-visible:outline-white"
          >
            <svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="block h-full w-full">
              <rect x="17" y="17" width="22" height="22" rx="3.5" transform="rotate(45 28 28)" fill="#ffffff" />
              <path d="M23.5 34v-6.5a3 3 0 0 1 3-3H31" fill="none" stroke="#0b7a87" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M30.5 19.8L36 24.5l-5.5 4.7z" fill="#0b7a87" transform="translate(-0.5 0)" />
            </svg>
          </button>

          {/* Legend card — same rows and styling as the Flood Prone map's
              #legend (all three swatches are black), with custom labels:
              3D / Directions / Find. An invisible sizer row keeps the card
              exactly as wide as the original legend. Info card only; the
              Help Center map itself stays a plain Leaflet basemap. */}
          <div className="rounded-lg border border-[#d8d2c2] bg-[#f6f3ea]/95 px-3 py-2.5 text-[12.5px] text-[#1b2a2f] shadow-md">
            {/* Invisible sizer — a replica of the original widest row, so
                the card keeps exactly its original width even though the
                custom labels (3D / Directions / Find) are shorter. Zero
                height, clipped, and hidden from assistive tech. */}
            <div aria-hidden="true" className="flex h-0 items-center gap-1.5 overflow-hidden">
              <span className="inline-block h-[13px] w-[13px] rounded-[2px]" style={{ background: '#000000' }} />
              Medium (0.5–1.5m)
            </div>
            <div className="my-[3px] flex items-center gap-1.5">
              <span className="inline-block h-[13px] w-[13px] rounded-[2px]" style={{ background: '#000000' }} />
              3D
            </div>
            <div className="my-[3px] flex items-center gap-1.5">
              <span className="inline-block h-[13px] w-[13px] rounded-[2px]" style={{ background: '#000000' }} />
              Directions
            </div>
            <div className="my-[3px] flex items-center gap-1.5">
              <span className="inline-block h-[13px] w-[13px] rounded-[2px]" style={{ background: '#000000' }} />
              Find
            </div>
          </div>
        </div>
      )}

      {/* X button shown while the Flood Prone iframe is viewing the external
          Leaflet site (leafletjs.com). Bare X icon — no circle card — visible
          on ALL devices and returns the user to the Flood Prone map. */}
      {showFloodProneBlank && floodOnExternalSite && (
        <button
          onClick={handleBackToFloodProne}
          title="Back to Flood Prone map"
          aria-label="Back to Flood Prone map"
          className="absolute right-6 top-4 z-[45] flex h-10 w-10 items-center justify-center text-slate-900 drop-shadow-sm transition-transform hover:scale-110 active:scale-90"
        >
          <X className="h-7 w-7" strokeWidth={3} />
        </button>
      )}

      {/* Adding Pin Active Overlay Banner */}
      {isAddingPinMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-white px-4 py-2 rounded-md shadow-lg border border-emerald-500/60 flex items-center gap-2 animate-bounce">
          <MapPin className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold">Click any street in Barangay San Jose to place hazard pin</span>
        </div>
      )}

      {/* Live Coordinate Display (Bottom Left) — desktop/landscape only; hidden on mobile portrait (Android/iPhone) */}
      <div className="absolute bottom-4 left-4 z-10 hidden max-w-[calc(100vw-2rem)] flex-wrap portrait:hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/90 backdrop-blur-md text-slate-200 border border-slate-800 shadow-md text-[10px] font-mono">
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
      <div className={`absolute flex flex-col gap-1.5 ${showFloodProneBlank || showTrafficMap || showHelpCenter ? 'left-4 top-4 z-50' : 'left-4 top-4 z-40'} ${isMobileMenuOpen ? 'portrait:hidden' : ''} ${floodOnExternalSite || (showTrafficMap && trafficDirectionsOpen) ? 'hidden' : ''}`}>
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
                    {(['streets', 'satellite', 'dark', 'light'] as const).map((layer) => (
                      <button
                        key={layer}
                        onClick={() => {
                          if (layer === 'dark') {
                            // The former "Comming Soon" slot now opens the realtime Traffic map.
                            setShowTrafficMap(true);
                            setShowFloodProneBlank(false);
                            setShowHelpCenter(false);
                            toggleLayerMenu(false);
                            return;
                          }
                          if (layer === 'light') {
                            setShowTrafficMap(false);
                            setShowFloodProneBlank(true);
                            setShowHelpCenter(false);
                            onUpdateMapSettings({ tileLayer: layer });
                            toggleLayerMenu(false);
                            return;
                          }
                          if (layer === 'satellite') {
                            // "Help Center" — independent duplicate of the Traffic view: same traffic map, own state/overlay.
                            setShowTrafficMap(false);
                            setShowFloodProneBlank(false);
                            setShowHelpCenter(true);
                            toggleLayerMenu(false);
                            return;
                          }
                          setShowTrafficMap(false);
                          setShowFloodProneBlank(false);
                          setShowHelpCenter(false);
                          onUpdateMapSettings({ tileLayer: layer });
                        }}
                      className={`relative px-2 py-1 rounded-md text-center text-xs font-semibold capitalize border transition-colors ${
                        layer === 'dark'
                          ? showTrafficMap
                            ? 'bg-black text-white border-black'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          : (layer === 'light' ? showFloodProneBlank : layer === 'satellite' ? showHelpCenter : mapSettings.tileLayer === layer && !showTrafficMap && !showHelpCenter)
                            ? 'bg-black text-white border-black'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {layer === 'light' ? 'Flood Prone' : layer === 'dark' ? 'Traffic' : layer === 'satellite' ? 'Help Center' : layer}
                    </button>
                  ))}

                  {/* Road Warrior — enabled placeholder: clickable but
                      intentionally does nothing yet. */}
                  <button
                    type="button"
                    onClick={() => {
                      // Placeholder: no action wired up yet.
                    }}
                    title="Road Warrior"
                    aria-label="Road Warrior"
                    className="px-2 py-1 rounded-md text-center text-xs font-semibold capitalize border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 active:scale-95 cursor-pointer"
                  >
                    Road Warrior
                  </button>

                  {/* Coming Soon — reserved placeholder slot next to Road Warrior. */}
                  <button
                    type="button"
                    disabled
                    title="Coming soon"
                    aria-label="Coming soon"
                    className="px-2 py-1 rounded-md text-center text-xs font-semibold border border-dashed border-slate-300 bg-slate-100 text-slate-400 cursor-not-allowed select-none"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>

              {!showFloodProneBlank && !showTrafficMap && !showHelpCenter && (
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

        {/* Zoom In / Zoom Out — below "Show your location"; hidden in Flood
            Prone, Traffic, and Help Center modes (the Help Center map has
            its own native Leaflet zoom control). */}
        {!showFloodProneBlank && !showTrafficMap && !showHelpCenter && (
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
          // z-[40] keeps it visible above the Flood Prone iframe (z-30).
          // Portrait sits a bit lower on the main map; Flood Prone keeps the
          // raised spot so it stays clear of the iframe's bottom overlays.
          <div className={`pointer-events-none absolute inset-x-0 bottom-20 ${showFloodProneBlank || showTrafficMap || showHelpCenter ? 'portrait:bottom-28' : 'portrait:bottom-20'} z-[40] flex justify-center px-4`}>
            <p className={`animate-in fade-in zoom-in-95 font-['JetBrains_Mono',monospace] text-xs font-medium italic tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] duration-300 ${locationBanner === 'success' ? 'text-green-400/90' : 'text-red-400/90'}`}>
              {locationMessage}
            </p>
          </div>
        ) : (
          <div className="absolute left-4 top-44 z-[40] rounded-md bg-white/95 px-3 py-2 text-[11px] text-slate-700 shadow-md">
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
