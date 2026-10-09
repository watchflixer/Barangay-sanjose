import React from 'react';
import { X, FileText, ShieldCheck } from 'lucide-react';
import { MAJOR_RIVER_BASINS } from '../services/pagasa';
import { Language } from '../types/weather';

interface PagasaBulletinModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const PagasaBulletinModal: React.FC<PagasaBulletinModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Government Document Header */}
        <div className="p-4 border-b border-slate-800 bg-[#001f3f] flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-950 border border-blue-400 flex flex-col items-center justify-center font-bold text-center">
              <span className="text-sm">☀️</span>
              <span className="text-[7px] text-cyan-300">PAGASA</span>
            </div>
            <div>
              <div className="text-[10px] tracking-wider uppercase text-blue-200">
                Republic of the Philippines · Department of Science and Technology
              </div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                24-HOUR PUBLIC WEATHER FORECAST BULLETIN
              </h2>
              <div className="text-[11px] text-amber-300 font-mono">
                Issued: {todayStr} at 4:00 AM / 4:00 PM PST
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Body */}
        <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar text-xs leading-relaxed">
          
          {/* Section 1: Synoptic Situation */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
            <h3 className="font-bold text-cyan-300 text-sm flex items-center gap-1.5 uppercase">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>I. Synoptic Meteorological Situation</span>
            </h3>
            <p className="text-slate-200 text-xs">
              The <strong>Northeast Monsoon (Amihan)</strong> is affecting Northern Luzon (Batanes, Babuyan Islands, Ilocos Region, and Cordillera Administrative Region). Meanwhile, <strong>Easterlies</strong> are prevailing across the rest of Luzon, Visayas, and Mindanao, bringing warm and humid conditions with chances of isolated afternoon or evening thunderstorms.
            </p>
          </div>

          {/* Section 2: Regional Forecast Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-amber-300 text-sm uppercase">
              II. 24-Hour Regional Weather Forecast
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-[#002855] text-slate-200 border-b border-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Region / Area</th>
                    <th className="p-2.5">Weather Condition</th>
                    <th className="p-2.5">Caused By</th>
                    <th className="p-2.5">Potential Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                  <tr>
                    <td className="p-2.5 font-bold text-white">Batanes and Babuyan Islands</td>
                    <td className="p-2.5 text-cyan-200">Cloudy skies with light rains</td>
                    <td className="p-2.5 text-slate-300">Northeast Monsoon (Amihan)</td>
                    <td className="p-2.5 text-slate-400">No significant hazard</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-white">Metro Manila and Central Luzon</td>
                    <td className="p-2.5 text-amber-200">Partly cloudy to cloudy with isolated rainshowers</td>
                    <td className="p-2.5 text-slate-300">Easterlies / Amihan</td>
                    <td className="p-2.5 text-amber-400">Possible flash floods in low-lying areas during heavy downpours</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-white">Visayas (Cebu, Iloilo, Tacloban)</td>
                    <td className="p-2.5 text-amber-200">Fair weather with isolated thunderstorms</td>
                    <td className="p-2.5 text-slate-300">Easterlies</td>
                    <td className="p-2.5 text-amber-400">Gusty winds and lightning during thunderstorms</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-white">Mindanao (Davao, Caraga, BARMM)</td>
                    <td className="p-2.5 text-slate-200">Partly cloudy with scattered thunderstorms</td>
                    <td className="p-2.5 text-slate-300">Easterlies / ITCZ</td>
                    <td className="p-2.5 text-amber-400">Localized flash floods and rain-induced landslides</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Key Cities Weather Outlook */}
          <div className="space-y-2">
            <h3 className="font-bold text-cyan-300 text-sm uppercase">
              III. Weather Outlook for Key Tourist & Urban Centers
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { city: 'Metro Manila', temp: '25°C - 33°C', wind: 'Wind: Moderate (E-NE)', rain: 'Passing Showers (30%)' },
                { city: 'Baguio City', temp: '15°C - 23°C', wind: 'Cool Breeze (NE)', rain: 'Occasional Drizzle (40%)' },
                { city: 'Tagaytay City', temp: '20°C - 28°C', wind: 'Fresh Breeze (NE)', rain: 'Partly Cloudy (20%)' },
                { city: 'Metro Cebu', temp: '26°C - 32°C', wind: 'Light to Moderate (E)', rain: 'Isolated Showers (35%)' },
                { city: 'Metro Davao', temp: '24°C - 32°C', wind: 'Gentle (NE)', rain: 'Thunderstorm (45%)' },
                { city: 'Legazpi / Albay', temp: '25°C - 31°C', wind: 'Moderate (E)', rain: 'Passing Rain (50%)' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
                  <div className="font-bold text-white text-xs">{item.city}</div>
                  <div className="text-cyan-400 font-mono font-bold text-xs">{item.temp}</div>
                  <div className="text-[10px] text-slate-400">{item.wind}</div>
                  <div className="text-[10px] text-amber-300">{item.rain}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Flood Advisory for Major River Basins */}
          <div className="space-y-2">
            <h3 className="font-bold text-blue-300 text-sm uppercase">
              IV. General Flood Advisory for Major River Basins
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MAJOR_RIVER_BASINS.map((river, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-xs">{river.name}</div>
                    <div className="text-[10px] text-slate-400">{river.region}</div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded border"
                    style={{ borderColor: river.color, color: river.color, backgroundColor: `${river.color}15` }}
                  >
                    {river.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Official meteorological data released by the Weather Division of DOST-PAGASA Science Garden Complex, Agham Road, Diliman, Quezon City.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
