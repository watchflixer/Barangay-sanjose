import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet-weather';
import { Layers, LocateFixed, Minus, Plus, RefreshCw } from 'lucide-react';
import { CityWeather, WeatherMode, RainViewerFrame } from '../types/weather';
import { getOwmTileUrl } from '../services/openWeatherService';
import { getRainViewerTileUrl } from '../services/rainViewerService';
import { getWeatherConditionInfo } from '../services/openMeteoService';
import { WindCloudEngine } from '../services/windCloudEngine';

interface WeatherMapProps {
  mode: WeatherMode;
  cities: CityWeather[];
  onSelectCity: (city: CityWeather) => void;
  rainViewerHost: string;
  rainViewerFrames: RainViewerFrame[];
  currentFrameIndex: number;
  owmKey: string;
  timelineForecastHour: number;
  userLocationCoords?: [number, number] | null;
  userLocationCity?: CityWeather | null;
  isLocating?: boolean;
  onRequestLocation: () => void;
}

// Geographic boundary of the Philippines with generous margin around it:
// North: 22.8°N (above Batanes & Itbayat, extra ocean padding)
// South: 3.2°N (below Tawi-Tawi & Celebes Sea, extra ocean padding)
// West: 113.8°E (west of Palawan & Kalayaan, extra West PH Sea padding)
// East: 131.8°E (east of Philippine Sea, extra open ocean padding)
const PH_SOUTH_WEST = L.latLng(3.2, 113.8);
const PH_NORTH_EAST = L.latLng(22.8, 131.8);
const PH_BOUNDS = L.latLngBounds(PH_SOUTH_WEST, PH_NORTH_EAST);
// A small southward camera offset places the locked Philippines view slightly
// higher on screen. Shift the lock bounds too, so Leaflet will not snap it back.
const VIEW_LAT_OFFSET = -2.0;
const PH_CENTER = L.latLng(PH_BOUNDS.getCenter().lat + VIEW_LAT_OFFSET, PH_BOUNDS.getCenter().lng);

export const WeatherMap: React.FC<WeatherMapProps> = ({
  mode,
  cities,
  onSelectCity,
  rainViewerHost,
  rainViewerFrames,
  currentFrameIndex,
  owmKey,
  timelineForecastHour,
  userLocationCoords,
  userLocationCity,
  isLocating = false,
  onRequestLocation
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const dynamicLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const windEngineRef = useRef<WindCloudEngine | null>(null);
  const layerMenuRef = useRef<HTMLDivElement>(null);
  const layersButtonRef = useRef<HTMLButtonElement>(null);

  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [isRecenterSpinning, setIsRecenterSpinning] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(5.0);
  const [minZoomLevel, setMinZoomLevel] = useState<number>(5.0);

  const handleRecenter = () => {
    setIsRecenterSpinning(true);
    window.setTimeout(() => setIsRecenterSpinning(false), 550);
    mapInstanceRef.current?.setView(PH_CENTER, minZoomLevel, { animate: true });
  };
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn(0.6);
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut(0.6);
  const selectAppLayer = (layer: string) => {
    setShowLayerMenu(false);
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'hazardsync-layer-select', layer }, window.location.origin);
      return;
    }
    if (layer === 'weather') return;
    const target = layer === 'dark' ? 'rizal_traffic_map.html'
      : layer === 'light' ? 'rizal_flood_100yr_map.html'
      : layer === 'satellite' ? 'index.html?help=1'
      : 'index.html';
    window.location.assign(`${import.meta.env.BASE_URL}${target}`);
  };

  useEffect(() => {
    if (!showLayerMenu) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) ||
          (layerMenuRef.current?.contains(target) ?? false) ||
          (layersButtonRef.current?.contains(target) ?? false)) return;
      setShowLayerMenu(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowLayerMenu(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showLayerMenu]);

  // Initialize Map with locked overview and strict boundary locking
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: PH_CENTER,
      zoomSnap: 0.1,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 100,
      wheelDebounceTime: 40,
      zoomAnimation: true,
      zoomAnimationThreshold: 8,
      maxZoom: 16, // Zooming in is fully supported!
      zoomControl: false, // We render custom ergonomic glass controls
      attributionControl: false
    });

    // Compute the exact zoom where the entire Philippines with extra margin fits inside container
    const initialFitZoom = Math.floor(map.getBoundsZoom(PH_BOUNDS, false, L.point(16, 16)) * 10) / 10;
    const baseZoom = Math.max(4.6, initialFitZoom);

    // FIXED / LOCKED: Set minZoom to the exact overview so the user CANNOT zoom out beyond this view!
    map.setMinZoom(baseZoom);
    map.setView(PH_CENTER, baseZoom);
    setCurrentZoom(baseZoom);
    setMinZoomLevel(baseZoom);

    // Strictly lock panning within the Philippines boundary with padding
    const lockBounds = L.latLngBounds(
      [PH_SOUTH_WEST.lat + VIEW_LAT_OFFSET, PH_SOUTH_WEST.lng],
      [PH_NORTH_EAST.lat + VIEW_LAT_OFFSET, PH_NORTH_EAST.lng]
    ).pad(0.08);
    map.setMaxBounds(lockBounds);
    map.options.maxBoundsViscosity = 1.0;

    // Handle container resize dynamically
    const handleResize = () => {
      if (!map) return;
      const newCalc = Math.floor(map.getBoundsZoom(PH_BOUNDS, false, L.point(16, 16)) * 10) / 10;
      const newBaseZoom = Math.max(4.6, newCalc);
      map.setMinZoom(newBaseZoom);
      setMinZoomLevel(newBaseZoom);
      if (map.getZoom() < newBaseZoom) {
        map.setView(PH_CENTER, newBaseZoom);
        setCurrentZoom(newBaseZoom);
      }
    };
    map.on('resize', handleResize);

    // Esri World Dark Gray Basemap (supports native zoom up to 16, auto-upscales gracefully)
    const baseMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      minZoom: 2,
      maxZoom: 16,
      maxNativeZoom: 16,
      attribution: '&copy; Esri &copy; OpenStreetMap contributors'
    }).addTo(map);

    // Esri Reference Labels Layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      minZoom: 2,
      maxZoom: 16,
      maxNativeZoom: 16,
      zIndex: 12
    }).addTo(map);

    tileLayerRef.current = baseMap;
    dynamicLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    // Initialize HTML5 Canvas Wind Streamline & Cloud Engine
    const windEngine = new WindCloudEngine(map);
    windEngineRef.current = windEngine;
    if (mode === 'storm') {
      windEngine.updateData(cities, timelineForecastHour);
      windEngine.start();
    }

    // Track zoom events for progressive Level of Detail (LOD)
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    mapInstanceRef.current = map;
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.off('resize', handleResize);
      if (windEngineRef.current) {
        windEngineRef.current.destroy();
        windEngineRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Continue accepting host-originated zoom/recenter actions (such as navbar
  // reset); the regular visible map controls are rendered and owned below.
  useEffect(() => {
    const onMapAction = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== window.location.origin ||
          event.data?.type !== 'panahon-map-action') return;
      const map = mapInstanceRef.current;
      if (!map) return;
      if (event.data.action === 'zoom-in') map.zoomIn(0.6);
      if (event.data.action === 'zoom-out') map.zoomOut(0.6);
      if (event.data.action === 'recenter') map.setView(PH_CENTER, minZoomLevel, { animate: true });
    };
    window.addEventListener('message', onMapAction);
    return () => window.removeEventListener('message', onMapAction);
  }, [minZoomLevel]);

  // Update container CSS class for temperature ambient styling
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mode === 'temperature') {
      mapContainerRef.current.classList.add('temperature-active');
    } else {
      mapContainerRef.current.classList.remove('temperature-active');
    }
  }, [mode]);

  // Dedicated effect to ensure WindCloudEngine starts and stops reliably
  useEffect(() => {
    if (!windEngineRef.current) return;
    if (mode === 'storm') {
      windEngineRef.current.updateData(cities, timelineForecastHour);
      windEngineRef.current.start();
    } else {
      windEngineRef.current.stop();
    }
  }, [mode, cities, timelineForecastHour]);

  // Update Dynamic Layers (Thermal Heat Map, RainViewer Doppler, Storm Clouds)
  // PAR is strictly omitted per user instruction!
  useEffect(() => {
    const map = mapInstanceRef.current;
    const dynamicGroup = dynamicLayerRef.current;
    if (!map || !dynamicGroup) return;

    dynamicGroup.clearLayers();

    if (mode === 'temperature') {
      // 1. If OpenWeatherMap API key exists, load official temperature layer
      const owmTempUrl = getOwmTileUrl('temp_new', owmKey);
      if (owmTempUrl) {
        const tempLayer = L.tileLayer(owmTempUrl, {
          opacity: 0.70,
          zIndex: 8
        });
        dynamicGroup.addLayer(tempLayer);
      }

      // 2. Wide Southeast Asian & Philippine Tropical Warm Thermal Field (golden amber glow covering map)
      const regionalThermalBounds: L.LatLngBoundsExpression = [
        [-10.0, 96.0],
        [35.0, 150.0]
      ];

      const regionalSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      regionalSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      regionalSvg.setAttribute('viewBox', '0 0 1000 1000');
      regionalSvg.setAttribute('preserveAspectRatio', 'none');
      regionalSvg.innerHTML = `
        <defs>
          <radialGradient id="regionalPhilippineCore" cx="48%" cy="48%" r="48%">
            <stop offset="0%" stop-color="#fde047" stop-opacity="0.75"/>
            <stop offset="25%" stop-color="#facc15" stop-opacity="0.65"/>
            <stop offset="55%" stop-color="#f59e0b" stop-opacity="0.50"/>
            <stop offset="80%" stop-color="#ea580c" stop-opacity="0.38"/>
            <stop offset="100%" stop-color="#c2410c" stop-opacity="0.20"/>
          </radialGradient>
          <radialGradient id="pacificWarmPool" cx="75%" cy="50%" r="42%">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.55"/>
            <stop offset="60%" stop-color="#ea580c" stop-opacity="0.40"/>
            <stop offset="100%" stop-color="#c2410c" stop-opacity="0.20"/>
          </radialGradient>
          <filter id="regionalThermalBlur">
            <feGaussianBlur stdDeviation="35"/>
          </filter>
        </defs>
        <rect width="1000" height="1000" fill="#ea580c" fill-opacity="0.25"/>
        <ellipse cx="750" cy="500" rx="350" ry="300" fill="url(#pacificWarmPool)" filter="url(#regionalThermalBlur)"/>
        <ellipse cx="480" cy="480" rx="380" ry="420" fill="url(#regionalPhilippineCore)" filter="url(#regionalThermalBlur)"/>
      `;

      const regionalOverlay = L.svgOverlay(regionalSvg, regionalThermalBounds, {
        opacity: 0.70,
        interactive: false,
        zIndex: 6
      });
      dynamicGroup.addLayer(regionalOverlay);

      // 3. Local City Thermal Pockets (Cooler Cordillera mountain anomaly, e.g. Baguio)
      cities.forEach((city) => {
        let microColor = '#fde047';
        let radius = 60000;
        let opacity = 0.25;

        if (city.temperature <= 19) {
          // Baguio & high Cordillera cooler pocket
          microColor = '#38bdf8';
          radius = 45000;
          opacity = 0.50;
        } else if (city.temperature >= 30) {
          microColor = '#f97316';
          radius = 75000;
          opacity = 0.35;
        }

        const microCircle = L.circle([city.lat, city.lng], {
          radius: radius,
          color: microColor,
          weight: 0,
          fillColor: microColor,
          fillOpacity: opacity,
          interactive: false
        });
        dynamicGroup.addLayer(microCircle);
      });
    } else if (mode === 'rain') {
      // Live Doppler Radar from RainViewer
      if (rainViewerHost && rainViewerFrames.length > 0) {
        const frame = rainViewerFrames[currentFrameIndex] || rainViewerFrames[rainViewerFrames.length - 1];
        if (frame) {
          const radarUrl = getRainViewerTileUrl(rainViewerHost, frame, 2);
          const radarTileLayer = L.tileLayer(radarUrl, {
            opacity: 0.85,
            zIndex: 10,
            tileSize: 256,
            minZoom: 2,
            maxZoom: 16,
            maxNativeZoom: 11
          });
          dynamicGroup.addLayer(radarTileLayer);
        }
      }
    } else if (mode === 'storm') {
      // Start HTML5 Canvas Real-Time Wind & Cloud Streamline Animation Engine
      if (windEngineRef.current) {
        windEngineRef.current.updateData(cities, timelineForecastHour);
        windEngineRef.current.start();
      }

      // Optional OWM layers if API key present
      const owmWindUrl = getOwmTileUrl('wind_new', owmKey);
      const owmCloudUrl = getOwmTileUrl('clouds_new', owmKey);

      if (owmWindUrl) {
        const windLayer = L.tileLayer(owmWindUrl, { opacity: 0.65, zIndex: 8 });
        dynamicGroup.addLayer(windLayer);
      }
      if (owmCloudUrl) {
        const cloudLayer = L.tileLayer(owmCloudUrl, { opacity: 0.55, zIndex: 7 });
        dynamicGroup.addLayer(cloudLayer);
      }

      // Atmospheric Wind Heatmap Layer matching video palette (Lime Green NW / Purple South)
      const stormOverlayBounds: L.LatLngBoundsExpression = [
        [-10.0, 95.0],
        [32.0, 150.0]
      ];
      const stormSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      stormSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      stormSvg.setAttribute('viewBox', '0 0 1000 1000');
      stormSvg.setAttribute('preserveAspectRatio', 'none');
      stormSvg.innerHTML = `
        <defs>
          <radialGradient id="nwHighWindLime" cx="25%" cy="30%" r="45%">
            <stop offset="0%" stop-color="#84cc16" stop-opacity="0.65"/>
            <stop offset="40%" stop-color="#06b6d4" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="southLowWindPurple" cx="65%" cy="75%" r="55%">
            <stop offset="0%" stop-color="#581c87" stop-opacity="0.65"/>
            <stop offset="50%" stop-color="#3b0764" stop-opacity="0.50"/>
            <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="baseAtmosphere" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0891b2" stop-opacity="0.35"/>
            <stop offset="50%" stop-color="#4f46e5" stop-opacity="0.30"/>
            <stop offset="100%" stop-color="#581c87" stop-opacity="0.45"/>
          </linearGradient>
          <filter id="stormBlur">
            <feGaussianBlur stdDeviation="35"/>
          </filter>
        </defs>
        <rect width="1000" height="1000" fill="url(#baseAtmosphere)"/>
        <ellipse cx="250" cy="300" rx="350" ry="300" fill="url(#nwHighWindLime)" filter="url(#stormBlur)"/>
        <ellipse cx="650" cy="750" rx="400" ry="350" fill="url(#southLowWindPurple)" filter="url(#stormBlur)"/>
      `;
      const stormOverlay = L.svgOverlay(stormSvg, stormOverlayBounds, {
        opacity: 0.65,
        interactive: false,
        zIndex: 6
      });
      dynamicGroup.addLayer(stormOverlay);

      // Maritime wind vectors around Philippine waters
      const windHubs: [number, number, number, number, string][] = [
        [15.5, 126.5, 38, 70, 'Philippine Sea'],
        [13.0, 128.5, 48, 110, 'East Samar Sea'],
        [11.5, 126.8, 34, 80, 'Leyte Gulf'],
        [8.0, 127.5, 26, 90, 'East Mindanao'],
        [17.0, 118.0, 24, 45, 'West Philippine Sea'],
        [10.0, 118.0, 20, 55, 'Palawan Passage'],
        [8.0, 121.5, 18, 65, 'Sulu Sea'],
        [19.0, 122.0, 32, 60, 'Luzon Strait']
      ];

      windHubs.forEach(([lat, lng, speed, deg, label]) => {
        const windIcon = L.divIcon({
          className: 'storm-wind-vector',
          html: `
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 border border-amber-400/50 text-amber-300 text-[10px] font-mono shadow-xl backdrop-blur-md pointer-events-none whitespace-nowrap">
              <span class="text-teal-300 text-xs font-bold" style="display:inline-block; transform: rotate(${deg}deg);">↑</span>
              <span class="font-bold">${speed} km/h</span>
              <span class="text-slate-400 text-[9px] font-sans">· ${label}</span>
            </div>
          `,
          iconSize: [140, 24],
          iconAnchor: [70, 12]
        });
        const marker = L.marker([lat, lng], { icon: windIcon, interactive: false });
        dynamicGroup.addLayer(marker);
      });
    } else if (mode === 'weather') {
      if (windEngineRef.current) {
        windEngineRef.current.stop();
      }
      // Cloud simulation circles based on real Open-Meteo cloud cover
      cities.forEach((city) => {
        if (city.cloudCover > 40) {
          const cloudCircle = L.circle([city.lat, city.lng], {
            radius: 35000 + city.cloudCover * 250,
            color: '#94a3b8',
            weight: 0,
            fillColor: '#cbd5e1',
            fillOpacity: (city.cloudCover / 100) * 0.18,
            interactive: false
          });
          dynamicGroup.addLayer(cloudCircle);
        }
      });
    } else {
      if (windEngineRef.current) {
        windEngineRef.current.stop();
      }
    }
  }, [mode, rainViewerHost, rainViewerFrames, currentFrameIndex, owmKey, cities, timelineForecastHour]);

  // Discrete Level-of-Detail tier to avoid re-rendering DOM markers during smooth zoom transitions
  const currentTier = currentZoom <= minZoomLevel + 0.55 ? 1 : currentZoom <= minZoomLevel + 1.25 ? 2 : 3;

  // Update Markers with Progressive Level-of-Detail (LOD) based on Zoom Level
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // Adaptive Level-of-Detail relative to the locked overview zoom:
    // Tier 1: The 16 major regional anchors from user's screenshot
    // Tier 2 (+0.55x): Adds 30+ key provincial centers
    // Tier 3 (+1.25x): Adds all 50+ towns, islands & municipalities
    const isBaseZoom = currentTier === 1;
    const isMediumZoom = currentTier === 2;

    const visibleCities = cities.filter((city) => {
      const cityTier = city.minZoom ?? 6;
      if (cityTier <= 6) {
        // Always show the 16 primary national & regional anchors on the locked overview
        return true;
      } else if (cityTier === 7) {
        // Show provincial centers when zoomed in by at least 0.55x
        return !isBaseZoom;
      } else {
        // Show all towns, municipalities and islands when zoomed in further
        return !isBaseZoom && !isMediumZoom;
      }
    });

    visibleCities.forEach((city) => {
      let temp = city.temperature;
      let weatherCode = city.weatherCode;
      let icon = city.conditionIcon;

      if (timelineForecastHour > 0 && city.hourly && city.hourly.temperature.length > timelineForecastHour) {
        temp = city.hourly.temperature[timelineForecastHour];
        weatherCode = city.hourly.weatherCode[timelineForecastHour] ?? weatherCode;
        icon = getWeatherConditionInfo(weatherCode).icon;
      }

      let markerHtml = '';

      if (mode === 'temperature') {
        // EXACT STYLE FROM SCREENSHOT:
        // Top: City name in bold white with dark drop-shadow
        // Bottom: Yellow/amber oval pill with temperature (e.g. "27°")
        let pillBg = 'bg-[#facc15] text-slate-950'; // Vibrant yellow/amber matching screenshot
        if (temp <= 19) {
          pillBg = 'bg-[#7dd3fc] text-slate-950'; // Cooler sky blue for Baguio / mountains
        } else if (temp >= 31) {
          pillBg = 'bg-[#fb923c] text-slate-950'; // Warm orange for hot days
        }

        markerHtml = `
          <div class="city-marker-pin flex flex-col items-center justify-center cursor-pointer select-none group">
            <span class="text-white font-extrabold text-[12px] sm:text-[13px] tracking-tight leading-none drop-shadow-[0_1.5px_2.5px_rgba(0,0,0,0.95)] mb-1 group-hover:scale-105 transition-transform">
              ${city.name}
            </span>
            <div class="${pillBg} px-2.5 py-0.5 rounded-full font-black text-[12px] sm:text-[13px] shadow-lg leading-none border border-black/20 group-hover:scale-110 transition-transform">
              ${temp}°
            </div>
          </div>
        `;
      } else if (mode === 'weather') {
        // Matches weather mode: icon + temp + city name
        markerHtml = `
          <div class="city-marker-pin flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white border border-white/10 shadow-lg text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-all">
            <span class="text-sm select-none">${icon}</span>
            <span class="font-bold text-white">${temp}°</span>
            <span class="text-slate-200 font-medium">${city.name}</span>
          </div>
        `;
      } else if (mode === 'storm') {
        // Storm style: City name on top in bold white, purple pill with wind speed + direction
        const speedValue = Math.round(city.windSpeed / 3.6) || 3;
        markerHtml = `
          <div class="city-marker-pin flex flex-col items-center justify-center cursor-pointer select-none group">
            <span class="text-white font-extrabold text-[12px] sm:text-[13px] tracking-tight leading-none drop-shadow-[0_1.5px_2.5px_rgba(0,0,0,0.95)] mb-1 group-hover:scale-105 transition-transform">
              ${city.name}
            </span>
            <div class="bg-[#7c3aed] text-white px-2 py-0.5 rounded-full font-black text-[11px] sm:text-[12px] shadow-lg leading-none border border-purple-300/40 flex items-center gap-1 group-hover:scale-110 transition-transform">
              <span>${speedValue}</span>
              <span style="display:inline-block; transform: rotate(${city.windDirection}deg);" class="text-[9px] text-purple-200">▲</span>
            </div>
          </div>
        `;
      } else if (mode === 'rain') {
        const rainLabel = city.precipitation > 0 ? `${city.precipitation}mm` : `${city.precipitationProbability}%`;
        const hasRain = city.precipitation > 0 || city.precipitationProbability >= 50;

        markerHtml = `
          <div class="city-marker-pin flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
            hasRain ? 'bg-indigo-900/90 border-indigo-400/40 text-indigo-100' : 'bg-slate-900/90 border-white/10 text-white'
          } hover:bg-slate-800 border shadow-lg text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-all">
            <span class="text-sky-400 text-sm">🌧️</span>
            <span class="font-bold font-mono text-sky-200">${rainLabel}</span>
            <span class="text-slate-200 font-medium">${city.name}</span>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: 'custom-city-pin-container',
        html: markerHtml,
        iconSize: (mode === 'temperature' || mode === 'storm') ? [90, 42] : [120, 28],
        iconAnchor: (mode === 'temperature' || mode === 'storm') ? [45, 21] : [60, 14]
      });

      const marker = L.marker([city.lat, city.lng], {
        icon: customIcon,
        zIndexOffset: city.id === 'manila' ? 1000 : (city.minZoom === 5 ? 500 : 100)
      });

      marker.on('click', () => {
        onSelectCity(city);
      });

      markersGroup.addLayer(marker);
    });

    // Render User Location Marker if available
    if (userLocationCoords && userLocationCity) {
      const temp = userLocationCity.temperature;
      let userHtml = '';

      if (mode === 'temperature') {
        userHtml = `
          <div class="city-marker-pin flex flex-col items-center justify-center cursor-pointer select-none group">
            <div class="flex items-center gap-1 text-sky-300 font-extrabold text-[12px] sm:text-[13px] tracking-tight leading-none drop-shadow-[0_1.5px_2.5px_rgba(0,0,0,0.95)] mb-1">
              <span class="w-2 h-2 rounded-full bg-sky-400 animate-ping inline-block"></span>
              <span>Your Location</span>
            </div>
            <div class="bg-[#facc15] text-slate-950 px-2.5 py-0.5 rounded-full font-black text-[12px] sm:text-[13px] shadow-xl leading-none border-2 border-sky-400">
              ${temp}°
            </div>
          </div>
        `;
      } else if (mode === 'storm') {
        const speedValue = Math.round(userLocationCity.windSpeed / 3.6) || 3;
        userHtml = `
          <div class="city-marker-pin flex flex-col items-center justify-center cursor-pointer select-none group">
            <div class="flex items-center gap-1 text-sky-300 font-extrabold text-[12px] sm:text-[13px] tracking-tight leading-none drop-shadow-[0_1.5px_2.5px_rgba(0,0,0,0.95)] mb-1">
              <span class="w-2 h-2 rounded-full bg-sky-400 animate-ping inline-block"></span>
              <span>Your Location</span>
            </div>
            <div class="bg-[#7c3aed] text-white px-2 py-0.5 rounded-full font-black text-[11px] sm:text-[12px] shadow-xl leading-none border-2 border-sky-400 flex items-center gap-1">
              <span>${speedValue}</span>
              <span style="display:inline-block; transform: rotate(${userLocationCity.windDirection}deg);" class="text-[9px] text-purple-200">▲</span>
            </div>
          </div>
        `;
      } else {
        userHtml = `
          <div class="city-marker-pin flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white border-2 border-sky-300 shadow-xl text-[12px] font-bold whitespace-nowrap cursor-pointer transition-all">
            <span class="w-2 h-2 rounded-full bg-sky-300 animate-ping inline-block"></span>
            <span>${userLocationCity.conditionIcon}</span>
            <span class="font-extrabold">${temp}°</span>
            <span>Your Location</span>
          </div>
        `;
      }

      const userIcon = L.divIcon({
        className: 'user-location-marker-container',
        html: userHtml,
        iconSize: mode === 'temperature' ? [120, 44] : [140, 32],
        iconAnchor: mode === 'temperature' ? [60, 22] : [70, 16]
      });

      const userMarker = L.marker(userLocationCoords, {
        icon: userIcon,
        zIndexOffset: 3000
      });

      userMarker.on('click', () => {
        onSelectCity(userLocationCity);
      });

      markersGroup.addLayer(userMarker);
    }
  }, [cities, mode, onSelectCity, timelineForecastHour, currentTier, userLocationCoords, userLocationCity]);

  // Smoothly fly to user location when requested
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocationCoords) return;
    map.flyTo(userLocationCoords, 10, { duration: 1.5 });
  }, [userLocationCoords]);

  return (
    <div className="relative w-full h-full bg-[#0c0f14] overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* The weather page owns these map controls, just like the other map layers. */}
      <div className="absolute left-4 top-[110px] z-[1050] flex flex-col gap-1.5 sm:top-[82px]">
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter"
          aria-label="Recenter"
          className="cursor-pointer rounded-md border border-slate-200 bg-white p-2 text-slate-800 shadow-xs transition-colors hover:bg-slate-50 active:scale-95"
        >
          <RefreshCw className={`h-4 w-4 transition-transform ${isRecenterSpinning ? 'animate-fast-spin text-slate-900' : 'text-slate-700'}`} />
        </button>

        <div className="relative">
          <button
            ref={layersButtonRef}
            type="button"
            onClick={() => setShowLayerMenu((open) => !open)}
            title="Layers"
            aria-label="Layers"
            aria-expanded={showLayerMenu}
            className="cursor-pointer rounded-md border border-slate-200 bg-white p-2 text-slate-800 shadow-xs transition-colors hover:bg-slate-50 active:scale-95"
          >
            <Layers className="h-4 w-4 text-slate-700" />
          </button>

          {showLayerMenu && (
            <>
              <div
                className="fixed inset-0 z-30 md:hidden"
                onClick={() => setShowLayerMenu(false)}
              />
              <div
                ref={layerMenuRef}
                className="absolute left-11 top-0 z-40 w-64 space-y-2.5 rounded-lg border border-slate-200 bg-white p-2.5 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] leading-[1.5] text-slate-800 shadow-xl animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-[11px] leading-[1.5] font-bold uppercase tracking-wider text-slate-900">MAP SETTINGS</span>
                  <button
                    type="button"
                    onClick={() => setShowLayerMenu(false)}
                    aria-label="Close layers"
                    className="cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="-mt-1">
                  <label className="mb-1.5 block text-[10px] leading-[1.5] font-bold uppercase tracking-wider text-slate-500">
                    BASEMAP STYLE:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['streets', 'dark', 'weather', 'light', 'satellite'] as const).map((layer) => (
                      <button
                        key={layer}
                        type="button"
                                        onClick={() => selectAppLayer(layer)}
                        className={`relative cursor-pointer rounded-md border px-2 py-1 text-center text-xs font-semibold capitalize transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                          layer === 'weather'
                            ? 'border-black bg-black text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {layer === 'weather' ? 'Weather' : layer === 'light' ? 'Flood Prone' : layer === 'dark' ? 'Traffic' : layer === 'satellite' ? 'Help Center' : 'Streets'}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled
                      title="Coming soon"
                      aria-label="Coming soon"
                      className="cursor-not-allowed select-none rounded-md border border-dashed border-slate-300 bg-slate-100 px-2 py-1 text-center text-xs font-semibold text-slate-400"
                    >
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onRequestLocation}
          title="Show your location"
          aria-label="Show your location"
          className="rounded-md border border-slate-200 bg-white p-2 text-slate-800 shadow-xs transition-colors hover:bg-slate-50 active:scale-95"
        >
          <LocateFixed className={`h-4 w-4 ${isLocating ? 'animate-pulse text-blue-600' : 'text-slate-700'}`} />
        </button>

        <div className="flex flex-col overflow-hidden rounded-none border border-slate-300 bg-white shadow-xs">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom in"
            aria-label="Zoom in"
            className="border-b border-slate-300 p-2 text-slate-800 transition-colors hover:bg-slate-50"
          >
            <Plus className="h-4 w-4 text-black" strokeWidth={3} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom out"
            aria-label="Zoom out"
            className="rounded-none p-2 text-slate-800 transition-colors hover:bg-slate-50"
          >
            <Minus className="h-4 w-4 text-black" strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};
