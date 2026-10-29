import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DesktopRail } from './components/DesktopRail';
import { Sidebar } from './components/Sidebar';
import { AdminPortal } from './components/AdminPortal';
import type { AdminChange } from './lib/admin';
import {
  useAdminWorkspace,
  usePublicFeed,
  signInAdmin,
  signOutAdmin,
  verifyAdminMfa,
} from './hooks/useSharedReports';
import { ResolveRequestDialog } from './components/ResolveRequestDialog';
import { MapViewer } from './components/MapViewer';
import { AddHazardModal } from './components/AddHazardModal';
import { EmergencyHotlinesModal } from './components/EmergencyHotlinesModal';
import { LiveStreamModal } from './components/LiveStreamModal';
import { PagasaFloodStatus } from './components/PagasaFloodStatus';
import { EvacuationCentersModal } from './components/EvacuationCentersModal';
import { UpdatesModal } from './components/UpdatesModal';
import { ResolvedModal } from './components/ResolvedModal';
import { HistoryModal } from './components/HistoryModal';
import { LocationPickerModal } from './components/LocationPickerModal';
import { HazardAlert, HazardDraft, MapSettings, HazardType, HazardStatus } from './types';
import { SAN_JOSE_POLYGON_COORDS } from './data/geoData';
import { useFloodStatus } from './hooks/useFloodStatus';
import { classifyFloodLevel, SAN_JOSE_BRIDGE_COORDS, AUTO_FLOOD_ALERT_ID } from './lib/flood';
import { readRefreshView } from './lib/refreshView';

export default function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  // On Cloudflare Pages this is only the proxy sentinel — the real credential
  // stays in the Function and arrives as an HttpOnly cookie. Locally it is the
  // `email:password` pair. Either way it lives in memory only.
  const [adminCredential, setAdminCredential] = useState<string | null>(null);
  const adminAuthenticated = !!adminCredential;
  const handleAdminExpired = useCallback(() => {
    setAdminCredential(null);
    setIsAdminOpen(false);
  }, []);
  const feed = usePublicFeed();
  const workspace = useAdminWorkspace(adminCredential, handleAdminExpired);
  // The PAGASA marker is generated live in the browser, not stored as a report.
  const [autoAlert, setAutoAlert] = useState<HazardAlert | null>(null);
  const alerts = useMemo(
    () => (autoAlert && !feed.hiddenTypes.includes('flood') ? [autoAlert, ...feed.reports] : feed.reports),
    [autoAlert, feed.reports, feed.hiddenTypes],
  );
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || null;
  const setSelectedAlert = (alert: HazardAlert | null) => setSelectedAlertId(alert?.id || null);

  const handleAdminChange = useCallback(
    async (id: string, change: AdminChange) => {
      if (!adminCredential) throw new Error('Sign in again to continue.');
      await workspace.change(id, change);
    },
    [adminCredential, workspace],
  );

  // Modals state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isHotlinesModalOpen, setIsHotlinesModalOpen] = useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
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

  // STRICT USER DIRECTIVE: Default to NO live stream unless user explicitly provides/pastes a URL
  const [liveStreamUrl, setLiveStreamUrl] = useState<string>(
    () => localStorage.getItem('san-jose-live-url') || '',
  );

  useEffect(() => {
    if (liveStreamUrl) localStorage.setItem('san-jose-live-url', liveStreamUrl);
    else localStorage.removeItem('san-jose-live-url');
  }, [liveStreamUrl]);

  // Map and GIS settings
  const [mapSettings, setMapSettings] = useState<MapSettings>({
    maskOpacity: 0.3, // Default 30% blackout for surrounding areas (San Mateo, Macabud, Burgos, QC)
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
      setIsLiveModalOpen(false);
      setIsEvacuationModalOpen(false);
      setIsUpdatesModalOpen(false);
      setIsResolvedModalOpen(false);
      setIsHistoryModalOpen(false);
      setIsAdminOpen(false);
      setIsLocationPickerOpen(false);
      setIsAddingPinMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ---- AUTOMATIC PAGASA FLOOD PIN ----
  const floodStatus = useFloodStatus();

  useEffect(() => {
    if (!floodStatus.data || !floodStatus.data.stations?.length) return;
    const station = floodStatus.data.stations[0];
    const level = classifyFloodLevel(station);
    const displayName = station.landmark || station.name || 'San Jose Bridge';

    if (level === 'watch' || level === 'alarm' || level === 'critical') {
      const severity = level === 'critical' ? 'critical' : level === 'alarm' ? 'high' : 'moderate';
      setAutoAlert({
        id: AUTO_FLOOD_ALERT_ID,
        type: 'flood',
        title: `${level.toUpperCase()} \u2014 ${displayName} Water Level (Live PAGASA)`,
        streetName: `${displayName}, Rodriguez Highway`,
        sitio: `${displayName} Crossing`,
        coordinates: SAN_JOSE_BRIDGE_COORDS,
        timeReported: 'Automatic \u2014 PAGASA FFWS',
        status: 'active',
        severity,
        description: `Automatic live reading from PAGASA's official river gauge at ${displayName}: current water level is ${station.currentLevel}${station.unit || 'm'} (Watch ${station.alertLevel}${station.unit || 'm'} / Alarm ${station.alarmLevel}${station.unit || 'm'} / Critical ${station.criticalLevel}${station.unit || 'm'}). This marker is generated automatically \u2014 not a manual report \u2014 and updates every 15 minutes.`,
        reportedBy: 'PAGASA FFWS (Automatic Real-Time Feed)',
        updatesCount: 0,
        lastUpdated: (() => {
          if (!floodStatus.data?.fetchedAt) return undefined;
          try {
            const d = new Date(floodStatus.data.fetchedAt);
            if (isNaN(d.getTime())) return undefined;
            return d.toLocaleTimeString('en-PH', {
              timeZone: 'Asia/Manila',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
          } catch {
            return undefined;
          }
        })(),
      });
    } else {
      setAutoAlert(null);
    }
  }, [floodStatus.data]);

  const handleSelectAlert = (alert: HazardAlert | null) => {
    setSelectedAlert(alert);
    if (alert && window.innerWidth < 1024) {
      setMobileMenuOpen(false); // Close mobile drawer when selecting from sidebar
    }
  };

  const [submissionNotice, setSubmissionNotice] = useState('');
  const [flagTarget, setFlagTarget] = useState<HazardAlert | null>(null);
  const [flagSaving, setFlagSaving] = useState(false);
  const [flagError, setFlagError] = useState('');

  const handleAddAlert = async (draft: HazardDraft) => {
    await feed.submit(draft);
    setSubmissionNotice(
      'Report received. Barangay admins will review it before it appears on the public map.',
    );
  };
  const handleAdminCreate = async (draft: HazardDraft) => {
    if (!adminCredential) return undefined;
    return workspace.create(draft);
  };
  const handleRequestResolved = (alert: HazardAlert) => {
    setFlagError('');
    setFlagTarget(alert);
  };
  const handleSubmitResolveFlag = async (note: string) => {
    if (!flagTarget) return;
    setFlagSaving(true);
    setFlagError('');
    try {
      await feed.flagResolved(flagTarget.id, note);
      setFlagTarget(null);
      setSubmissionNotice('Resolve request sent to the barangay admin for review.');
    } catch (cause) {
      setFlagError(cause instanceof Error ? cause.message : 'Could not send the request.');
    } finally {
      setFlagSaving(false);
    }
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
      <AdminPortal
        isOpen={isAdminOpen}
        authenticated={adminAuthenticated}
        onLogin={async (email, password) => {
          // Both fields are verified — by Supabase Auth first, then by the
          // Pages Function or the database against the stored pair.
          const result = await signInAdmin(email, password);
          if (result.ok && result.credential) setAdminCredential(result.credential);
          return { ok: result.ok, error: result.error, mfaRequired: result.mfaRequired };
        }}
        onVerify={async (code) => {
          // Second factor: the database refuses admin actions until this runs.
          const result = await verifyAdminMfa(code);
          if (result.ok && result.credential) setAdminCredential(result.credential);
          return { ok: result.ok, error: result.error, mfaRequired: result.mfaRequired };
        }}
        onLogout={() => {
          const credential = adminCredential;
          setAdminCredential(null);
          setIsAdminOpen(false);
          // Drop the session cookie and the cached reporter contact details.
          void signOutAdmin(credential);
        }}
        onClose={() => {
          setIsAdminOpen(false);
          // The map on this device should show the change an admin just made.
          void feed.refresh();
        }}
        alerts={workspace.reports}
        history={workspace.history}
        flags={workspace.flags}
        hiddenTypes={workspace.hiddenTypes}
        onChange={handleAdminChange}
        onCreate={handleAdminCreate}
        onReviewFlag={workspace.reviewFlag}
        onSetHiddenTypes={workspace.setHiddenTypes}
        syncError={workspace.error}
        loading={workspace.loading}
      />
      {feed.error && (
        <div
          role="status"
          className="fixed bottom-4 left-4 right-4 z-[1900] rounded-xl bg-amber-700 p-3 text-xs text-white shadow-xl"
        >
          {feed.error}
        </div>
      )}
      {submissionNotice && (
        <div
          role="status"
          className="fixed bottom-4 left-4 right-4 z-[1900] flex items-center justify-between gap-3 rounded-xl bg-slate-900 p-4 text-sm text-white shadow-xl"
        >
          {submissionNotice}
          <button
            type="button"
            aria-label="Dismiss report confirmation"
            onClick={() => setSubmissionNotice('')}
          >
            ×
          </button>
        </div>
      )}
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
        onOpenLiveModal={() => setIsLiveModalOpen(true)}
        onOpenUpdates={() => setIsUpdatesModalOpen(true)}
        onOpenEvacuationCenters={() => setIsEvacuationModalOpen(true)}
        onOpenResolvedCleared={() => setIsResolvedModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        feedsVisible={incidentFeedsVisible}
      />

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
                onOpenAdmin={() => setIsAdminOpen(true)}
                alerts={alerts}
                hiddenTypes={feed.hiddenTypes}
                selectedAlert={selectedAlert}
                onSelectAlert={handleSelectAlert}
                onRequestResolved={handleRequestResolved}
                onOpenReportModal={handleOpenReportModal}
                onOpenHotlinesModal={() => setIsHotlinesModalOpen(true)}
                activeFilterType={mapSettings.activeFilterType}
                setActiveFilterType={(type) => handleUpdateMapSettings({ activeFilterType: type })}
                activeFilterStatus={mapSettings.activeFilterStatus}
                setActiveFilterStatus={(status) => handleUpdateMapSettings({ activeFilterStatus: status })}
                liveUrl={liveStreamUrl}
                onOpenLiveModal={() => setIsLiveModalOpen(true)}
                onRemoveLive={() => setLiveStreamUrl('')}
                onClose={() => setMobileMenuOpen(false)}
                onOpenUpdates={() => setIsUpdatesModalOpen(true)}
                onOpenEvacuationCenters={() => setIsEvacuationModalOpen(true)}
                onOpenResolvedCleared={() => setIsResolvedModalOpen(true)}
                onOpenHistory={() => setIsHistoryModalOpen(true)}
                optionsDisabled={floodProneOpen || trafficOpen || helpCenterOpen || weatherOpen}
              />

              {/* Paired with the feed itself: it exists exactly while the panel does. */}
              {!isReportModalOpen && !isLocationPickerOpen && (
                <button
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
                </button>
              )}
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
            hiddenTypes={feed.hiddenTypes}
            selectedAlert={selectedAlert}
            onSelectAlert={handleSelectAlert}
            onRequestResolved={handleRequestResolved}
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
      <ResolveRequestDialog
        alert={flagTarget}
        saving={flagSaving}
        error={flagError}
        onClose={() => {
          if (!flagSaving) setFlagTarget(null);
        }}
        onSubmit={handleSubmitResolveFlag}
      />
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
      <EmergencyHotlinesModal isOpen={isHotlinesModalOpen} onClose={() => setIsHotlinesModalOpen(false)} />

      {/* Live Stream URL Link Modal */}
      <LiveStreamModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        currentLiveUrl={liveStreamUrl}
        onSaveLiveUrl={(url) => setLiveStreamUrl(url)}
      />

      {/* Evacuation Centers Directory Modal */}
      <EvacuationCentersModal
        isOpen={isEvacuationModalOpen}
        onClose={() => setIsEvacuationModalOpen(false)}
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
        onOpenLiveModal={() => {
          setIsUpdatesModalOpen(false);
          setIsLiveModalOpen(true);
        }}
        hasLiveUrl={!!liveStreamUrl}
      />

      {/* Resolved / Cleared Hazards Modal */}
      <ResolvedModal
        isOpen={isResolvedModalOpen}
        onClose={() => setIsResolvedModalOpen(false)}
        resolvedAlerts={resolvedAlerts}
        onFilterToResolved={handleFilterToResolved}
        onSelectAlert={handleSelectAlert}
      />

      {/* Full Incident History Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        alerts={alerts}
      />
    </div>
  );
}
