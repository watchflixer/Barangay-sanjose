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
    <div className="bg-white rounded-xl px-2 py-1.5 shadow-xl flex items-center gap-2 select-none">
      {/* Play/Pause circular button */}
      <button
        onClick={onTogglePlay}
        className="w-7 h-7 rounded-full bg-black hover:bg-white hover:text-black active:scale-95 text-white flex items-center justify-center shrink-0 shadow-md shadow-black/20 transition-all focus:outline-none focus:ring-2 focus:ring-black"
        title={isPlaying ? 'Pause animation' : 'Play animation'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-3 h-3 fill-current" />
        ) : (
          <Play className="w-3 h-3 fill-current ml-0.5" />
        )}
      </button>

      {/* Scrubber slider and time label */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between text-[9.5px] mb-0.5">
          <span className="font-semibold text-black truncate flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-black"></span>
            {currentLabel}
          </span>
          <span className="text-[9px] text-black font-mono">
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
        className="p-1.5 rounded-lg text-black hover:bg-black hover:text-white transition-colors shrink-0"
        title="Reset to current time"
        aria-label="Reset timeline"
      >
        <RotateCcw className="w-3 h-3" />
      </button>
    </div>
  );
};
