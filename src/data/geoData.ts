import { HazardAlert, SitioLocation, EmergencyContact } from '../types';
import kasiglahanFloodImg from '../assets/images/kasiglahan_flood_rizal_1788211116468.jpg';
import litexFireImg from '../assets/images/litex_transformer_fire_1788211132714.jpg';
import sanJoseDownedPowerImg from '../assets/images/sanjose_downed_powerline_1788211148418.jpg';
import tagumpayStreetlightsImg from '../assets/images/tagumpay_dark_streetlights_1788211165673.jpg';
import eastwoodPipeLeakImg from '../assets/images/eastwood_pipe_leak_1788211180390.jpg';
import suburbanBridgeClearingImg from '../assets/images/suburban_bridge_clearing_1788211195809.jpg';
import amityvilleDrainageImg from '../assets/images/amityville_drainage_cleared_1788211212112.jpg';

/**
 * Official Geographic Boundary of Barangay San Jose, Rodriguez (Montalban), Rizal, Philippines
 * Coordinates format: [latitude, longitude] in WGS84
 * 
 * Geographic Context:
 * - South: San Mateo (Malanday / Guitnang Bayan)
 * - West: Quezon City border (Payatas / Litex)
 * - North: Barangay Macabud / Barangay San Isidro
 * - East: Barangay Burgos / Barangay San Rafael / Rodriguez River
 */
export const SAN_JOSE_POLYGON_COORDS: [number, number][] = [
  [14.7180, 121.1080],
  [14.7215, 121.1042],
  [14.7268, 121.1015],
  [14.7330, 121.1008],
  [14.7405, 121.1030],
  [14.7482, 121.1075],
  [14.7550, 121.1120],
  [14.7620, 121.1185],
  [14.7685, 121.1260],
  [14.7725, 121.1340],
  [14.7710, 121.1435],
  [14.7660, 121.1510],
  [14.7585, 121.1575],
  [14.7505, 121.1610],
  [14.7420, 121.1605],
  [14.7345, 121.1560],
  [14.7275, 121.1495],
  [14.7220, 121.1410],
  [14.7175, 121.1315],
  [14.7150, 121.1220],
  [14.7160, 121.1140],
  [14.7180, 121.1080], // Closed polygon loop
];

/**
 * Municipality of Rodriguez (Montalban), Rizal Boundary for Extended Context
 */
export const RODRIGUEZ_MUNICIPALITY_COORDS: [number, number][] = [
  [14.7080, 121.1100],
  [14.7200, 121.0950],
  [14.7450, 121.0920],
  [14.7750, 121.1050],
  [14.8100, 121.1300],
  [14.8350, 121.1600],
  [14.8250, 121.2100],
  [14.7900, 121.2400],
  [14.7500, 121.2200],
  [14.7200, 121.1850],
  [14.7050, 121.1450],
  [14.7080, 121.1100],
];

/**
 * Centroid and Bounding Box of Barangay San Jose
 */
export const SAN_JOSE_CENTER: [number, number] = [14.7425, 121.1310];

export const SAN_JOSE_BOUNDS: [[number, number], [number, number]] = [
  [14.7120, 121.0950], // Southwest [lat, lng]
  [14.7760, 121.1660], // Northeast [lat, lng]
];

/**
 * Sitios, Subdivisions and Key Communities in Barangay San Jose
 */
export const SAN_JOSE_SITIOS: SitioLocation[] = [
  {
    name: 'Kasiglahan Village (1K1 & 1K2)',
    coordinates: [14.7452, 121.1355],
    description: 'Major residential resettlement area along Rodriguez River corridor',
    zone: 'Zone 4 - Kasiglahan Core'
  },
  {
    name: 'Sub-Urban Housing',
    coordinates: [14.7510, 121.1412],
    description: 'Sub-Urban Phase 1 to Phase 3 residential sector',
    zone: 'Zone 5 - North-East San Jose'
  },
  {
    name: 'Litex / Gravel Pit Corridor',
    coordinates: [14.7285, 121.1120],
    description: 'Southwestern commercial gateway bordering Payatas / QC',
    zone: 'Zone 1 - Gateway West'
  },
  {
    name: 'Eastwood Greenview & Residences',
    coordinates: [14.7390, 121.1215],
    description: 'Established private and community subdivision sector',
    zone: 'Zone 2 - Central San Jose'
  },
  {
    name: 'Amityville Subdivision',
    coordinates: [14.7335, 121.1280],
    description: 'Residential community along Montalban bypass route',
    zone: 'Zone 2 - South Central'
  },
  {
    name: 'Tagumpay Village & Metro Montana',
    coordinates: [14.7560, 121.1325],
    description: 'Upper plateau residential and institutional area',
    zone: 'Zone 3 - North San Jose'
  },
  {
    name: 'San Jose Proper / J.P. Rizal St',
    coordinates: [14.7410, 121.1470],
    description: 'Historic town corridor and Barangay Hall operations center',
    zone: 'Zone 6 - Poblacion San Jose'
  },
  {
    name: 'Sitio Balite & Marang',
    coordinates: [14.7615, 121.1460],
    description: 'Agricultural & foothills buffer zone of San Jose',
    zone: 'Zone 7 - Foothills'
  }
];

/**
 * Pre-seeded Active Hazard Alerts in Barangay San Jose
 */
export const INITIAL_HAZARDS: HazardAlert[] = [
  {
    id: 'hz-001',
    type: 'flood',
    title: 'Yellow Flood Watch - High River Level',
    streetName: 'Kasiglahan 1K1 Riverside Drive',
    sitio: 'Kasiglahan Village (1K1 & 1K2)',
    coordinates: [14.7468, 121.1378],
    timeReported: '12 mins ago (14:35 PST)',
    status: 'active',
    severity: 'high',
    description: 'Rodriguez river water level is currently 0.8m below dike threshold due to upstream runoff from Sierra Madre. Barangay rescue boats on standby at Block 47.',
    reportedBy: 'BDRRMC San Jose River Monitoring Unit',
    photoUrl: kasiglahanFloodImg,
    affectedHouseholds: 'Approx. 120 households',
    evacuationCenter: 'Kasiglahan Village Elementary School Gym',
    contactNumber: '(02) 8997-1823',
    updatesCount: 4,
    lastUpdated: '5 mins ago'
  },
  {
    id: 'hz-002',
    type: 'fire',
    title: 'Controlled Fire Incident - Overheated Transformer',
    streetName: 'Litex Market Access Rd, near Gravel Pit',
    sitio: 'Litex / Gravel Pit Corridor',
    coordinates: [14.7292, 121.1135],
    timeReported: '38 mins ago (14:09 PST)',
    status: 'monitoring',
    severity: 'moderate',
    description: 'BFP Rodriguez Engine 3 responded to a sparking transformer near commercial stalls. Fire is declared under control. Lane temporarily cordoned off.',
    reportedBy: 'BFP Rodriguez Fire Substation',
    photoUrl: litexFireImg,
    affectedHouseholds: '15 commercial stalls',
    contactNumber: '(02) 8948-2211',
    updatesCount: 2,
    lastUpdated: '15 mins ago'
  },
  {
    id: 'hz-003',
    type: 'power',
    title: 'Emergency Power Interruption & Downed Post',
    streetName: 'J.P. Rizal Avenue corner Balite St',
    sitio: 'San Jose Proper / J.P. Rizal St',
    coordinates: [14.7435, 121.1458],
    timeReported: '1 hour ago (13:45 PST)',
    status: 'active',
    severity: 'high',
    description: 'Fallen acacia branch snapped primary 34.5kV distribution cable. Meralco line crew truck #409 is actively splicing wires. Est. power restoration: 17:00 PST.',
    reportedBy: 'Brgy Tanod Sector 6 Dispatch',
    photoUrl: sanJoseDownedPowerImg,
    affectedHouseholds: 'Est. 450 households in San Jose Proper',
    contactNumber: '16211 (Meralco Hotline)',
    updatesCount: 3,
    lastUpdated: '20 mins ago'
  },
  {
    id: 'hz-007',
    type: 'streetlight',
    title: 'Dark Corridor - Multiple Broken Streetlights',
    streetName: 'Tagumpay Main Spine Road (Poles #12 to #18)',
    sitio: 'Tagumpay Village & Metro Montana',
    coordinates: [14.7565, 121.1332],
    timeReported: '1 hour ago (13:15 PST)',
    status: 'active',
    severity: 'moderate',
    description: 'Six consecutive LED streetlamp fixtures are non-operational along the curve, causing zero visibility for tricycles and pedestrians at night. Reported to Barangay Electrical Engineering unit for ballast replacement.',
    reportedBy: 'Tagumpay Purok Leader & TODA Association',
    photoUrl: tagumpayStreetlightsImg,
    affectedHouseholds: 'Key commuter & pedestrian path',
    contactNumber: '(02) 8997-1823',
    updatesCount: 2,
    lastUpdated: '10 mins ago'
  },
  {
    id: 'hz-004',
    type: 'water',
    title: 'Emergency Main Pipe Leak Repair',
    streetName: 'Eastwood Boulevard Phase 2',
    sitio: 'Eastwood Greenview & Residences',
    coordinates: [14.7382, 121.1230],
    timeReported: '2 hours ago (12:40 PST)',
    status: 'active',
    severity: 'moderate',
    description: 'Manila Water emergency maintenance on broken 200mm distribution main. Low pressure to zero water supply experienced in Phases 1 to 3. Water tankers en route.',
    reportedBy: 'Manila Water Montalban Operations',
    photoUrl: eastwoodPipeLeakImg,
    affectedHouseholds: 'Eastwood Greenview Phases 1-3',
    contactNumber: '1627 (Manila Water)',
    updatesCount: 5,
    lastUpdated: '30 mins ago'
  },
  {
    id: 'hz-005',
    type: 'road',
    title: 'Sub-Urban Access Bridge One-Lane Restriction',
    streetName: 'Sub-Urban Main Entrance Bridge',
    sitio: 'Sub-Urban Housing',
    coordinates: [14.7525, 121.1402],
    timeReported: '3 hours ago (11:30 PST)',
    status: 'monitoring',
    severity: 'low',
    description: 'Road clearing and desilting operations along bridge approach. Heavy vehicles are advised to take alternate bypass route through Amityville.',
    reportedBy: 'Rodriguez Municipal Engineering Office',
    photoUrl: suburbanBridgeClearingImg,
    contactNumber: '(02) 8997-1800',
    updatesCount: 1,
    lastUpdated: '1 hour ago'
  },
  {
    id: 'hz-006',
    type: 'flood',
    title: 'Gutter-Deep Flash Flood Cleared',
    streetName: 'Amityville 4th Avenue',
    sitio: 'Amityville Subdivision',
    coordinates: [14.7340, 121.1275],
    timeReported: '4 hours ago (10:15 PST)',
    status: 'resolved',
    severity: 'low',
    description: 'Clogged culvert caused temporary gutter-deep water during morning downpour. Barangay clearing team successfully unclogged drainage. Street is passable to all vehicles.',
    reportedBy: 'Amityville HOA Security Patrol',
    photoUrl: amityvilleDrainageImg,
    updatesCount: 3,
    lastUpdated: '1 hour ago'
  }
];

/**
 * Emergency Contacts Directory for Barangay San Jose & Municipality of Rodriguez
 */
export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    agency: 'Barangay San Jose Hall & Operations Center',
    label: 'Brgy. San Jose OpCen',
    numbers: ['(02) 8997-1823', '0917-890-7265'],
    type: 'barangay',
    icon: 'ShieldAlert'
  },
  {
    agency: 'Rodriguez (Montalban) MDRRMO Rescue 911',
    label: 'MDRRMO Rescue',
    numbers: ['(02) 8997-1800', '0920-955-7372', '911'],
    type: 'rescue',
    icon: 'LifeBuoy'
  },
  {
    agency: 'Bureau of Fire Protection (BFP) Rodriguez Fire Station',
    label: 'BFP Fire Dept',
    numbers: ['(02) 8948-2211', '0966-248-1890'],
    type: 'fire',
    icon: 'Flame'
  },
  {
    agency: 'Philippine National Police (PNP) Rodriguez Sub-Station',
    label: 'PNP Rodriguez',
    numbers: ['(02) 8941-1191', '0998-598-5712'],
    type: 'police',
    icon: 'BadgeCheck'
  },
  {
    agency: 'Manila Water Montalban Emergency Desk',
    label: 'Manila Water',
    numbers: ['1627', '(02) 7917-4221'],
    type: 'utility',
    icon: 'Droplets'
  },
  {
    agency: 'MERALCO Emergency & Outage Dispatch',
    label: 'Meralco Power',
    numbers: ['16211', '0920-971-6211'],
    type: 'utility',
    icon: 'Zap'
  }
];

/**
 * Helper to construct GeoJSON Feature for Barangay San Jose
 */
export function getSanJoseGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: 'Barangay San Jose',
          municipality: 'Rodriguez (Montalban)',
          province: 'Rizal',
          region: 'Region IV-A (CALABARZON)',
          country: 'Philippines',
          area_sqkm: 18.42,
          population_est: 145000,
          psgc_code: '045811006'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            SAN_JOSE_POLYGON_COORDS.map(([lat, lng]) => [lng, lat]) // GeoJSON uses [lng, lat]
          ]
        }
      }
    ]
  };
}

/**
 * Helper to generate Inverted Mask Polygon coordinates for Leaflet.
 * Outer polygon: Worldwide envelope
 * Inner ring: Polygon coordinates of Barangay San Jose
 */
export function getInvertedMaskCoordinates(polygonCoords: [number, number][]): [number, number][][] {
  // Worldwide bounding box in [lat, lng] format
  const worldOuterRing: [number, number][] = [
    [90, -180],
    [90, 180],
    [-90, 180],
    [-90, -180],
    [90, -180],
  ];

  // Inner ring is the boundary of Barangay San Jose
  const innerHoleRing: [number, number][] = [...polygonCoords];

  return [worldOuterRing, innerHoleRing];
}
