import React from 'react';
import { WeatherMode } from '../types/weather';

interface LegendCardProps {
  mode: WeatherMode;
}

export const LegendCard: React.FC<LegendCardProps> = ({ mode }) => {
  const getLegendConfig = () => {
    switch (mode) {
      case 'weather':
        return {
          title: 'CLOUD COVER',
          leftLabel: 'Clear',
          midLabel: '50%',
          rightLabel: 'Overcast',
          gradientClass: 'bg-gradient-to-r from-black via-slate-500 to-white',
        };
      case 'temperature':
        return {
          title: 'SURFACE TEMPERATURE (°C)',
          leftLabel: '18°C Cool',
          midLabel: '27°C Manila',
          rightLabel: '34°C Warm',
          gradientClass: 'bg-gradient-to-r from-amber-300 via-yellow-400 via-orange-500 to-amber-700',
        };
      case 'storm':
        return {
          title: 'REAL-TIME WIND & CLOUDS',
          leftLabel: 'Calm (<20 km/h)',
          midLabel: 'Moderate (20-45)',
          rightLabel: 'Gale / Strong (>50+)',
          gradientClass: 'bg-gradient-to-r from-purple-800 via-sky-500 to-lime-400',
        };
      case 'rain':
        return {
          title: 'RAINVIEWER DOPPLER RADAR',
          leftLabel: 'Light (10 dBZ)',
          midLabel: 'Moderate (35 dBZ)',
          rightLabel: 'Heavy (55+ dBZ)',
          gradientClass: 'bg-gradient-to-r from-sky-400 via-emerald-400 via-yellow-400 via-red-500 to-purple-600',
        };
    }
  };

  const config = getLegendConfig();

  return (
    <div className="ph-legend bg-white border border-slate-200 rounded-2xl p-3 shadow-2xl select-none">
      <div className="flex items-center justify-between mb-1.5">
        <span className="ph-legend__title text-[11px] font-bold tracking-wider text-black uppercase">
          {config.title}
        </span>
      </div>

      {/* Progress Bar / Gradient Track */}
      <div className={`ph-legend__bar w-full h-2 rounded-full ${config.gradientClass} ${mode === 'weather' ? '' : 'border border-slate-200'} shadow-inner`} />

      {/* Scale Labels */}
      <div className="ph-legend__labels flex items-center justify-between text-[10px] text-black mt-1.5 font-medium">
        <span>{config.leftLabel}</span>
        <span>{config.midLabel}</span>
        <span>{config.rightLabel}</span>
      </div>

    </div>
  );
};
