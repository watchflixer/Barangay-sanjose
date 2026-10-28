import React from 'react';
import { WeatherMode } from '../types/weather';

interface TopBarProps {
  currentMode: WeatherMode;
  onSelectMode: (mode: WeatherMode) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ currentMode, onSelectMode }) => {
  const modes: { id: WeatherMode; label: string; badge: string }[] = [
    { id: 'weather', label: 'Weather', badge: 'Open-Meteo' },
    { id: 'temperature', label: 'Temperature', badge: 'Thermal' },
    { id: 'storm', label: 'Wind', badge: 'Wind & Clouds' },
    { id: 'rain', label: 'Rain', badge: 'RainViewer' }
  ];

  return (
    <header className="absolute top-10 sm:top-3 left-3 right-3 z-[1000] flex flex-col gap-2.5 pointer-events-none select-none">
      {/* Mode Navigation Bar (Weather | Temperature | Wind | Rain) */}
      {/* `ph-mode-nav` / `ph-mode-btn` are hooks only: every laptop/desktop
          tweak lives behind `@media (min-width: 640px)` in index.css — above
          every portrait phone — so the Android/iPhone portrait rendering stays
          byte-for-byte the same. */}
      <nav
        className="ph-mode-nav w-[calc(100%-12px)] mx-auto bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-1.5 shadow-2xl flex items-center justify-between gap-1 pointer-events-auto"
        aria-label="Weather modes"
      >
        {modes.map((mode) => {
          const isActive = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className={`ph-mode-btn flex-auto min-w-0 py-1.5 px-0.5 sm:px-2 rounded-xl text-sm sm:text-base font-semibold whitespace-nowrap tracking-tight transition-all duration-200 text-center flex flex-col items-center justify-center ${
                isActive
                  ? 'ph-mode-btn--active bg-black text-white shadow-md'
                  : 'text-black hover:bg-slate-100'
              }`}
            >
              <span>{mode.label}</span>
            </button>
          );
        })}
      </nav>

    </header>
  );
};
