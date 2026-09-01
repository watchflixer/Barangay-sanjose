import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MapViewer } from './components/MapViewer';
import { AddHazardModal } from './components/AddHazardModal';
import { EmergencyHotlinesModal } from './components/EmergencyHotlinesModal';
import { LiveStreamModal } from './components/LiveStreamModal';
import { PagasaFloodStatus } from './components/PagasaFloodStatus';
import { HazardAlert, MapSettings, HazardType, HazardStatus } from './types';
import { INITIAL_HAZARDS, SAN_JOSE_POLYGON_COORDS } from './data/geoData';

export default function App() {
  const [alerts, setAlerts] = useState<HazardAlert[]>(INITIAL_HAZARDS);
  const [selectedAlert, setSelectedAlert] = useState<HazardAlert | null>(null);

  // Modals state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isHotlinesModalOpen, setIsHotlinesModalOpen] = useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [isAddingPinMode, setIsAddingPinMode] = useState(false);
  const [pickedCoordinates, setPickedCoordinates] = useState<[number, number] | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recenterCount, setRecenterCount] = useState(0);
  
  // STRICT USER DIRECTIVE: Default to NO live stream unless user explicitly provides/pastes a URL
  const [liveStreamUrl, setLiveStreamUrl] = useState<string>('');

  // Map and GIS settings
  const [mapSettings, setMapSettings] = useState<MapSettings>({
    maskOpacity: 0.90, // Default 90% blackout for surrounding areas (San Mateo, Macabud, Burgos, QC)
    maskColor: '#000000',
    tileLayer: 'streets',
    showBoundaryStroke: true,
    boundaryColor: '#10b981',
    showSitioLabels: true,
    lockCameraToBounds: true,
    autoCenterOnSelect: true,
    activeFilterType: 'all',
    activeFilterStatus: 'all',
  });

  const handleUpdateMapSettings = (partial: Partial<MapSettings>) => {
    setMapSettings((prev) => ({ ...prev, ...partial }));
  };

  const handleSelectAlert = (alert: HazardAlert | null) => {
    setSelectedAlert(alert);
    if (alert && window.innerWidth < 1024) {
      setMobileMenuOpen(false); // Close mobile drawer when selecting from sidebar
    }
  };

  const handleToggleAlertStatus = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) => {
        if (alert.id === id) {
          const newStatus: HazardStatus = alert.status === 'resolved' ? 'active' : 'resolved';
          return {
            ...alert,
            status: newStatus,
            lastUpdated: 'Just now',
          };
        }
        return alert;
      })
    );
  };

  const handleAddAlert = (newAlertData: Omit<HazardAlert, 'id' | 'timeReported'>) => {
    const newAlert: HazardAlert = {
      ...newAlertData,
      id: `hz-${Date.now().toString().slice(-4)}`,
      timeReported: 'Just now (Live Report)',
    };
    setAlerts((prev) => [newAlert, ...prev]);
    setSelectedAlert(newAlert);
  };

  const handleMapClickCoordinate = (coords: [number, number]) => {
    setPickedCoordinates(coords);
    setIsAddingPinMode(false);
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navbar */}
      <Navbar
        alerts={alerts}
        onOpenReportModal={() => {
          setPickedCoordinates(null);
          setIsReportModalOpen(true);
        }}
        onOpenHotlinesModal={() => setIsHotlinesModalOpen(true)}
        onResetMap={handleResetMap}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        hasLiveUrl={!!liveStreamUrl}
        onOpenLiveModal={() => setIsLiveModalOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (Alerts Feed & GIS Controls) */}
        <div
          className={`fixed inset-y-16 left-0 z-20 w-80 sm:w-96 transform transition-transform duration-300 ease-in-out lg:relative lg:inset-y-0 lg:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            alerts={alerts}
            selectedAlert={selectedAlert}
            onSelectAlert={handleSelectAlert}
            onToggleAlertStatus={handleToggleAlertStatus}
            onOpenReportModal={() => {
              setPickedCoordinates(null);
              setIsReportModalOpen(true);
            }}
            onOpenHotlinesModal={() => setIsHotlinesModalOpen(true)}
            activeFilterType={mapSettings.activeFilterType}
            setActiveFilterType={(type) => handleUpdateMapSettings({ activeFilterType: type })}
            activeFilterStatus={mapSettings.activeFilterStatus}
            setActiveFilterStatus={(status) => handleUpdateMapSettings({ activeFilterStatus: status })}
            liveUrl={liveStreamUrl}
            onOpenLiveModal={() => setIsLiveModalOpen(true)}
            onRemoveLive={() => setLiveStreamUrl('')}
          />
        </div>

        {/* Backdrop for Mobile Sidebar */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-10 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Center/Right Leaflet Map Viewport */}
        <main className="flex-1 h-full w-full relative">
          <MapViewer
            alerts={alerts}
            selectedAlert={selectedAlert}
            onSelectAlert={handleSelectAlert}
            onToggleAlertStatus={handleToggleAlertStatus}
            mapSettings={mapSettings}
            onUpdateMapSettings={handleUpdateMapSettings}
            isAddingPinMode={isAddingPinMode}
            onMapClickCoordinate={handleMapClickCoordinate}
            recenterTrigger={recenterCount}
          />
          <PagasaFloodStatus />
        </main>
      </div>

      {/* Add Hazard Incident Modal */}
      <AddHazardModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onAddAlert={handleAddAlert}
        selectedCoordinates={pickedCoordinates}
        onEnablePickCoordinateMode={() => setIsAddingPinMode(true)}
      />

      {/* Emergency Hotlines Directory Modal */}
      <EmergencyHotlinesModal
        isOpen={isHotlinesModalOpen}
        onClose={() => setIsHotlinesModalOpen(false)}
      />

      {/* Live Stream URL Link Modal */}
      <LiveStreamModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        currentLiveUrl={liveStreamUrl}
        onSaveLiveUrl={(url) => setLiveStreamUrl(url)}
      />
    </div>
  );
}
