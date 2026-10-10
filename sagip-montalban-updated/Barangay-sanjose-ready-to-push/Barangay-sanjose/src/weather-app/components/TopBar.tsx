import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Crosshair,
  CloudRain,
  Wind,
  Thermometer,
  Cloud,
  Satellite,
  ShieldAlert,
  Globe,
  Settings2,
  X,
  Loader2,
  MapPin,
} from 'lucide-react';
import {
  Language,
  LocationCoordinates,
  MapBaseStyle,
  SpeedUnit,
  TemperatureUnit,
  TropicalStorm,
  WeatherLayerType,
} from '../types/weather';
import { searchCities } from '../services/openMeteo';
import { PHILIPPINE_CITIES, PHILIPPINE_REGIONS, RegionPreset } from '../services/storms';

interface TopBarProps {
  activeLayer: WeatherLayerType;
  onChangeLayer: (layer: WeatherLayerType) => void;
  baseStyle: MapBaseStyle;
  onChangeBaseStyle: (style: MapBaseStyle) => void;
  onSelectLocation: (loc: LocationCoordinates) => void;
  onUseCurrentLocation: () => void;
  isLocating: boolean;
  lang: Language;
  onToggleLang: () => void;
  tempUnit: TemperatureUnit;
  onToggleTempUnit: () => void;
  speedUnit: SpeedUnit;
  onChangeSpeedUnit: (unit: SpeedUnit) => void;
  activeStorms: TropicalStorm[];
  onOpenStormTracker: () => void;
  activeRegion: string;
  onSelectRegion: (reg: RegionPreset) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeLayer,
  onChangeLayer,
  baseStyle,
  onChangeBaseStyle,
  onSelectLocation,
  onUseCurrentLocation,
  isLocating,
  lang,
  onToggleLang,
  tempUnit,
  onToggleTempUnit,
  speedUnit,
  onChangeSpeedUnit,
  activeStorms,
  onOpenStormTracker,
  activeRegion,
  onSelectRegion,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationCoordinates[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Debounced search
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

  // Click outside listener for search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCity = (city: LocationCoordinates) => {
    onSelectLocation(city);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const layers: { id: WeatherLayerType; labelEn: string; labelFil: string; icon: React.ReactNode }[] = [
    { id: 'radar', labelEn: 'Rain Radar', labelFil: 'Radar ng Ulan', icon: <CloudRain className="w-3.5 h-3.5" /> },
    { id: 'wind', labelEn: 'Wind Flow', labelFil: 'Amihan & Habagat (Hangin)', icon: <Wind className="w-3.5 h-3.5" /> },
    { id: 'temperature', labelEn: 'Temperature', labelFil: 'Temperatura', icon: <Thermometer className="w-3.5 h-3.5" /> },
    { id: 'satellite', labelEn: 'Satellite', labelFil: 'Satelayt ng Ulap', icon: <Satellite className="w-3.5 h-3.5" /> },
    { id: 'clouds', labelEn: 'Cloud Cover', labelFil: 'Kapal ng Ulap', icon: <Cloud className="w-3.5 h-3.5" /> },
  ];

  const baseStyles: { id: MapBaseStyle; label: string }[] = [
    { id: 'satellite', label: 'Satellite' },
    { id: 'streets', label: 'Street View' },
  ];

  return (
    <header className="fixed top-3 inset-x-3 md:inset-x-6 z-[600] flex flex-col gap-2 pointer-events-none">
      {/* Top Navbar Row */}
      <div className="flex items-center justify-between gap-2 w-full">
        
        {/* Left: Brand Identity & PH Live Tag */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 px-3 py-2 rounded-2xl shadow-xl shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="absolute w-4 h-4 rounded-full bg-emerald-400/40 animate-ping" />
            </div>
            <div>
              <div className="font-extrabold tracking-tight text-white text-sm md:text-base leading-none flex items-center gap-1.5">
                <span>AuraCast PH</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 hidden sm:inline">
                  PILIPINAS
                </span>
              </div>
              <div className="text-[9px] uppercase tracking-wider text-cyan-400 font-mono font-medium">
                {lang === 'fil' ? 'Realtime Panahon sa Pilipinas' : 'Philippine Realtime Weather'}
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* PAR Storm Tracker Alert Button */}
          {activeStorms.length > 0 && (
            <button
              onClick={onOpenStormTracker}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-semibold transition-all group shrink-0"
              title="PAGASA & PAR Cyclone Monitoring"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">
                {lang === 'fil' ? `${activeStorms.length} Bagyo / LPA sa PAR` : `${activeStorms.length} PAR Tropical Alert`}
              </span>
              <span className="sm:hidden font-mono text-[10px]">PAR ({activeStorms.length})</span>
            </button>
          )}
        </div>

        {/* Center: Search Bar with Autocomplete Dropdown */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-md pointer-events-auto">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder={lang === 'fil' ? 'Maghanap sa Pilipinas (e.g. Baguio, Cebu, Davao, Palawan...)' : 'Search city or town in the Philippines...'}
              className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl pl-10 pr-20 py-2.5 text-xs md:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 shadow-xl transition-all"
            />

            <div className="absolute right-2 flex items-center gap-1">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {isSearching && (
                <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              )}
              <button
                onClick={onUseCurrentLocation}
                disabled={isLocating}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 transition-colors"
                title={lang === 'fil' ? 'Aking Lokasyon sa Pilipinas (GPS)' : 'Locate My Position in PH'}
              >
                <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Autocomplete Dropdown List with Philippine grouping */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-xs z-[650] max-h-80 overflow-y-auto custom-scrollbar">
              {searchResults.length > 0 ? (
                <div className="p-1.5 space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    {lang === 'fil' ? 'Resulta ng Paghahanap sa Pilipinas' : 'Philippine Search Results'}
                  </div>
                  {searchResults.map((city, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectCity(city)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 flex items-center justify-between text-slate-200 transition-colors"
                    >
                      <div className="truncate">
                        <span className="font-semibold text-white">{city.name}</span>
                        {city.admin1 && <span className="text-slate-400">, {city.admin1}</span>}
                      </div>
                      <span className="text-[10px] text-cyan-400/80 font-mono shrink-0 ml-2">
                        {city.lat.toFixed(2)}°N, {city.lon.toFixed(2)}°E
                      </span>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 && !isSearching ? (
                <div className="p-4 text-center text-slate-400">
                  {lang === 'fil' ? 'Walang nahanap na bayan o lungsod.' : 'No locations found in the Philippines.'}
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  <div className="px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    {lang === 'fil' ? 'Mga Lungsod at Lalawigan sa Pilipinas' : 'Major Philippine Cities'}
                  </div>

                  {/* Grouped by Luzon, Visayas, Mindanao */}
                  {(['luzon', 'visayas', 'mindanao'] as const).map((group) => {
                    const groupTitle = group === 'luzon' ? '⛰️ Luzon' : group === 'visayas' ? '🏖️ Visayas' : '🌴 Mindanao';
                    const groupCities = PHILIPPINE_CITIES.filter((c) => c.islandGroup === group).slice(0, 4);

                    return (
                      <div key={group} className="space-y-1">
                        <div className="text-[10px] font-semibold text-cyan-400 px-2">{groupTitle}</div>
                        <div className="grid grid-cols-2 gap-1">
                          {groupCities.map((city, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSelectCity(city)}
                              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors truncate flex items-center gap-1.5"
                            >
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <div className="truncate">
                                <span className="font-medium text-white block truncate">{city.name}</span>
                                <span className="text-[9px] text-slate-400 block truncate">{city.admin1}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Base Style & Quick Settings */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 p-1.5 rounded-2xl shadow-xl shrink-0">
          
          {/* Base Map Switcher */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl">
            {baseStyles.map((b) => (
              <button
                key={b.id}
                onClick={() => onChangeBaseStyle(b.id)}
                className={`px-2 py-1 text-[11px] rounded-lg font-medium transition-all ${
                  baseStyle === b.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Unit Toggle */}
          <button
            onClick={onToggleTempUnit}
            className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-mono text-xs font-bold text-slate-200 transition-colors"
            title="Celsius / Fahrenheit"
          >
            {tempUnit === 'celsius' ? '°C' : '°F'}
          </button>

          {/* Language Toggle (FIL / EN) */}
          <button
            onClick={onToggleLang}
            className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-cyan-400 transition-colors flex items-center gap-1"
            title="Wika (Filipino / English)"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Settings button */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-xl border transition-colors ${
                showSettings
                  ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Map & Unit Settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {showSettings && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 space-y-3 z-[650] text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                    {lang === 'fil' ? 'Bilis ng Hangin' : 'Wind Speed Unit'}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['kmh', 'mph', 'knots'] as SpeedUnit[]).map((u) => (
                      <button
                        key={u}
                        onClick={() => onChangeSpeedUnit(u)}
                        className={`py-1 rounded text-center font-mono ${
                          speedUnit === u
                            ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                    {lang === 'fil' ? 'Istilo ng Mapa' : 'Map Base Layer'}
                  </div>
                  <div className="space-y-1">
                    {baseStyles.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          onChangeBaseStyle(b.id);
                          setShowSettings(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                          baseStyle === b.id
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span>{b.label}</span>
                        {baseStyle === b.id && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Philippine Island Group Selector & Weather Layers */}
      <div className="flex items-center justify-between gap-2 pointer-events-auto overflow-x-auto py-1 px-0.5 custom-scrollbar">
        {/* Island Group Jump Bar */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 p-1 rounded-2xl shadow-xl shrink-0">
          {PHILIPPINE_REGIONS.map((reg) => (
            <button
              key={reg.id}
              onClick={() => onSelectRegion(reg)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeRegion === reg.id
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{reg.id === 'ph' ? '🇵🇭' : reg.id === 'luzon' ? '⛰️' : reg.id === 'visayas' ? '🏖️' : '🌴'}</span>
              <span>{lang === 'fil' ? reg.labelFil : reg.labelEn}</span>
            </button>
          ))}
        </div>

        {/* Weather Layer Switcher Bar */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 p-1 rounded-2xl shadow-xl shrink-0">
          {layers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => onChangeLayer(layer.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeLayer === layer.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {layer.icon}
              <span>{lang === 'fil' ? layer.labelFil : layer.labelEn}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
