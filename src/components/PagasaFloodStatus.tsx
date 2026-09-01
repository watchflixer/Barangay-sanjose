import React, { useEffect, useState } from 'react';
import { Waves, RefreshCw, AlertTriangle } from 'lucide-react';

interface FloodStation {
  name: string;
  river?: string;
  currentLevel: string | number | null;
  alertLevel?: string | number | null;
  alarmLevel?: string | number | null;
  criticalLevel?: string | number | null;
  unit?: string;
}

interface FloodStatusData {
  fetchedAt: string;
  barangay: string;
  stations: FloodStation[];
}

type Level = 'normal' | 'watch' | 'alarm' | 'critical' | 'unknown';

function classify(station: FloodStation): Level {
  const cur = parseFloat(String(station.currentLevel));
  const alert = parseFloat(String(station.alertLevel));
  const alarm = parseFloat(String(station.alarmLevel));
  const critical = parseFloat(String(station.criticalLevel));
  if (isNaN(cur)) return 'unknown';
  if (!isNaN(critical) && cur >= critical) return 'critical';
  if (!isNaN(alarm) && cur >= alarm) return 'alarm';
  if (!isNaN(alert) && cur >= alert) return 'watch';
  return 'normal';
}

const LEVEL_STYLES: Record<Level, { label: string; badge: string; dot: string }> = {
  normal: { label: 'NORMAL', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-400' },
  watch: { label: 'WATCH', badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40', dot: 'bg-yellow-400' },
  alarm: { label: 'ALARM', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/40', dot: 'bg-orange-400' },
  critical: { label: 'CRITICAL', badge: 'bg-red-500/15 text-red-400 border-red-500/40', dot: 'bg-red-400' },
  unknown: { label: 'NO DATA', badge: 'bg-slate-500/15 text-slate-400 border-slate-500/40', dot: 'bg-slate-400' },
};

const DATA_URL = `${import.meta.env.BASE_URL}data/flood-status.json`;
const REFRESH_MS = 5 * 60 * 1000; // re-check every 5 minutes while the page is open

export const PagasaFloodStatus: React.FC = () => {
  const [data, setData] = useState<FloodStatusData | null>(null);
  const [error, setError] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('bad response');
      const json = (await res.json()) as FloodStatusData;
      setData(json);
      setError(false);
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  if (error && !data) return null; // fail silently, don't disturb the page
  if (!data || !data.stations?.length) return null;

  const station = data.stations[0];
  const level = classify(station);
  const style = LEVEL_STYLES[level];

  const fetchedDate = new Date(data.fetchedAt);
  const timeLabel = isNaN(fetchedDate.getTime())
    ? ''
    : fetchedDate.toLocaleTimeString('en-PH', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

  return (
    <div className="absolute top-20 right-4 z-10 w-56 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-800 shadow-lg text-slate-200 overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-800">
        <Waves className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="text-[10px] font-bold tracking-wide uppercase text-slate-300 truncate">
          Marikina River &ndash; {station.name}
        </span>
      </div>
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black border tracking-wider ${style.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {style.label}
          </span>
          {level === 'critical' || level === 'alarm' ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          ) : null}
        </div>
        <div className="text-lg font-bold text-white leading-none">
          {station.currentLevel ?? '\u2014'}
          <span className="text-xs font-medium text-slate-400 ml-1">{station.unit || 'm'}</span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
          <RefreshCw className="w-2.5 h-2.5" />
          <span>{timeLabel ? `Updated ${timeLabel} PHT` : 'PAGASA FFWS'}</span>
        </div>
      </div>
    </div>
  );
};
