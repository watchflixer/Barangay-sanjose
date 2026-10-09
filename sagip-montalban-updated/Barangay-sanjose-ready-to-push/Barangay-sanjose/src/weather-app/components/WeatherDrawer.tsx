import React from 'react';
import {
  X,
  Compass,
  Droplets,
  Wind,
  Sun,
  SunMedium,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Snowflake,
  Gauge,
  Eye,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import {
  Language,
  SpeedUnit,
  TemperatureUnit,
  WeatherDetails,
} from '../types/weather';
import {
  formatSpeed,
  formatTemperature,
  getMonsoonType,
  getWeatherCodeInfo,
  getWindDirectionLabel,
} from '../services/openMeteo';

interface WeatherDrawerProps {
  weather: WeatherDetails | null;
  isLoading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  lang: Language;
  tempUnit: TemperatureUnit;
  speedUnit: SpeedUnit;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const WeatherDrawer: React.FC<WeatherDrawerProps> = ({
  weather,
  isLoading,
  onClose,
  onRefresh,
  lang,
  tempUnit,
  speedUnit,
  isExpanded,
  onToggleExpand,
}) => {
  if (!weather && !isLoading) return null;

  const renderWeatherIcon = (code: number, className = 'w-6 h-6') => {
    const info = getWeatherCodeInfo(code);
    switch (info.icon) {
      case 'Sun':
        return <Sun className={`${className} text-amber-400`} />;
      case 'SunMedium':
        return <SunMedium className={`${className} text-amber-300`} />;
      case 'CloudSun':
        return <CloudSun className={`${className} text-amber-200`} />;
      case 'Cloud':
        return <Cloud className={`${className} text-slate-300`} />;
      case 'CloudFog':
        return <CloudFog className={`${className} text-slate-400`} />;
      case 'CloudDrizzle':
        return <CloudDrizzle className={`${className} text-cyan-400`} />;
      case 'CloudRain':
        return <CloudRain className={`${className} text-blue-400`} />;
      case 'CloudSnow':
      case 'Snowflake':
        return <CloudSnow className={`${className} text-cyan-200`} />;
      case 'CloudLightning':
        return <CloudLightning className={`${className} text-purple-400 animate-pulse`} />;
      default:
        return <CloudSun className={`${className} text-slate-300`} />;
    }
  };

  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysFil = ['Lin', 'Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab'];
    return lang === 'fil' ? daysFil[day] : daysEn[day];
  };

  const formatHour = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
  };

  return (
    <div
      className={`fixed z-[600] transition-all duration-300 ease-out bg-slate-900/95 backdrop-blur-2xl border-slate-700/80 text-slate-100 shadow-2xl flex flex-col ${
        // Responsive positioning: Bottom sheet on mobile, sleek right drawer or bottom-right card on desktop
        'bottom-0 md:top-20 md:right-4 md:bottom-6 w-full md:w-[420px] max-h-[85vh] md:max-h-[calc(100vh-100px)] rounded-t-3xl md:rounded-2xl border'
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 pb-2 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0 border border-cyan-500/20">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-white truncate leading-tight">
                {weather?.location.name || (lang === 'fil' ? 'Nilo-load...' : 'Loading...')}
              </h2>
            </div>
            <p className="text-xs text-slate-400 truncate">
              {weather?.location.country || `${weather?.location.lat.toFixed(2)}°, ${weather?.location.lon.toFixed(2)}°`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={lang === 'fil' ? 'I-refresh ang Datos' : 'Refresh Data'}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          
          <button
            onClick={onToggleExpand}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors md:hidden"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={lang === 'fil' ? 'Isara' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">
        {weather && (
          <>
            {/* Current hero temperature card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-slate-700/60 flex items-center justify-between shadow-lg relative overflow-hidden">
              <div className="space-y-1 relative z-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                    {formatTemperature(weather.current.temperature, tempUnit)}
                  </span>
                  <div className="text-xs text-slate-400">
                    <div>
                      {lang === 'fil' ? 'Parang' : 'Feels like'}{' '}
                      <span className="text-slate-200 font-semibold">
                        {formatTemperature(weather.current.apparentTemperature, tempUnit)}
                      </span>
                    </div>
                    {weather.daily[0] && (
                      <div>
                        {formatTemperature(weather.daily[0].temperatureMin, tempUnit)} /{' '}
                        {formatTemperature(weather.daily[0].temperatureMax, tempUnit)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-sm font-semibold text-cyan-300 flex items-center gap-1.5 pt-0.5">
                  <span>
                    {lang === 'fil'
                      ? getWeatherCodeInfo(weather.current.weatherCode).labelFil
                      : getWeatherCodeInfo(weather.current.weatherCode).labelEn}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1 font-mono">
                  <span>💧 {weather.current.precipitation} mm</span>
                  <span>·</span>
                  <span>🌧️ {weather.hourly[0]?.precipitationProbability ?? 0}% {lang === 'fil' ? 'tsansa' : 'rain'}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex flex-col items-center justify-center shrink-0">
                {renderWeatherIcon(weather.current.weatherCode, 'w-12 h-12')}
              </div>
            </div>

            {/* Philippine Monsoon & PAGASA Rainfall Advisory Indicator */}
            {(() => {
              const monsoon = getMonsoonType(weather.current.windDirection);
              const rain = weather.current.precipitation;
              const rainProb = weather.hourly[0]?.precipitationProbability ?? 0;
              
              // PAGASA rainfall alert categories
              const isRedAlert = rain >= 30;
              const isOrangeAlert = rain >= 15 && rain < 30;
              const isYellowAlert = (rain >= 7.5 && rain < 15) || (rainProb > 70 && rain > 2);

              return (
                <div className="space-y-2">
                  {/* Monsoon banner */}
                  <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                      <Wind className="w-3.5 h-3.5" />
                      <span>{lang === 'fil' ? monsoon.nameFil : monsoon.nameEn}</span>
                    </div>
                    <div className="text-[11px] text-cyan-200/80 mt-0.5 leading-relaxed">
                      {lang === 'fil' ? monsoon.desc : monsoon.descEn}
                    </div>
                  </div>

                  {/* PAGASA Heavy Rainfall Warning if raining */}
                  {(isRedAlert || isOrangeAlert || isYellowAlert) && (
                    <div className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                      isRedAlert
                        ? 'bg-rose-950/60 border-rose-600 text-rose-200'
                        : isOrangeAlert
                        ? 'bg-amber-950/60 border-amber-600 text-amber-200'
                        : 'bg-yellow-950/60 border-yellow-500 text-yellow-200'
                    }`}>
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">
                          {isRedAlert
                            ? (lang === 'fil' ? 'PAGASA RED WARNING (Panganib sa Baha)' : 'PAGASA RED WARNING (Torrential Rain)')
                            : isOrangeAlert
                            ? (lang === 'fil' ? 'PAGASA ORANGE WARNING (Maghanda sa Baha)' : 'PAGASA ORANGE WARNING (Intense Rain)')
                            : (lang === 'fil' ? 'PAGASA YELLOW WARNING (Subaybayan ang Ulan)' : 'PAGASA YELLOW WARNING (Heavy Rain)')}
                        </div>
                        <div className="text-[10px] opacity-90 mt-0.5">
                          {isRedAlert
                            ? (lang === 'fil' ? 'Napakalakas na buhos ng ulan (>30 mm/h). Posibleng matinding pagbaha at landslides.' : 'Torrential rainfall. Serious flooding expected.')
                            : isOrangeAlert
                            ? (lang === 'fil' ? 'Malakas na buhos ng ulan (15-30 mm/h). Posibleng pagbaha sa mabababang lugar.' : 'Intense rainfall. Threatening flooding.')
                            : (lang === 'fil' ? 'Mabigat na pag-ulan (7.5-15 mm/h). Bantayan ang lagay ng panahon.' : 'Heavy rainfall. Monitor weather conditions.')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {/* Wind Card */}
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{lang === 'fil' ? 'Hangin' : 'Wind'}</span>
                </div>
                <div className="pt-2">
                  <div className="font-bold text-white text-sm">
                    {formatSpeed(weather.current.windSpeed, speedUnit)}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Compass
                      className="w-3 h-3 text-cyan-400 shrink-0 transition-transform"
                      style={{ transform: `rotate(${weather.current.windDirection}deg)` }}
                    />
                    <span className="truncate">
                      {getWindDirectionLabel(weather.current.windDirection, lang)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Humidity Card */}
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Droplets className="w-3.5 h-3.5 text-blue-400" />
                  <span>{lang === 'fil' ? 'Kahalumigmigan' : 'Humidity'}</span>
                </div>
                <div className="pt-2">
                  <div className="font-bold text-white text-sm">
                    {weather.current.relativeHumidity}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {weather.current.relativeHumidity > 70
                      ? lang === 'fil' ? 'Mataas / Masinsin' : 'High'
                      : lang === 'fil' ? 'Katamtaman' : 'Comfortable'}
                  </div>
                </div>
              </div>

              {/* UV Index Card */}
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>UV Index</span>
                </div>
                <div className="pt-2">
                  <div className="font-bold text-white text-sm">
                    {weather.current.uvIndex.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-amber-400 mt-0.5 font-medium">
                    {weather.current.uvIndex > 8
                      ? (lang === 'fil' ? 'Napakataas' : 'Very High')
                      : weather.current.uvIndex > 5
                      ? (lang === 'fil' ? 'Katamtaman' : 'Moderate')
                      : (lang === 'fil' ? 'Mababa' : 'Low')}
                  </div>
                </div>
              </div>

              {/* Barometric Pressure Card */}
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Gauge className="w-3.5 h-3.5 text-purple-400" />
                  <span>{lang === 'fil' ? 'Presyon' : 'Pressure'}</span>
                </div>
                <div className="pt-2">
                  <div className="font-bold text-white text-sm font-mono">
                    {Math.round(weather.current.surfacePressure)} <span className="text-[10px] font-normal text-slate-400">hPa</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {weather.current.surfacePressure < 1005
                      ? lang === 'fil' ? 'Low Pressure Area' : 'Low Pressure'
                      : lang === 'fil' ? 'Normal na Antas' : 'Normal'}
                  </div>
                </div>
              </div>

              {/* Cloud Cover Card */}
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Cloud className="w-3.5 h-3.5 text-slate-300" />
                  <span>{lang === 'fil' ? 'Ulap' : 'Clouds'}</span>
                </div>
                <div className="pt-2">
                  <div className="font-bold text-white text-sm">
                    {weather.current.cloudCover}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {weather.current.cloudCover > 80
                      ? (lang === 'fil' ? 'Makapal' : 'Overcast')
                      : (lang === 'fil' ? 'Bahagya' : 'Scattered')}
                  </div>
                </div>
              </div>

              {/* Gusts */}
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>{lang === 'fil' ? 'Bugso' : 'Wind Gusts'}</span>
                </div>
                <div className="pt-2">
                  <div className="font-bold text-white text-sm">
                    {formatSpeed(weather.current.windGusts, speedUnit)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {weather.current.windGusts > 50 ? (lang === 'fil' ? 'Malakas' : 'Strong') : (lang === 'fil' ? 'Banayad' : 'Gentle')}
                  </div>
                </div>
              </div>
            </div>

            {/* Air Quality Index Card */}
            {weather.airQuality && (
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: weather.airQuality.status.color }} />
                    <span>{lang === 'fil' ? 'Kalidad ng Hangin (AQI)' : 'Air Quality Index'}</span>
                  </div>
                  <div className="text-xs font-bold" style={{ color: weather.airQuality.status.color }}>
                    {lang === 'fil' ? weather.airQuality.status.labelFil : weather.airQuality.status.label}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                    <span>PM2.5: {weather.airQuality.pm2_5} µg/m³</span>
                    <span>·</span>
                    <span>PM10: {weather.airQuality.pm10}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black font-mono" style={{ color: weather.airQuality.status.color }}>
                    {weather.airQuality.aqi}
                  </span>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">US AQI</div>
                </div>
              </div>
            )}

            {/* 24-Hour Forecast Timeline */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'fil' ? '24-Oras na Pagtataya' : '24-Hour Hourly Forecast'}
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2 pt-1 custom-scrollbar">
                {weather.hourly.slice(0, 18).map((hour, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-between p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 shrink-0 w-16 text-center transition-colors"
                  >
                    <span className="text-[10px] text-slate-400 font-medium">
                      {idx === 0 ? (lang === 'fil' ? 'Ngayon' : 'Now') : formatHour(hour.time)}
                    </span>
                    <div className="my-1.5">
                      {renderWeatherIcon(hour.weatherCode, 'w-5 h-5')}
                    </div>
                    <span className="text-xs font-bold text-white">
                      {formatTemperature(hour.temperature, tempUnit)}
                    </span>
                    {hour.precipitationProbability > 0 && (
                      <span className="text-[9px] text-cyan-400 font-semibold mt-1">
                        {hour.precipitationProbability}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 7-Day Forecast */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'fil' ? '7-Araw na Pagtataya' : '7-Day Extended Forecast'}
              </h3>
              <div className="space-y-1.5">
                {weather.daily.map((day, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 border border-slate-800/60 text-xs transition-colors"
                  >
                    <span className="w-12 font-medium text-slate-300">
                      {idx === 0 ? (lang === 'fil' ? 'Ngayon' : 'Today') : getDayName(day.date)}
                    </span>

                    <div className="flex items-center gap-2">
                      {renderWeatherIcon(day.weatherCode, 'w-4 h-4')}
                      {day.precipitationProbability > 10 && (
                        <span className="text-[10px] text-cyan-400 font-medium w-8">
                          {day.precipitationProbability}%
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-slate-400">
                        {formatTemperature(day.temperatureMin, tempUnit)}
                      </span>
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                        <div className="absolute inset-y-0 bg-gradient-to-r from-blue-400 to-amber-400 rounded-full w-full" />
                      </div>
                      <span className="font-semibold text-white">
                        {formatTemperature(day.temperatureMax, tempUnit)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
