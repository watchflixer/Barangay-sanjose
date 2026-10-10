import React, { useState, useEffect, useRef } from 'react';
import {
  Ruler,
  Sliders,
  MapPin,
  Layers,
  Search,
  Crosshair,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  X,
  Loader2,
  Compass,
  Satellite,
  Map as MapIcon,
  CloudRain,
  CloudLightning,
  Droplets,
  Wind,
  Thermometer,
  Gauge,
  Waves,
  Eye,
  Check,
  Radar,
} from 'lucide-react';
import {
  LocationCoordinates,
  MapBaseStyle,
  RainViewerFrame,
  SpeedUnit,
  TemperatureUnit,
  WeatherLayerType,
} from '../types/weather';
import { searchCities } from '../services/openMeteo';
import { PHILIPPINE_CITIES } from '../services/storms';

// Visual metadata for the Layers card (icon, gradient tile, short description)
const LAYER_META: Record<string, { icon: React.ComponentType<{ className?: string }>; tone: string; desc: string }> = {
  'radar-reflectivity': { icon: Radar, tone: 'from-cyan-400 to-blue-600', desc: 'Intensity ng ulan (dBZ)' },
  'radar-rainrate': { icon: Droplets, tone: 'from-sky-400 to-blue-500', desc: 'Bilis ng pagbuhos (mm/h)' },
  'himawari-ir': { icon: Satellite, tone: 'from-indigo-400 to-violet-600', desc: 'Infrared satellite, araw at gabi' },
  'himawari-bw': { icon: Eye, tone: 'from-slate-400 to-slate-600', desc: 'Black & white na satellite view' },
  rain: { icon: CloudRain, tone: 'from-blue-400 to-indigo-600', desc: 'Forecast ng pag-ulan' },
  storm: { icon: CloudLightning, tone: 'from-fuchsia-500 to-violet-700', desc: 'Bagyo at tinatahak nito' },
  'rain-accumulation': { icon: Waves, tone: 'from-teal-400 to-emerald-600', desc: 'Kabuuang ipon na ulan' },
  wind: { icon: Wind, tone: 'from-emerald-400 to-green-600', desc: 'Amihan at habagat' },
  pressure: { icon: Gauge, tone: 'from-amber-400 to-orange-600', desc: 'Presyon ng hangin' },
  temperature: { icon: Thermometer, tone: 'from-rose-400 to-pink-600', desc: 'Init sa bawat lugar' },
};

interface PanahonMobileUIProps {
  activeLayer: WeatherLayerType;
  onChangeLayer: (layer: WeatherLayerType) => void;
  baseStyle: MapBaseStyle;
  onChangeBaseStyle: (style: MapBaseStyle) => void;
  showRadarStations: boolean;
  onToggleRadarStations: () => void;
  showRadarRings: boolean;
  onToggleRadarRings: () => void;
  showPAR: boolean;
  onTogglePAR: () => void;
  showCityLabels: boolean;
  onToggleCityLabels: () => void;
  showElevation: boolean;
  onToggleElevation: () => void;
  showBathymetry: boolean;
  onToggleBathymetry: () => void;
  showIsolines: boolean;
  onToggleIsolines: () => void;
  radarOpacity: number;
  onChangeRadarOpacity: (val: number) => void;
  radarSpeed: number;
  onChangeRadarSpeed: (speed: number) => void;
  tempUnit: TemperatureUnit;
  onChangeTempUnit: (unit: TemperatureUnit) => void;
  speedUnit: SpeedUnit;
  onChangeSpeedUnit: (unit: SpeedUnit) => void;
  isMeasureActive: boolean;
  onToggleMeasure: () => void;
  measuredDistanceKm?: number;
  measurePointCount?: number;
  onRecenterPhilippines: () => void;
  onSelectLocation: (loc: LocationCoordinates) => void;
  onUseCurrentLocation: () => void;
  isLocating: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  frames: RainViewerFrame[];
  currentFrameIndex: number;
  onSelectFrameIndex: (idx: number) => void;
}

export const PanahonMobileUI: React.FC<PanahonMobileUIProps> = ({
  activeLayer,
  onChangeLayer,
  baseStyle,
  onChangeBaseStyle,
  showRadarStations,
  onToggleRadarStations,
  showRadarRings,
  onToggleRadarRings,
  showPAR,
  onTogglePAR,
  showCityLabels,
  onToggleCityLabels,
  showElevation,
  onToggleElevation,
  showBathymetry,
  onToggleBathymetry,
  showIsolines,
  onToggleIsolines,
  radarOpacity,
  onChangeRadarOpacity,
  radarSpeed,
  onChangeRadarSpeed,
  tempUnit,
  onChangeTempUnit,
  speedUnit,
  onChangeSpeedUnit,
  isMeasureActive,
  onToggleMeasure,
  measuredDistanceKm = 0,
  measurePointCount = 0,
  onRecenterPhilippines,
  onSelectLocation,
  onUseCurrentLocation,
  isLocating,
  onZoomIn,
  onZoomOut,
  isPlaying,
  onTogglePlay,
  frames,
  currentFrameIndex,
  onSelectFrameIndex,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationCoordinates[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const layersCardRef = useRef<HTMLDivElement | null>(null);
  const settingsCardRef = useRef<HTMLDivElement | null>(null);

  // Live Philippine Timestamp e.g. "Fri, Oct 9 6:00 PM"
  const [timestampStr, setTimestampStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Manila',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      };
      setTimestampStr(now.toLocaleString('en-US', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Click outside to close layers card & settings card
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        layersCardRef.current &&
        !layersCardRef.current.contains(target)
      ) {
        setIsLayersOpen(false);
      }
      if (
        settingsCardRef.current &&
        !settingsCardRef.current.contains(target)
      ) {
        setIsSettingsOpen(false);
      }
    };
    if (isLayersOpen || isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLayersOpen, isSettingsOpen]);

  // Search debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchCities(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Generate 5-day timeline markers
  const days = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue'];

  // Observation Layers
  const observationLayers: { id: WeatherLayerType; label: string }[] = [
    { id: 'radar-reflectivity', label: 'Radar Mosaic — Reflectivity' },
    { id: 'radar-rainrate', label: 'Radar Mosaic — Rain Rate' },
    { id: 'himawari-ir', label: 'Himawari IR Extended' },
    { id: 'himawari-bw', label: 'Himawari IR Extended BW' },
  ];

  // Numerical Weather Prediction Layers
  const nwpLayers: { id: WeatherLayerType; label: string }[] = [
    { id: 'rain', label: 'Rain' },
    { id: 'storm', label: 'Storm' },
    { id: 'rain-accumulation', label: 'Rain Accumulation' },
    { id: 'wind', label: 'Wind' },
    { id: 'pressure', label: 'Pressure' },
    { id: 'temperature', label: 'Temperature' },
  ];

  // Base Map Styles
  const baseMapItems: { id: MapBaseStyle; label: string }[] = [
    { id: 'satellite', label: '🛰️ Satellite Imagery' },
    { id: 'streets', label: '🗺️ Street View' },
  ];
  const isRainfallRadarLayer =
    activeLayer === 'radar' ||
    activeLayer === 'rain' ||
    activeLayer === 'storm' ||
    activeLayer === 'radar-reflectivity' ||
    activeLayer === 'radar-rainrate' ||
    activeLayer === 'rain-accumulation';

  const activeLayerItem = [...observationLayers, ...nwpLayers].find((item) => item.id === activeLayer);

  const renderLayerRow = (item: { id: WeatherLayerType; label: string }) => {
    const isActive = activeLayer === item.id;
    const meta = LAYER_META[item.id] ?? { icon: Layers, tone: 'from-slate-400 to-slate-600', desc: '' };
    const Icon = meta.icon;
    return (
      <button
        key={item.id}
        onClick={() => {
          onChangeLayer(item.id);
          setIsLayersOpen(false);
        }}
        className={`group w-full flex items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-all duration-200 ${
          isActive
            ? 'bg-gradient-to-r from-[#4361ee]/35 to-cyan-400/10 ring-1 ring-inset ring-[#4361ee]/50 shadow-[0_0_22px_-8px_rgba(67,97,238,0.9)]'
            : 'hover:bg-white/[0.06] active:scale-[0.98]'
        }`}
      >
        <div
          className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-gradient-to-br ${meta.tone} ring-1 ring-inset ring-white/20 shadow-lg transition-transform duration-200 ${
            isActive ? 'scale-105' : 'group-hover:scale-105'
          }`}
        >
          <Icon className="w-4 h-4 text-white drop-shadow" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[13px] leading-tight truncate ${isActive ? 'text-white font-semibold' : 'text-slate-100 font-medium'}`}>
            {item.label}
          </div>
          {meta.desc && <div className="text-[11px] leading-tight text-slate-400 truncate mt-0.5">{meta.desc}</div>}
        </div>
        <span
          className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center border transition-all duration-200 ${
            isActive
              ? 'bg-gradient-to-br from-cyan-300 to-cyan-500 border-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.6)]'
              : 'border-white/15 opacity-0 group-hover:opacity-100'
          }`}
        >
          {isActive && <Check className="w-3 h-3 text-slate-950" strokeWidth={3} />}
        </span>
      </button>
    );
  };

  const renderSectionHeader = (title: string) => (
    <div className="flex items-center gap-2 px-1.5 pt-3 pb-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{title}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
    </div>
  );

  return (
    <>
      {/* SECOND ROW: SETTINGS, RADAR & LAYERS CONTROLS */}
      <div className="fixed top-16 inset-x-3 z-[600] flex items-center justify-end pointer-events-none">
        {/* Right: 3 warm-amber circular translucent action buttons */}
        <div className="flex items-center gap-2 pointer-events-auto relative">
          {/* 1. Sliders / Settings */}
          <button
            onClick={() => {
              setIsSettingsOpen(!isSettingsOpen);
              if (!isSettingsOpen) setIsLayersOpen(false);
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border ${
              isSettingsOpen
                ? 'bg-white/25 text-white border-white/40 ring-2 ring-white/30'
                : 'bg-black/55 backdrop-blur-md text-white border-white/20 hover:bg-black/70'
            }`}
            title="Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* 2. Locator / Radar Stations Toggle */}
          <button
            onClick={onToggleRadarStations}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border ${
              showRadarStations
                ? 'bg-white/25 text-white border-white/40'
                : 'bg-black/55 backdrop-blur-md text-white border-white/20 hover:bg-black/70'
            }`}
            title="PAGASA Radar Stations"
          >
            <MapPin className="w-4 h-4" />
          </button>

          {/* 3. Layers Stack Button */}
          <button
            onClick={() => {
              setIsLayersOpen(!isLayersOpen);
              if (!isLayersOpen) setIsSettingsOpen(false);
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border ${
              isLayersOpen
                ? 'bg-white/25 text-white border-white/40 ring-2 ring-white/30'
                : 'bg-black/55 backdrop-blur-md text-white border-white/20 hover:bg-black/70'
            }`}
            title="Map and Weather Layers"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* ======================================================== */}
          {/* LAYERS CARD: DOCKED UNDER THE BUTTON CLUSTER */}
          {/* ======================================================== */}
          {isLayersOpen && (
            <div
              ref={layersCardRef}
              className="absolute top-12 right-0 w-72 max-h-[78vh] overflow-y-auto custom-scrollbar rounded-3xl border border-white/10 bg-gradient-to-b from-[#1f2228]/95 to-[#0e1014]/95 backdrop-blur-2xl shadow-[0_24px_60px_-15px_rgba(0,0,0,0.75)] ring-1 ring-inset ring-white/5 p-3 z-[750] animate-in fade-in slide-in-from-top-2 duration-200 text-slate-100 font-sans"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 px-1 pt-0.5 pb-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-[#4361ee] to-cyan-400 flex items-center justify-center shadow-lg shadow-[#4361ee]/40 ring-1 ring-inset ring-white/25">
                    <Layers className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold tracking-tight leading-tight">Map Layers</div>
                    <div className="text-[11px] text-slate-400 leading-tight">Piliin ang ipapakita sa mapa</div>
                  </div>
                </div>
                {activeLayerItem && (
                  <span className="max-w-[40%] truncate text-[10px] font-semibold uppercase tracking-wider text-cyan-200 bg-cyan-400/10 border border-cyan-400/25 px-2 py-0.5 rounded-full">
                    {activeLayerItem.label}
                  </span>
                )}
              </div>

              {/* SECTION 1: Observations */}
              {renderSectionHeader('Observations')}
              <div className="space-y-1">{observationLayers.map(renderLayerRow)}</div>

              {/* SECTION 2: Numerical Weather Prediction */}
              {renderSectionHeader('Numerical Weather Prediction')}
              <div className="space-y-1">{nwpLayers.map(renderLayerRow)}</div>

              {/* SECTION 3: Base Map */}
              {renderSectionHeader('Map Style')}
              <div className="grid grid-cols-2 gap-2">
                {baseMapItems.map((item) => {
                  const isActive = baseStyle === item.id;
                  const Icon = item.id === 'satellite' ? Satellite : MapIcon;
                  const sub = item.id === 'satellite' ? 'Imagery' : 'Kalsada';
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onChangeBaseStyle(item.id);
                        setIsLayersOpen(false);
                      }}
                      className={`relative overflow-hidden rounded-2xl p-2.5 text-left transition-all duration-200 active:scale-[0.97] ${
                        isActive
                          ? 'bg-gradient-to-br from-[#4361ee]/40 to-cyan-400/15 ring-1 ring-inset ring-cyan-300/60 shadow-[0_0_22px_-8px_rgba(34,211,238,0.8)]'
                          : 'bg-white/[0.04] ring-1 ring-inset ring-white/10 hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isActive ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/5 text-slate-300'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {isActive && (
                          <span className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-300 to-cyan-500 flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.7)]">
                            <Check className="w-2.5 h-2.5 text-slate-950" strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <div className={`mt-2 text-[12.5px] leading-tight ${isActive ? 'font-semibold text-white' : 'font-medium text-slate-200'}`}>
                        {item.label.replace(/^\S+\s/, '')}
                      </div>
                      <div className="text-[10.5px] text-slate-400 leading-tight mt-0.5">{sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SETTINGS CARD: DOCKED UNDER THE SLIDERS BUTTON */}
          {/* ======================================================== */}
          {isSettingsOpen && (
            <div
              ref={settingsCardRef}
              className="absolute top-12 right-0 w-72 sm:w-80 max-h-[78vh] overflow-y-auto custom-scrollbar bg-[#18181b]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-3.5 z-[750] animate-in fade-in slide-in-from-top-2 duration-150 text-slate-100 font-sans"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white tracking-tight">Panahon Map Settings</span>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* SECTION 1: DISPLAY & OVERLAYS */}
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 select-none">
                Display & Overlays
              </div>
              <div className="space-y-1 mb-2.5">
                {/* Elevation (Hill Shading) */}
                <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-white/5 text-xs">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-200">Elevation Shading</span>
                    <span className="text-[10px] text-slate-400">Terrain relief on land</span>
                  </div>
                  <button
                    onClick={onToggleElevation}
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${showElevation ? 'bg-[#00a8ff]' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showElevation ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Sea Bathymetry */}
                <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-white/5 text-xs">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-200">Sea Bathymetry</span>
                    <span className="text-[10px] text-slate-400">Ocean depth contours</span>
                  </div>
                  <button
                    onClick={onToggleBathymetry}
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${showBathymetry ? 'bg-[#00a8ff]' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showBathymetry ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Isolines (Isobars) */}
                <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-white/5 text-xs">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-200">Isolines (Isobars)</span>
                    <span className="text-[10px] text-slate-400">Pressure contour lines</span>
                  </div>
                  <button
                    onClick={onToggleIsolines}
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${showIsolines ? 'bg-[#00a8ff]' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showIsolines ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* PAR Boundary */}
                <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-white/5 text-xs">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-200">PAR Boundary Line</span>
                    <span className="text-[10px] text-slate-400">Philippine Area of Responsibility</span>
                  </div>
                  <button
                    onClick={onTogglePAR}
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${showPAR ? 'bg-[#00a8ff]' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showPAR ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* City Labels */}
                <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-white/5 text-xs">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-200">City & Capital Labels</span>
                    <span className="text-[10px] text-slate-400">Major Philippine cities</span>
                  </div>
                  <button
                    onClick={onToggleCityLabels}
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${showCityLabels ? 'bg-[#00a8ff]' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showCityLabels ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Thin separator */}
              <div className="h-px bg-white/10 my-2" />

              {/* SECTION 2: DOPPLER RADAR & STATIONS */}
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 select-none">
                Doppler Radar & Stations
              </div>
              <div className="space-y-1.5 mb-2.5">
                {/* Radar Stations */}
                <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-white/5 text-xs">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-200">PAGASA Radar Towers</span>
                    <span className="text-[10px] text-slate-400">17 Doppler radar stations</span>
                  </div>
                  <button
                    onClick={onToggleRadarStations}
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${showRadarStations ? 'bg-[#00a8ff]' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showRadarStations ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Station Range Rings */}
                <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-white/5 text-xs">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-200">Radar Coverage Rings</span>
                    <span className="text-[10px] text-slate-400">120 - 200 km sweep radius</span>
                  </div>
                  <button
                    onClick={onToggleRadarRings}
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${showRadarRings ? 'bg-[#00a8ff]' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showRadarRings ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Radar Layer Opacity */}
                <div className="pt-1 px-1.5 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-200">Radar Layer Opacity</span>
                    <span className="text-[11px] font-bold text-amber-300">{Math.round(radarOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={1.0}
                    step={0.05}
                    value={radarOpacity}
                    onChange={(e) => onChangeRadarOpacity(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer appearance-none"
                  />
                </div>
              </div>

              {/* Thin separator */}
              <div className="h-px bg-white/10 my-2" />

              {/* SECTION 3: ANIMATION PLAYBACK SPEED */}
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 select-none">
                Animation Playback Speed
              </div>
              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                {[
                  { value: 0.5, label: '0.5x Slow' },
                  { value: 1.0, label: '1.0x Normal' },
                  { value: 2.0, label: '2.0x Fast' },
                ].map((spd) => (
                  <button
                    key={spd.value}
                    onClick={() => onChangeRadarSpeed(spd.value)}
                    className={`py-1.5 px-2 rounded-xl text-center text-[11px] font-semibold transition-all ${
                      radarSpeed === spd.value
                        ? 'bg-[#4361ee] text-white shadow-md'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {spd.label}
                  </button>
                ))}
              </div>

              {/* Thin separator */}
              <div className="h-px bg-white/10 my-2" />

              {/* SECTION 4: UNITS OF MEASUREMENT */}
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 select-none">
                Units of Measurement
              </div>
              <div className="space-y-2 mb-2.5 text-xs">
                {/* Temperature */}
                <div className="flex items-center justify-between px-1.5">
                  <span className="text-slate-300 font-medium">Temperature</span>
                  <div className="flex bg-white/10 p-0.5 rounded-lg">
                    <button
                      onClick={() => onChangeTempUnit('celsius')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                        tempUnit === 'celsius' ? 'bg-[#00a8ff] text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      °C
                    </button>
                    <button
                      onClick={() => onChangeTempUnit('fahrenheit')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                        tempUnit === 'fahrenheit' ? 'bg-[#00a8ff] text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      °F
                    </button>
                  </div>
                </div>

                {/* Wind Speed */}
                <div className="flex items-center justify-between px-1.5">
                  <span className="text-slate-300 font-medium">Wind Speed</span>
                  <div className="flex bg-white/10 p-0.5 rounded-lg">
                    {(['kmh', 'knots', 'ms', 'mph'] as SpeedUnit[]).map((u) => (
                      <button
                        key={u}
                        onClick={() => onChangeSpeedUnit(u)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                          speedUnit === u ? 'bg-[#00a8ff] text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {u === 'kmh' ? 'km/h' : u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Thin separator */}
              <div className="h-px bg-white/10 my-2" />

              {/* SECTION 5: TOOLS & RESET */}
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 select-none">
                Tools & Actions
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={onToggleMeasure}
                  className={`w-full py-2 px-3 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                    isMeasureActive
                      ? 'bg-amber-600/80 text-white border border-amber-400'
                      : 'bg-white/5 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Ruler className="w-3.5 h-3.5 text-amber-400" />
                    Distance Measurement Tool
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isMeasureActive ? 'bg-amber-300 text-slate-900' : 'bg-white/10 text-slate-400'}`}>
                    {isMeasureActive ? 'ACTIVE' : 'OFF'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    onRecenterPhilippines();
                    setIsSettingsOpen(false);
                  }}
                  className="w-full py-2 px-3 rounded-xl text-left text-xs font-semibold bg-white/5 text-slate-200 hover:bg-white/10 flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-emerald-400" />
                    Reset View to Entire Philippines
                  </span>
                  <span className="text-[10px] text-slate-400">PH Center</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING MEASUREMENT STATUS BANNER WHEN ACTIVE */}
      {isMeasureActive && (
        <div className="fixed top-28 inset-x-4 z-[650] max-w-sm mx-auto pointer-events-auto">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/60 rounded-2xl p-2.5 shadow-2xl text-white flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex flex-col text-xs">
                <span className="font-bold text-amber-200">Distance Measure Tool</span>
                <span className="text-[11px] text-slate-300">
                  {measurePointCount === 0
                    ? 'Click any point on the map to start'
                    : `${measuredDistanceKm.toFixed(1)} km · ${measurePointCount} points`}
                </span>
              </div>
            </div>
            <button
              onClick={onToggleMeasure}
              className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* TOP ROW: SEARCH BAR & ZOOM BUTTONS */}
      <div className="fixed top-3 inset-x-3 z-[600] flex items-center gap-2 pointer-events-none">
        {/* Search Bar Pill */}
        <div className="relative flex-1 pointer-events-auto">
          <div className="flex items-center w-full h-11 px-4 rounded-2xl bg-black/55 backdrop-blur-md border border-white/20 shadow-lg text-white">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search location in Philippines"
              className="w-full bg-transparent text-sm text-white placeholder-slate-300/70 focus:outline-none"
            />
            {/* GPS crosshair target inside search bar */}
            <button
              onClick={onUseCurrentLocation}
              disabled={isLocating}
              className="p-1 text-white hover:text-slate-300 transition-colors ml-1"
              title="Locate my position"
            >
              <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Autocomplete dropdown */}
          {isSearchOpen && (searchQuery.length >= 2 || searchResults.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-2 z-[700] max-h-72 overflow-y-auto custom-scrollbar text-xs">
              <div className="flex items-center justify-between px-2 py-1 text-[10px] text-slate-400 font-bold uppercase">
                <span>Locations in the Philippines</span>
                <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {searchResults.length > 0 ? (
                searchResults.map((city, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectLocation(city);
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 flex items-center justify-between text-white"
                  >
                    <span className="font-semibold">{city.name}</span>
                    <span className="text-[10px] text-slate-400">{city.admin1}</span>
                  </button>
                ))
              ) : isSearching ? (
                <div className="p-3 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </div>
              ) : (
                PHILIPPINE_CITIES.slice(0, 5).map((city, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectLocation(city);
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200"
                  >
                    {city.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Circular Zoom In & Zoom Out Buttons */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Zoom In */}
          <button
            onClick={onZoomIn}
            className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={onZoomOut}
            className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. RIGHT SIDE VERTICAL LEGEND: RainViewer radar reflectivity or temperature */}
      <div className="fixed right-3 top-1/2 -translate-y-12 z-[500] pointer-events-auto">
        {isRainfallRadarLayer ? (
          <div className="flex flex-col items-center bg-black/55 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-2xl text-white font-sans">
            <span className="text-[10px] font-bold text-white mb-1.5">dBZ</span>
            <div className="flex gap-1.5 h-60">
              <div
                className="w-3 h-full rounded-full shadow-inner"
                style={{
                  background:
                    'linear-gradient(to bottom, #ff62ff 0%, #d91b00 18%, #ff9500 32%, #ffee00 44%, #005588 62%, #00a3e0 77%, #88ddeeff 90%, #827b6949 100%)',
                }}
              />
              <div className="flex flex-col justify-between text-[9px] font-bold text-white leading-none py-0.5">
                {['60', '50', '40', '30', '20', '10', '0'].map((v) => (
                  <span key={v}>{v}</span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center bg-black/55 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-2xl text-white font-sans">
            <span className="text-[11px] font-bold text-white mb-1.5">°C</span>
            <div className="flex gap-1.5 h-52">
              <div
                className="w-3 h-full rounded-full shadow-inner"
                style={{
                  background:
                    'linear-gradient(to bottom, #d90429 0%, #ea580c 25%, #eab308 50%, #84cc16 70%, #06b6d4 85%, #2563eb 100%)',
                }}
              />
              <div className="flex flex-col justify-between text-[10px] font-bold text-white leading-none py-0.5">
                <span>58</span>
                <span>43</span>
                <span>28</span>
                <span>12</span>
                <span>-3</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. FLOATING TIMESTAMP PILL */}
      <div className="fixed bottom-24 left-4 z-[500] pointer-events-auto">
        <div className="px-3.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-lg">
          {timestampStr || 'Fri, Oct 9 6:00 PM'}
        </div>
      </div>

      {/* 5. BOTTOM PLAYBACK CONTROL BAR */}
      <div className="fixed bottom-4 inset-x-3 z-[500] pointer-events-auto max-w-xl mx-auto">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-3xl bg-black/60 backdrop-blur-md border border-white/20 shadow-2xl text-white">
          <button
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center shrink-0 transition-transform"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-white text-white" />
            ) : (
              <Play className="w-5 h-5 fill-white text-white ml-0.5" />
            )}
          </button>

          <div className="flex-1 flex flex-col gap-1 pt-1">
            <input
              type="range"
              min={0}
              max={Math.max(1, frames.length - 1)}
              value={currentFrameIndex}
              onChange={(e) => onSelectFrameIndex(Number(e.target.value))}
              className="w-full accent-white h-1.5 bg-white/30 rounded-lg cursor-pointer appearance-none outline-none"
            />

            <div className="flex justify-between items-center text-[10px] text-slate-200 font-medium px-1">
              {days.map((day, idx) => (
                <span key={idx} className="tracking-tight">
                  {day}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
