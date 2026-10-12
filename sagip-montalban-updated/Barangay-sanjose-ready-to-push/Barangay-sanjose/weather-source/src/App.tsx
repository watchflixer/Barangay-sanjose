import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WeatherMode, CityWeather, RainViewerFrame, RainViewerData } from './types/weather';
import { fetchPhilippineWeather, PHILIPPINE_CITIES, getWeatherConditionInfo } from './services/openMeteoService';
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
  const [, setRefreshSecondsLeft] = useState<number>(10 * 60);
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

  // Load all weather data
  const loadWeatherData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch Open-Meteo Philippine Cities
      const fetchedCities = await fetchPhilippineWeather();
      setCities(fetchedCities);

      // 2. Fetch RainViewer Doppler Radar Frames
      const rvData: RainViewerData | null = await fetchRainViewerData();
      if (rvData) {
        setRainViewerHost(rvData.host || 'https://tilecache.rainviewer.com');
        const pastFrames = rvData.radar?.past || [];
        const nowcastFrames = rvData.radar?.nowcast || [];
        const combined = [...pastFrames, ...nowcastFrames];
        setRainViewerFrames(combined);
        // Default to the latest 'past' radar frame (live now)
        if (pastFrames.length > 0) {
          setCurrentFrameIndex(pastFrames.length - 1);
        } else if (combined.length > 0) {
          setCurrentFrameIndex(0);
        }
      }

      setRefreshSecondsLeft(refreshMinutes * 60);
    } catch (err) {
      console.error('Error refreshing weather data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshMinutes]);

  // Initial load
  useEffect(() => {
    loadWeatherData();
  }, [loadWeatherData]);

  // Real-time 10-minute Auto-Refresh Countdown & Heartbeat
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshSecondsLeft((prev) => {
        if (prev <= 1) {
          loadWeatherData();
          return refreshMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
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
    if (currentMode === 'rain') {
      if (rainViewerFrames.length === 0) return 'Live Doppler Radar';
      const frame = rainViewerFrames[currentFrameIndex];
      if (!frame) return 'Live Radar';
      return `Radar: ${formatFrameTime(frame.time)}`;
    } else {
      if (forecastHourStep === 0) return 'Current Conditions (Live)';
      return `Forecast: +${forecastHourStep}h Outlook`;
    }
  };

  const getMaxIndex = () => {
    if (currentMode === 'rain') {
      return Math.max(0, rainViewerFrames.length - 1);
    }
    return 23; // 24 hours (0-23)
  };

  const getCurrentIndex = () => {
    if (currentMode === 'rain') {
      return currentFrameIndex;
    }
    return forecastHourStep;
  };

  // The parent GIS control requests permission during the user's click,
  // then sends the approved coordinates to the embedded weather view.
  const showApprovedLocation = useCallback(async (latitude: number, longitude: number) => {
    setUserLocationCoords([latitude, longitude]);
    setIsLocating(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&timezone=auto`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const current = data.current || {};
        const code = current.weather_code ?? 1;
        const cond = getWeatherConditionInfo(code);
        const userWeather: CityWeather = {
          id: 'user-location',
              name: 'Your Location',
              region: 'GPS Coordinates',
              islandGroup: 'Luzon',
              lat: latitude,
              lng: longitude,
              temperature: Math.round(current.temperature_2m ?? 27),
              apparentTemperature: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 27),
              weatherCode: code,
              conditionText: cond.text,
              conditionIcon: cond.icon,
              humidity: Math.round(current.relative_humidity_2m ?? 75),
              windSpeed: Math.round(current.wind_speed_10m ?? 12),
              windDirection: Math.round(current.wind_direction_10m ?? 80),
              cloudCover: Math.round(current.cloud_cover ?? 40),
              precipitation: current.precipitation ?? 0,
              precipitationProbability: 20
        };
        setUserLocationCity(userWeather);
      }
    } catch (err) {
      console.warn('Failed to fetch user location weather:', err);
    } finally {
      setIsLocating(false);
    }
  }, []);

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
          />
        </div>

        {/* Floating Bottom Overlays (Timeline Scrubber + Legend Card) */}
        <div className="absolute bottom-6 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-none">
          <div className="pointer-events-auto">
            <PlaybackControls
              mode={currentMode}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              currentIndex={getCurrentIndex()}
              maxIndex={getMaxIndex()}
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
          setRefreshSecondsLeft(mins * 60);
        }}
        onKeySaved={() => setOwmKey(getStoredOwmKey())}
      />
    </div>
  );
}
