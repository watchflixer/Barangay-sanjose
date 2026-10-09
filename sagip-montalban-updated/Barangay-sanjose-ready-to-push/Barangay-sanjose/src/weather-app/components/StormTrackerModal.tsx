import React from 'react';
import { X, AlertTriangle, Wind, Compass, ShieldAlert, ArrowRight, Activity } from 'lucide-react';
import { Language, SpeedUnit, TropicalStorm } from '../types/weather';
import { formatSpeed } from '../services/openMeteo';

interface StormTrackerModalProps {
  storms: TropicalStorm[];
  isOpen: boolean;
  onClose: () => void;
  onSelectStorm: (storm: TropicalStorm) => void;
  lang: Language;
  speedUnit: SpeedUnit;
}

export const StormTrackerModal: React.FC<StormTrackerModalProps> = ({
  storms,
  isOpen,
  onClose,
  onSelectStorm,
  lang,
  speedUnit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{lang === 'fil' ? 'PAGASA & Global Bagyo Tracker' : 'Typhoon & Tropical Cyclone Tracker'}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'fil'
                  ? 'Realtime pagsubaybay sa mga bagyo sa loob at labas ng PAR'
                  : 'Realtime active tropical cyclone monitoring & forecast track'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Storms */}
        <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar">
          {storms.map((storm) => (
            <div
              key={storm.id}
              className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-rose-500/40 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">
                      {storm.name}
                    </span>
                    {storm.inPAR && (
                      <span className="text-[10px] font-bold text-rose-300 bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 rounded-full">
                        {lang === 'fil' ? 'LOOB NG PAR' : 'INSIDE PAR'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-amber-400 font-medium mt-0.5">
                    {storm.category} · {storm.basin}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectStorm(storm);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <span>{lang === 'fil' ? 'Tingnan sa Mapa' : 'View on Map'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Storm Key Stats */}
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Wind className="w-3 h-3 text-cyan-400" />
                    <span>{lang === 'fil' ? 'Lakas' : 'Max Wind'}</span>
                  </div>
                  <div className="font-bold text-white mt-1">
                    {formatSpeed(storm.maxWindKmh, speedUnit)}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-rose-400" />
                    <span>{lang === 'fil' ? 'Bugso' : 'Gusts'}</span>
                  </div>
                  <div className="font-bold text-rose-300 mt-1">
                    {formatSpeed(storm.gustsKmh, speedUnit)}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Compass className="w-3 h-3 text-amber-400" />
                    <span>{lang === 'fil' ? 'Presyon' : 'Pressure'}</span>
                  </div>
                  <div className="font-bold text-white mt-1 font-mono">
                    {storm.pressureHpa} hPa
                  </div>
                </div>
              </div>

              {/* Movement */}
              <div className="text-xs text-slate-300 flex items-center gap-1.5 bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  <strong>{lang === 'fil' ? 'Kilos / Direksyon:' : 'Movement:'}</strong> {storm.movement}
                </span>
              </div>

              {/* Forecast Track Waypoints */}
              <div className="pt-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {lang === 'fil' ? 'Inaasahang Landas (Forecast Track)' : 'Forecast Track Points'}
                </div>
                <div className="space-y-1">
                  {storm.track.map((pt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-slate-900/30 text-slate-400 font-mono"
                    >
                      <span className="text-slate-300 font-sans">{pt.time}</span>
                      <span>{pt.lat.toFixed(1)}°N, {pt.lon.toFixed(1)}°E</span>
                      <span className="text-amber-300">{pt.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* PAR Advisory notice */}
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/30 text-xs text-cyan-200/80 leading-relaxed">
            <span className="font-bold text-cyan-300">💡 Philippine Area of Responsibility (PAR):</span>{' '}
            {lang === 'fil'
              ? 'Ang guhit ng PAR ay awtomatikong ipinapakita sa mapa bilang berdeng boundary. Anumang sama ng panahon na papasok dito ay opisyal na pinapangalanan at sinusubaybayan.'
              : 'The PAR boundary is rendered as a distinct polygon boundary on the map. Tropical depressions entering this area receive official domestic warnings.'}
          </div>
        </div>
      </div>
    </div>
  );
};
