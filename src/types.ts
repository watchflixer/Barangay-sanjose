export type HazardType = 'fire' | 'flood' | 'power' | 'streetlight' | 'water' | 'road';

export type HazardSeverity = 'critical' | 'high' | 'moderate' | 'low';

export type HazardStatus = 'active' | 'monitoring' | 'resolved';

export interface HazardAlert {
  id: string;
  type: HazardType;
  title: string;
  streetName: string;
  sitio: string;
  coordinates: [number, number]; // [lat, lng]
  timeReported: string;
  status: HazardStatus;
  severity: HazardSeverity;
  description: string;
  reportedBy: string;
  photoUrl?: string;
  affectedHouseholds?: string;
  evacuationCenter?: string;
  contactNumber?: string;
  updatesCount?: number;
  lastUpdated?: string;
}

export interface SitioLocation {
  name: string;
  coordinates: [number, number];
  description: string;
  zone: string;
}

export interface MapSettings {
  maskOpacity: number; // 0.5 to 1.0 (default: 0.98 for solid blackout)
  maskColor: string; // '#000000' or '#0b0f19'
  tileLayer: 'streets' | 'light' | 'dark' | 'satellite';
  showBoundaryStroke: boolean;
  boundaryColor: string;
  showSitioLabels: boolean;
  lockCameraToBounds: boolean;
  autoCenterOnSelect: boolean;
  activeFilterType: HazardType | 'all';
  activeFilterStatus: HazardStatus | 'all';
}

export interface EmergencyContact {
  agency: string;
  label: string;
  numbers: string[];
  type: 'rescue' | 'fire' | 'police' | 'barangay' | 'utility';
  icon: string;
}
