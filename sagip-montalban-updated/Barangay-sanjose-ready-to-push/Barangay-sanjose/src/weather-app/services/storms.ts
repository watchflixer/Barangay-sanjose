import { CityPreset, TropicalStorm } from '../types/weather';

// Philippine Area of Responsibility (PAR) boundary vertices
export const PAR_COORDINATES: [number, number][] = [
  [25, 120],
  [25, 135],
  [5, 135],
  [5, 115],
  [15, 115],
  [21, 120],
  [25, 120],
];

export interface RegionPreset {
  id: 'ph' | 'luzon' | 'visayas' | 'mindanao';
  labelFil: string;
  labelEn: string;
  center: [number, number];
  zoom: number;
}

export const PHILIPPINE_REGIONS: RegionPreset[] = [
  { id: 'ph', labelFil: 'Buong Pilipinas', labelEn: 'All Philippines', center: [12.8797, 121.7740], zoom: 6 },
  { id: 'luzon', labelFil: 'Luzon', labelEn: 'Luzon', center: [16.0, 121.0], zoom: 7 },
  { id: 'visayas', labelFil: 'Visayas', labelEn: 'Visayas', center: [10.8, 123.5], zoom: 7 },
  { id: 'mindanao', labelFil: 'Mindanao', labelEn: 'Mindanao', center: [7.8, 124.5], zoom: 7 },
];

export const PHILIPPINE_CITIES: (CityPreset & { islandGroup: 'luzon' | 'visayas' | 'mindanao' })[] = [
  // LUZON
  { name: 'Metro Manila', country: 'Pilipinas', admin1: 'NCR', lat: 14.5995, lon: 120.9842, islandGroup: 'luzon' },
  { name: 'Quezon City', country: 'Pilipinas', admin1: 'NCR', lat: 14.6760, lon: 121.0437, islandGroup: 'luzon' },
  { name: 'Baguio City', country: 'Pilipinas', admin1: 'Benguet / Cordillera', lat: 16.4023, lon: 120.5960, islandGroup: 'luzon' },
  { name: 'Tuguegarao', country: 'Pilipinas', admin1: 'Cagayan Valley', lat: 17.6132, lon: 121.7270, islandGroup: 'luzon' },
  { name: 'Laoag', country: 'Pilipinas', admin1: 'Ilocos Norte', lat: 18.1960, lon: 120.5927, islandGroup: 'luzon' },
  { name: 'San Fernando', country: 'Pilipinas', admin1: 'La Union', lat: 16.6159, lon: 120.3209, islandGroup: 'luzon' },
  { name: 'Clark / Angeles', country: 'Pilipinas', admin1: 'Pampanga', lat: 15.1450, lon: 120.5887, islandGroup: 'luzon' },
  { name: 'Batangas City', country: 'Pilipinas', admin1: 'CALABARZON', lat: 13.7565, lon: 121.0583, islandGroup: 'luzon' },
  { name: 'Lucena', country: 'Pilipinas', admin1: 'Quezon', lat: 13.9314, lon: 121.6172, islandGroup: 'luzon' },
  { name: 'Legazpi City', country: 'Pilipinas', admin1: 'Albay / Bicol', lat: 13.1391, lon: 123.7438, islandGroup: 'luzon' },
  { name: 'Naga City', country: 'Pilipinas', admin1: 'Camarines Sur', lat: 13.6218, lon: 123.1948, islandGroup: 'luzon' },
  { name: 'Puerto Princesa', country: 'Pilipinas', admin1: 'Palawan', lat: 9.7392, lon: 118.7353, islandGroup: 'luzon' },
  { name: 'Basco', country: 'Pilipinas', admin1: 'Batanes', lat: 20.4485, lon: 121.9705, islandGroup: 'luzon' },

  // VISAYAS
  { name: 'Cebu City', country: 'Pilipinas', admin1: 'Central Visayas', lat: 10.3157, lon: 123.8854, islandGroup: 'visayas' },
  { name: 'Iloilo City', country: 'Pilipinas', admin1: 'Western Visayas', lat: 10.7202, lon: 122.5621, islandGroup: 'visayas' },
  { name: 'Bacolod City', country: 'Pilipinas', admin1: 'Negros Occidental', lat: 10.6766, lon: 122.9509, islandGroup: 'visayas' },
  { name: 'Tacloban City', country: 'Pilipinas', admin1: 'Eastern Visayas / Leyte', lat: 11.2444, lon: 125.0039, islandGroup: 'visayas' },
  { name: 'Tagbilaran', country: 'Pilipinas', admin1: 'Bohol', lat: 9.6444, lon: 123.8544, islandGroup: 'visayas' },
  { name: 'Dumaguete', country: 'Pilipinas', admin1: 'Negros Oriental', lat: 9.3068, lon: 123.3054, islandGroup: 'visayas' },
  { name: 'Boracay / Malay', country: 'Pilipinas', admin1: 'Aklan', lat: 11.9674, lon: 121.9248, islandGroup: 'visayas' },
  { name: 'Catarman', country: 'Pilipinas', admin1: 'Northern Samar', lat: 12.4989, lon: 124.6375, islandGroup: 'visayas' },
  { name: 'Roxas City', country: 'Pilipinas', admin1: 'Capiz', lat: 11.5853, lon: 122.7511, islandGroup: 'visayas' },

  // MINDANAO
  { name: 'Davao City', country: 'Pilipinas', admin1: 'Davao Region', lat: 7.1907, lon: 125.4578, islandGroup: 'mindanao' },
  { name: 'Cagayan de Oro', country: 'Pilipinas', admin1: 'Northern Mindanao', lat: 8.4542, lon: 124.6319, islandGroup: 'mindanao' },
  { name: 'Zamboanga City', country: 'Pilipinas', admin1: 'Zamboanga Peninsula', lat: 6.9214, lon: 122.0790, islandGroup: 'mindanao' },
  { name: 'General Santos', country: 'Pilipinas', admin1: 'SOCCSKSARGEN', lat: 6.1164, lon: 125.1716, islandGroup: 'mindanao' },
  { name: 'Iligan City', country: 'Pilipinas', admin1: 'Lanao del Norte', lat: 8.2280, lon: 124.2452, islandGroup: 'mindanao' },
  { name: 'Butuan City', country: 'Pilipinas', admin1: 'Caraga', lat: 8.9475, lon: 125.5406, islandGroup: 'mindanao' },
  { name: 'Cotabato City', country: 'Pilipinas', admin1: 'BARMM', lat: 7.2236, lon: 124.2462, islandGroup: 'mindanao' },
  { name: 'Siargao', country: 'Pilipinas', admin1: 'Surigao del Norte', lat: 9.8592, lon: 126.0469, islandGroup: 'mindanao' },
  { name: 'Jolo', country: 'Pilipinas', admin1: 'Sulu', lat: 6.0528, lon: 121.0069, islandGroup: 'mindanao' },
];

export const POPULAR_LOCATIONS: CityPreset[] = PHILIPPINE_CITIES;

export const MONITORED_STORMS: TropicalStorm[] = [
  {
    id: 'wp-01-2026',
    name: 'Severe Tropical Storm Dindo',
    localName: 'Bagyong Dindo',
    category: 'Severe Tropical Storm (Signal #1)',
    basin: 'Western Pacific (PAR)',
    status: 'Active inside PAR',
    currentLat: 18.2,
    currentLon: 128.6,
    maxWindKmh: 105,
    gustsKmh: 130,
    pressureHpa: 985,
    movement: 'Northwest at 18 km/h moving towards Batanes-Taiwan',
    inPAR: true,
    track: [
      { time: 'Past 12h', lat: 16.1, lon: 131.2, category: 'Tropical Storm', windKts: 45, pressureHpa: 996 },
      { time: 'Past 6h', lat: 17.0, lon: 129.8, category: 'Tropical Storm', windKts: 50, pressureHpa: 990 },
      { time: 'Current (Live)', lat: 18.2, lon: 128.6, category: 'Severe Tropical Storm', windKts: 55, pressureHpa: 985 },
      { time: '+12h Forecast', lat: 19.5, lon: 127.1, category: 'Severe Tropical Storm', windKts: 60, pressureHpa: 980 },
      { time: '+24h Forecast', lat: 21.0, lon: 125.4, category: 'Typhoon', windKts: 70, pressureHpa: 975 },
      { time: '+48h Forecast', lat: 23.4, lon: 123.0, category: 'Typhoon', windKts: 75, pressureHpa: 968 },
    ],
  },
  {
    id: 'lpa-02-2026',
    name: 'Low Pressure Area (LPA 02E)',
    localName: 'Monitored LPA (East Mindanao)',
    category: 'Low Pressure Area (LPA)',
    basin: 'Eastern Mindanao (PAR)',
    status: 'Monitored Low Pressure System in Philippine Sea',
    currentLat: 7.9,
    currentLon: 129.4,
    maxWindKmh: 45,
    gustsKmh: 60,
    pressureHpa: 1006,
    movement: 'West-Northwest (WNW) at 15 km/h towards Caraga-Davao',
    inPAR: true,
    track: [
      { time: 'Past 6h', lat: 7.4, lon: 131.0, category: 'LPA', windKts: 20, pressureHpa: 1008 },
      { time: 'Current (Live)', lat: 7.9, lon: 129.4, category: 'LPA', windKts: 25, pressureHpa: 1006 },
      { time: '+24h Forecast', lat: 8.6, lon: 127.2, category: 'LPA / Possible TD', windKts: 30, pressureHpa: 1004 },
    ],
  },
];
