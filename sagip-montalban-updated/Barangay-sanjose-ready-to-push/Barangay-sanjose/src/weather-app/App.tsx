/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Language,
  LocationCoordinates,
  MapBaseStyle,
  RainViewerData,
  RainViewerFrame,
  SpeedUnit,
  TemperatureUnit,
  TropicalStorm,
  WeatherDetails,
  WeatherLayerType,
} from './types/weather';
import { rainViewer } from './services/rainviewer';
import { fetchWeatherData, reverseGeocode } from './services/openMeteo';
import { MONITORED_STORMS } from './services/storms';
import { WeatherMap } from './components/WeatherMap';
import { PanahonMobileUI } from './components/PanahonMobileUI';
import { PagasaBulletinModal } from './components/PagasaBulletinModal';
import { PagasaWarningsModal } from './components/PagasaWarningsModal';
import { WeatherDrawer } from './components/WeatherDrawer';
import { StormTrackerModal } from './components/StormTrackerModal';

export default function App() {
  // Map View State (Centered on Luzon and Philippine Archipelago as shown in screenshot)
  const [center, setCenter] = useState<[number, number]>([15.5, 121.0]);
  const [zoom, setZoom] = useState<number>(6.5);

  // Layers & Aesthetics: Default Temperature Heatmap + Street/Satellite layer
  const [activeLayer, setActiveLayer] = useState<WeatherLayerType>('temperature');
  const [baseStyle, setBaseStyle] = useState<MapBaseStyle>('streets');
  const [radarOpacity, setRadarOpacity] = useState<number>(0.85);

  // Display & Overlays settings (Panahon authentic map settings)
  const [showRadarStations, setShowRadarStations] = useState<boolean>(true);
  const [showRadarRings, setShowRadarRings] = useState<boolean>(true);
  const [showElevation, setShowElevation] = useState<boolean>(true);
  const [showBathymetry, setShowBathymetry] = useState<boolean>(true);
  const [showIsolines, setShowIsolines] = useState<boolean>(true);
  const [showPAR, setShowPAR] = useState<boolean>(true);
  const [showCityLabels, setShowCityLabels] = useState<boolean>(true);

  // Distance Measurement tool
  const [isMeasureActive, setIsMeasureActive] = useState<boolean>(false);
  const [measuredDistanceKm, setMeasuredDistanceKm] = useState<number>(0);
  const [measurePointCount, setMeasurePointCount] = useState<number>(0);

  // Default English as requested
  const [lang] = useState<Language>('en');
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>('celsius');
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>('kmh');

  // Weather Details Drawer
  const [selectedLocation, setSelectedLocation] = useState<LocationCoordinates | null>(null);
  const [weatherDetails, setWeatherDetails] = useState<WeatherDetails | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState<boolean>(false);

  // RainViewer Radar Loop State
  const [radarData, setRadarData] = useState<RainViewerData | null>(null);
  const [radarFrames, setRadarFrames] = useState<RainViewerFrame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlayingRadar, setIsPlayingRadar] = useState<boolean>(false);
  const [radarSpeed, setRadarSpeed] = useState<number>(1);
  const [radarColorScheme, setRadarColorScheme] = useState<number>(2);

  // Storm / Typhoon Monitoring
  const [storms] = useState<TropicalStorm[]>(MONITORED_STORMS);
  const [isStormModalOpen, setIsStormModalOpen] = useState<boolean>(false);

  // Government Modal Dialogs
  const [isBulletinModalOpen, setIsBulletinModalOpen] = useState<boolean>(false);
  const [isWarningsModalOpen, setIsWarningsModalOpen] = useState<boolean>(false);
  const [warningsDefaultTab] = useState<'rainfall' | 'signals' | 'gale'>('rainfall');

  // Geolocation
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Initial Load of RainViewer Radar Data
  const loadRadar = useCallback(async () => {
    try {
      const data = await rainViewer.getRadarData();
      setRadarData(data);

      const frames =
        activeLayer === 'satellite'
          ? rainViewer.getSatelliteFrames(data)
          : rainViewer.getAllFrames(data);

      setRadarFrames(frames);
      const pastFrames = data.radar?.past || [];
      const defaultIndex = pastFrames.length > 0 ? pastFrames.length - 1 : frames.length - 1;
      setCurrentFrameIndex(Math.max(0, defaultIndex));
    } catch (err) {
      console.error('Error fetching radar:', err);
    }
  }, [activeLayer]);

  useEffect(() => {
    loadRadar();
    const interval = setInterval(loadRadar, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadRadar]);

  // 2. Load Weather Details for Selected Location
  const loadWeather = useCallback(async (loc: LocationCoordinates) => {
    setIsLoadingWeather(true);
    try {
      const data = await fetchWeatherData(loc.lat, loc.lon, loc.name, loc.country);
      setWeatherDetails(data);
      setIsDrawerOpen(true);
    } catch (err) {
      console.error('Weather load error:', err);
      showToast('Failed to load weather for this location.');
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  // 3. Radar Animation Loop
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPlayingRadar || radarFrames.length === 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const stepDuration = Math.round(750 / radarSpeed);
    const isAtEnd = currentFrameIndex >= radarFrames.length - 1;
    const delay = isAtEnd ? stepDuration * 2.2 : stepDuration;

    timerRef.current = setTimeout(() => {
      setCurrentFrameIndex((prev) => (prev >= radarFrames.length - 1 ? 0 : prev + 1));
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlayingRadar, currentFrameIndex, radarFrames.length, radarSpeed]);

  // 4. Handle Map Click anywhere in PH
  const handleMapClick = async (lat: number, lon: number) => {
    if (isMeasureActive) return; // Do not inspect when measuring

    setSelectedLocation({ lat, lon, name: 'Locating place...' });
    setIsDrawerOpen(true);

    try {
      const geo = await reverseGeocode(lat, lon);
      const newLoc: LocationCoordinates = {
        lat,
        lon,
        name: geo.name,
        country: geo.country || 'Philippines',
      };
      setSelectedLocation(newLoc);
      loadWeather(newLoc);
    } catch {
      const fallbackLoc: LocationCoordinates = {
        lat,
        lon,
        name: `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`,
        country: 'Philippines',
      };
      setSelectedLocation(fallbackLoc);
      loadWeather(fallbackLoc);
    }
  };

  // 5. Select predefined city or search result
  const handleSelectLocation = (loc: LocationCoordinates) => {
    setSelectedLocation(loc);
    setCenter([loc.lat, loc.lon]);
    setZoom(8.5);
    loadWeather(loc);
  };

  // 6. Use HTML5 Current Location (GPS)
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCenter([lat, lon]);
        setZoom(9.5);
        setIsLocating(false);

        const geo = await reverseGeocode(lat, lon);
        const loc: LocationCoordinates = {
          lat,
          lon,
          name: geo.name,
          country: geo.country || 'Philippines',
        };
        setSelectedLocation(loc);
        loadWeather(loc);
        showToast(`Located: ${geo.name}`);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        showToast('Unable to retrieve location. Please check browser permissions.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Zoom handlers for mobile ZoomIn / ZoomOut buttons
  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + 1, 16));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - 1, 5));
  };

  // Recenter to Entire Philippines
  const handleRecenterPhilippines = () => {
    setCenter([12.8797, 121.7740]);
    setZoom(6.2);
    showToast('Map centered to Entire Philippines');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#e07a2c] font-sans select-none">
      
      {/* 1. Exact Mobile Portrait UI from user's screenshot with Settings & Layers Cards */}
      <PanahonMobileUI
        activeLayer={activeLayer}
        onChangeLayer={(l) => {
          setActiveLayer(l);
          if (l === 'satellite' && radarData) {
            const satFrames = rainViewer.getSatelliteFrames(radarData);
            setRadarFrames(satFrames);
            setCurrentFrameIndex(Math.max(0, satFrames.length - 1));
          } else if (l === 'radar' && radarData) {
            const allFrames = rainViewer.getAllFrames(radarData);
            setRadarFrames(allFrames);
            const past = radarData.radar?.past || [];
            setCurrentFrameIndex(Math.max(0, past.length > 0 ? past.length - 1 : allFrames.length - 1));
          }
        }}
        baseStyle={baseStyle}
        onChangeBaseStyle={setBaseStyle}
        showRadarStations={showRadarStations}
        onToggleRadarStations={() => setShowRadarStations(!showRadarStations)}
        showRadarRings={showRadarRings}
        onToggleRadarRings={() => setShowRadarRings(!showRadarRings)}
        showPAR={showPAR}
        onTogglePAR={() => setShowPAR(!showPAR)}
        showCityLabels={showCityLabels}
        onToggleCityLabels={() => setShowCityLabels(!showCityLabels)}
        showElevation={showElevation}
        onToggleElevation={() => setShowElevation(!showElevation)}
        showBathymetry={showBathymetry}
        onToggleBathymetry={() => setShowBathymetry(!showBathymetry)}
        showIsolines={showIsolines}
        onToggleIsolines={() => setShowIsolines(!showIsolines)}
        radarOpacity={radarOpacity}
        onChangeRadarOpacity={setRadarOpacity}
        radarSpeed={radarSpeed}
        onChangeRadarSpeed={setRadarSpeed}
        tempUnit={tempUnit}
        onChangeTempUnit={setTempUnit}
        speedUnit={speedUnit}
        onChangeSpeedUnit={setSpeedUnit}
        isMeasureActive={isMeasureActive}
        onToggleMeasure={() => {
          setIsMeasureActive(!isMeasureActive);
          if (!isMeasureActive) {
            showToast('Distance measure enabled: Click points on the map');
          } else {
            showToast('Distance measure disabled');
          }
        }}
        measuredDistanceKm={measuredDistanceKm}
        measurePointCount={measurePointCount}
        onRecenterPhilippines={handleRecenterPhilippines}
        onSelectLocation={handleSelectLocation}
        onUseCurrentLocation={handleUseCurrentLocation}
        isLocating={isLocating}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        isPlaying={isPlayingRadar}
        onTogglePlay={() => setIsPlayingRadar(!isPlayingRadar)}
        frames={radarFrames}
        currentFrameIndex={currentFrameIndex}
        onSelectFrameIndex={setCurrentFrameIndex}
      />

      {/* 2. Interactive Map Canvas Layer (Locked to Philippines with Temperature Heatmap & Streets) */}
      <WeatherMap
        center={center}
        zoom={zoom}
        activeLayer={activeLayer}
        baseStyle={baseStyle}
        radarData={radarData}
        currentRadarFrame={radarFrames[currentFrameIndex] || null}
        radarColorScheme={radarColorScheme}
        selectedLocation={selectedLocation}
        onMapClick={handleMapClick}
        lang={lang}
        tempUnit={tempUnit}
        storms={storms}
        onSelectStorm={(st) => {
          setCenter([st.currentLat, st.currentLon]);
          setZoom(7.5);
          setIsStormModalOpen(true);
        }}
        radarOpacity={radarOpacity}
        showRadarStations={showRadarStations}
        showRadarRings={showRadarRings}
        showPAR={showPAR}
        showCityLabels={showCityLabels}
        showElevation={showElevation}
        showBathymetry={showBathymetry}
        showIsolines={showIsolines}
        isMeasureActive={isMeasureActive}
        onMeasureUpdate={(distKm, count) => {
          setMeasuredDistanceKm(distKm);
          setMeasurePointCount(count);
        }}
      />

      {/* 3. Location Weather Detail Drawer (when inspecting any city or coordinate) */}
      {isDrawerOpen && (
        <WeatherDrawer
          weather={weatherDetails}
          isLoading={isLoadingWeather}
          onClose={() => setIsDrawerOpen(false)}
          onRefresh={() => {
            if (selectedLocation) loadWeather(selectedLocation);
          }}
          lang={lang}
          tempUnit={tempUnit}
          speedUnit={speedUnit}
          isExpanded={isDrawerExpanded}
          onToggleExpand={() => setIsDrawerExpanded(!isDrawerExpanded)}
        />
      )}

      {/* 4. PAGASA 24-Hour Public Weather Forecast Bulletin Modal */}
      <PagasaBulletinModal
        isOpen={isBulletinModalOpen}
        onClose={() => setIsBulletinModalOpen(false)}
        lang={lang}
      />

      {/* 5. PAGASA Heavy Rainfall & TCWS Warning Scale Modal */}
      <PagasaWarningsModal
        isOpen={isWarningsModalOpen}
        onClose={() => setIsWarningsModalOpen(false)}
        defaultTab={warningsDefaultTab}
      />

      {/* 6. Typhoon & PAR Storm Tracker Modal */}
      <StormTrackerModal
        storms={storms}
        isOpen={isStormModalOpen}
        onClose={() => setIsStormModalOpen(false)}
        onSelectStorm={(st) => {
          setCenter([st.currentLat, st.currentLon]);
          setZoom(7.5);
        }}
        lang={lang}
        speedUnit={speedUnit}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[900] bg-slate-900/95 backdrop-blur-md border border-amber-500/50 text-white text-xs px-4 py-2.5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
