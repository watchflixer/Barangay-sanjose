import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Language,
  LocationCoordinates,
  MapBaseStyle,
  RainViewerData,
  RainViewerFrame,
  TemperatureUnit,
  TropicalStorm,
  WeatherLayerType,
} from '../types/weather';
import { rainViewer } from '../services/rainviewer';
import {
  BASEMAP_ERROR_THRESHOLD,
  BasemapSource,
  getBasemapChain,
} from '../services/basemaps';
import { WindCanvas } from './WindCanvas';
import { TemperatureCanvas } from './TemperatureCanvas';
import { PAR_COORDINATES, POPULAR_LOCATIONS } from '../services/storms';
import { PAGASA_RADAR_STATIONS } from '../services/pagasa';

interface WeatherMapProps {
  center: [number, number];
  zoom: number;
  activeLayer: WeatherLayerType;
  baseStyle: MapBaseStyle;
  radarData: RainViewerData | null;
  currentRadarFrame: RainViewerFrame | null;
  radarColorScheme: number;
  selectedLocation: LocationCoordinates | null;
  onMapClick: (lat: number, lon: number) => void;
  lang: Language;
  tempUnit: TemperatureUnit;
  storms: TropicalStorm[];
  onSelectStorm: (storm: TropicalStorm) => void;
  radarOpacity?: number;
  showRadarStations?: boolean;
  showRadarRings?: boolean;
  showPAR?: boolean;
  showCityLabels?: boolean;
  showElevation?: boolean;
  showBathymetry?: boolean;
  showIsolines?: boolean;
  isMeasureActive?: boolean;
  onMeasureUpdate?: (distanceKm: number, pointCount: number) => void;
}

export const WeatherMap: React.FC<WeatherMapProps> = ({
  center,
  zoom,
  activeLayer,
  baseStyle,
  radarData,
  currentRadarFrame,
  radarColorScheme,
  selectedLocation,
  onMapClick,
  storms,
  onSelectStorm,
  radarOpacity = 0.85,
  showRadarStations = true,
  showRadarRings = true,
  showPAR = true,
  showCityLabels = true,
  showElevation = true,
  showBathymetry = true,
  showIsolines = true,
  isMeasureActive = false,
  onMeasureUpdate,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Basemap provider currently on screen + whether every provider failed
  const [activeBasemap, setActiveBasemap] = useState<BasemapSource | null>(null);
  const [basemapFailed, setBasemapFailed] = useState(false);

  // Layer refs
  const baseGroupRef = useRef<L.LayerGroup | null>(null);
  const elevationLayerRef = useRef<L.TileLayer | null>(null);
  const bathymetryLayerRef = useRef<L.TileLayer | null>(null);
  const weatherTileLayerRef = useRef<L.TileLayer | null>(null);
  const parPolygonRef = useRef<L.Polygon | null>(null);
  const isolinesGroupRef = useRef<L.LayerGroup | null>(null);
  const stormMarkersGroupRef = useRef<L.LayerGroup | null>(null);
  const cityMarkersGroupRef = useRef<L.LayerGroup | null>(null);
  const radarStationsGroupRef = useRef<L.LayerGroup | null>(null);
  const clickMarkerRef = useRef<L.Marker | null>(null);

  // Distance measurement refs
  const measurePointsRef = useRef<L.LatLng[]>([]);
  const measureMarkersGroupRef = useRef<L.LayerGroup | null>(null);
  const measureLineRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: false,
      attributionControl: false,
      minZoom: 5.5,
      maxZoom: 17,
      maxBounds: L.latLngBounds([3.5, 114.0], [23.5, 136.0]),
      maxBoundsViscosity: 0.9,
      worldCopyJump: false,
    });

    // Custom Zoom control at bottom right
    L.control
      .zoom({
        position: 'bottomright',
      })
      .addTo(map);

    // Map click handler (checks if measuring distance or inspecting weather)
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isMeasureActive) {
        handleMeasureClick(e.latlng);
      } else {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map click handler dynamically when isMeasureActive changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    map.off('click');
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isMeasureActive) {
        handleMeasureClick(e.latlng);
      } else {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });
  }, [isMeasureActive, onMapClick]);

  // Handle distance measurement
  const handleMeasureClick = (latlng: L.LatLng) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (!measureMarkersGroupRef.current) {
      measureMarkersGroupRef.current = L.layerGroup().addTo(map);
    }

    const points = measurePointsRef.current;
    points.push(latlng);

    // Add marker at point
    const pointIdx = points.length;
    const markerIcon = L.divIcon({
      className: 'measure-point-pin',
      html: `
        <div style="width: 14px; height: 14px; border-radius: 9999px; background-color: #f59e0b; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #000;">
          ${pointIdx}
        </div>
      `,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const marker = L.marker(latlng, { icon: markerIcon });
    measureMarkersGroupRef.current.addLayer(marker);

    // Calculate total distance
    let totalKm = 0;
    for (let i = 1; i < points.length; i++) {
      totalKm += points[i - 1].distanceTo(points[i]) / 1000;
    }

    // Update polyline
    if (measureLineRef.current) {
      measureLineRef.current.setLatLngs(points);
    } else {
      measureLineRef.current = L.polyline(points, {
        color: '#f59e0b',
        weight: 3,
        dashArray: '6, 6',
      }).addTo(map);
    }

    // Bind tooltip to the latest point
    marker.bindTooltip(
      `<strong>Point ${pointIdx}</strong><br/>${points.length === 1 ? 'Start Point' : `Total: ${totalKm.toFixed(1)} km`}`,
      { permanent: true, direction: 'top', className: 'custom-leaflet-tooltip' }
    ).openTooltip();

    if (onMeasureUpdate) {
      onMeasureUpdate(totalKm, points.length);
    }
  };

  // Clear measure points when measure mode is turned off
  useEffect(() => {
    if (!isMeasureActive) {
      measurePointsRef.current = [];
      if (measureMarkersGroupRef.current) {
        measureMarkersGroupRef.current.clearLayers();
      }
      if (measureLineRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(measureLineRef.current);
        measureLineRef.current = null;
      }
      if (onMeasureUpdate) {
        onMeasureUpdate(0, 0);
      }
    }
  }, [isMeasureActive, onMeasureUpdate]);

  // Update center & zoom when props change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const currentCenter = mapInstanceRef.current.getCenter();
    const dist = Math.hypot(currentCenter.lat - center[0], currentCenter.lng - center[1]);
    if (dist > 0.05) {
      mapInstanceRef.current.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom]);

  // Update Base Tile Layer
  //
  // All four styles (Meteor Dark, Clean Hybrid, Satellite Imagery, Street
  // View) are served by keyless providers — no CARTO, no API key, no
  // "API KEY REQUIRED" watermark tiles. Every style has a fallback chain: if
  // a provider keeps failing we silently switch to the next one instead of
  // leaving a blank map.
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (baseGroupRef.current) {
      map.removeLayer(baseGroupRef.current);
      baseGroupRef.current = null;
    }

    const chain = getBasemapChain(baseStyle);
    const group = L.layerGroup().addTo(map);
    baseGroupRef.current = group;

    let sourceIndex = 0;
    let errorCount = 0;
    let disposed = false;

    const mountSource = (index: number) => {
      if (disposed) return;
      const source = chain[index];

      group.clearLayers();
      errorCount = 0;
      setActiveBasemap(source);
      setBasemapFailed(false);

      const layerOptions = (extra: L.TileLayerOptions = {}): L.TileLayerOptions => ({
        subdomains: source.subdomains ?? 'abc',
        maxZoom: source.maxZoom ?? 19,
        maxNativeZoom: source.maxNativeZoom,
        className: source.className,
        attribution: source.attribution,
        ...extra,
      });

      const base = L.tileLayer(source.url, layerOptions({ zIndex: 100 }));

      base.on('tileerror', () => {
        if (disposed) return;
        errorCount += 1;
        if (errorCount < BASEMAP_ERROR_THRESHOLD) return;

        if (index + 1 < chain.length) {
          // Current provider is unreachable — try the next one.
          sourceIndex += 1;
          mountSource(sourceIndex);
        } else {
          setBasemapFailed(true);
        }
      });

      base.addTo(group);

      // Some Esri "canvas" basemaps ship their labels as a separate service.
      if (source.labelsUrl) {
        L.tileLayer(source.labelsUrl, layerOptions({ zIndex: 200 })).addTo(group);
      }
    };

    mountSource(sourceIndex);

    return () => {
      disposed = true;
      if (map.hasLayer(group)) {
        map.removeLayer(group);
      }
      if (baseGroupRef.current === group) {
        baseGroupRef.current = null;
      }
    };
  }, [baseStyle]);

  // Elevation / Hillshade Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (elevationLayerRef.current) {
      map.removeLayer(elevationLayerRef.current);
      elevationLayerRef.current = null;
    }

    if (showElevation && baseStyle !== 'satellite') {
      const hillshade = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
        {
          opacity: 0.35,
          zIndex: 140,
          maxZoom: 16,
        }
      ).addTo(map);
      elevationLayerRef.current = hillshade;
    }
  }, [showElevation, baseStyle]);

  // Bathymetry / Ocean Depth Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (bathymetryLayerRef.current) {
      map.removeLayer(bathymetryLayerRef.current);
      bathymetryLayerRef.current = null;
    }

    if (showBathymetry && baseStyle !== 'satellite') {
      const bathy = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
        {
          opacity: 0.22,
          zIndex: 130,
          maxZoom: 13,
        }
      ).addTo(map);
      bathymetryLayerRef.current = bathy;
    }
  }, [showBathymetry, baseStyle]);

  // Update Radar / Satellite Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (weatherTileLayerRef.current) {
      map.removeLayer(weatherTileLayerRef.current);
      weatherTileLayerRef.current = null;
    }

    if (!radarData || !currentRadarFrame) return;

    const isRadar =
      activeLayer === 'radar' ||
      activeLayer === 'radar-reflectivity' ||
      activeLayer === 'rain' ||
      activeLayer === 'radar-rainrate' ||
      activeLayer === 'rain-accumulation';

    const isSatellite =
      activeLayer === 'satellite' ||
      activeLayer === 'himawari-ir' ||
      activeLayer === 'himawari-bw';

    if (isRadar) {
      const scheme =
        activeLayer === 'radar-reflectivity' ? 3 :
        activeLayer === 'radar-rainrate' ? 4 :
        activeLayer === 'rain-accumulation' ? 1 : radarColorScheme;

      const radarUrl = rainViewer.getTileUrl(radarData.host, currentRadarFrame.path, {
        colorScheme: scheme,
        smooth: true,
      });

      const layer = L.tileLayer(radarUrl, {
        opacity: radarOpacity,
        zIndex: 300,
        tileSize: 256,
      }).addTo(map);

      weatherTileLayerRef.current = layer;
    } else if (isSatellite) {
      const satUrl = rainViewer.getSatelliteTileUrl(radarData.host, currentRadarFrame.path);
      const layer = L.tileLayer(satUrl, {
        opacity: 0.8,
        zIndex: 300,
        tileSize: 256,
        className: activeLayer === 'himawari-bw' ? 'grayscale contrast-125' : '',
      }).addTo(map);

      weatherTileLayerRef.current = layer;
    }
  }, [activeLayer, radarData, currentRadarFrame, radarColorScheme, radarOpacity]);

  // PAR (Philippine Area of Responsibility) boundary polygon
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (parPolygonRef.current) {
      map.removeLayer(parPolygonRef.current);
      parPolygonRef.current = null;
    }

    if (showPAR) {
      const parPoly = L.polygon(PAR_COORDINATES, {
        color: '#10b981', // emerald
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#10b981',
        fillOpacity: 0.03,
      }).addTo(map);

      parPoly.bindTooltip('PAR Boundary (Philippine Area of Responsibility)', {
        sticky: true,
        className: 'custom-leaflet-tooltip',
      });

      parPolygonRef.current = parPoly;
    }
  }, [showPAR]);

  // Isolines (Pressure Isobars)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (isolinesGroupRef.current) {
      map.removeLayer(isolinesGroupRef.current);
      isolinesGroupRef.current = null;
    }

    if (showIsolines) {
      const group = L.layerGroup();
      
      const isobars = [
        { hpa: 1012, points: [[20.5, 117.0], [19.0, 120.0], [17.5, 123.0], [16.0, 126.5], [14.0, 129.0]] },
        { hpa: 1010, points: [[16.5, 116.5], [15.0, 119.5], [13.5, 122.5], [12.0, 126.0], [10.5, 128.5]] },
        { hpa: 1008, points: [[12.5, 116.0], [11.0, 119.0], [9.5, 122.5], [8.0, 125.5], [7.0, 128.0]] },
        { hpa: 1006, points: [[8.5, 117.0], [7.0, 120.0], [6.0, 123.0], [5.5, 126.0]] },
      ];

      isobars.forEach((line) => {
        const polyline = L.polyline(line.points as [number, number][], {
          color: '#38bdf8',
          weight: 1.5,
          opacity: 0.55,
          dashArray: '5, 5',
        });
        
        const midIdx = Math.floor(line.points.length / 2);
        const midPoint = line.points[midIdx];
        const labelIcon = L.divIcon({
          className: 'isobar-label',
          html: `<div style="background: rgba(15, 23, 42, 0.85); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.4); padding: 1px 4px; border-radius: 4px; font-size: 9px; font-weight: bold; white-space: nowrap; pointer-events: none;">${line.hpa} hPa</div>`,
          iconSize: [45, 16],
          iconAnchor: [22, 8],
        });
        const labelMarker = L.marker(midPoint as [number, number], { icon: labelIcon, interactive: false });

        group.addLayer(polyline);
        group.addLayer(labelMarker);
      });

      group.addTo(map);
      isolinesGroupRef.current = group;
    }
  }, [showIsolines]);

  // Storm and Typhoon Markers & Tracks
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (stormMarkersGroupRef.current) {
      map.removeLayer(stormMarkersGroupRef.current);
    }

    const group = L.layerGroup();

    storms.forEach((storm) => {
      const stormIcon = L.divIcon({
        className: 'custom-storm-pin',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="w-9 h-9 rounded-full bg-rose-600/80 border-2 border-rose-300 flex items-center justify-center shadow-lg shadow-rose-600/50 animate-spin" style="animation-duration: 4s;">
              <span class="text-white text-xs font-black">🌀</span>
            </div>
            <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-white font-bold text-[10px] px-2 py-0.5 rounded border border-rose-500/50 shadow">
              ${storm.localName || storm.name}
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([storm.currentLat, storm.currentLon], { icon: stormIcon });
      marker.on('click', () => onSelectStorm(storm));
      group.addLayer(marker);

      if (storm.track && storm.track.length > 1) {
        const trackLatLngs: [number, number][] = storm.track.map((t) => [t.lat, t.lon]);
        const trackLine = L.polyline(trackLatLngs, {
          color: '#fb7185',
          weight: 2.5,
          dashArray: '4, 4',
          opacity: 0.85,
        });
        group.addLayer(trackLine);
      }
    });

    group.addTo(map);
    stormMarkersGroupRef.current = group;
  }, [storms, onSelectStorm]);

  // Click beacon marker for selected location
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (clickMarkerRef.current) {
      map.removeLayer(clickMarkerRef.current);
      clickMarkerRef.current = null;
    }

    if (selectedLocation) {
      const markerIcon = L.divIcon({
        className: 'selected-location-beacon',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-lg"></span>
            <span class="absolute w-8 h-8 rounded-full bg-cyan-400/40 animate-ping"></span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([selectedLocation.lat, selectedLocation.lon], {
        icon: markerIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      clickMarkerRef.current = marker;
    }
  }, [selectedLocation]);

  // City Labels Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (cityMarkersGroupRef.current) {
      map.removeLayer(cityMarkersGroupRef.current);
      cityMarkersGroupRef.current = null;
    }

    if (showCityLabels) {
      const group = L.layerGroup();

      POPULAR_LOCATIONS.forEach((city) => {
        const cityIcon = L.divIcon({
          className: 'panahon-city-label',
          html: `
            <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center; pointer-events: auto;">
              <span style="font-size: 13px; font-weight: 750; color: #0f172a; text-shadow: -1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff, 0 2px 4px rgba(0,0,0,0.3); letter-spacing: -0.01em; white-space: nowrap;">
                ${city.name}
              </span>
            </div>
          `,
          iconSize: [120, 24],
          iconAnchor: [60, 12],
        });

        const marker = L.marker([city.lat, city.lon], { icon: cityIcon });
        marker.on('click', () => {
          onMapClick(city.lat, city.lon);
        });
        group.addLayer(marker);
      });

      group.addTo(map);
      cityMarkersGroupRef.current = group;
    }
  }, [showCityLabels, onMapClick]);

  // PAGASA Doppler Radar Stations & Sweep Rings Overlay
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (radarStationsGroupRef.current) {
      map.removeLayer(radarStationsGroupRef.current);
      radarStationsGroupRef.current = null;
    }

    if (showRadarStations) {
      const group = L.layerGroup();

      PAGASA_RADAR_STATIONS.forEach((station) => {
        const towerIcon = L.divIcon({
          className: 'custom-radar-tower',
          html: `
            <div class="flex items-center justify-center cursor-pointer group">
              <div class="w-7 h-7 rounded-full bg-blue-900/90 border-2 border-cyan-400 text-cyan-300 flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-125 transition-transform">
                <span class="text-xs">📡</span>
              </div>
              <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/95 text-cyan-200 font-bold text-[9px] px-1.5 py-0.5 rounded border border-cyan-500/50 shadow opacity-90 group-hover:opacity-100">
                ${station.name.replace(' Station', '')}
              </div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([station.lat, station.lon], { icon: towerIcon });
        
        marker.bindTooltip(
          `
            <div style="font-family: system-ui; min-width: 170px;">
              <strong style="color: #38bdf8; font-size: 12px;">${station.name}</strong><br/>
              <span style="color: #94a3b8; font-size: 10px;">${station.location}</span><br/>
              <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #334155; font-size: 10px; display: flex; justify-content: space-between;">
                <span>Type: <b>${station.type}</b></span>
                <span style="color: #34d399; font-weight: bold;">● ${station.status}</span>
              </div>
              <div style="color: #cbd5e1; font-size: 10px; margin-top: 2px;">
                Radius: <b>${station.rangeKm} km coverage</b>
              </div>
            </div>
          `,
          { className: 'custom-leaflet-tooltip' }
        );

        marker.on('click', () => {
          map.flyTo([station.lat, station.lon], 9, { duration: 1.0 });
          onMapClick(station.lat, station.lon);
        });

        group.addLayer(marker);

        // Radar coverage sweep range circle
        if (showRadarRings) {
          const circle = L.circle([station.lat, station.lon], {
            radius: station.rangeKm * 1000,
            color: '#0284c7',
            weight: 1,
            dashArray: '4, 4',
            fillColor: '#0284c7',
            fillOpacity: 0.02,
          });
          group.addLayer(circle);
        }
      });

      group.addTo(map);
      radarStationsGroupRef.current = group;
    }
  }, [showRadarStations, showRadarRings, onMapClick]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* Leaflet Map Div */}
      <div ref={mapContainerRef} className={`w-full h-full z-0 ${isMeasureActive ? 'cursor-crosshair' : 'cursor-default'}`} />

      {/* Temperature Thermal Heatmap Canvas Layer */}
      <TemperatureCanvas map={mapInstanceRef.current} visible={activeLayer === 'temperature'} opacity={0.88} />

      {/* Wind Streamline Particle Canvas Layer */}
      <WindCanvas map={mapInstanceRef.current} visible={activeLayer === 'wind' || activeLayer === 'temperature'} intensity={1.1} />

      {/* Basemap tiles could not be reached from this network */}
      {basemapFailed && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] max-w-[80%] rounded-xl border border-amber-500/40 bg-slate-900/90 px-3 py-2 text-center text-[11px] leading-snug text-amber-200 shadow-lg backdrop-blur">
          Basemap tiles are unreachable on this network — radar, storm and
          forecast overlays still work.
        </div>
      )}

      {/* Map Attribution and Click Hint */}
      <div className="absolute bottom-2 left-3 z-[400] text-[10px] text-slate-400/80 font-mono pointer-events-none flex items-center gap-2">
        <span>DOST-PAGASA Realtime</span>
        <span>·</span>
        <span>Click anywhere on the map to inspect weather</span>
        <span>·</span>
        <span>Weather data by RainViewer</span>
        {activeBasemap && (
          <>
            <span>·</span>
            <span className="opacity-70">{activeBasemap.attribution}</span>
          </>
        )}
      </div>
    </div>
  );
};
