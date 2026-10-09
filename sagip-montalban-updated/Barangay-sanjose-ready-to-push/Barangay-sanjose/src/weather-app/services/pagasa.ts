export interface PagasaRadarStation {
  id: string;
  name: string;
  location: string;
  lat: number;
  lon: number;
  rangeKm: number;
  island: 'Luzon' | 'Visayas' | 'Mindanao';
  status: 'Operational' | 'Standby' | 'Maintenance';
  type: 'Doppler Weather Radar' | 'X-Band Radar';
}

export const PAGASA_RADAR_STATIONS: PagasaRadarStation[] = [
  // LUZON
  { id: 'aparri', name: 'Aparri Radar Station', location: 'Punta, Aparri, Cagayan', lat: 18.3584, lon: 121.6429, rangeKm: 200, island: 'Luzon', status: 'Operational', type: 'Doppler Weather Radar' },
  { id: 'baguio', name: 'Baguio Radar (Mt. Sto. Tomas)', location: 'Tuba, Benguet', lat: 16.3344, lon: 120.5518, rangeKm: 200, island: 'Luzon', status: 'Operational', type: 'Doppler Weather Radar' },
  { id: 'baler', name: 'Baler Radar Station', location: 'Baler, Aurora', lat: 15.7588, lon: 121.5647, rangeKm: 200, island: 'Luzon', status: 'Operational', type: 'Doppler Weather Radar' },
  { id: 'subic', name: 'Subic Radar Station', location: 'Subic Bay, Bataan/Zambales', lat: 14.8219, lon: 120.2711, rangeKm: 200, island: 'Luzon', status: 'Operational', type: 'Doppler Weather Radar' },
  { id: 'tagaytay', name: 'Tagaytay Radar Station', location: 'Tagaytay City, Cavite (Metro Manila Coverage)', lat: 14.1153, lon: 120.9621, rangeKm: 200, island: 'Luzon', status: 'Operational', type: 'Doppler Weather Radar' },
  { id: 'daet', name: 'Daet Radar Station', location: 'Daet, Camarines Norte', lat: 14.1287, lon: 122.9814, rangeKm: 200, island: 'Luzon', status: 'Operational', type: 'Doppler Weather Radar' },
  { id: 'virac', name: 'Virac Radar Station', location: 'Virac, Catanduanes', lat: 13.5842, lon: 124.2386, rangeKm: 200, island: 'Luzon', status: 'Operational', type: 'Doppler Weather Radar' },
  { id: 'palawan', name: 'Puerto Princesa Radar', location: 'Puerto Princesa, Palawan', lat: 9.7410, lon: 118.7592, rangeKm: 200, island: 'Luzon', status: 'Operational', type: 'Doppler Weather Radar' },
  { id: 'busuanga', name: 'Coron / Busuanga Radar', location: 'Busuanga, Palawan', lat: 12.0125, lon: 120.0984, rangeKm: 150, island: 'Luzon', status: 'Operational', type: 'Doppler Weather Radar' },

  // VISAYAS
  { id: 'mactan', name: 'Mactan Radar Station', location: 'Lapu-Lapu City, Cebu', lat: 10.3117, lon: 123.9794, rangeKm: 200, island: 'Visayas', status: 'Operational', type: 'Doppler Weather Radar' },
  { id: 'guiuan', name: 'Guiuan Radar Station', location: 'Guiuan, Eastern Samar', lat: 11.0333, lon: 125.7289, rangeKm: 200, island: 'Visayas', status: 'Operational', type: 'Doppler Weather Radar' },
  { id: 'iloilo', name: 'Iloilo Radar Station', location: 'Iloilo City, Panay', lat: 10.7067, lon: 122.5644, rangeKm: 180, island: 'Visayas', status: 'Operational', type: 'Doppler Weather Radar' },
  { id: 'alburquerque', name: 'Bohol Radar Station', location: 'Alburquerque, Bohol', lat: 9.6158, lon: 123.9583, rangeKm: 150, island: 'Visayas', status: 'Operational', type: 'Doppler Weather Radar' },

  // MINDANAO
  { id: 'hinatuan', name: 'Hinatuan Radar Station', location: 'Hinatuan, Surigao del Sur', lat: 8.3725, lon: 126.3342, rangeKm: 200, island: 'Mindanao', status: 'Operational', type: 'Doppler Weather Radar' },
  { id: 'tampakan', name: 'Tampakan Radar Station', location: 'Tampakan, South Cotabato', lat: 6.4428, lon: 124.9317, rangeKm: 200, island: 'Mindanao', status: 'Operational', type: 'Doppler Weather Radar' },
  { id: 'el-salvador', name: 'Misamis Oriental Radar', location: 'El Salvador, Misamis Oriental (CDO)', lat: 8.5642, lon: 124.5236, rangeKm: 180, island: 'Mindanao', status: 'Operational', type: 'Doppler Weather Radar' },
  { id: 'zamboanga', name: 'Zamboanga Radar Station', location: 'Zamboanga City', lat: 6.9214, lon: 122.0592, rangeKm: 200, island: 'Mindanao', status: 'Operational', type: 'Doppler Weather Radar' },
];

export interface HeavyRainfallWarning {
  level: 'YELLOW' | 'ORANGE' | 'RED';
  titleFil: string;
  titleEn: string;
  rateMmHr: string;
  actionFil: string;
  actionEn: string;
  impactFil: string;
  colorHex: string;
}

export const PAGASA_RAINFALL_WARNINGS: Record<'YELLOW' | 'ORANGE' | 'RED', HeavyRainfallWarning> = {
  YELLOW: {
    level: 'YELLOW',
    titleFil: 'DILAW NA BABALA (Mag-monitor)',
    titleEn: 'YELLOW WARNING (Monitor)',
    rateMmHr: '7.5 - 15 mm/h (Mabigat na Pag-ulan)',
    actionFil: 'Mag-abang sa mga susunod na ulat ng panahon at mga anunsyo ng lokal na pamahalaan.',
    actionEn: 'Monitor the weather condition and stay updated.',
    impactFil: 'Posible ang pagbaha sa mga mabababang lugar.',
    colorHex: '#eab308',
  },
  ORANGE: {
    level: 'ORANGE',
    titleFil: 'KAHEL NA BABALA (Maghanda)',
    titleEn: 'ORANGE WARNING (Alert / Prepare)',
    rateMmHr: '15 - 30 mm/h (Matinding Pag-ulan)',
    actionFil: 'Maging alerto at maghanda para sa posibleng paglikas.',
    actionEn: 'Threatening flooding. Prepare for possible evacuation.',
    impactFil: 'Inaasahan ang pagbaha sa mabababang lugar at pagguho ng lupa sa bulubunduking komunidad.',
    colorHex: '#f97316',
  },
  RED: {
    level: 'RED',
    titleFil: 'PULANG BABALA (Lumikas / Evacuate)',
    titleEn: 'RED WARNING (Evacuate / Action)',
    rateMmHr: '>30 mm/h (Napakalakas / Torrential)',
    actionFil: 'KILOS EVACUATION: Agad na lumikas sa ligtas na evacuation centers.',
    actionEn: 'Severe flooding expected. Immediate evacuation is advised.',
    impactFil: 'Kritikal na baha at malawakang pagguho ng lupa.',
    colorHex: '#dc2626',
  },
};

export interface TropicalCycloneSignal {
  signalNo: number;
  windSpeedKmh: string;
  leadTimeHours: number;
  impactFil: string;
  colorHex: string;
}

export const PAGASA_TCWS: TropicalCycloneSignal[] = [
  { signalNo: 1, windSpeedKmh: '39 - 61 km/h', leadTimeHours: 36, impactFil: 'Bahagyang pinsala sa mga istrukturang gawa sa mahihinang materyales.', colorHex: '#38bdf8' },
  { signalNo: 2, windSpeedKmh: '62 - 88 km/h', leadTimeHours: 24, impactFil: 'Magaan hanggang katamtamang pinsala; posibleng pagkasira ng mga bubong at pananim.', colorHex: '#eab308' },
  { signalNo: 3, windSpeedKmh: '89 - 117 km/h', leadTimeHours: 18, impactFil: 'Katamtaman hanggang matinding pinsala; mapanganib ang paglalayag sa dagat.', colorHex: '#f97316' },
  { signalNo: 4, windSpeedKmh: '118 - 184 km/h', leadTimeHours: 12, impactFil: 'Napakabigat na pinsala; mapanganib na storm surge sa mga baybayin.', colorHex: '#ef4444' },
  { signalNo: 5, windSpeedKmh: '≥ 185 km/h (Super Typhoon)', leadTimeHours: 12, impactFil: 'Widespread catastrophic damage; sapilitang paglikas sa lahat ng baybayin.', colorHex: '#9333ea' },
];

export const MAJOR_RIVER_BASINS = [
  { name: 'Cagayan River Basin', region: 'Cagayan Valley (Region II)', status: 'Normal Level', color: '#10b981' },
  { name: 'Pampanga River Basin', region: 'Central Luzon (Region III)', status: 'Alert Level (Bantayan)', color: '#eab308' },
  { name: 'Pasig-Marikina-Tullahan River Basin', region: 'Metro Manila / Rizal', status: 'Normal Level', color: '#10b981' },
  { name: 'Bicol River Basin', region: 'Bicol Region (Region V)', status: 'Normal Level', color: '#10b981' },
  { name: 'Agusan River Basin', region: 'Caraga Region', status: 'Alert Level (Bantayan)', color: '#eab308' },
  { name: 'Mindanao River Basin', region: 'Cotabato / Maguindanao', status: 'Normal Level', color: '#10b981' },
];
