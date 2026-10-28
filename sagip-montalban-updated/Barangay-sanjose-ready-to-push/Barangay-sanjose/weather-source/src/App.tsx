import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WeatherMode, CityWeather, RainViewerFrame } from './types/weather';
import { fetchPhilippineWeather, fetchLocationWeather } from './services/openMeteoService';
import { fetchRainViewerData, formatFrameTime } from './services/rainViewerService';
import { getStoredOwmKey } from './services/openWeatherService';
import { WeatherMap } from './components/WeatherMap';
import { TopBar } from './components/TopBar';
import { LegendCard } from './components/LegendCard';
import { PlaybackControls } from './components/PlaybackControls';
import { CityModal } from './components/CityModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [currentMode, setCurrentMode] = useState<WeatherMode>('weather');
  const [cities, setCities] = useState<CityWeather[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityWeather | null>(null);
  const [refreshMinutes, setRefreshMinutes] = useState<number>(10);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [radarError, setRadarError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  // Fill the host Weather panel when embedded; keep the original 420px phone
  // frame only when Panahon is opened as a standalone top-level page.
  const isMobileFrame = window.self === window.top;
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [owmKey, setOwmKey] = useState<string>(getStoredOwmKey());

  // User location tracking
  const [userLocationCoords, setUserLocationCoords] = useState<[number, number] | null>(null);
  const [userLocationCity, setUserLocationCity] = useState<CityWeather | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // RainViewer radar frames
  const [rainViewerHost, setRainViewerHost] = useState<string>('https://tilecache.rainviewer.com');
  const [rainViewerFrames, setRainViewerFrames] = useState<RainViewerFrame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);

  // Playback animation state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [forecastHourStep, setForecastHourStep] = useState<number>(0);
  const playbackIntervalRef = useRef<number | null>(null);

  // Weather and radar load independently so a failed provider cannot block the other.
  const loadWeatherData = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchPhilippineWeather().then(fetchedCities => {
          setCities(fetchedCities);
          setSelectedCity(previous => previous && (fetchedCities.find(city => city.id === previous.id) ?? previous));
          setWeatherError(null);
        }).catch(() => {
          setWeatherError('Hindi ma-load ang weather. Kung may dating data, iyon muna ang ipinapakita.');
        }),
        fetchRainViewerData().then(rvData => {
          const frames = [...(rvData?.radar?.past ?? []), ...(rvData?.radar?.nowcast ?? [])];
          if (!rvData || frames.length === 0) {
            setRadarError('Walang radar data sa ngayon. Hindi ibig sabihin nito na walang ulan.');
            setRainViewerFrames([]);
            setCurrentFrameIndex(0);
            return;
          }
          setRainViewerHost(rvData.host);
          setRainViewerFrames(frames);
          setCurrentFrameIndex(Math.max(0, (rvData.radar.past?.length ?? 1) - 1));
          setRadarError(null);
        })
      ]);
    } finally {
      refreshInFlight.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadWeatherData();
    const timer = window.setInterval(() => void loadWeatherData(), refreshMinutes * 60000);
    return () => window.clearInterval(timer);
  }, [loadWeatherData, refreshMinutes]);

  // Playback loop for RainViewer Doppler or Forecast timeline
  useEffect(() => {
    if (isPlaying) {
      playbackIntervalRef.current = window.setInterval(() => {
        if (currentMode === 'rain') {
          // Loop through RainViewer radar frames
          setRainViewerFrames((frames) => {
            if (frames.length === 0) return frames;
            setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
            return frames;
          });
        } else {
          // Loop through 24-hr Open-Meteo forecast steps
          setForecastHourStep((prev) => (prev + 1) % 24);
        }
      }, 900); // 900ms per frame
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    };
  }, [isPlaying, currentMode]);

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    if (getMaxIndex() === 0) return;
    setIsPlaying((prev) => !prev);
  };

  // Timeline seek handler
  const handleSeek = (index: number) => {
    if (currentMode === 'rain') {
      setCurrentFrameIndex(index);
    } else {
      setForecastHourStep(index);
    }
  };

  // Determine current timeline label
  const getTimelineLabel = () => {
    if (weatherError) return weatherError;
    if (currentMode === 'rain' && radarError) return radarError;
    if (currentMode === 'rain') {
      if (rainViewerFrames.length === 0) return 'Radar unavailable';
      const frame = rainViewerFrames[currentFrameIndex];
      if (!frame) return 'Live Radar';
      return `Radar: ${formatFrameTime(frame.time)}`;
    } else {
      if (!cities.length) return isRefreshing ? 'Loading weather…' : 'Weather unavailable';
      if (forecastHourStep === 0) return 'Current Conditions';
      return `Forecast: +${forecastHourStep}h Outlook`;
    }
  };

  const getMaxIndex = () => {
    if (currentMode === 'rain') {
      return Math.max(0, rainViewerFrames.length - 1);
    }
    return cities.length ? 23 : 0;
  };

  const getCurrentIndex = () => {
    if (currentMode === 'rain') {
      return currentFrameIndex;
    }
    return forecastHourStep;
  };

  // The Weather page's location control asks the host to run the existing
  // consent flow when embedded, then receives the approved coordinates.
  const showApprovedLocation = useCallback(async (latitude: number, longitude: number) => {
    setUserLocationCoords([latitude, longitude]);
    setIsLocating(true);
    try {
      setUserLocationCity(await fetchLocationWeather(latitude, longitude));
    } catch (err) {
      setWeatherError('Hindi ma-load ang weather sa iyong lokasyon. Subukan muli ang location button.');
    } finally {
      setIsLocating(false);
    }
  }, []);

  const requestUserLocation = useCallback(() => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'hazardsync-location-request' }, window.location.origin);
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => void showApprovedLocation(position.coords.latitude, position.coords.longitude),
      (error) => console.warn('Unable to get current location:', error.message),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [showApprovedLocation]);

  useEffect(() => {
    const onMapAction = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== window.location.origin ||
          event.data?.type !== 'panahon-map-action' || event.data.action !== 'location') return;
      const { lat, lng } = event.data;
      if (typeof lat !== 'number' || typeof lng !== 'number' ||
          !Number.isFinite(lat) || !Number.isFinite(lng) ||
          Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
      void showApprovedLocation(lat, lng);
    };
    window.addEventListener('message', onMapAction);
    return () => window.removeEventListener('message', onMapAction);
  }, [showApprovedLocation]);

  return (
    <div className="relative w-screen h-screen bg-[#07090d] text-slate-100 flex items-center justify-center overflow-hidden font-sans">
      {/* Outer wrapper: Either Phone Frame or Edge-to-Edge */}
      <main
        className={`relative transition-all duration-300 overflow-hidden ${
          isMobileFrame
            ? 'w-full max-w-[420px] h-full max-h-[880px] sm:rounded-[44px] shadow-2xl border-0 sm:border-[8px] sm:border-slate-800 ring-1 ring-white/10'
            : 'w-full h-full'
        }`}
      >
        {/* Phone Notch / Speaker Grille (in phone frame mode) */}
        {isMobileFrame && (
          <div className="hidden sm:flex absolute top-2 left-1/2 -translate-x-1/2 z-[1100] w-24 h-4 bg-slate-900 rounded-full items-center justify-center gap-2 pointer-events-none border border-white/5 shadow-md">
            <div className="w-10 h-1 bg-slate-700 rounded-full" />
            <div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700" />
          </div>
        )}

        {/* Top Header & Mode Navigation Bar */}
        <TopBar
          currentMode={currentMode}
          onSelectMode={(mode) => {
            setCurrentMode(mode);
            setIsPlaying(false);
            setForecastHourStep(0);
          }}
        />

        {/* Leaflet Interactive Weather Map */}
        <div className="w-full h-full">
          <WeatherMap
            mode={currentMode}
            cities={cities}
            onSelectCity={(city) => setSelectedCity(city)}
            rainViewerHost={rainViewerHost}
            rainViewerFrames={rainViewerFrames}
            currentFrameIndex={currentFrameIndex}
            owmKey={owmKey}
            timelineForecastHour={currentMode === 'rain' ? 0 : forecastHourStep}
            userLocationCoords={userLocationCoords}
            userLocationCity={userLocationCity}
            isLocating={isLocating}
            onRequestLocation={requestUserLocation}
          />
        </div>

        {/* Timeline Scrubber + Legend Card.
            Portrait phones keep them docked at the bottom (unchanged). Above
            640px the `ph-overlays` rule in index.css lifts the whole stack to
            the top of the map, the way the Flood Prone map keeps every panel
            in its top row and leaves the bottom of the map clear. */}
        <div className="ph-overlays absolute bottom-6 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-none">
          <div className="pointer-events-auto">
            <PlaybackControls
              mode={currentMode}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              currentIndex={getCurrentIndex()}
              maxIndex={getMaxIndex()}
              liveIndex={Math.max(0, rainViewerFrames.reduce((last, frame, index) =>
                frame.time * 1000 <= Date.now() ? index : last, 0))}
              onSeek={handleSeek}
              currentLabel={getTimelineLabel()}
            />
          </div>
          <div className="pointer-events-auto">
            <LegendCard mode={currentMode} />
          </div>
        </div>
      </main>

      {/* City Detail Modal */}
      <CityModal
        city={selectedCity}
        onClose={() => setSelectedCity(null)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        refreshMinutes={refreshMinutes}
        onChangeRefreshMinutes={(mins) => {
          setRefreshMinutes(mins);

        }}
        onKeySaved={() => setOwmKey(getStoredOwmKey())}
      />
    </div>
  );
}
