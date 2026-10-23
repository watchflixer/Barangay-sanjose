import React from 'react';
import { X, Wind, Droplets, Cloud, Thermometer, Compass, Calendar, Clock } from 'lucide-react';
import { CityWeather } from '../types/weather';
import { getWeatherConditionInfo } from '../services/openMeteoService';

interface CityModalProps {
  city: CityWeather | null;
  onClose: () => void;
}

export const CityModal: React.FC<CityModalProps> = ({ city, onClose }) => {
  if (!city) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5 text-slate-800 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start justify-between pr-8">
          <div>
            <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
              {city.islandGroup} · {city.region}
            </span>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              {city.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Lat: {city.lat.toFixed(2)}°N · Lng: {city.lng.toFixed(2)}°E
            </p>
          </div>
        </div>

        {/* Current Big Weather Display */}
        <div className="my-5 flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-slate-50 border border-slate-200">
          <div className="flex items-center gap-3">
            <span className="text-5xl select-none" role="img" aria-label={city.conditionText}>
              {city.conditionIcon}
            </span>
            <div>
              <div className="text-4xl font-extrabold tracking-tight font-mono text-slate-900">
                {city.temperature}°C
              </div>
              <div className="text-xs font-medium text-slate-600 mt-0.5">
                {city.conditionText}
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 space-y-1">
            <div>Feels like <span className="text-slate-800 font-semibold">{city.apparentTemperature}°C</span></div>
            <div>Rain chance <span className="text-indigo-600 font-semibold">{city.precipitationProbability}%</span></div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Droplets className="w-3.5 h-3.5 text-sky-500" />
              <span>Humidity</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 mt-1 font-mono">
              {city.humidity}%
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Wind className="w-3.5 h-3.5 text-teal-500" />
              <span>Wind</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 mt-1 font-mono">
              {city.windSpeed} km/h
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Cloud className="w-3.5 h-3.5 text-slate-400" />
              <span>Cloud Cover</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 mt-1 font-mono">
              {city.cloudCover}%
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Compass className="w-3.5 h-3.5 text-amber-500" />
              <span>Direction</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 mt-1 font-mono">
              {city.windDirection}°
            </span>
          </div>
        </div>

        {/* 24-Hour Forecast strip */}
        {city.hourly && city.hourly.time.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>24-Hour Forecast</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {city.hourly.time.map((timeStr, idx) => {
                const hour = new Date(timeStr).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Manila' });
                const temp = city.hourly?.temperature[idx] ?? city.temperature;
                const code = city.hourly?.weatherCode[idx] ?? 1;
                const icon = getWeatherConditionInfo(code).icon;
                const pop = city.hourly?.precipitationProbability[idx] ?? 0;

                return (
                  <div
                    key={idx}
                    className="flex-shrink-0 w-16 p-2 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center"
                  >
                    <span className="text-[10px] text-slate-500 font-mono">
                      {hour}
                    </span>
                    <span className="text-lg my-1">{icon}</span>
                    <span className="text-xs font-bold text-slate-900 font-mono">{temp}°</span>
                    <span className="text-[9px] text-sky-600 font-mono mt-0.5">{pop}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 7-Day Outlook */}
        {city.daily && city.daily.time.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>7-Day Outlook</span>
            </div>
            <div className="space-y-1.5">
              {city.daily.time.map((dateStr, idx) => {
                const d = new Date(dateStr);
                const dayName = idx === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Manila' });
                const code = city.daily?.weatherCode[idx] ?? 1;
                const cond = getWeatherConditionInfo(code);
                const max = city.daily?.maxTemp[idx] ?? city.temperature;
                const min = city.daily?.minTemp[idx] ?? city.temperature - 4;

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <span className="w-16 font-medium text-slate-700">{dayName}</span>
                    <div className="flex items-center gap-2 flex-1 justify-center">
                      <span>{cond.icon}</span>
                      <span className="text-slate-500 text-[11px] truncate max-w-[120px]">{cond.text}</span>
                    </div>
                    <div className="w-20 text-right font-mono text-[11px]">
                      <span className="text-slate-900 font-semibold">{max}°</span>{' '}
                      <span className="text-slate-400">/ {min}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-400 text-center">
          <span>Source: Open-Meteo API</span>
        </div>
      </div>
    </div>
  );
};
