import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { WeatherMode } from '../types/weather';

interface PlaybackControlsProps {
  mode: WeatherMode;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentIndex: number;
  maxIndex: number;
  onSeek: (index: number) => void;
  currentLabel: string;
  liveIndex?: number;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  mode,
  isPlaying,
  onTogglePlay,
  currentIndex,
  maxIndex,
  onSeek,
  currentLabel,
  liveIndex = 0
}) => {
  return (
    <div className="ph-playback bg-white rounded-2xl p-2.5 shadow-2xl flex items-center gap-3 select-none">
      {/* Play/Pause circular button */}
      <button
        onClick={onTogglePlay}
        className="ph-playback__button w-10 h-10 rounded-full bg-black hover:bg-white hover:text-black active:scale-95 text-white flex items-center justify-center shrink-0 shadow-lg shadow-black/20 transition-all focus:outline-none focus:ring-2 focus:ring-black"
        title={isPlaying ? 'Pause animation' : 'Play animation'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Scrubber slider and time label */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="ph-playback__meta flex items-center justify-between text-[11px] mb-1">
          <span className="font-semibold text-black truncate flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
            {currentLabel}
          </span>
          <span className="ph-playback__count text-[10px] text-black font-mono">
            {currentIndex + 1} / {Math.max(1, maxIndex + 1)}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(0, maxIndex)}
          value={currentIndex}
          onChange={(e) => onSeek(parseInt(e.target.value, 10))}
          className="panahon-monochrome-range w-full appearance-none cursor-pointer"
          aria-label="Timeline scrubber"
        />
      </div>

      {/* Reset to live now */}
      <button
        onClick={() => onSeek(mode === 'rain' ? liveIndex : 0)}
        className="ph-playback__reset p-2 rounded-xl text-black hover:bg-black hover:text-white transition-colors shrink-0"
        title="Reset to current time"
        aria-label="Reset timeline"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
