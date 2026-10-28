import React from 'react';
import { X, Building2, MapPin, Users, Phone, CheckCircle, AlertTriangle, ExternalLink, Shield } from 'lucide-react';

import { SAN_JOSE_EVACUATION_CENTERS, type EvacuationCenter } from '../data/evacuationCenters';

interface EvacuationCentersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCoordinates?: (coords: [number, number], name: string) => void;
  centers?: EvacuationCenter[];
}

export const EvacuationCentersModal: React.FC<EvacuationCentersModalProps> = ({
  isOpen,
  onClose,
  onSelectCoordinates,
  centers = SAN_JOSE_EVACUATION_CENTERS,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Evacuation Centers in San Jose</h2>
              <p className="text-xs text-slate-300">
                Facilities listed by the barangay administrator
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

        {/* Quick Summary Strip */}
        <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="font-semibold">Total Capacity: {centers.reduce((total, center) => total + center.capacityFamilies, 0).toLocaleString()} Families</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {centers.filter(center => center.status === 'Open').length} Open / Active
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-blue-700">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> {centers.filter(center => center.status === 'Standby').length} Standby / Ready
            </span>
          </div>
        </div>

        {/* List of Evacuation Centers */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-100">
          {centers.length === 0 && (
            <p className="text-center text-xs text-slate-500 py-8">
              No evacuation centers have been published yet. For immediate emergencies, call 911.
            </p>
          )}
          {centers.map((center) => (
            <div key={center.id} className="pt-3.5 first:pt-0">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">{center.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        center.status === 'Open'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                          : center.status === 'Full'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {center.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{center.address}</span>
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <strong className="text-slate-900">{center.currentFamilies}</strong> / {center.capacityFamilies} families
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{center.contactNumber} ({center.contactPerson})</span>
                    </span>
                  </div>

                  {/* Amenities tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {center.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] rounded font-medium"
                      >
                        ✓ {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                {onSelectCoordinates && (
                  <button
                    onClick={() => {
                      onSelectCoordinates(center.coordinates, center.name);
                      onClose();
                    }}
                    className="self-start px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>Focus on Map</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>For immediate emergencies, call <strong>911</strong>.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
