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
  feedsVisible?: boolean;
  floodProneOpen?: boolean;
  trafficOpen?: boolean;
  helpCenterOpen?: boolean;
  weatherOpen?: boolean;
  reportCardOpen?: boolean;
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
  reportCardOpen = false,
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
      className="sticky top-0 z-30 shrink-0 border-b border-slate-200/80 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl"
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-2 sm:gap-4 portrait:h-13 sm:portrait:h-16">
          <button
            type="button"
            id="btn-brand-refresh"
            onClick={handleRefresh}
            title="Refresh"
            aria-label="Refresh page"
            className="group flex min-w-0 cursor-pointer items-center space-x-2.5 rounded-xl border border-slate-200/80 bg-white/80 px-2 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:space-x-3.5"
          >
            <svg
              viewBox="0 0 32 32"
              className="h-8 w-8 shrink-0 rounded-xl bg-slate-900/95 p-1.5 text-white portrait:h-7 portrait:w-7 sm:portrait:h-8 sm:portrait:w-8"
              role="img"
              aria-label="HazardSync"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.15 5.35Q16 1.8 17.85 5.35L29.41 27.54Q30.8 30.2 27.8 30.2H4.2Q1.2 30.2 2.59 27.54L14.15 5.35Z M16 8.9a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Z M11.25 30.2V26.45a4.75 4.75 0 0 1 9.5 0V30.2H11.25Z"
              />
            </svg>
            <span className="block min-w-0">
              <span className="flex items-center space-x-1.5 sm:space-x-2">
                <span
                  role="heading"
                  aria-level={1}
                  className="whitespace-nowrap text-sm font-extrabold leading-tight tracking-[-0.04em] text-slate-900 sm:text-base"
                >
                  HazardSync
                </span>
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                <span>Rizal</span>
                <span className="flex items-center gap-1 normal-case tracking-tight text-slate-700 tabular-nums whitespace-nowrap sm:hidden sm:portrait:flex">
                  <span className="h-2.5 w-0.5 rounded-full bg-slate-300" />
                  {currentTime || 'PST'}
                </span>
              </span>
            </span>
          </button>

          <div className="hidden items-center gap-2 lg:flex">
            <div className="flex w-[500px] max-w-[500px] items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-700">
                <Flame className="h-3.5 w-3.5 text-rose-500" />
                <span>{fireCount} Fire</span>
              </div>

              <div className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-700">
                <Waves className="h-3.5 w-3.5 text-blue-500" />
                <span>{floodCount} Flood</span>
              </div>

              <div className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-700">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>{powerCount} No Power</span>
              </div>

              <div className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-700">
                <LightbulbOff className="h-3.5 w-3.5 text-indigo-500" />
                <span>{streetlightCount} Streetlight</span>
              </div>

              <div className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-700">
                <Droplets className="h-3.5 w-3.5 text-cyan-500" />
                <span>{waterCount} Water</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center space-x-2 portrait:flex-row-reverse">
            <div className="hidden h-8 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-3 text-xs font-semibold tracking-tight text-slate-700 tabular-nums whitespace-nowrap shadow-sm sm:flex portrait:hidden">
              {currentTime || 'PST'}
            </div>

            <OptionsMenu
              className={`shrink-0 ${feedsVisible ? 'portrait:hidden' : ''}`}
              disabled={false}
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

            <DonateButton className="portrait:h-7 sm:portrait:h-8" disabled={reportCardOpen} />

            <button
              id="btn-emergency-hotlines"
              disabled={false}
              aria-label="Emergency hotlines"
              onClick={onOpenHotlinesModal}
              className="hidden h-8 items-center space-x-1.5 rounded-lg border bg-rose-50 px-3 text-xs font-bold text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100 sm:inline-flex"
            >
              <PhoneCall className="h-3.5 w-3.5 text-rose-500" />
              <span>Hotlines</span>
            </button>

            <button
              id="btn-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="hidden h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 sm:flex lg:hidden portrait:hidden sm:portrait:flex sm:h-8 sm:w-8 sm:p-2"
            >
              {mobileMenuOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};












































































































































































































