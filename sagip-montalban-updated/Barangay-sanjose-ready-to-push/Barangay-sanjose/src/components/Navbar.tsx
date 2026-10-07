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
import { ReportButton } from './ReportButton';
import { HazardAlert } from '../types';

interface NavbarProps {
  alerts: HazardAlert[];
  onOpenReportModal: () => void;
  onOpenHotlinesModal: () => void;
  onResetMap: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  hasLiveUrl?: boolean;
  /** Flood Prone map is open — disables Report/●●● on ALL devices. */
  floodProneOpen?: boolean;
  /** Traffic map is open — also disables Report/●●● on ALL devices. */
  trafficOpen?: boolean;
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
  trafficOpen = false,
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
            {/* HazardSync mark — rounded delta with a monitoring dot and a
                shelter arch cut out of the base. Plain vector so it stays crisp
                at 32px (and can't be blown up by mobile font-boosting). */}
            <svg
              viewBox="0 0 32 32"
              className="h-8 w-8 shrink-0"
              role="img"
              aria-label="HazardSync"
              fill="#111827"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.15 5.35Q16 1.8 17.85 5.35L29.41 27.54Q30.8 30.2 27.8 30.2H4.2Q1.2 30.2 2.59 27.54L14.15 5.35Z M16 8.9a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Z M11.25 30.2V26.45a4.75 4.75 0 0 1 9.5 0V30.2H11.25Z"
              />
            </svg>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-800 leading-tight tracking-tight whitespace-nowrap">
                  HazardSync
                </h1>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Rizal</span>
                {/* Live clock beside “Rizal” — mobile phone views (narrow width or portrait).
                    On extra-narrow screens it steps aside so the Navbar buttons
                    (Buy Me a Coffee + Report) never overflow. */}
                <span className="flex sm:hidden sm:portrait:flex max-[400px]:hidden items-center gap-1 normal-case tracking-tight text-slate-700 tabular-nums">
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

          {/* Action Buttons — the ●●● button hides itself on mobile portrait,
              where it moves into the Incident Feeds header (Sidebar.tsx). */}
          <div className="flex items-center space-x-2 shrink-0 portrait:flex-row-reverse">
            <div className="hidden sm:flex h-8 items-center justify-center mr-4 sm:mr-5 text-slate-800 font-sans font-semibold text-xs tracking-tight tabular-nums whitespace-nowrap portrait:hidden">
              {currentTime || 'PST'}
            </div>

            {/* ●●● options menu. On mobile portrait (Android/iPhone) it is
                moved INSIDE the Incident Feeds header — see Sidebar.tsx. */}
            <OptionsMenu
              className="shrink-0 portrait:hidden"
              disabled={floodProneOpen || trafficOpen}
              onOpenUpdates={onOpenUpdates}
              onOpenEvacuationCenters={onOpenEvacuationCenters}
              onOpenResolvedCleared={onOpenResolvedCleared}
              onOpenHistory={onOpenHistory}
            />

            {/* Report — itim na plus sa puting bilog, katabi ng ●●●.
                Sa portrait phone ito ay naka-hide dito at lumalabas sa
                Incident Feeds header sa tabi ng ⋮ (Sidebar.tsx). */}
            <ReportButton
              id="btn-report-hazard"
              className="portrait:hidden"
              disabled={floodProneOpen || trafficOpen}
              onClick={onOpenReportModal}
            />

            {/* Donate — eksaktong dating DOM slot ng ●●● button.
                Portrait phone (row-reverse): nasa KANAN ito ng Report, kung
                saan mismo nakatayo ang ●●● noon — may maliit na espasyo sa
                kanan (portrait:mr-2.5 = 10px) para hindi dumikit sa gilid.
                Desktop/landscape: nasa tabi ng Report row. */}
            <DonateButton className="portrait:mr-5" />

            <button
              id="btn-emergency-hotlines"
              onClick={onOpenHotlinesModal}
              className="hidden sm:inline-flex h-8 items-center space-x-1.5 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
              <span>Hotlines</span>
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
