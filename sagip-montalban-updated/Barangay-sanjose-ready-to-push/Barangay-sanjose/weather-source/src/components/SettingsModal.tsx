import React, { useState } from 'react';
import { X, Key, ShieldCheck, Clock, Layers, ExternalLink } from 'lucide-react';
import { getStoredOwmKey, saveOwmKey } from '../services/openWeatherService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  refreshMinutes: number;
  onChangeRefreshMinutes: (mins: number) => void;
  onKeySaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  refreshMinutes,
  onChangeRefreshMinutes,
  onKeySaved
}) => {
  const [owmKey, setOwmKey] = useState(getStoredOwmKey());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveKey = () => {
    saveOwmKey(owmKey);
    setSavedSuccess(true);
    onKeySaved();
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-6 text-slate-100 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          aria-label="Close settings"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          Settings & Data Sources
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Real-time weather configurations for the Philippine archipelago.
        </p>

        <div className="space-y-5 mt-5">
          {/* Refresh Interval */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-white/5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Realtime Auto-Refresh Interval</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Automatically re-queries Open-Meteo, RainViewer & OWM to keep conditions live.
            </p>
            <div className="flex items-center gap-2">
              {[5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  onClick={() => onChangeRefreshMinutes(mins)}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-medium transition-colors ${
                    refreshMinutes === mins
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {mins} Minutes {mins === 10 ? '(Default)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* OpenWeatherMap API Key (Optional) */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-white/5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Key className="w-4 h-4 text-amber-400" />
                <span>OpenWeatherMap API Key (Optional)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Free Tier</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2.5">
              If left blank, Panahon uses high-resolution Open-Meteo Philippine thermal modeling & RainViewer Doppler radar seamlessly with zero key required!
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste OpenWeatherMap API Key..."
                value={owmKey}
                onChange={(e) => setOwmKey(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                onClick={handleSaveKey}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
              >
                Save
              </button>
            </div>
            {savedSuccess && (
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Key saved successfully!
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Map tiles: © Esri · © OpenStreetMap contributors. Weather: Open-Meteo. Radar: RainViewer.
          </p>

          {/* Integrated Services Information */}
          <div className="space-y-2 text-xs text-slate-400 border-t border-white/5 pt-4">
            <div className="flex items-center justify-between">
              <span>🌦️ Weather Forecasts:</span>
              <span className="text-slate-200 font-medium">Open-Meteo API (Philippines)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>🌧️ Doppler Rain Radar:</span>
              <span className="text-slate-200 font-medium">RainViewer Network (Live)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>🌪️ Storm & Wind Tracking:</span>
              <span className="text-slate-200 font-medium">PAGASA PAR & Wind Grid</span>
            </div>
            <div className="flex items-center justify-between">
              <span>🌡️ Temperature Modeling:</span>
              <span className="text-slate-200 font-medium">OpenWeatherMap / Open-Meteo</span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
