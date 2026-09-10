import React from 'react';
import { X, Building2, MapPin, Users, Phone, CheckCircle, AlertTriangle, ExternalLink, Shield } from 'lucide-react';

export interface EvacuationCenter {
  id: string;
  name: string;
  sitio: string;
  address: string;
  capacityFamilies: number;
  currentFamilies: number;
  status: 'Open' | 'Standby' | 'Full';
  contactPerson: string;
  contactNumber: string;
  coordinates: [number, number];
  amenities: string[];
}

export const SAN_JOSE_EVACUATION_CENTERS: EvacuationCenter[] = [
  {
    id: 'evac-1',
    name: 'Kasiglahan Village Elementary School',
    sitio: 'Kasiglahan Village (1K1)',
    address: 'Phase 1K1, Kasiglahan Village, San Jose, Rodriguez, Rizal',
    capacityFamilies: 450,
    currentFamilies: 0,
    status: 'Standby',
    contactPerson: 'Principal / Brgy. Evac Officer Reyes',
    contactNumber: '0917-890-7265',
    coordinates: [14.7458, 121.1362],
    amenities: ['Generator Back-up', 'Community Kitchen', 'Medical Station', 'Clean Water Tank']
  },
  {
    id: 'evac-2',
    name: 'San Jose National High School Evacuation Center',
    sitio: 'Litex / Tagumpay Area',
    address: 'National Highway, Brgy. San Jose, Rodriguez, Rizal',
    capacityFamilies: 600,
    currentFamilies: 0,
    status: 'Standby',
    contactPerson: 'MDRRMO Focal Santos',
    contactNumber: '(02) 8997-1800',
    coordinates: [14.7335, 121.1095],
    amenities: ['Multi-Room Classrooms', 'WASH Facilities', 'Security Post', 'Solar Lights']
  },
  {
    id: 'evac-3',
    name: 'Kasiglahan Phase 1K2 Multi-Purpose Covered Court',
    sitio: 'Kasiglahan Village (1K2)',
    address: 'Phase 1K2 Covered Gym, San Jose, Rodriguez, Rizal',
    capacityFamilies: 250,
    currentFamilies: 18,
    status: 'Open',
    contactPerson: 'Sitio Leader Hernandez',
    contactNumber: '0920-955-7372',
    coordinates: [14.7485, 121.1390],
    amenities: ['Elevated Flooring', 'Relief Distribution Point', 'First Aid Station']
  },
  {
    id: 'evac-4',
    name: 'Tagumpay Multi-Purpose Evacuation Hall',
    sitio: 'Sitio Tagumpay Resettlement',
    address: 'Tagumpay Main Ave, San Jose, Rodriguez, Rizal',
    capacityFamilies: 300,
    currentFamilies: 0,
    status: 'Standby',
    contactPerson: 'Kagawad on Disaster Preparedness',
    contactNumber: '(02) 8997-1823',
    coordinates: [14.7555, 121.1215],
    amenities: ['Emergency Power', 'Restrooms', 'CCTV Monitoring']
  },
  {
    id: 'evac-5',
    name: 'Amityville Covered Court & Disaster Facility',
    sitio: 'Amityville Subdivision',
    address: 'Main Entrance Court, Amityville, San Jose, Rodriguez, Rizal',
    capacityFamilies: 180,
    currentFamilies: 0,
    status: 'Standby',
    contactPerson: 'HOA Disaster Committee',
    contactNumber: '0966-248-1890',
    coordinates: [14.7380, 121.1270],
    amenities: ['Clean Drinking Water', 'Covered Arena', 'Radio Comms Base']
  },
  {
    id: 'evac-6',
    name: 'Suburban Multi-Purpose Gymnasium',
    sitio: 'Suburban San Jose',
    address: 'Phase 2 Gym, Suburban, San Jose, Rodriguez, Rizal',
    capacityFamilies: 200,
    currentFamilies: 0,
    status: 'Standby',
    contactPerson: 'Brgy. San Jose Sub-OpCen',
    contactNumber: '(02) 8941-1191',
    coordinates: [14.7290, 121.1180],
    amenities: ['Elevated Bleachers', 'Backup Power', 'Kitchen Area']
  }
];

interface EvacuationCentersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCoordinates?: (coords: [number, number], name: string) => void;
}

export const EvacuationCentersModal: React.FC<EvacuationCentersModalProps> = ({
  isOpen,
  onClose,
  onSelectCoordinates,
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
              <h2 className="text-base font-bold tracking-tight">Mga Evacuation Center sa San Jose</h2>
              <p className="text-xs text-slate-300">
                Opisyal na itinalagang mga ligtas na pasilidad ng Barangay San Jose at MDRRMO
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
            <span className="font-semibold">Kabuuang Kapasidad: 1,980 Pamilya</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 1 Open / Active
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-blue-700">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> 5 Standby / Ready
            </span>
          </div>
        </div>

        {/* List of Evacuation Centers */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-100">
          {SAN_JOSE_EVACUATION_CENTERS.map((center) => (
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
                      <strong className="text-slate-900">{center.currentFamilies}</strong> / {center.capacityFamilies} pamilya
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
                    <span>I-focus sa Mapa</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Para sa agarang evacuation assistance: Tumawag sa <strong>MDRRMO 911</strong> o <strong>(02) 8997-1800</strong></span>
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
