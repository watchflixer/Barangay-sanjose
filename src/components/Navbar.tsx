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
  onOpenUpdates: () => void;
  onOpenEvacuationCenters: () => void;
  onOpenResolvedCleared: () => void;
  onOpenHistory: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  alerts,
  onOpenReportModal,
  onOpenHotlinesModal,
  onResetMap,
  mobileMenuOpen,
  setMobileMenuOpen,
  onOpenUpdates,
  onOpenEvacuationCenters,
  onOpenResolvedCleared,
  onOpenHistory,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState<boolean>(false);
  const menuDropdownRef = useRef<HTMLDivElement>(null);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Location Info */}
          <div className="flex items-center space-x-3.5">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0 tracking-wider">
              SJ
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-slate-800 leading-tight tracking-tight">
                  Barangay San Jose
                </h1>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>San Jose, Rodriguez, Rizal</span>
              </p>
            </div>
          </div>

          {/* Center Quick Stats (Desktop) */}
          <div className="hidden lg:flex items-center space-x-2.5 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 text-xs">
            {/* Black ●●● Options Menu Button */}
            <div className="relative" ref={menuDropdownRef}>
              <button
                id="btn-options-dots"
                onClick={() => setIsMenuDropdownOpen((prev) => !prev)}
                title="Opsyon: Updates, Evacuation Centers, Resolved, History"
                className={`flex items-center justify-center px-2 py-0.5 rounded-md hover:bg-slate-200 transition-colors cursor-pointer select-none ${
                  isMenuDropdownOpen ? 'bg-slate-200' : ''
                }`}
              >
                <span className="text-black font-black text-xs tracking-wider leading-none">
                  ●●●
                </span>
              </button>

              {/* 4-Item Dropdown Menu */}
              {isMenuDropdownOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsMenuDropdownOpen(false);
                        onOpenUpdates();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <BellRing className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Updates</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMenuDropdownOpen(false);
                        onOpenEvacuationCenters();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Evacuation Centers</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMenuDropdownOpen(false);
                        onOpenResolvedCleared();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Resolved / Cleared</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMenuDropdownOpen(false);
                        onOpenHistory();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <History className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>History</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="h-3 w-px bg-slate-200"></div>

            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${fireCount > 0 ? 'bg-red-100 text-red-700' : 'text-slate-500'}`}>
              <Flame className="w-3 h-3 text-red-500" />
              <span>{fireCount} Fire</span>
            </div>

            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${floodCount > 0 ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}>
              <Waves className="w-3 h-3 text-blue-500" />
              <span>{floodCount} Flood</span>
            </div>

            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${powerCount > 0 ? 'bg-amber-100 text-amber-700' : 'text-slate-500'}`}>
              <Zap className="w-3 h-3 text-amber-500" />
              <span>{powerCount} No Power</span>
            </div>

            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${streetlightCount > 0 ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'}`}>
              <LightbulbOff className="w-3 h-3 text-indigo-600" />
              <span>{streetlightCount} Streetlight</span>
            </div>

            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${waterCount > 0 ? 'bg-cyan-100 text-cyan-700' : 'text-slate-500'}`}>
              <Droplets className="w-3 h-3 text-cyan-500" />
              <span>{waterCount} Water</span>
            </div>

            <div className="pl-2 border-l border-slate-200 text-slate-500 font-mono text-[11px]">
              {currentTime || 'PST'}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Mobile ●●● button so it's always accessible on mobile too */}
            <div className="lg:hidden relative">
              <button
                onClick={() => setIsMenuDropdownOpen((prev) => !prev)}
                title="Opsyon"
                className="p-2 rounded-md hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <span className="text-black font-black text-xs tracking-wider leading-none">
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
              id="btn-recenter-map"
              onClick={handleRecenter}
              title="Recenter Map"
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 transition-transform ${isSpinning ? 'animate-fast-spin text-slate-900' : 'text-slate-600'}`} />
            </button>

            <button
              id="btn-emergency-hotlines"
              onClick={onOpenHotlinesModal}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
              <span>Hotlines</span>
            </button>

            <button
              id="btn-report-hazard"
              onClick={onOpenReportModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pin Hazard</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              id="btn-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100 border border-slate-200"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

