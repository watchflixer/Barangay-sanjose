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
    { id: 'rain-accumulation', label: 'Rain Accumulation' },
    { id: 'wind', label: 'Wind' },
    { id: 'pressure', label: 'Pressure' },
    { id: 'temperature', label: 'Temperature' },
  ];

  // Base Map Styles
  const baseMapItems: { id: MapBaseStyle; label: string }[] = [
    { id: 'satellite', label: '🛰️ Satellite Imagery' },
    { id: 'streets', label: '🗺️ Street View' },
    { id: 'dark', label: '🌙 Meteor Dark' },
    { id: 'voyager', label: '🧭 Clean Hybrid' },
  ];

  return (
    <>
      {/* 1. TOP HEADER ROW: LOGO + 4 CIRCULAR ACTION BUTTONS */}
      <div className="fixed top-3 inset-x-3 z-[600] flex items-center justify-between pointer-events-none">
        {/* Left: Official DOST/PAGASA 4-lobed crest + blue PANAHON badge */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* 4-lobed DOST / PAGASA Emblem */}
          <div className="w-10 h-10 rounded-xl bg-slate-950/80 backdrop-blur-md p-1 border border-white/20 shadow-lg flex items-center justify-center">
            <div className="relative w-7 h-7 flex items-center justify-center">
              <span className="absolute top-0 left-0 w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700" />
              <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-[#00a8ff] shadow-sm" />
              <span className="absolute bottom-0 left-0 w-3.5 h-3.5 rounded-full bg-[#00a8ff] shadow-sm" />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700" />
              <span className="relative z-10 text-[9px] font-black text-amber-300">☀️</span>
            </div>
          </div>

          {/* Blue PANAHON App Badge */}
          <div className="h-10 px-2.5 rounded-xl bg-[#009be5] shadow-lg flex items-center gap-1.5 text-white border border-white/30">
            <span className="font-extrabold text-base leading-none">P</span>
            <span className="text-[9px] font-black tracking-tight uppercase leading-none">
              PANAHON
            </span>
          </div>
        </div>

        {/* Right: 4 Warm-amber circular translucent buttons (matching screenshot) */}
        <div className="flex items-center gap-2 pointer-events-auto relative">
          {/* 1. Ruler / Distance Tool */}
          <button
            onClick={onToggleMeasure}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border ${
              isMeasureActive
                ? 'bg-[#d97706] text-white border-amber-300 ring-2 ring-white/40'
                : 'bg-[#a2541a]/85 backdrop-blur-md text-white border-white/20 hover:bg-[#a2541a]'
            }`}
            title="Measure Distance"
          >
            <Ruler className="w-4 h-4" />
          </button>

          {/* 2. Sliders / Settings */}
          <button
            onClick={() => {
              setIsSettingsOpen(!isSettingsOpen);
              if (!isSettingsOpen) setIsLayersOpen(false);
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border ${
              isSettingsOpen
                ? 'bg-[#d97706] text-white border-amber-300 ring-2 ring-white/40'
                : 'bg-[#a2541a]/85 backdrop-blur-md text-white border-white/20 hover:bg-[#a2541a]'
            }`}
            title="Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* 3. Locator / Radar Stations Toggle */}
          <button
            onClick={onToggleRadarStations}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border ${
              showRadarStations
                ? 'bg-[#d97706] text-white border-amber-300'
                : 'bg-[#a2541a]/85 backdrop-blur-md text-white border-white/20 hover:bg-[#a2541a]'
            }`}
            title="PAGASA Radar Stations"
          >
            <MapPin className="w-4 h-4" />
          </button>

          {/* 4. Layers Stack Button */}
          <button
            onClick={() => {
              setIsLayersOpen(!isLayersOpen);
              if (!isLayersOpen) setIsSettingsOpen(false);
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border ${
              isLayersOpen
                ? 'bg-[#d97706] text-white border-amber-300 ring-2 ring-white/40'
                : 'bg-[#a2541a]/85 backdrop-blur-md text-white border-white/20 hover:bg-[#a2541a]'
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
              className="absolute top-12 right-0 w-64 bg-[#18181b]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1.5 z-[750] animate-in fade-in slide-in-from-top-2 duration-150 text-slate-100 font-sans"
            >
              {/* SECTION 1: Observations */}
              <div className="text-[11px] font-medium text-slate-400 px-3.5 pt-2 pb-1 tracking-tight select-none">
                Observations
              </div>
              <div className="space-y-0.5">
                {observationLayers.map((item) => {
                  const isActive = activeLayer === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onChangeLayer(item.id);
                        setIsLayersOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors leading-tight flex items-center justify-between ${
                        isActive
                          ? 'bg-[#4361ee] text-white font-medium'
                          : 'text-slate-100 hover:bg-white/10'
                      }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Thin separator line */}
              <div className="h-px bg-white/5 my-1" />

              {/* SECTION 2: Numerical Weather Prediction */}
              <div className="text-[11px] font-medium text-slate-400 px-3.5 pt-2 pb-1 tracking-tight select-none">
                Numerical Weather Prediction
              </div>
              <div className="space-y-0.5">
                {nwpLayers.map((item) => {
                  const isActive = activeLayer === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onChangeLayer(item.id);
                        setIsLayersOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors leading-tight flex items-center justify-between ${
                        isActive
                          ? 'bg-[#4361ee] text-white font-medium'
                          : 'text-slate-100 hover:bg-white/10'
                      }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Thin separator line */}
              <div className="h-px bg-white/5 my-1" />

              {/* SECTION 3: Base Map (Satellite, Street, Dark, Hybrid) */}
              <div className="text-[11px] font-medium text-slate-400 px-3.5 pt-2 pb-1 tracking-tight select-none">
                Map Style
              </div>
              <div className="space-y-0.5 pb-1">
                {baseMapItems.map((item) => {
                  const isActive = baseStyle === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onChangeBaseStyle(item.id);
                        setIsLayersOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 text-[12px] transition-colors leading-tight flex items-center justify-between ${
                        isActive
                          ? 'bg-[#4361ee]/40 text-cyan-200 font-medium'
                          : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
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

      {/* 2. SEARCH BAR & ZOOM BUTTONS ROW */}
      <div className="fixed top-16 inset-x-3 z-[600] flex items-center gap-2 pointer-events-none">
        {/* Search Bar Pill */}
        <div className="relative flex-1 pointer-events-auto">
          <div className="flex items-center w-full h-11 px-4 rounded-2xl bg-[#a2541a]/80 backdrop-blur-md border border-white/20 shadow-lg text-white">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search location in Philippines"
              className="w-full bg-transparent text-sm text-white placeholder-amber-200/60 focus:outline-none"
            />
            {/* GPS crosshair target inside search bar */}
            <button
              onClick={onUseCurrentLocation}
              disabled={isLocating}
              className="p-1 text-white hover:text-amber-200 transition-colors ml-1"
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
            className="w-11 h-11 rounded-full bg-[#a2541a]/85 backdrop-blur-md border border-white/20 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={onZoomOut}
            className="w-11 h-11 rounded-full bg-[#a2541a]/85 backdrop-blur-md border border-white/20 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. RIGHT SIDE VERTICAL TEMPERATURE LEGEND SCALE */}
      <div className="fixed right-3 top-1/2 -translate-y-12 z-[500] pointer-events-auto">
        <div className="flex flex-col items-center bg-[#8f4514]/85 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-2xl text-white font-sans">
          <span className="text-[11px] font-bold text-white mb-1.5">°C</span>

          <div className="relative flex items-center justify-center w-10 h-52">
            <div
              className="w-3.5 h-full rounded-full shadow-inner"
              style={{
                background:
                  'linear-gradient(to bottom, #d90429 0%, #ea580c 25%, #eab308 50%, #84cc16 70%, #06b6d4 85%, #2563eb 100%)',
              }}
            />

            <div className="absolute inset-y-0 right-0 flex flex-col justify-between text-[10px] font-bold text-white leading-none pointer-events-none py-1">
              <span>58</span>
              <span>43</span>
              <span>28</span>
              <span>12</span>
              <span>-3</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FLOATING TIMESTAMP PILL */}
      <div className="fixed bottom-24 left-4 z-[500] pointer-events-auto">
        <div className="px-3.5 py-1.5 rounded-xl bg-[#6d2f09]/80 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-lg">
          {timestampStr || 'Fri, Oct 9 6:00 PM'}
        </div>
      </div>

      {/* 5. BOTTOM PLAYBACK CONTROL BAR */}
      <div className="fixed bottom-4 inset-x-3 z-[500] pointer-events-auto max-w-xl mx-auto">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-3xl bg-[#7c370b]/85 backdrop-blur-md border border-white/20 shadow-2xl text-white">
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

            <div className="flex justify-between items-center text-[10px] text-amber-200/90 font-medium px-1">
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
