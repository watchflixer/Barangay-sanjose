import React, { useEffect, useState } from 'react';
import { CloudSun, Droplets, RefreshCw, Wind } from 'lucide-react';

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=14.7425&longitude=121.1310&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FManila';

type WeatherData = {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    time: string;
  };
};

const weatherLabel = (code: number) => {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Cloudy';
  if (code <= 67 || code >= 80) return 'Rain showers';
  if (code <= 77) return 'Drizzle';
  if (code >= 95) return 'Thunderstorm';
  return 'Current conditions';
};

export const PagasaFloodStatus: React.FC = () => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`${WEATHER_URL}&t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Weather request failed');
        const json = await response.json() as WeatherData;
        if (!cancelled) { setData(json); setError(false); }
      } catch {
        if (!cancelled) setError(true);
      }
    };
    load();
    // Refresh frequently so the card stays as close to live as the weather provider allows.
    const timer = window.setInterval(load, 15 * 1000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  const current = data?.current;
  const updated = current ? new Date(current.time).toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true,
  }) : '';

  return (
    <div className="absolute top-20 right-4 z-10 w-56 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-800 shadow-lg text-slate-200 overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-800">
        <CloudSun className="w-4 h-4 text-sky-300 shrink-0" />
        <div>
          <div className="text-[10px] font-bold tracking-wide uppercase text-slate-200">Weather</div>
        </div>
      </div>
      {current ? (
        <div className="px-2.5 py-2 space-y-1.5">
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-white leading-none">{Math.round(current.temperature_2m)}°C</div>
            <div className="text-[10px] text-slate-400 text-right">Feels like {Math.round(current.apparent_temperature)}°C<br />{weatherLabel(current.weather_code)}</div>
          </div>
          <div className="grid grid-cols-3 gap-1 border-t border-slate-800 pt-2 text-[9px] text-slate-400">
            <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-sky-400" />{current.relative_humidity_2m}%</span>
            <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-emerald-400" />{Math.round(current.wind_speed_10m)} km/h</span>
            <span>Rain {current.precipitation} mm</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono"><RefreshCw className="w-2.5 h-2.5" />Updated {updated} PHT</div>
        </div>
      ) : (
        <div className="px-3 py-3 text-[10px] text-slate-400">{error ? 'Weather data unavailable right now.' : 'Loading realtime weather…'}</div>
      )}
    </div>
  );
};
