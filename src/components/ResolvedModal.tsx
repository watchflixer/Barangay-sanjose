import React from 'react';
import { X, CheckCircle2, ShieldCheck, MapPin, Calendar, Camera, Eye, ExternalLink } from 'lucide-react';
import { HazardAlert } from '../types';

interface ResolvedModalProps {
  isOpen: boolean;
  onClose: () => void;
  resolvedAlerts: HazardAlert[];
  onFilterToResolved: () => void;
  onSelectAlert: (alert: HazardAlert) => void;
}

export const ResolvedModal: React.FC<ResolvedModalProps> = ({
  isOpen,
  onClose,
  resolvedAlerts,
  onFilterToResolved,
  onSelectAlert,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Resolved / Cleared Hazards</h2>
              <p className="text-xs text-slate-300">
                Talaan ng mga naayos, nalinis, at natapos na operasyon sa Barangay San Jose
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

        {/* Quick Filter Banner */}
        <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Kabuuang Nalinis / Naayos: <strong>{resolvedAlerts.length} Insidente</strong></span>
          </div>
          <button
            onClick={() => {
              onFilterToResolved();
              onClose();
            }}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-md transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>I-filter ang Mapa sa Resolved</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* List of Resolved Items */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {resolvedAlerts.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              Walang kasalukuyang resolved hazard sa database.
            </div>
          ) : (
            resolvedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{alert.title}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                        Cleared / Safe
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{alert.sitio} — {alert.streetName}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onSelectAlert(alert);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Tingnan</span>
                  </button>
                </div>

                <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200/80">
                  {alert.description}
                </p>

                {alert.photoUrl && (
                  <div className="flex items-center gap-3 pt-1">
                    <img
                      src={alert.photoUrl}
                      alt={alert.title}
                      className="w-16 h-12 object-cover rounded-lg border border-slate-200"
                    />
                    <div className="text-[11px] text-slate-500">
                      <p className="font-medium text-slate-700">Clearing & Verification Photo Attached</p>
                      <p>Na-verify ng Brgy. San Jose Ops Center</p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Ang lahat ng resolved records ay naka-archive sa Disaster Logs.</span>
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
