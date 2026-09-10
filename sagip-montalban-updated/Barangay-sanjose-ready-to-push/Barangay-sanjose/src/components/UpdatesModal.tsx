import React from 'react';
import { X, BellRing, Radio, CloudRain, ShieldCheck, Flame, Waves, Zap, LightbulbOff, AlertTriangle, Clock } from 'lucide-react';
import { HazardAlert } from '../types';

interface UpdatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: HazardAlert[];
  onOpenReportModal?: () => void;
  onOpenLiveModal?: () => void;
  hasLiveUrl?: boolean;
}

export const UpdatesModal: React.FC<UpdatesModalProps> = ({
  isOpen,
  onClose,
  alerts,
  onOpenReportModal,
  onOpenLiveModal,
  hasLiveUrl,
}) => {
  if (!isOpen) return null;

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const monitoringAlerts = alerts.filter((a) => a.status === 'monitoring');
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Pinakabagong Updates at Situational Report</h2>
              <p className="text-xs text-slate-300">
                Opisyal na ulat mula sa Barangay San Jose BDRRMO at Rodriguez MDRRMO
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Water Level & Weather Bulletin */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Official Advisory Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>BDRRMO Weather & Flood Advisory (Barangay San Jose)</span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              Kasalukuyang <strong>Normal hanggang Katamtaman</strong> ang antas ng tubig sa Rodriguez River at Wawa corridor. Patuloy ang pag-ikot ng mga barangay tanod at rescue personnel sa mga low-lying areas tulad ng Kasiglahan Village (1K1 & 1K2) at Tagumpay.
            </p>
            <div className="flex items-center justify-between pt-1 text-[11px] text-amber-800 font-medium border-t border-amber-200/60">
              <span>Antas ng Tubig: <strong>Normal (Green Level)</strong></span>
              <span>Updated: <strong>Kasalukuyang Oras</strong></span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
              <div className="text-xl font-black text-red-700">{activeAlerts.length}</div>
              <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Aktibong Insidente</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <div className="text-xl font-black text-amber-700">{monitoringAlerts.length}</div>
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Nasa Pagsubaybay</div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <div className="text-xl font-black text-emerald-700">{resolvedAlerts.length}</div>
              <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Naaksyunan / Ligtas</div>
            </div>
          </div>

          {/* Timeline Updates Feed */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Kasalukuyang Talaan ng mga Ulat</span>
            </h3>

            <div className="space-y-2.5">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{alert.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        alert.status === 'active'
                          ? 'bg-red-100 text-red-800'
                          : alert.status === 'monitoring'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {alert.status === 'active' ? 'Aktibo' : alert.status === 'monitoring' ? 'Monitoring' : 'Resolved'}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{alert.sitio} • {alert.streetName}</p>
                  <p className="text-slate-500 text-[11px] italic">"{alert.description}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500">MDRRMO Rodriguez Hotlines: <strong>(02) 8997-1800</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Isara
          </button>
        </div>
      </div>
    </div>
  );
};
