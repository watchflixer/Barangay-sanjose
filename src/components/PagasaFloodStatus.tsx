import React from 'react';
import { Waves, RefreshCw, AlertTriangle } from 'lucide-react';
import { useFloodStatus } from '../hooks/useFloodStatus';
import { classifyFloodLevel, FloodLevel } from '../lib/flood';

const LEVEL_STYLES: Record<FloodLevel, { label: string; badge: string; dot: string }> = {
  normal: { label: 'NORMAL', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-400' },
  watch: { label: 'WATCH', badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40', dot: 'bg-yellow-400' },
  alarm: { label: 'ALARM', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/40', dot: 'bg-orange-400' },
  critical: { label: 'CRITICAL', badge: 'bg-red-500/15 text-red-400 border-red-500/40', dot: 'bg-red-400' },
  unknown: { label: 'NO DATA', badge: 'bg-slate-500/15 text-slate-400 border-slate-500/40', dot: 'bg-slate-400' },
};

export const PagasaFloodStatus: React.FC = () => {
  const { data, error } = useFloodStatus();

  if (error && !data) return null;
  if (!data || !data.stations?.length) return null;

  const station = data.stations[0];
  const level = classifyFloodLevel(station);
  const style = LEVEL_STYLES[level];
  const displayName = station.landmark || station.name;

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
          {displayName}, Rodriguez
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
