import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { OptionsMenu } from './OptionsMenu';
import { DonateButton } from './DonateButton';
import { GuideButton } from './GuideButton';
import { ReportButton } from './ReportButton';
import { HazardAlert } from '../types';
import { rememberRefreshView } from '../lib/refreshView';

interface NavbarProps {
  alerts: HazardAlert[];
  onOpenReportModal: () => void;
  onOpenHotlinesModal: () => void;
  onResetMap: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  hasLiveUrl?: boolean;
  /** True on the hazard map — the feed header then carries ●●● and Report on
   *  phones, so the navbar hides its own copies. False in Traffic / Flood
   *  Prone / Help Center / Weather, where there is no feed header at all and
   *  the navbar must show them instead. */
  feedsVisible?: boolean;
  /** Flood Prone map is open — disables Report/●●● on ALL devices. */
  floodProneOpen?: boolean;
  /** Traffic map is open — also disables Report/●●● on ALL devices. */
  trafficOpen?: boolean;
  /** Help Center view is open — also disables Report/●●● on ALL devices. */
  helpCenterOpen?: boolean;
  /** Weather view is open — also disables Report/●●● on ALL devices. */
  weatherOpen?: boolean;
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
  feedsVisible = true,
  floodProneOpen = false,
  trafficOpen = false,
  helpCenterOpen = false,
  weatherOpen = false,
  onOpenLiveModal = () => {},
  onOpenUpdates = () => {},
  onOpenEvacuationCenters = () => {},
  onOpenResolvedCleared = () => {},
  onOpenHistory = () => {},
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isSpinning, setIsSpinning] = useState<boolean>(false);

  const handleRecenter = () => {
    setIsSpinning(true);
    onResetMap();
    setTimeout(() => {
      setIsSpinning(false);
    }, 550);
  };

  // Brand click (HazardSync mark + wordmark) — i-reload ang buong app at
  // ibalik sa kasalukuyang map view (Traffic/Flood Prone) pagkatapos mag-refresh.
  // Sariwa ang data at hindi nawawala ang mga report (nasa localStorage sila).
  const handleRefresh = () => {
    const view = trafficOpen ? 'traffic' : helpCenterOpen ? 'helpcenter' : weatherOpen ? 'weather' : floodProneOpen ? 'flood' : 'main';
    rememberRefreshView(view);
    window.location.reload();
  };

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
    <header
      id="app-navbar"
      className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs shrink-0"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 portrait:h-13 sm:portrait:h-16 gap-2 sm:gap-4">
          <button
            type="button"
            id="btn-brand-refresh"
            onClick={handleRefresh}
            title="Refresh"
            aria-label="Refresh page"
            className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0 cursor-pointer rounded-md text-left transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            <svg
              viewBox="0 0 120 120"
              className="h-8 w-8 shrink-0 portrait:h-7 portrait:w-7 sm:portrait:h-8 sm:portrait:w-8"
              role="img"
              aria-label="HazardSync brand mark"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M60 10L100 90H20L60 10Z" fill="#111827" />
              <circle cx="60" cy="49" r="19" fill="#F8FAFC" />
              <path d="M48 68h24c4 0 8 4 8 8v4c0 4-4 8-8 8H48c-4 0-8-4-8-8v-4c0-4 4-8 8-8Z" fill="#111827"/>
            </svg>
            <span className="block min-w-0">
              <span className="flex items-center space-x-1.5 sm:space-x-2">
                <span
                  role="heading"
                  aria-level={1}
                  className="text-sm sm:text-base font-bold text-slate-800 leading-tight tracking-tight whitespace-nowrap"
                >
                  HazardSync
                </span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Rizal</span>
                <span className="flex sm:hidden sm:portrait:flex items-center gap-1 normal-case tracking-tight text-slate-700 tabular-nums whitespace-nowrap">
                  <span className="w-0.5 h-2.5 rounded-full bg-slate-300" />
                  {currentTime || 'PST'}
                </span>
              </span>
            </span>
          </button>

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

          <div className="flex items-center space-x-2 shrink-0 portrait:flex-row-reverse">
            <div className="hidden sm:flex h-8 items-center justify-center mr-4 sm:mr-5 text-slate-800 font-sans font-semibold text-xs tracking-tight tabular-nums whitespace-nowrap portrait:hidden sm:portrait:flex">
              {currentTime || 'PST'}
            </div>

            <OptionsMenu
              className={`shrink-0 ${feedsVisible ? 'portrait:hidden' : ''}`}
              disabled
              onOpenUpdates={onOpenUpdates}
              onOpenEvacuationCenters={onOpenEvacuationCenters}
              onOpenResolvedCleared={onOpenResolvedCleared}
              onOpenHistory={onOpenHistory}
            />

            <ReportButton
              id="btn-report-hazard"
              className={feedsVisible ? 'portrait:hidden' : ''}
              disabled={floodProneOpen || trafficOpen || helpCenterOpen || weatherOpen}
              onClick={onOpenReportModal}
            />

            <GuideButton className="ml-4 portrait:ml-0 portrait:mr-0.5 sm:portrait:mr-5 portrait:h-7 sm:portrait:h-8" />

            <DonateButton className="portrait:h-7 sm:portrait:h-8" />

            <button
              id="btn-emergency-hotlines"
              disabled
              aria-label="Hotlines temporarily unavailable"
              className="hidden sm:inline-flex h-8 items-center space-x-1.5 px-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md cursor-not-allowed"
            >
              <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
              <span>Hotlines</span>
            </button>

            <button
              id="btn-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="hidden sm:flex lg:hidden portrait:hidden sm:portrait:flex h-7 w-7 sm:h-8 sm:w-8 p-1 sm:p-2 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 border border-slate-200"
              type="button"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
