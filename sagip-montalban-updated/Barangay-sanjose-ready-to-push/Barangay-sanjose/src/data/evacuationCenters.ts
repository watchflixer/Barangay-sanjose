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

