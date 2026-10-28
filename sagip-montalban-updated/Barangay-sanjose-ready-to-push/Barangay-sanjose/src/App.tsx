import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { DesktopRail } from './components/DesktopRail';
import { Sidebar } from './components/Sidebar';
import { MapViewer } from './components/MapViewer';
import { AddHazardModal } from './components/AddHazardModal';
import { EmergencyHotlinesModal } from './components/EmergencyHotlinesModal';
import { PagasaFloodStatus } from './components/PagasaFloodStatus';
import { EvacuationCentersModal } from './components/EvacuationCentersModal';
import { UpdatesModal } from './components/UpdatesModal';
import { ResolvedModal } from './components/ResolvedModal';
import { HistoryModal } from './components/HistoryModal';
import { LocationPickerModal } from './components/LocationPickerModal';
import { HazardAlert, MapSettings, HazardType, HazardStatus } from './types';
import { SAN_JOSE_POLYGON_COORDS } from './data/geoData';
import { DEFAULT_MAP_DISPLAY, type OperationsData } from './admin/types';
import { isDemoMode, readDemoData, loadPublicData, visibleHazards, submitCommunityReport, OPERATIONS_CHANGED_EVENT } from './services/operationsService';
import { useFloodStatus } from './hooks/useFloodStatus';
import { classifyFloodLevel, SAN_JOSE_BRIDGE_COORDS, AUTO_FLOOD_ALERT_ID } from './lib/flood';
import { readRefreshView } from './lib/refreshView';
// The admin workspace is loaded only after the secret door opens, so the
// public page never pays for the dashboard code.
const AdminWorkspace = React.lazy(() => import('./admin/AdminApp').then(module => ({ default: module.AdminWorkspace })));
import { ADMIN_GATE_EVENT, isAdminUnlocked, lockAdmin } from './admin/gate';

export default function App() {
  const demo = isDemoMode();
  const [operations, setOperations] = useState<OperationsData>(() => demo ? readDemoData() : {
    hazards: [], map: DEFAULT_MAP_DISPLAY, evacuationCenters: [], emergencyContacts: [], liveStreamUrl: '', places: [], activity: [],
  });
  const [dataError, setDataError] = useState('');
  const [reportNotice, setReportNotice] = useState('');
  const [autoFloodAlert, setAutoFloodAlert] = useState<HazardAlert | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<HazardAlert | null>(null);
  // Secret admin door: the feed search box reveals the sign-in card, and a
  // successful unlock mounts the full admin workspace over the site.
  const [adminOpen, setAdminOpen] = useState(false);
  useEffect(() => {
    if (!isAdminUnlocked()) setAdminOpen(false);
  }, []);
  useEffect(() => {
    const onChange = () => { if (!isAdminUnlocked()) setAdminOpen(false); };
    window.addEventListener(ADMIN_GATE_EVENT, onChange);
    return () => window.removeEventListener(ADMIN_GATE_EVENT, onChange);
  }, []);

  // Published changes are shared across browsers through Supabase. In the
  // clearly labelled demo they are shared only between tabs of this browser.
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const next = await loadPublicData();
        if (alive) { setOperations(next); setDataError(''); }
      } catch {
        if (alive) {
          // Do not silently present demo data as live data when the backend fails.
          setOperations(current => ({ ...current, hazards: [] }));
          setDataError('Hindi ma-load ang pinakabagong incidents. Subukan muli o makipag-ugnayan sa barangay.');
        }
      }
    };
    void refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener(OPERATIONS_CHANGED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { alive = false; window.removeEventListener('storage', refresh); window.removeEventListener(OPERATIONS_CHANGED_EVENT, refresh); window.removeEventListener('focus', refresh); window.clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!reportNotice) return;
    const timer = window.setTimeout(() => setReportNotice(''), 6500);
    return () => window.clearTimeout(timer);
  }, [reportNotice]);

  const alerts = useMemo(() => {
    const published = visibleHazards(operations);
    if (autoFloodAlert && operations.map.showPagasa && operations.map.types.flood) return [autoFloodAlert, ...published];
    return published;
  }, [operations, autoFloodAlert]);
  useEffect(() => {
    if (selectedAlert && !alerts.some(alert => alert.id === selectedAlert.id)) setSelectedAlert(null);
  }, [alerts, selectedAlert]);

  // Modals state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isHotlinesModalOpen, setIsHotlinesModalOpen] = useState(false);
  const [isEvacuationModalOpen, setIsEvacuationModalOpen] = useState(false);
  const [isUpdatesModalOpen, setIsUpdatesModalOpen] = useState(false);
  const [isResolvedModalOpen, setIsResolvedModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAddingPinMode, setIsAddingPinMode] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [pickedCoordinates, setPickedCoordinates] = useState<[number, number] | null>(null);
  // "Desktop layout" is now LANDSCAPE from 480px up (see the DEVICE PROFILES
  // block in index.css): the feed starts OPEN, docked next to the rail, and
  // the round chevron under zoom-out closes it. Every PORTRAIT view — phone or
  // tablet — starts with the drawer shut, opened by its own `‹` handle.
  // This is the JS twin of those media queries, so it must match them exactly.
  const isDesktopFeedViewport = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(orientation: landscape) and (min-width: 480px)').matches;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(isDesktopFeedViewport);
  const [recenterCount, setRecenterCount] = useState(0);
  
  // The broadcast link is managed centrally by the administrator.
  const liveStreamUrl = operations.liveStreamUrl;

  // Map and GIS settings
  const [mapSettings, setMapSettings] = useState<MapSettings>({
    maskOpacity: 0.30, // Default 30% blackout for surrounding areas (San Mateo, Macabud, Burgos, QC)
    maskColor: '#000000',
    tileLayer: 'streets',
    showBoundaryStroke: true,
    boundaryColor: '#10b981',
    showSitioLabels: false,
    lockCameraToBounds: true,
    autoCenterOnSelect: true,
    activeFilterType: 'all',
    activeFilterStatus: 'all',
  });

  const handleUpdateMapSettings = (partial: Partial<MapSettings>) => {
    setMapSettings((prev) => ({ ...prev, ...partial }));
  };

  // Consistent keyboard behavior across every dialog and mobile drawer.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileMenuOpen(false);
      setIsReportModalOpen(false);
      setIsHotlinesModalOpen(false);
      setIsEvacuationModalOpen(false);
      setIsUpdatesModalOpen(false);
      setIsResolvedModalOpen(false);
      setIsHistoryModalOpen(false);
      setIsLocationPickerOpen(false);
      setIsAddingPinMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ---- AUTOMATIC PAGASA FLOOD PIN ----
  const floodStatus = useFloodStatus();

  useEffect(() => {
    if (!floodStatus.data || !floodStatus.data.stations?.length) { setAutoFloodAlert(null); return; }
    const station = floodStatus.data.stations[0];
    const level = classifyFloodLevel(station);
    const displayName = station.landmark || station.name || 'San Jose Bridge';
    if (level !== 'watch' && level !== 'alarm' && level !== 'critical') { setAutoFloodAlert(null); return; }
    const severity = level === 'critical' ? 'critical' : level === 'alarm' ? 'high' : 'moderate';
    setAutoFloodAlert({
      id: AUTO_FLOOD_ALERT_ID, type: 'flood',
      title: `${level.toUpperCase()} — ${displayName} Water Level (Live PAGASA)`,
      streetName: `${displayName}, Rodriguez Highway`, sitio: `${displayName} Crossing`,
      coordinates: SAN_JOSE_BRIDGE_COORDS, timeReported: 'Automatic — PAGASA FFWS',
      status: 'active', severity,
      description: `Automatic reading from PAGASA's river gauge at ${displayName}: current water level is ${station.currentLevel}${station.unit || 'm'} (Watch ${station.alertLevel}${station.unit || 'm'} / Alarm ${station.alarmLevel}${station.unit || 'm'} / Critical ${station.criticalLevel}${station.unit || 'm'}).`,
      reportedBy: 'PAGASA FFWS (Automatic Feed)', updatesCount: 0,
      lastUpdated: floodStatus.data.fetchedAt ? new Date(floodStatus.data.fetchedAt).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true }) : undefined,
    });
  }, [floodStatus.data]);

  const handleSelectAlert = (alert: HazardAlert | null) => {
    setSelectedAlert(alert);
    if (alert && window.innerWidth < 1024) {
      setMobileMenuOpen(false); // Close mobile drawer when selecting from sidebar
    }
  };

  const handleAddAlert = async (newAlertData: Omit<HazardAlert, 'id' | 'timeReported'>) => {
    await submitCommunityReport(newAlertData);
    setReportNotice(demo
      ? 'Demo report submitted for admin review on this browser only.'
      : 'Naipadala ang report. Lalabas ito sa mapa kapag na-review at na-publish ng admin.');
  };

  const handleMapClickCoordinate = (coords: [number, number]) => {
    setPickedCoordinates(coords);
    setIsAddingPinMode(false);
    setIsReportModalOpen(true);
  };

  // True while the Flood Prone map is open — used to gate navbar actions.
  const [floodProneOpen, setFloodProneOpen] = useState(false);
  // True while the realtime Traffic map is open — also gates navbar actions.
  const [trafficOpen, setTrafficOpen] = useState(false);
  // True while the Help Center view (independent Traffic duplicate) is open.
  const [helpCenterOpen, setHelpCenterOpen] = useState(false);
  // True while the Weather view (the AuraCast app) is open — also gates navbar actions.
  // Seed from the refresh snapshot so the Hazard Map's sidebar arrow is never
  // briefly rendered over Weather during a direct/reloaded Weather entry.
  const [weatherOpen, setWeatherOpen] = useState(() => readRefreshView() === 'weather');
  // Alternate map modes replace the map content entirely — the hazard map's
  // incident feed is NOT part of them (see incidentFeedsVisible below).
  const alternateMapOpen = floodProneOpen || trafficOpen || helpCenterOpen || weatherOpen;

  // THE INCIDENT FEED BELONGS TO THE HAZARD MAP ONLY.
  // Traffic, Flood Prone, Help Center and Weather replace the map and carry
  // their own UI, so the feed panel is not mounted there at all — no card, no
  // list, no mobile arrow. Back on the hazard map it is always docked.
  const incidentFeedsVisible = !alternateMapOpen;

  // Leaving the hazard map unmounts the feed, so forget the phone drawer state
  // too: coming back should start with the map, not a stale open drawer.
  // Back ON the hazard map, laptop/desktop shows the feed open again (that is
  // its resting state); phones keep starting from the map.
  useEffect(() => {
    if (!incidentFeedsVisible) setMobileMenuOpen(false);
    else if (isDesktopFeedViewport()) setMobileMenuOpen(true);
  }, [incidentFeedsVisible]);

  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved');

  const handleFilterToResolved = () => {
    setMapSettings((prev) => ({ ...prev, activeFilterStatus: 'resolved' }));
  };

  const handleOpenReportModal = () => {
    setMobileMenuOpen(false);
    setPickedCoordinates(null);
    setIsReportModalOpen(true);
  };

  const handleResetMap = () => {
    setSelectedAlert(null);
    setMapSettings((prev) => ({
      ...prev,
      activeFilterType: 'all',
      activeFilterStatus: 'all',
    }));
    setRecenterCount((prev) => prev + 1);
  };

  return (
    // h-full resolves against the 100dvh html height fix in index.css — the
    // app always fits the phone screen with no cut-off or extra scrolling.
    <div className="flex flex-col h-full w-screen overflow-hidden bg-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navbar */}
      <Navbar
        alerts={alerts}
        onOpenReportModal={handleOpenReportModal}
        onOpenHotlinesModal={() => setIsHotlinesModalOpen(true)}
        onResetMap={handleResetMap}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        hasLiveUrl={!!liveStreamUrl}
        floodProneOpen={floodProneOpen}
        trafficOpen={trafficOpen}
        helpCenterOpen={helpCenterOpen}
        weatherOpen={weatherOpen}
        onOpenUpdates={() => setIsUpdatesModalOpen(true)}
        onOpenEvacuationCenters={() => setIsEvacuationModalOpen(true)}
        onOpenResolvedCleared={() => setIsResolvedModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        feedsVisible={incidentFeedsVisible}
      />

      {incidentFeedsVisible && (demo || dataError) && <div role="status" className="shrink-0 px-3 py-1.5 text-center text-[10px] font-semibold bg-amber-50 text-amber-800 border-b border-amber-200">
        {dataError || 'DEMO ONLY · Sample incidents and local changes are not live barangay reports.'}
      </div>}
      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Google-Maps-style icon rail. Renders on laptop/desktop widths only
            (all of its CSS sits behind @media (min-width: 1024px)), so the
            Android/iPhone portrait layout is untouched. */}
        <DesktopRail />

        {/* Left Sidebar (Alerts Feed & GIS Controls) — HAZARD MAP ONLY. */}
        {incidentFeedsVisible && (
          <div
            id="app-sidebar-panel"
            className={`fixed top-16 max-sm:portrait:top-13 bottom-0 left-0 ${!isReportModalOpen && !isLocationPickerOpen ? 'z-[70]' : 'z-0'} w-80 sm:w-96 transform transition-transform duration-300 ease-in-out lg:w-[25rem] lg:relative lg:inset-y-0 lg:z-auto lg:h-full lg:min-h-0 lg:translate-x-0 app-feed-outer ${
              mobileMenuOpen ? 'translate-x-0 is-feed-open' : '-translate-x-full'
            }`}
          >
            {/* The feed sits inside the outer card as an inner card. */}
            <div className="app-feed-inner">
              {/* On mobile portrait the Sidebar also carries the ●●● options menu
                  (the Navbar hides its own copy of that button there). */}
              <Sidebar
                alerts={alerts}
                selectedAlert={selectedAlert}
                onSelectAlert={handleSelectAlert}
                onOpenReportModal={handleOpenReportModal}
                onOpenHotlinesModal={() => setIsHotlinesModalOpen(true)}
                activeFilterType={mapSettings.activeFilterType}
                setActiveFilterType={(type) => handleUpdateMapSettings({ activeFilterType: type })}
                activeFilterStatus={mapSettings.activeFilterStatus}
                setActiveFilterStatus={(status) => handleUpdateMapSettings({ activeFilterStatus: status })}
                liveUrl={liveStreamUrl}
                        onClose={() => setMobileMenuOpen(false)}
                onOpenUpdates={() => setIsUpdatesModalOpen(true)}
                onOpenEvacuationCenters={() => setIsEvacuationModalOpen(true)}
                onOpenResolvedCleared={() => setIsResolvedModalOpen(true)}
                onOpenHistory={() => setIsHistoryModalOpen(true)}
                optionsDisabled={floodProneOpen || trafficOpen || helpCenterOpen || weatherOpen}
                onOpenAdmin={() => { setMobileMenuOpen(false); setAdminOpen(true); }}
              />

              {/* Paired with the feed itself: it exists exactly while the panel does. */}
              {!isReportModalOpen && !isLocationPickerOpen && <button
                id="btn-mobile-sidebar-toggle-arrow"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                title={mobileMenuOpen ? 'Close incident feeds' : 'Open incident feeds'}
                aria-label={mobileMenuOpen ? 'Close incident feeds' : 'Open incident feeds'}
                className="hidden portrait:flex sm:portrait:hidden absolute left-full ml-1.5 top-[44%] -translate-y-1/2 z-30 h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm transition-transform active:scale-90 cursor-pointer select-none"
              >
                <svg
                  viewBox="0 0 70 140"
                  className={`w-3 h-5 transition-transform duration-300 ${
                    mobileMenuOpen ? 'rotate-180' : 'rotate-0'
                  }`}
                  fill="#000000"
                >
                  <path d="M 16 18 C 12 10, 21 5, 27 11 L 62 64 C 66 68, 66 72, 62 76 L 27 129 C 21 135, 12 130, 16 122 L 38 73 C 40 71, 40 69, 38 67 Z" />
              </svg>
            </button>}
            </div>
          </div>
        )}

        {/* Backdrop for Mobile Sidebar */}
        {mobileMenuOpen && incidentFeedsVisible && (
          <div
            id="app-feed-backdrop"
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 top-16 max-sm:portrait:top-13 bottom-0 z-[65] bg-slate-900/50 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Center/Right Leaflet Map Viewport */}
        <main className="relative min-w-0 w-full flex-1 h-full">
          <MapViewer
            alerts={alerts}
            selectedAlert={selectedAlert}
            onSelectAlert={handleSelectAlert}
            mapSettings={mapSettings}
            onUpdateMapSettings={handleUpdateMapSettings}
            isAddingPinMode={isAddingPinMode}
            onMapClickCoordinate={handleMapClickCoordinate}
            recenterTrigger={recenterCount}
            onOpenMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
            isMobileMenuOpen={mobileMenuOpen}
            onFloodProneChange={setFloodProneOpen}
            onTrafficChange={setTrafficOpen}
            onHelpCenterChange={setHelpCenterOpen}
            onWeatherChange={setWeatherOpen}
          />
          {!alternateMapOpen && <PagasaFloodStatus />}
        </main>
      </div>

      {/* Add Hazard Incident Modal */}
      <AddHazardModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onAddAlert={handleAddAlert}
        selectedCoordinates={pickedCoordinates}
        onEnablePickCoordinateMode={() => {
          setIsAddingPinMode(false);
          setIsLocationPickerOpen(true);
        }}
      />
      <LocationPickerModal
        isOpen={isLocationPickerOpen}
        initialCoordinates={pickedCoordinates}
        onClose={() => setIsLocationPickerOpen(false)}
        onSelect={(coordinates) => {
          setPickedCoordinates(coordinates);
          setIsLocationPickerOpen(false);
          setIsReportModalOpen(true);
        }}
      />

      {/* Emergency Hotlines Directory Modal */}
      <EmergencyHotlinesModal
        isOpen={isHotlinesModalOpen}
        onClose={() => setIsHotlinesModalOpen(false)}
        contacts={operations.emergencyContacts}
      />

      {/* Evacuation Centers Directory Modal */}
      <EvacuationCentersModal
        isOpen={isEvacuationModalOpen}
        onClose={() => setIsEvacuationModalOpen(false)}
        centers={operations.evacuationCenters}
      />

      {/* Live Updates / Activity Feed Modal */}
      <UpdatesModal
        isOpen={isUpdatesModalOpen}
        onClose={() => setIsUpdatesModalOpen(false)}
        alerts={alerts}
        onOpenReportModal={() => {
          setIsUpdatesModalOpen(false);
          handleOpenReportModal();
        }}
        hasLiveUrl={!!liveStreamUrl}
      />

      {reportNotice && <div role="status" className="fixed bottom-5 right-5 z-[200] max-w-sm rounded-xl bg-emerald-800 px-4 py-3 text-xs font-semibold text-white shadow-lg">{reportNotice}</div>}

      {/* Resolved / Cleared Hazards Modal */}
      <ResolvedModal
        isOpen={isResolvedModalOpen}
        onClose={() => setIsResolvedModalOpen(false)}
        resolvedAlerts={resolvedAlerts}
        onFilterToResolved={handleFilterToResolved}
        onSelectAlert={handleSelectAlert}
      />

      {/* Secret-door admin workspace (mounted only after unlock) */}
      {adminOpen && <React.Suspense fallback={null}><AdminWorkspace
        embedded
        gateUnlocked
        onExit={() => {
          setAdminOpen(false);
          // Back on the hazard map, laptop/desktop shows the feed open again.
          if (isDesktopFeedViewport()) setMobileMenuOpen(true);
          // Leaving the workspace ends this browser's admin session.
          if (!isDemoMode()) lockAdmin();
        }}
      /></React.Suspense>}

      {/* Full Incident History Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        alerts={alerts}
      />
    </div>
  );
}
