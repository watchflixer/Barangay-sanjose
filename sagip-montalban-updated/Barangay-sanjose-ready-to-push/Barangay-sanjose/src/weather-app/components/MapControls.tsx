import React, { useState } from 'react';
import { Sliders, Maximize2, Minimize2, Navigation, Compass, Layers } from 'lucide-react';
import { Language } from '../types/weather';

interface MapControlsProps {
  opacity: number;
  onChangeOpacity: (val: number) => void;
  onResetView: () => void;
  lang: Language;
}

export const MapControls: React.FC<MapControlsProps> = ({
  opacity,
  onChangeOpacity,
  onResetView,
  lang,
}) => {
  const [showSlider, setShowSlider] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="fixed right-3 bottom-24 z-[500] flex flex-col gap-2 pointer-events-auto">
      {/* Opacity Tool */}
      <div className="relative">
        <button
          onClick={() => setShowSlider(!showSlider)}
          className={`p-2.5 rounded-xl border shadow-xl transition-all ${
            showSlider
              ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-slate-300'
          }`}
          title={lang === 'fil' ? 'Lakas ng Radar Opacity' : 'Radar Layer Opacity'}
        >
          <Sliders className="w-4 h-4" />
        </button>

        {showSlider && (
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 p-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col items-center gap-1.5 w-32">
            <span className="text-[10px] font-semibold text-slate-300">
              Opacity: {Math.round(opacity * 100)}%
            </span>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer appearance-none"
            />
          </div>
        )}
      </div>

      {/* Recenter button */}
      <button
        onClick={onResetView}
        className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 shadow-xl transition-colors"
        title="Recenter Map (Philippines & PAR)"
      >
        <Compass className="w-4 h-4 text-cyan-400" />
      </button>

      {/* Fullscreen toggle */}
      <button
        onClick={toggleFullscreen}
        className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 shadow-xl transition-colors hidden sm:flex"
        title="Fullscreen"
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
    </div>
  );
};
