import type { HazardAlert, HazardType, EmergencyContact } from '../types';
import type { EvacuationCenter } from '../data/evacuationCenters';
import type { PlaceCategoryId } from '../data/helpCenterPlaces';

export type HazardVisibility = 'pending' | 'published' | 'hidden';
export interface ManagedHazard extends HazardAlert {
  visibility: HazardVisibility;
  source: 'community' | 'admin' | 'sample';
  createdAt: string;
  updatedAt: string;
}

export interface MapDisplaySettings {
  types: Record<HazardType, boolean>;
  showResolved: boolean;
  showPagasa: boolean;
}

export interface ManagedPlace {
  id: string;
  category: PlaceCategoryId;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  phone: string;
  hours: string;
  note: string;
  approx: boolean;
  is_active: boolean;
}

export interface ActivityEntry {
  id: string;
  at: string;
  actor: string;
  /** created | published | hidden | updated | deleted | resolved | resources | settings */
  action: string;
  title: string;
  detail?: string;
}

export interface OperationsData {
  hazards: ManagedHazard[];
  map: MapDisplaySettings;
  evacuationCenters: EvacuationCenter[];
  emergencyContacts: EmergencyContact[];
  liveStreamUrl: string;
  places: ManagedPlace[];
  activity: ActivityEntry[];
}

export const DEFAULT_MAP_DISPLAY: MapDisplaySettings = {
  types: { flood: true, fire: true, power: true, streetlight: true, water: true, road: true },
  showResolved: true,
  showPagasa: true,
};
