import React, { useState } from 'react';
import { X, AlertTriangle, Wind, Waves, ShieldAlert } from 'lucide-react';
import { PAGASA_RAINFALL_WARNINGS, PAGASA_TCWS } from '../services/pagasa';

interface PagasaWarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'rainfall' | 'signals' | 'gale';
}

export const PagasaWarningsModal: React.FC<PagasaWarningsModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'rainfall',
}) => {
  const [activeTab, setActiveTab] = useState<'rainfall' | 'signals' | 'gale'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-[#001f3f] flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Official DOST-PAGASA Warning Systems</h2>
              <p className="text-xs text-blue-200">Heavy Rainfall Warning System · Tropical Cyclone Wind Signals · Gale Advisory</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('rainfall')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'rainfall' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Heavy Rainfall</span>
          </button>

          <button
            onClick={() => setActiveTab('signals')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'signals' ? 'bg-rose-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Signal No. 1 to 5 (TCWS)</span>
          </button>

          <button
            onClick={() => setActiveTab('gale')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'gale' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Marine Gale Warning</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar text-xs">
          
          {/* TAB 1: HEAVY RAINFALL WARNING SYSTEM */}
          {activeTab === 'rainfall' && (
            <div className="space-y-3">
              <p className="text-slate-300 leading-relaxed">
                The <strong>Color-Coded Heavy Rainfall Warning System (HRWS)</strong> is used by DOST-PAGASA to classify rainfall severity and alert communities to potential flood and landslide hazards.
              </p>

              {/* Yellow Warning */}
              <div className="p-3.5 rounded-xl border border-yellow-500/40 bg-yellow-950/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-yellow-400 text-sm flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-400 shadow-md"></span>
                    <span>{PAGASA_RAINFALL_WARNINGS.YELLOW.titleEn}</span>
                  </span>
                  <span className="font-mono text-[11px] text-yellow-300">7.5 - 15 mm/h (Heavy Rainfall)</span>
                </div>
                <div className="text-slate-200"><strong>Recommended Action:</strong> {PAGASA_RAINFALL_WARNINGS.YELLOW.actionEn}</div>
                <div className="text-slate-400 text-[11px]"><strong>Impact:</strong> Flooding is possible in low-lying flood-prone areas.</div>
              </div>

              {/* Orange Warning */}
              <div className="p-3.5 rounded-xl border border-orange-500/40 bg-orange-950/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-orange-400 text-sm flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-orange-500 shadow-md"></span>
                    <span>{PAGASA_RAINFALL_WARNINGS.ORANGE.titleEn}</span>
                  </span>
                  <span className="font-mono text-[11px] text-orange-300">15 - 30 mm/h (Intense Rainfall)</span>
                </div>
                <div className="text-slate-200"><strong>Recommended Action:</strong> {PAGASA_RAINFALL_WARNINGS.ORANGE.actionEn}</div>
                <div className="text-slate-400 text-[11px]"><strong>Impact:</strong> Flooding is threatening. Residents in high-risk areas should prepare to move.</div>
              </div>

              {/* Red Warning */}
              <div className="p-3.5 rounded-xl border border-rose-500/60 bg-rose-950/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400 text-sm flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 shadow-md animate-ping"></span>
                    <span>{PAGASA_RAINFALL_WARNINGS.RED.titleEn}</span>
                  </span>
                  <span className="font-mono text-[11px] text-rose-300">&gt;30 mm/h (Torrential Rainfall)</span>
                </div>
                <div className="text-rose-100 font-semibold"><strong>Recommended Action:</strong> {PAGASA_RAINFALL_WARNINGS.RED.actionEn}</div>
                <div className="text-rose-200 text-[11px]"><strong>Impact:</strong> Severe flooding and landslides expected in critical zones.</div>
              </div>
            </div>
          )}

          {/* TAB 2: TCWS SIGNALS */}
          {activeTab === 'signals' && (
            <div className="space-y-2.5">
              <p className="text-slate-300 leading-relaxed">
                <strong>Tropical Cyclone Wind Signals (TCWS)</strong> provide warning of impending winds and meteorological threats with associated lead times.
              </p>

              {PAGASA_TCWS.map((sig) => (
                <div
                  key={sig.signalNo}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-800/40 flex items-start gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border"
                    style={{ borderColor: sig.colorHex, color: sig.colorHex, backgroundColor: `${sig.colorHex}20` }}
                  >
                    #{sig.signalNo}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">Signal No. {sig.signalNo}</span>
                      <span className="font-mono text-cyan-400 text-[11px]">{sig.windSpeedKmh}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 leading-snug">
                      {sig.signalNo === 1
                        ? 'Slight damage to light structures; very light risk to high-risk areas.'
                        : sig.signalNo === 2
                        ? 'Minor to moderate damage; unroofing of light houses and damage to crops.'
                        : sig.signalNo === 3
                        ? 'Moderate to heavy damage; danger to marine navigation and sea vessels.'
                        : sig.signalNo === 4
                        ? 'Very heavy damage; high risk of coastal storm surge.'
                        : 'Catastrophic widespread damage; mandatory evacuation of all coastal areas.'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Lead Time: within {sig.leadTimeHours} hours</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: GALE WARNING */}
          {activeTab === 'gale' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                  <Waves className="w-4 h-4" />
                  <span>Marine Gale Warning Advisory</span>
                </div>
                <p className="text-slate-200 leading-relaxed">
                  Issued when sea wave heights reach <strong>2.8 to 4.5 meters or more</strong> due to surge winds from the Northeast Monsoon (Amihan), Southwest Monsoon (Habagat), or active tropical depressions.
                </p>
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="font-bold text-amber-300">⚠️ Seafarer Advisory:</div>
                  <div className="text-slate-300">
                    Fishing boats and small sea vessels are <strong>strongly advised not to venture out to sea</strong> over the seaboards of Northern Luzon and eastern coastlines due to rough to very rough sea conditions.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
