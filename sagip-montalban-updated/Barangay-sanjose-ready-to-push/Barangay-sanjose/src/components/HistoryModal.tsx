import React from 'react';
import { X, History, Calendar, MapPin, CheckCircle2, AlertOctagon, User, FileText } from 'lucide-react';
import { HazardAlert } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: HazardAlert[];
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  alerts,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Kasaysayan ng mga Ulat at Aksyon (History Log)</h2>
              <p className="text-xs text-slate-300">
                Opisyal na talaan ng mga nai-report na hazard at pagtugon sa Barangay San Jose
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

        {/* Timeline Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {alerts.map((alert, index) => (
              <div key={alert.id || index} className="relative group">
                {/* Status Dot on Line */}
                <div
                  className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white ${
                    alert.status === 'resolved'
                      ? 'bg-emerald-500'
                      : alert.status === 'monitoring'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                />

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{alert.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        alert.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : alert.status === 'monitoring'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {alert.status === 'resolved' ? 'Naaksyunan' : alert.status === 'monitoring' ? 'Monitoring' : 'Aktibo'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{alert.sitio} — {alert.streetName}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Naiulat ni: {alert.reportedBy}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Timestamp: {alert.lastUpdated || 'Kamakailan'}</span>
                    </p>
                  </div>

                  <p className="text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200/80">
                    "{alert.description}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Kabuuang talaan: <strong>{alerts.length} mga ulat</strong></span>
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
