import React, { useState, useEffect } from 'react';
import {
  Radio,
  FileText,
  AlertTriangle,
  Waves,
  Clock,
  ShieldCheck,
  Search,
  Crosshair,
  X,
  Loader2,
  MapPin,
  HelpCircle,
} from 'lucide-react';
import { Language, LocationCoordinates, TemperatureUnit } from '../types/weather';
import { searchCities } from '../services/openMeteo';
import { PHILIPPINE_CITIES, PHILIPPINE_REGIONS, RegionPreset } from '../services/storms';

interface PagasaHeaderProps {
  onOpenBulletin: () => void;
  onOpenWarnings: () => void;
  onOpenGaleWarning: () => void;
  showRadarStations: boolean;
  onToggleRadarStations: () => void;
  activeRegion: string;
  onSelectRegion: (reg: RegionPreset) => void;
  onSelectLocation: (loc: LocationCoordinates) => void;
  onUseCurrentLocation: () => void;
  isLocating: boolean;
  lang: Language;
  onToggleLang: () => void;
  tempUnit: TemperatureUnit;
  onToggleTempUnit: () => void;
}

export const PagasaHeader: React.FC<PagasaHeaderProps> = ({
  onOpenBulletin,
  onOpenWarnings,
  onOpenGaleWarning,
  showRadarStations,
  onToggleRadarStations,
  activeRegion,
  onSelectRegion,
  onSelectLocation,
  onUseCurrentLocation,
  isLocating,
  lang,
  onToggleLang,
  tempUnit,
  onToggleTempUnit,
}) => {
  // Live Philippine Standard Time (PST: UTC+8)
  const [pstTime, setPstTime] = useState<string>('');
  const [pstDate, setPstDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format to Philippine Standard Time
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const dateStr = now.toLocaleDateString(lang === 'fil' ? 'fil-PH' : 'en-US', {
        timeZone: 'Asia/Manila',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      setPstTime(timeStr);
      setPstDate(dateStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lang]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationCoordinates[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

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
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="fixed top-0 inset-x-0 z-[600] flex flex-col pointer-events-none shadow-2xl">
      {/* 1. Official Government Topbar (Mandatory gov.ph masthead) */}
      <div className="w-full bg-[#001f3f] border-b border-[#003366] text-slate-200 px-3 md:px-6 py-1 flex items-center justify-between text-[11px] pointer-events-auto">
        <div className="flex items-center gap-2">
          {/* Philippine flag colors badge */}
          <div className="flex items-center gap-1 font-semibold text-xs tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white/50" />
            <span className="text-white font-bold">GOVPH</span>
          </div>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-300 hidden sm:inline font-sans">
            Republic of the Philippines · Department of Science and Technology (DOST)
          </span>
        </div>

        {/* Live Philippine Standard Time (PST) */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-amber-300">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-bold text-white hidden md:inline">Philippine Standard Time (PST):</span>
          <span className="font-bold tracking-wider">{pstTime}</span>
          <span className="text-slate-400 hidden lg:inline">({pstDate})</span>
        </div>
      </div>

      {/* 2. Main DOST-PAGASA & PANAHON.GOV.PH Title Banner */}
      <div className="w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-700/80 px-3 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* DOST-PAGASA Crest & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-blue-700 via-sky-600 to-amber-500 p-0.5 shadow-md flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center text-center">
              <span className="text-base font-black text-amber-400 leading-none">☀️</span>
              <span className="text-[7px] font-black text-cyan-300 uppercase tracking-tighter">PAGASA</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-xl font-black text-white tracking-tight flex items-center gap-1.5">
                <span className="text-cyan-400">PANAHON</span>
                <span className="text-slate-200">.GOV.PH</span>
              </h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-900/80 text-blue-200 border border-blue-500/50">
                DOST-PAGASA
              </span>
            </div>
            <p className="text-[10px] md:text-xs text-slate-300 font-medium">
              Philippine Atmospheric, Geophysical and Astronomical Services Administration
            </p>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="relative flex-1 max-w-sm min-w-[220px]">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search city or municipality in the Philippines..."
              className="w-full bg-slate-800/90 border border-slate-600/80 rounded-xl pl-8 pr-16 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
              {isSearching && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />}
              <button
                onClick={onUseCurrentLocation}
                disabled={isLocating}
                className="p-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-cyan-300"
                title="My Location (GPS)"
              >
                <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[700] max-h-72 overflow-y-auto custom-scrollbar text-xs">
              {searchResults.length > 0 ? (
                <div className="p-1">
                  {searchResults.map((city, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onSelectLocation(city);
                        setSearchQuery('');
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-800 rounded-lg flex items-center justify-between text-slate-200"
                    >
                      <span className="font-semibold">{city.name}</span>
                      <span className="text-[10px] text-slate-400">{city.admin1}</span>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 && !isSearching ? (
                <div className="p-3 text-center text-slate-400 text-xs">No locations found.</div>
              ) : (
                <div className="p-2 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase px-1">Popular Cities in the Philippines</div>
                  <div className="grid grid-cols-2 gap-1">
                    {PHILIPPINE_CITIES.slice(0, 6).map((city, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onSelectLocation(city);
                          setSearchQuery('');
                          setShowDropdown(false);
                        }}
                        className="text-left px-2 py-1 rounded bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs truncate"
                      >
                        {city.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0 text-xs">
          {/* Radar Towers button */}
          <button
            onClick={onToggleRadarStations}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 font-semibold transition-all ${
              showRadarStations
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md font-bold'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
            title="Toggle PAGASA Doppler Radar Station Towers and Coverage Rings"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Radar Stations</span>
          </button>

          {/* Bulletin button */}
          <button
            onClick={onOpenBulletin}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 font-semibold transition-colors"
            title="Official 24-Hour Public Weather Forecast Bulletin"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Public Bulletin</span>
          </button>

          {/* Heavy Rainfall & TCWS Warning Scale Modal button */}
          <button
            onClick={onOpenWarnings}
            className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 flex items-center gap-1.5 font-semibold transition-colors"
            title="PAGASA Severe Weather Warning Scale & Guidelines"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden lg:inline">Warnings</span>
          </button>

          {/* Gale Warning button */}
          <button
            onClick={onOpenGaleWarning}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 flex items-center gap-1.5 font-semibold transition-colors hidden sm:flex"
            title="Marine Gale Warning Advisory"
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Gale Warning</span>
          </button>

          {/* Unit & Lang */}
          <button
            onClick={onToggleTempUnit}
            className="px-2 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-mono font-bold text-slate-200"
          >
            {tempUnit === 'celsius' ? '°C' : '°F'}
          </button>
        </div>
      </div>

      {/* 3. PAGASA Synoptic Weather Situation Ticker & Island Groups */}
      <div className="w-full bg-[#001428] border-b border-blue-900/60 px-3 md:px-6 py-1.5 flex items-center justify-between gap-3 text-xs pointer-events-auto overflow-x-auto">
        {/* Island group tabs */}
        <div className="flex items-center gap-1 shrink-0 font-semibold text-[11px]">
          <span className="text-slate-400 text-[10px] uppercase font-bold mr-1 hidden sm:inline">Region:</span>
          {PHILIPPINE_REGIONS.map((reg) => (
            <button
              key={reg.id}
              onClick={() => onSelectRegion(reg)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeRegion === reg.id
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {reg.labelEn}
            </button>
          ))}
        </div>

        {/* Synoptic Situation Ticker */}
        <div className="flex-1 flex items-center gap-2 overflow-hidden text-[11px] text-slate-300 min-w-0">
          <span className="font-bold text-amber-400 shrink-0 uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            Synoptic Analysis:
          </span>
          <span className="truncate text-slate-200 font-mono">
            Northeast Monsoon (Amihan) affecting Northern Luzon · Easterlies prevailing across the rest of the country · No active tropical cyclone inside PAR · Warm and humid with isolated thunderstorms
          </span>
        </div>
      </div>
    </header>
  );
};
