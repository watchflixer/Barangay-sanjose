import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  MapPin, 
  PlusCircle, 
  PhoneCall, 
  Menu, 
  X,
  Flame,
  Droplets,
  Zap,
  Waves,
  LightbulbOff,
  RefreshCw,
  BellRing,
  Building2,
  CheckCircle2,
  History
} from 'lucide-react';
import { HazardAlert } from '../types';

interface NavbarProps {
  alerts: HazardAlert[];
  onOpenReportModal: () => void;
  onOpenHotlinesModal: () => void;
  onResetMap: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  hasLiveUrl?: boolean;
  /** Flood Prone map is open — disables Report/●●● on mobile portrait. */
  floodProneOpen?: boolean;
  onOpenLiveModal?: () => void;
  onOpenUpdates?: () => void;
  onOpenEvacuationCenters?: () => void;
  onOpenResolvedCleared?: () => void;
  onOpenHistory?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  alerts,
  onOpenReportModal,
  onOpenHotlinesModal,
  onResetMap,
  mobileMenuOpen,
  setMobileMenuOpen,
  hasLiveUrl = false,
  floodProneOpen = false,
  onOpenLiveModal = () => {},
  onOpenUpdates = () => {},
  onOpenEvacuationCenters = () => {},
  onOpenResolvedCleared = () => {},
  onOpenHistory = () => {},
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState<boolean>(false);
  // Tracks portrait orientation so flood-prone gating only applies on
  // Android/iPhone portrait views, never on desktop.
  const [isPortrait, setIsPortrait] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches
  );
  const menuDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(orientation: portrait)');
    const handleChange = (event: MediaQueryListEvent) => setIsPortrait(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  // Close the ●●● dropdown when the Flood Prone map disables it on portrait.
  useEffect(() => {
    if (floodProneOpen && isPortrait) setIsMenuDropdownOpen(false);
  }, [floodProneOpen, isPortrait]);

  const handleRecenter = () => {
    setIsSpinning(true);
    onResetMap();
    setTimeout(() => {
      setIsSpinning(false);
    }, 550);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuDropdownRef.current &&
        !menuDropdownRef.current.contains(event.target as Node)
      ) {
        setIsMenuDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const fireCount = activeAlerts.filter(a => a.type === 'fire').length;
  const floodCount = activeAlerts.filter(a => a.type === 'flood').length;
  const powerCount = activeAlerts.filter(a => a.type === 'power').length;
  const streetlightCount = activeAlerts.filter(a => a.type === 'streetlight').length;
  const waterCount = activeAlerts.filter(a => a.type === 'water').length;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs shrink-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Brand & Location Info */}
          <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0 tracking-wider">
              HS
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-800 leading-tight tracking-tight whitespace-nowrap">
                  HazardSync
                </h1>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Rizal</span>
                {/* Live clock beside “Rizal” — mobile phone views (narrow width or portrait) */}
                <span className="flex sm:hidden sm:portrait:flex items-center gap-1 normal-case tracking-tight text-slate-700 tabular-nums">
                  <span className="w-0.5 h-2.5 rounded-full bg-slate-300" />
                  {currentTime || 'PST'}
                </span>
              </p>
            </div>
          </div>

          {/* Center Quick Stats (Desktop) */}
          <div className="hidden lg:flex items-center gap-2 -mr-24">
            <div className="w-[480px] max-w-[480px] flex items-center justify-between bg-white px-3 py-1.5 rounded-md border border-slate-200 text-xs">
              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[11px] font-semibold text-black whitespace-nowrap">
                <Flame className="w-3 h-3 text-slate-700" />
                <span>{fireCount} Fire</span>
              </div>

              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[11px] font-semibold text-black whitespace-nowrap">
                <Waves className="w-3 h-3 text-slate-700" />
                <span>{floodCount} Flood</span>
              </div>

              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[11px] font-semibold text-black whitespace-nowrap">
                <Zap className="w-3 h-3 text-slate-700" />
                <span>{powerCount} No Power</span>
              </div>

              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[11px] font-semibold text-black whitespace-nowrap">
                <LightbulbOff className="w-3 h-3 text-slate-700" />
                <span>{streetlightCount} Streetlight</span>
              </div>

              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[11px] font-semibold text-black whitespace-nowrap">
                <Droplets className="w-3 h-3 text-slate-700" />
                <span>{waterCount} Water</span>
              </div>
            </div>
          </div>

          {/* Action Buttons — on mobile portrait the ●●● and Report buttons swap places */}
          <div className="flex items-center space-x-2 shrink-0 portrait:flex-row-reverse">
            <div className="hidden sm:flex h-8 items-center justify-center mr-4 sm:mr-5 text-slate-800 font-sans font-semibold text-xs tracking-tight tabular-nums whitespace-nowrap portrait:hidden">
              {currentTime || 'PST'}
            </div>

            {/* ●●● options menu beside Hotlines */}
            <div className="relative shrink-0" ref={menuDropdownRef}>
              <button
                onClick={() => setIsMenuDropdownOpen((prev) => !prev)}
                title="Options"
                disabled={floodProneOpen && isPortrait}
                className={`inline-flex h-8 items-center justify-center px-2 rounded-md border border-slate-200 transition-colors ${floodProneOpen && isPortrait ? 'cursor-not-allowed opacity-40' : 'hover:bg-slate-100 cursor-pointer'}`}
              >
                <span className="text-black font-black text-[10px] tracking-wider leading-none">
                  ●●●
                </span>
              </button>

              {isMenuDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsMenuDropdownOpen(false);
                        onOpenUpdates();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                    >
                      <BellRing className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Updates</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMenuDropdownOpen(false);
                        onOpenEvacuationCenters();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                    >
                      <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Evacuation Centers</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMenuDropdownOpen(false);
                        onOpenResolvedCleared();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Resolved / Cleared</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMenuDropdownOpen(false);
                        onOpenHistory();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                    >
                      <History className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>History</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              id="btn-emergency-hotlines"
              onClick={onOpenHotlinesModal}
              className="hidden sm:inline-flex h-8 items-center space-x-1.5 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
              <span>Hotlines</span>
            </button>

            <button
              id="btn-report-hazard"
              onClick={onOpenReportModal}
              disabled={floodProneOpen && isPortrait}
              className={`inline-flex items-center space-x-1.5 h-8 px-3 sm:px-3.5 text-xs font-semibold text-white bg-slate-900 rounded-md shadow-xs transition-all shrink-0 whitespace-nowrap ${floodProneOpen && isPortrait ? 'cursor-not-allowed opacity-40' : 'hover:bg-slate-800'}`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Report</span>
            </button>

            {/* Mobile Menu Toggle (hidden on Android/iPhone portrait view) */}
            <button
              id="btn-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="hidden sm:flex lg:hidden portrait:hidden sm:portrait:flex h-7 w-7 sm:h-8 sm:w-8 p-1 sm:p-2 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 border border-slate-200 shrink-0"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
