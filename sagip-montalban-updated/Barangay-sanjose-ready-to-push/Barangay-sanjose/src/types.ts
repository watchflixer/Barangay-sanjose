export type HazardType = 'fire' | 'flood' | 'power' | 'streetlight' | 'water' | 'road';

export type HazardSeverity = 'critical' | 'high' | 'moderate' | 'low';

export type HazardStatus = 'active' | 'monitoring' | 'resolved';

export type ReviewStatus = 'pending' | 'accepted' | 'declined';

export interface HazardAlert {
  id: string;
  type: HazardType;
  title: string;
  streetName: string;
  sitio: string;
  coordinates: [number, number]; // [lat, lng]
  timeReported: string;
  reviewStatus?: ReviewStatus; // Missing on legacy/live records means accepted.
  pendingResolveFlags?: number;
  source?: 'community' | 'admin';
  reviewedAt?: string;
  declineReason?: string;
  reportedAt?: string; // ISO timestamp; legacy/demo reports may not have one
  showReporter?: boolean; // Public name only; email/phone remain admin-only
  deletedAt?: string; // Archived reports stay available to admin history
  status: HazardStatus;
  severity: HazardSeverity;
  description: string;
  reportedBy: string;
  photoUrl?: string;
  affectedHouseholds?: string;
  evacuationCenter?: string;
  contactNumber?: string;
  reporterEmail?: string;
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
  maskOpacity: number; // 0.3 to 1.0 (default: 0.30 for subtle blackout)
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

export type HazardDraft = Pick<
  HazardAlert,
  | 'type'
  | 'title'
  | 'streetName'
  | 'sitio'
  | 'coordinates'
  | 'status'
  | 'severity'
  | 'description'
  | 'reportedBy'
  | 'photoUrl'
  | 'affectedHouseholds'
  | 'evacuationCenter'
  | 'contactNumber'
  | 'reporterEmail'
>;
