import React, { useEffect, useState } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Gauge, Layers, Info } from 'lucide-react';
import { Language, RainViewerFrame } from '../types/weather';

interface RadarTimelineProps {
  frames: RainViewerFrame[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  lang: Language;
  colorScheme: number;
  onChangeColorScheme: (id: number) => void;
  speed: number;
  onChangeSpeed: (spd: number) => void;
  activeLayer: string;
}

export const RadarTimeline: React.FC<RadarTimelineProps> = ({
  frames,
  currentIndex,
  onSelectIndex,
  isPlaying,
  onTogglePlay,
  lang,
  colorScheme,
  onChangeColorScheme,
  speed,
  onChangeSpeed,
  activeLayer,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const currentFrame = frames[currentIndex];

  // Format timestamp
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getRelativeTimeLabel = (frame?: RainViewerFrame) => {
    if (!frame) return '';
    const nowSec = Math.floor(Date.now() / 1000);
    const diffMins = Math.round((frame.time - nowSec) / 60);

    if (Math.abs(diffMins) <= 6) {
      return lang === 'fil' ? '🔴 LIVE NGAYON' : '🔴 LIVE NOW';
    }
    if (diffMins < 0) {
      const absMin = Math.abs(diffMins);
      if (absMin < 60) {
        return lang === 'fil' ? `${absMin}m ang nakalipas` : `${absMin}m ago`;
      }
      const hrs = Math.floor(absMin / 60);
      const rem = absMin % 60;
      return lang === 'fil'
        ? `${hrs}o ${rem > 0 ? rem + 'm' : ''} nakalipas`
        : `${hrs}h ${rem > 0 ? rem + 'm' : ''} ago`;
    } else {
      return lang === 'fil' ? `+${diffMins}m Hula (Nowcast)` : `+${diffMins}m Forecast`;
    }
  };

  const colorSchemes = [
    { id: 2, label: 'Universal Blue' },
    { id: 1, label: 'Original Radar' },
    { id: 3, label: 'TITAN Doppler' },
    { id: 4, label: 'The Weather Channel' },
    { id: 8, label: 'Dark Sky' },
  ];

  if (!frames.length && activeLayer === 'radar') {
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] px-4 py-2 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/60 text-xs text-slate-400 shadow-xl flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        {lang === 'fil' ? 'Ikinakarga ang realtime radar frames...' : 'Loading realtime radar data...'}
      </div>
    );
  }

  if (activeLayer !== 'radar' && activeLayer !== 'satellite') {
    return null;
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] w-[94%] max-w-2xl">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3 shadow-2xl text-slate-100 flex flex-col gap-2.5 transition-all">
        
        {/* Top row: Current Frame Time & Relative Status & Controls */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-sm md:text-base font-bold text-white tracking-wide">
                {formatTime(currentFrame?.time)}
              </span>
              <span className="text-xs text-cyan-400 font-medium tracking-tight">
                {getRelativeTimeLabel(currentFrame)}
              </span>
            </div>
            {currentFrame && !currentFrame.isPast && (
              <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-300 border border-amber-400/40 px-1.5 py-0.5 rounded">
                {lang === 'fil' ? 'Hula' : 'Forecast'}
              </span>
            )}
          </div>

          {/* Right action controls */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => onChangeSpeed(speed === 1 ? 2 : speed === 2 ? 0.5 : 1)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 font-mono text-[11px] text-slate-300 transition-colors flex items-center gap-1"
              title="Playback speed"
            >
              <Gauge className="w-3.5 h-3.5 text-slate-400" />
              {speed}x
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg border text-slate-300 transition-colors ${
                showSettings
                  ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
              }`}
              title="Radar palette"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Timeline Scrubber Bar */}
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <button
            onClick={onTogglePlay}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          {/* Step Back */}
          <button
            onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex <= 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 shrink-0"
            title="Previous frame"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Step markers track */}
          <div className="flex-1 relative flex items-center h-6 px-1">
            <input
              type="range"
              min={0}
              max={Math.max(0, frames.length - 1)}
              value={currentIndex}
              onChange={(e) => onSelectIndex(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer appearance-none outline-none"
            />
            
            {/* Ticks for each frame */}
            <div className="absolute inset-x-2 pointer-events-none flex justify-between top-4 text-[9px] text-slate-500 font-mono">
              <span>{frames.length > 0 ? '-2h' : ''}</span>
              <span className="text-cyan-400/80 font-medium">LIVE</span>
              <span>{frames.length > 0 ? '+30m' : ''}</span>
            </div>
          </div>

          {/* Step Forward */}
          <button
            onClick={() => onSelectIndex(Math.min(frames.length - 1, currentIndex + 1))}
            disabled={currentIndex >= frames.length - 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 shrink-0"
            title="Next frame"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Intensity Legend & Sub Settings */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px]">
          {/* Radar Intensity scale */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="font-semibold text-slate-300">
              {lang === 'fil' ? 'Ulan (mm/h):' : 'Precip (mm/h):'}
            </span>
            <div className="flex items-center gap-0.5 rounded overflow-hidden h-2.5 shadow-sm border border-slate-700">
              <span className="w-4 h-full bg-[#a1e6ff]" title="Light drizzle" />
              <span className="w-4 h-full bg-[#0096fe]" title="Moderate rain" />
              <span className="w-4 h-full bg-[#00d832]" title="Steady rain" />
              <span className="w-4 h-full bg-[#ffd800]" title="Heavy rain" />
              <span className="w-4 h-full bg-[#ff6a00]" title="Violent rain" />
              <span className="w-4 h-full bg-[#ff0000]" title="Thunderstorm / Hail" />
              <span className="w-4 h-full bg-[#bf00bf]" title="Extreme" />
            </div>
            <span className="text-[9px] text-slate-400 font-mono">0.1 → 32+ mm</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[10px]">
            <span>{frames.length} {lang === 'fil' ? 'realtime frames' : 'frames'}</span>
            <span>·</span>
            <span className="text-emerald-400 font-mono">10m updates</span>
          </div>
        </div>

        {/* Color Palette dropdown sheet */}
        {showSettings && (
          <div className="pt-2 pb-1 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {colorSchemes.map((scheme) => (
              <button
                key={scheme.id}
                onClick={() => onChangeColorScheme(scheme.id)}
                className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition-all flex items-center justify-between ${
                  colorScheme === scheme.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-medium'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                }`}
              >
                <span>{scheme.label}</span>
                {colorScheme === scheme.id && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
