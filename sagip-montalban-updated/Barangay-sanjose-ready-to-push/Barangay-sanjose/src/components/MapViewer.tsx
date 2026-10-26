import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
/*
 * NOTE ON LEAFLET: this app runs Leaflet 2 (2.0.0-alpha.1), where the old
 * lowercase factory helpers were removed. Use the classes instead:
 *   new L.Map(el, opts)          (not L.map(...))
 *   new L.TileLayer(url, opts)   (not L.tileLayer(...))
 *   new L.Marker(latlng, opts) / new L.DivIcon(opts) / new L.LayerGroup()
 *   new L.Polygon(...) / new L.Polyline(...) / new L.Circle(...)
 *   new L.LatLng(lat, lng) / new L.LatLngBounds(a, b) / new L.Control.Zoom(opts)
 * The published @types/leaflet still describes 1.x, so v1-only calls would
 * type-check yet fail at runtime.
 */
import { clearRefreshView, readHelpCenterOpen, readRefreshView, rememberHelpCenterOpen } from '../lib/refreshView';
import { TILE_SERVERS } from '../data/tileServers';
import { mountTileLayer, type TileMount } from '../lib/tileLayer';
import { WeatherView } from './WeatherView';
import { HelpCenterView } from './HelpCenterView';
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
  /** Lets the parent app know the Weather view is open (for navbar gating). */
  onWeatherChange?: (isOpen: boolean) => void;
}

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
  onWeatherChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileMountRef = useRef<TileMount | null>(null);
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

  // Notify the parent app before paint so the sidebar never flashes over a layer.
  React.useLayoutEffect(() => {
    onFloodProneChange?.(showFloodProneBlank);
  }, [showFloodProneBlank, onFloodProneChange]);

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
      // ?help=1 opens the Help Center straight away — it shows its filter
      // picker first, exactly like the in-app Layers menu route.
      help: q.get('help') === '1',
      sfrom: q.get('sfrom') || '',
      sto: q.get('sto') || '',
      smode: q.get('smode') || '',
    };
  }, []);
  const [showTrafficMap, setShowTrafficMap] = React.useState(
    refreshView === null ? sharedRoute.open : refreshView === 'traffic',
  );
  const trafficMapFrameRef = useRef<HTMLIFrameElement | null>(null);
  // Help Center — its own view (HelpCenterView.tsx): an INDEPENDENT Leaflet
  // directory map with a filter picker up front (pick "7-Eleven", "botika",
  // …) and its OWN basemap/state, fully separate from the Traffic feature, so
  // changing Help Center never affects Traffic (and vice versa). Only the map
  // instance is shared here so the host's Recenter/Locate buttons can drive it.
  // Reloading while Help Center is open returns to Help Center — and because
  // a fresh mount always starts on the picker, the filter question is asked
  // again. Precedence: the brand Refresh snapshot first, then explicit share
  // links (?traffic=1 must not be overridden by a remembered session), then
  // the session flag / ?help=1.
  const [helpCenterWasOpen] = React.useState(readHelpCenterOpen);
  const [showHelpCenter, setShowHelpCenter] = React.useState(() => {
    if (refreshView !== null) return refreshView === 'helpcenter';
    if (sharedRoute.open) return false;
    return sharedRoute.help || helpCenterWasOpen;
  });
  const helpCenterMapInstanceRef = useRef<L.Map | null>(null);
  // The Help Center opens on its filter picker, which covers the whole map.
  // Its floating buttons (Recenter / Layers / Locate) are pointless — and
  // overlap the picker — until the map screen shows, so they are hidden then.
  const [helpFilterOpen, setHelpFilterOpen] = React.useState(false);
  const handleHelpStageChange = React.useCallback((stage: 'picker' | 'map') => {
    setHelpFilterOpen(stage === 'picker');
  }, []);
  React.useEffect(() => {
    if (!showHelpCenter) setHelpFilterOpen(false);
  }, [showHelpCenter]);
  // Weather — the Panahon weather & radar app (WeatherView.tsx), shown in its
  // own document. Mutually exclusive with the other map views. The GIS-style
  // floating controls send actions into the embedded weather map.
  const [showWeather, setShowWeather] = React.useState(refreshView === 'weather');
  const weatherMapFrameRef = useRef<HTMLIFrameElement | null>(null);
  const sendWeatherAction = (action: 'recenter' | 'zoom-in' | 'zoom-out' | 'location', coordinates?: { lat: number; lng: number }) => {
    weatherMapFrameRef.current?.contentWindow?.postMessage(
      { type: 'panahon-map-action', action, ...coordinates }, window.location.origin
    );
  };
  // Opening Help Center closes the Flood Prone, Traffic and Weather maps.
  React.useEffect(() => {
    if (showHelpCenter) {
      setShowFloodProneBlank(false);
      setShowTrafficMap(false);
      setShowWeather(false);
    }
  }, [showHelpCenter]);
  // Notify the parent app before paint so the sidebar never flashes over a layer.
  React.useLayoutEffect(() => {
    onHelpCenterChange?.(showHelpCenter);
    // Keep the session flag in step so a reload while Help Center is open
    // re-opens it on its filter picker (see readHelpCenterOpen above).
    rememberHelpCenterOpen(showHelpCenter);
  }, [showHelpCenter, onHelpCenterChange]);
  // Opening Weather closes the Flood Prone, Traffic and Help Center maps.
  React.useEffect(() => {
    if (showWeather) {
      setShowFloodProneBlank(false);
      setShowTrafficMap(false);
      setShowHelpCenter(false);
    }
  }, [showWeather]);
  // Notify the parent app before paint so the sidebar never flashes over a layer.
  React.useLayoutEffect(() => {
    onWeatherChange?.(showWeather);
  }, [showWeather, onWeatherChange]);
  React.useEffect(() => {
    if (showTrafficMap) {
      setShowFloodProneBlank(false);
      setShowHelpCenter(false);
      setShowWeather(false);
    }
  }, [showTrafficMap]);
  // Conversely, opening Flood Prone closes the Traffic, Help Center and Weather maps.
  React.useEffect(() => {
    if (showFloodProneBlank) {
      setShowTrafficMap(false);
      setShowHelpCenter(false);
      setShowWeather(false);
    }
  }, [showFloodProneBlank]);
  // Notify the parent app before paint so the sidebar never flashes over a layer.
  React.useLayoutEffect(() => {
    onTrafficChange?.(showTrafficMap);
  }, [showTrafficMap, onTrafficChange]);
  const [isRecenterSpinning, setIsRecenterSpinning] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const [locationMessage, setLocationMessage] = React.useState('');
  // Banner style for the location message: "success" renders the centered
  // green toast, "error" the matching centered red one; both auto-hide after
  // 3 seconds. Anything else uses the plain hint banner top-left.
  const [locationBanner, setLocationBanner] = React.useState<'none' | 'success' | 'error'>('none');
  const locationMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const floodMapFrameRef = useRef<HTMLIFrameElement | null>(null);

  React.useEffect(() => {
    floodMapFrameRef.current?.contentWindow?.postMessage({ type: 'hazardsync-locating', isLocating }, '*');
    trafficMapFrameRef.current?.contentWindow?.postMessage({ type: 'hazardsync-locating', isLocating }, '*');
  }, [isLocating]);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Define strict bounding box for Barangay San Jose
    const corner1 = new L.LatLng(SAN_JOSE_BOUNDS[0][0] - 0.015, SAN_JOSE_BOUNDS[0][1] - 0.015);
    const corner2 = new L.LatLng(SAN_JOSE_BOUNDS[1][0] + 0.015, SAN_JOSE_BOUNDS[1][1] + 0.015);
    const maxBounds = new L.LatLngBounds(corner1, corner2);

    const map = new L.Map(mapContainerRef.current, {
      center: SAN_JOSE_CENTER,
      zoom: 13,
      minZoom: 13,
      maxZoom: 18,
      maxBounds: mapSettings.lockCameraToBounds ? maxBounds : undefined,
      maxBoundsViscosity: 1.0, // Hard lock - rubberband bouncing back
      zoomControl: false, // Zoom buttons are custom buttons in the left control stack, below 'Show your location'
      attributionControl: false,
    });

    // Initial Tile Layer — mountTileLayer stamps OSM's required referrer
    // policy on every tile and swaps to the keyless Esri backup if the tiles
    // stay blocked ("403r. Access blocked").
    tileMountRef.current = mountTileLayer(map, TILE_SERVERS[mapSettings.tileLayer]);

    // Inverted Mask Layer (Blacks out everything except Barangay San Jose)
    const maskCoords = getInvertedMaskCoordinates(SAN_JOSE_POLYGON_COORDS);
    const mask = new L.Polygon(maskCoords as any, {
      fillColor: mapSettings.maskColor,
      fillOpacity: mapSettings.maskOpacity,
      stroke: false,
      interactive: false,
      className: 'gis-blackout-mask'
    }).addTo(map);
    maskLayerRef.current = mask;

    // Boundary Glow Stroke Layer
    const boundary = new L.Polygon(SAN_JOSE_POLYGON_COORDS, {
      color: mapSettings.boundaryColor,
      weight: 2.5,
      opacity: 0.9,
      fillOpacity: 0,
      dashArray: '4, 6',
      interactive: false,
    }).addTo(map);
    boundaryLayerRef.current = boundary;

    // Marker Layer Group
    const markersGroup = new L.LayerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    // Sitios Layer Group
    const sitiosGroup = new L.LayerGroup().addTo(map);
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
      tileMountRef.current?.dispose();
      tileMountRef.current = null;
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
    if (!mapInstanceRef.current || !tileMountRef.current) return;
    const map = mapInstanceRef.current;

    // Coming back from Flood Prone mode the container was hidden (display:none),
    // so Leaflet cached a zero size and renders a blank map. Recompute now that
    // the container is visible again.
    setTimeout(() => {
      map.invalidateSize();
    }, 50);

    tileMountRef.current.dispose();
    tileMountRef.current = mountTileLayer(map, TILE_SERVERS[mapSettings.tileLayer]);

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
    const corner1 = new L.LatLng(SAN_JOSE_BOUNDS[0][0] - 0.015, SAN_JOSE_BOUNDS[0][1] - 0.015);
    const corner2 = new L.LatLng(SAN_JOSE_BOUNDS[1][0] + 0.015, SAN_JOSE_BOUNDS[1][1] + 0.015);
    const maxBounds = new L.LatLngBounds(corner1, corner2);

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
      const sitioIcon = new L.DivIcon({
        className: 'sitio-label-container',
        html: `<div class="sitio-map-label">${sitio.name}</div>`,
        iconSize: [120, 20],
        iconAnchor: [60, 10],
      });

      const marker = new L.Marker(sitio.coordinates, {
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
    if (!navigator.geolocation) {
      setLocationMessage('Location is unavailable.');
      return;
    }
    runLocationRequest(true);
  };

  // Embedded map pages own their map buttons and ask the host only for the
  // existing location-consent flow or when switching to another app layer.
  React.useEffect(() => {
    const onEmbeddedMapAction = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const isTrafficFrame = event.source === trafficMapFrameRef.current?.contentWindow;
      const isFloodFrame = event.source === floodMapFrameRef.current?.contentWindow;
      const isWeatherFrame = event.source === weatherMapFrameRef.current?.contentWindow;
      if (!isTrafficFrame && !isFloodFrame && !isWeatherFrame) return;

      const message = event.data as { type?: string; layer?: string } | null;
      if (message?.type === 'hazardsync-location-request') {
        handleShowUserLocation();
        return;
      }
      if (message?.type !== 'hazardsync-layer-select') return;

      toggleLayerMenu(false);
      if (message.layer === 'dark') {
        setShowTrafficMap(true);
        setShowFloodProneBlank(false);
        setShowHelpCenter(false);
        setShowWeather(false);
      } else if (message.layer === 'light') {
        setShowTrafficMap(false);
        setShowFloodProneBlank(true);
        setShowHelpCenter(false);
        setShowWeather(false);
        onUpdateMapSettings({ tileLayer: 'light' });
      } else if (message.layer === 'weather') {
        setShowTrafficMap(false);
        setShowFloodProneBlank(false);
        setShowHelpCenter(false);
        setShowWeather(true);
      } else if (message.layer === 'satellite') {
        setShowTrafficMap(false);
        setShowFloodProneBlank(false);
        setShowHelpCenter(true);
        setShowWeather(false);
      } else if (message.layer === 'streets') {
        setShowTrafficMap(false);
        setShowFloodProneBlank(false);
        setShowHelpCenter(false);
        setShowWeather(false);
        onUpdateMapSettings({ tileLayer: 'streets' });
      }
    };
    window.addEventListener('message', onEmbeddedMapAction);
    return () => window.removeEventListener('message', onEmbeddedMapAction);
  }, []);

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
          const locationIcon = new L.DivIcon({
            className: 'user-location-marker',
            html: '<span class="user-location-dot"></span>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.setLatLng(coordinates);
            userLocationMarkerRef.current.setIcon(locationIcon);
          } else {
            userLocationMarkerRef.current = new L.Marker(coordinates, {
              icon: locationIcon,
              zIndexOffset: 1000,
              title: 'Your location',
            }).addTo(mapInstanceRef.current!);
          }

          // Forward the approved coordinates to whichever map is visible.
          if (showWeather) {
            sendWeatherAction('location', { lat: position.coords.latitude, lng: position.coords.longitude });
          } else if (showFloodProneBlank) {
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

  const handleZoomIn = () => {
    if (showWeather) { sendWeatherAction('zoom-in'); return; }
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    if (showWeather) { sendWeatherAction('zoom-out'); return; }
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

      const customIcon = new L.DivIcon({
        className: 'custom-hazard-divicon',
        html: customPinHtml,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -22],
      });

      const marker = new L.Marker(alert.coordinates, {
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
    // The weather map lives in its own iframe; recenter that map, not the GIS map underneath.
    if (showWeather) { sendWeatherAction('recenter'); return; }
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
      const corner1 = new L.LatLng(SAN_JOSE_BOUNDS[0][0] - 0.015, SAN_JOSE_BOUNDS[0][1] - 0.015);
      const corner2 = new L.LatLng(SAN_JOSE_BOUNDS[1][0] + 0.015, SAN_JOSE_BOUNDS[1][1] + 0.015);
      mapInstanceRef.current.setMaxBounds(new L.LatLngBounds(corner1, corner2));
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

      {/* Realtime Traffic map overlay — Mapbox GL (live traffic, routing)
          rendered inside a Leaflet-driven shell, the same Leaflet engine the
          Help Center uses. The Mapbox key travels as a query parameter so the
          iframe picks it up without any build-time injection into public/
          files. */}
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

      {/* Mount the weather document when selected; the state alone does not display it. */}
      {showWeather && <WeatherView frameRef={weatherMapFrameRef} />}

      {/* Help Center — the Traffic-style directory map with its own filter
          picker (HelpCenterView.tsx). Picks first ("7-Eleven? botika?…"),
          then mounts its own Leaflet map with the selected category pins.
          The map instance is shared via helpCenterMapInstanceRef so the
          host's Recenter/Locate buttons keep working. */}
      {showHelpCenter && (
        <HelpCenterView
          mapRef={helpCenterMapInstanceRef}
          lockCameraToBounds={mapSettings.lockCameraToBounds}
          onStageChange={handleHelpStageChange}
        />
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

      {/* Floating GIS controls stay mounted beneath the mobile drawer while it slides in. */}
      <div className={`absolute flex flex-col gap-1.5 ${showWeather ? 'left-4 top-[110px] sm:top-[82px] z-50' : showFloodProneBlank || showTrafficMap || showHelpCenter ? 'left-4 top-4 z-50' : 'left-4 top-4 z-40'} ${showFloodProneBlank || showTrafficMap || showWeather || helpFilterOpen ? 'hidden' : ''}`}>
        {/* These controls operate on the embedded Panahon map in Weather mode. */}
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
                      {/* Help Center (the 'satellite' slot) opens the filterable directory map. */}
                    {(['streets', 'dark', 'weather', 'light', 'satellite'] as const).map((layer) => (
                      <button
                        key={layer}
                        onClick={() => {
                          if (layer === 'weather') {
                            setShowTrafficMap(false);
                            setShowFloodProneBlank(false);
                            setShowHelpCenter(false);
                            setShowWeather(true);
                            toggleLayerMenu(false);
                            return;
                          }
                          if (layer === 'dark') {
                            // The former "Comming Soon" slot now opens the realtime Traffic map.
                            setShowTrafficMap(true);
                            setShowFloodProneBlank(false);
                            setShowHelpCenter(false);
                            setShowWeather(false);
                            toggleLayerMenu(false);
                            return;
                          }
                          if (layer === 'light') {
                            setShowTrafficMap(false);
                            setShowFloodProneBlank(true);
                            setShowHelpCenter(false);
                            setShowWeather(false);
                            onUpdateMapSettings({ tileLayer: layer });
                            toggleLayerMenu(false);
                            return;
                          }
                          if (layer === 'satellite') {
                            // "Help Center" — its own filterable Leaflet directory map (pick a filter first).
                            setShowTrafficMap(false);
                            setShowFloodProneBlank(false);
                            setShowHelpCenter(true);
                            setShowWeather(false);
                            toggleLayerMenu(false);
                            return;
                          }
                          setShowTrafficMap(false);
                          setShowFloodProneBlank(false);
                          setShowHelpCenter(false);
                          setShowWeather(false);
                          onUpdateMapSettings({ tileLayer: layer });
                        }}
                      className={`relative px-2 py-1 rounded-md text-center text-xs font-semibold capitalize border transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                        (layer === 'weather' ? showWeather
                          : layer === 'dark' ? showTrafficMap
                          : layer === 'light' ? showFloodProneBlank
                          : layer === 'satellite' ? showHelpCenter
                          : mapSettings.tileLayer === layer && !showTrafficMap && !showHelpCenter && !showWeather)
                          ? 'bg-black text-white border-black'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {layer === 'weather' ? 'Weather' : layer === 'light' ? 'Flood Prone' : layer === 'dark' ? 'Traffic' : layer === 'satellite' ? 'Help Center' : layer}
                    </button>
                  ))}

                  {/* Coming Soon — reserved placeholder slot next to Help Center. */}
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

              {!showFloodProneBlank && !showTrafficMap && !showHelpCenter && !showWeather && (
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

        {/* Use the existing permission card; forward approved coordinates to Panahon. */}
        <button
          id="btn-show-user-location"
            onClick={handleShowUserLocation}
            title="Show your location"
            aria-label="Show your location"
            className="rounded-md border border-slate-200 bg-white p-2 text-slate-800 shadow-xs transition-colors hover:bg-slate-50 active:scale-95"
          >
            <LocateFixed className={`h-4 w-4 ${isLocating ? 'animate-pulse text-blue-600' : 'text-slate-700'}`} />
          </button>

        {/* Weather's zoom pair shares one white card, as in the GIS controls. */}
        {!showFloodProneBlank && !showTrafficMap && !showHelpCenter && (
          <div className={showWeather ? 'flex flex-col overflow-hidden rounded-none border border-slate-300 bg-white shadow-xs' : 'contents'}>
            <button
              id="btn-zoom-in"
              onClick={handleZoomIn}
              title="Zoom in"
              aria-label="Zoom in"
              className={`p-2 text-slate-800 transition-colors hover:bg-slate-50 ${showWeather ? 'rounded-none border-b border-slate-300' : 'rounded-md border border-slate-200 bg-white shadow-xs active:scale-95'}`}
            >
              <Plus className={`h-4 w-4 ${showWeather ? 'text-black' : 'text-slate-700'}`} strokeWidth={showWeather ? 3 : 2} />
            </button>
            <button
              id="btn-zoom-out"
              onClick={handleZoomOut}
              title="Zoom out"
              aria-label="Zoom out"
              className={`p-2 text-slate-800 transition-colors hover:bg-slate-50 ${showWeather ? 'rounded-none' : 'rounded-md border border-slate-200 bg-white shadow-xs active:scale-95'}`}
            >
              <Minus className={`h-4 w-4 ${showWeather ? 'text-black' : 'text-slate-700'}`} strokeWidth={showWeather ? 3 : 2} />
            </button>
          </div>
        )}
      </div>

      {locationMessage && !isMobileMenuOpen && (
        locationBanner !== 'none' ? (
          // Minimal centered toast — green when found, red when denied —
          // italic monospace, small and subtle, auto-hides after 3 seconds.
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



    </div>
  );
};
