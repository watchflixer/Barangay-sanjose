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
  Maximize2, 
  RotateCcw,
  RefreshCw,
  Eye, 
  Compass,
  MapPin,
  Flame,
  Waves,
  Zap,
  Droplets,
  AlertTriangle,
  CheckCircle2
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
  const [isRecenterSpinning, setIsRecenterSpinning] = React.useState(false);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Define strict bounding box for Barangay San Jose
    const corner1 = L.latLng(SAN_JOSE_BOUNDS[0][0] - 0.015, SAN_JOSE_BOUNDS[0][1] - 0.015);
    const corner2 = L.latLng(SAN_JOSE_BOUNDS[1][0] + 0.015, SAN_JOSE_BOUNDS[1][1] + 0.015);
    const maxBounds = L.latLngBounds(corner1, corner2);

    const map = L.map(mapContainerRef.current, {
      center: SAN_JOSE_CENTER,
      zoom: 14,
      minZoom: 13,
      maxZoom: 18,
      maxBounds: mapSettings.lockCameraToBounds ? maxBounds : undefined,
      maxBoundsViscosity: 1.0, // Hard lock - rubberband bouncing back
      zoomControl: false, // We'll add custom positioned zoom control
      attributionControl: false,
    });

    // Custom Zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

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
    const tileConfig = TILE_SERVERS[mapSettings.tileLayer];
    mapInstanceRef.current.removeLayer(tileLayerRef.current);
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
        ? `<div class="relative w-full h-32 rounded-md overflow-hidden border border-slate-200 bg-slate-100 mt-1">
            <img src="${alert.photoUrl}" alt="${alert.title}" class="w-full h-full object-cover" />
            <div class="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
              📸 Verified Photo
            </div>
          </div>`
        : '';

      const popupHtml = `
        <div class="p-3.5 space-y-2.5 font-sans">
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

            <div class="flex items-start justify-between">
              <span class="text-slate-400 font-medium text-[11px] shrink-0">Sitio:</span>
              <span class="text-right text-slate-600 text-[11px]">${alert.sitio}</span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-slate-400 font-medium text-[11px]">Reported:</span>
              <span class="text-slate-600 font-mono text-[10px]">${alert.timeReported}</span>
            </div>
          </div>

          <!-- Description -->
          <div class="p-2 bg-slate-50 rounded text-[11px] text-slate-600 leading-relaxed border border-slate-200">
            ${alert.description}
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
        maxWidth: 320,
      });

      marker.on('popupopen', () => {
        onSelectAlert(alert);
        // Attach click listener to the button inside popup
        setTimeout(() => {
          const btn = document.getElementById(`btn-popup-toggle-${alert.id}`);
          if (btn) {
            btn.onclick = (e) => {
              e.stopPropagation();
              onToggleAlertStatus(alert.id);
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
    if (!mapInstanceRef.current) return;
    
    // Close any active open popups
    mapInstanceRef.current.closePopup();
    
    // Smooth fast recenter back to Barangay San Jose center
    mapInstanceRef.current.flyTo(SAN_JOSE_CENTER, 14, {
      duration: 0.75,
      easeLinearity: 0.25,
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950">
      {/* The Leaflet Map Canvas */}
      <div 
        id="leaflet-map-root"
        ref={mapContainerRef} 
        className={`w-full h-full ${isAddingPinMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      />

      {/* Adding Pin Active Overlay Banner */}
      {isAddingPinMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-white px-4 py-2 rounded-md shadow-lg border border-emerald-500/60 flex items-center gap-2 animate-bounce">
          <MapPin className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold">Click any street in Barangay San Jose to place hazard pin</span>
        </div>
      )}

      {/* Live Coordinate Display (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/90 backdrop-blur-md text-slate-200 border border-slate-800 shadow-md text-[10px] font-mono">
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

      {/* Floating GIS Map Controls (Top Left) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
        {/* Recenter / Fit Bounds Button */}
        <button
          id="btn-recenter-gis"
          onClick={handleRecenter}
          title="Recenter to Barangay San Jose"
          className="p-2 rounded-md bg-white hover:bg-slate-50 text-slate-800 shadow-xs border border-slate-200 transition-colors active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 transition-transform ${isRecenterSpinning ? 'animate-fast-spin text-slate-900' : 'text-slate-700'}`} />
        </button>

        {/* Layer Selector & Mask Intensity Toggle */}
        <div className="relative">
          <button
            id="btn-toggle-layers-menu"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            title="GIS Layers & Masking Settings"
            className="p-2 rounded-md bg-white hover:bg-slate-50 text-slate-800 shadow-xs border border-slate-200 transition-colors"
          >
            <Layers className="w-4 h-4 text-slate-700" />
          </button>

          {showLayerMenu && (
            <div className="absolute top-0 left-11 w-64 bg-white rounded-lg shadow-lg border border-slate-200 p-3.5 text-xs text-slate-800 space-y-3 z-30 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">GIS Map Settings</span>
                <button 
                  onClick={() => setShowLayerMenu(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Base Map Style */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Basemap Street Style:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['streets', 'light', 'dark', 'satellite'] as const).map((layer) => (
                    <button
                      key={layer}
                      onClick={() => onUpdateMapSettings({ tileLayer: layer })}
                      className={`px-2 py-1 rounded-md text-xs font-semibold capitalize border transition-colors ${
                        mapSettings.tileLayer === layer
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {layer}
                    </button>
                  ))}
                </div>
              </div>

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
                  <span className="text-slate-700 font-bold">Default 90%</span>
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
                  <span className="text-slate-700 font-medium">Sitio / Zone Labels</span>
                  <input
                    type="checkbox"
                    checked={mapSettings.showSitioLabels}
                    onChange={(e) => onUpdateMapSettings({ showSitioLabels: e.target.checked })}
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
            </div>
          )}
        </div>
      </div>

      {/* Floating Legend / Quick Map Info Pill (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-10 hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-white/95 backdrop-blur-md border border-slate-200 shadow-xs text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span className="text-slate-700 font-semibold text-[11px]">Fire</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span className="text-slate-700 font-semibold text-[11px]">Flood</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span className="text-slate-700 font-semibold text-[11px]">Power</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
          <span className="text-slate-700 font-semibold text-[11px]">Streetlight</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
          <span className="text-slate-700 font-semibold text-[11px]">Water</span>
        </div>
      </div>
    </div>
  );
};
