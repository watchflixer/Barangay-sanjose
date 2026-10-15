/**
 * HELP CENTER DIRECTORY — categories + places for Barangay San Jose
 * ------------------------------------------------------------------
 * The Help Center view works like the Traffic view but instead of live
 * traffic it is a *filterable directory map* (Leaflet): the user first
 * picks the categories they need (7-Eleven, botika, water refilling,
 * ATM, evacuation center, …) and only then does the map open.
 *
 * Two data sources are merged by the map:
 *   1. Curated community list below (works offline, always available).
 *   2. Optional "Live OSM" mode — real OpenStreetMap POIs pulled from the
 *      Overpass API using the `osm` tag filters of each category.
 * Curated rows are community-mapped/approximate: every one of them is
 * flagged `approx: true` and the UI shows an "i-verify" hint so nobody
 * treats a rough pin as a survey-grade location.
 */

export type PlaceCategoryId =
  | 'seven_eleven'
  | 'convenience'
  | 'supermarket'
  | 'market'
  | 'pharmacy'
  | 'bigasan'
  | 'water'
  | 'lpg'
  | 'bakery'
  | 'hardware'
  | 'laundry'
  | 'police'
  | 'fire'
  | 'hospital'
  | 'clinic'
  | 'evacuation'
  | 'barangay'
  | 'school'
  | 'church'
  | 'court'
  | 'wifi'
  | 'food'
  | 'salon'
  | 'dental'
  | 'vet'
  | 'gym'
  | 'gas'
  | 'vulcanizing'
  | 'terminal'
  | 'parking'
  | 'atm'
  | 'bank'
  | 'pawnshop'
  | 'remittance';

export type PlaceGroupId = 'emergency' | 'essentials' | 'travel' | 'money' | 'community';

export interface PlaceCategory {
  id: PlaceCategoryId;
  /** Filipino-friendly label shown on the big filter buttons. */
  label: string;
  /** Short English caption under the label. */
  caption: string;
  emoji: string;
  /** Pin / accent colour. */
  color: string;
  group: PlaceGroupId;
  /**
   * Overpass QL tag filters used by "Live OSM" mode. Each string is a
   * complete filter block, e.g. `["amenity"="pharmacy"]`; the map expands
   * them into node/way/relation queries inside the barangay bounding box.
   */
  osm?: string[];
}

export interface Place {
  id: string;
  category: PlaceCategoryId;
  name: string;
  /** [lat, lng] WGS84 */
  coords: [number, number];
  address: string;
  hours?: string;
  phone?: string;
  note?: string;
  /** true when the pin is community-mapped (may be several meters off). */
  approx?: boolean;
  source: 'curated' | 'osm';
}

export const PLACE_GROUPS: { id: PlaceGroupId; label: string; caption: string }[] = [
  { id: 'emergency', label: 'Emergency / Saklolo', caption: 'Pulis, bumbero, ospital, evacuation' },
  { id: 'essentials', label: 'Pang-araw-araw nga bilihin', caption: 'Tindahan, botika, tubig, bigas' },
  { id: 'travel', label: 'Biyahe / Sasakyan', caption: 'Gas, vulcanizing, terminal, parking' },
  { id: 'money', label: 'Pera / Padala', caption: 'ATM, bangko, pawnshop, remittance' },
  { id: 'community', label: 'Komunidad / Pamilya', caption: 'Paaralan, simbahan, court, kainan' },
];

export const HELP_CENTER_CATEGORIES: PlaceCategory[] = [
  // ---------------------------------------------------------------- emergency
  {
    id: 'police', label: 'Pulis / Police', caption: 'Presinto at outpost', emoji: '🚓',
    color: '#1d4ed8', group: 'emergency', osm: ['["amenity"="police"]'],
  },
  {
    id: 'fire', label: 'Bumbero / BFP', caption: 'Fire station', emoji: '🚒',
    color: '#dc2626', group: 'emergency', osm: ['["amenity"="fire_station"]'],
  },
  {
    id: 'hospital', label: 'Ospital', caption: 'Emergency room', emoji: '🏥',
    color: '#e11d48', group: 'emergency', osm: ['["amenity"="hospital"]'],
  },
  {
    id: 'clinic', label: 'Health Center / Clinic', caption: 'Pagtitingin ng doctor', emoji: '🩺',
    color: '#0891b2', group: 'emergency',
    osm: ['["amenity"="clinic"]', '["amenity"="doctors"]', '["healthcare"="centre"]'],
  },
  {
    id: 'evacuation', label: 'Evacuation Center', caption: 'Silungan kapag may sakuna', emoji: '⛺',
    color: '#7c3aed', group: 'emergency',
    osm: ['["emergency"="assembly_point"]', '["amenity"="shelter"]', '["amenity"="community_centre"]'],
  },
  {
    id: 'barangay', label: 'Barangay Hall', caption: 'Munisipyo / gov offices', emoji: '🏛️',
    color: '#0f766e', group: 'emergency', osm: ['["amenity"="townhall"]', '["office"="government"]'],
  },
  // -------------------------------------------------------------- essentials
  {
    id: 'seven_eleven', label: '7-Eleven', caption: '24 oras na tindahan', emoji: '🏪',
    color: '#16a34a', group: 'essentials',
    osm: ['["brand"~"7-?Eleven",i]', '["name"~"7-?Eleven",i]'],
  },
  {
    id: 'convenience', label: 'Convenience Store', caption: 'Mini mart at sari-sari', emoji: '🛒',
    color: '#65a30d', group: 'essentials', osm: ['["shop"="convenience"]'],
  },
  {
    id: 'supermarket', label: 'Supermarket / Grocery', caption: 'Malaking groceries', emoji: '🛍️',
    color: '#ca8a04', group: 'essentials', osm: ['["shop"="supermarket"]', '["shop"="grocery"]'],
  },
  {
    id: 'market', label: 'Palengke / Talipapa', caption: 'Bilihan ng gulay at isda', emoji: '🥬',
    color: '#15803d', group: 'essentials', osm: ['["amenity"="marketplace"]'],
  },
  {
    id: 'pharmacy', label: 'Botika / Pharmacy', caption: 'Gamot at first aid', emoji: '💊',
    color: '#db2777', group: 'essentials', osm: ['["amenity"="pharmacy"]', '["shop"="chemist"]'],
  },
  {
    id: 'bigasan', label: 'Bigasan / Rice Store', caption: 'Sako-sakong bigas', emoji: '🌾',
    color: '#a16207', group: 'essentials', osm: ['["shop"="rice"]', '["name"~"bigas",i]'],
  },
  {
    id: 'water', label: 'Water Refilling', caption: 'Inuming tubig', emoji: '💧',
    color: '#0284c7', group: 'essentials',
    osm: ['["amenity"="water_point"]', '["shop"="water"]', '["man_made"="water_tap"]'],
  },
  {
    id: 'lpg', label: 'LPG / Gasul Dealer', caption: 'Tankeng pangluto', emoji: '🔥',
    color: '#ea580c', group: 'essentials',
    osm: ['["shop"="gas"]', '["name"~"gasul|lpg",i]'],
  },
  {
    id: 'bakery', label: 'Panaderia / Bakery', caption: 'Pandesal at cake', emoji: '🥖',
    color: '#b45309', group: 'essentials', osm: ['["shop"="bakery"]'],
  },
  {
    id: 'hardware', label: 'Hardware', caption: 'Materyales at kasangkapan', emoji: '🧰',
    color: '#4b5563', group: 'essentials',
    osm: ['["shop"="hardware"]', '["shop"="doityourself"]', '["shop"="trade"]'],
  },
  {
    id: 'laundry', label: 'Laundry / Labada', caption: 'Wash-dry-fold', emoji: '🧺',
    color: '#0d9488', group: 'essentials', osm: ['["shop"="laundry"]', '["shop"="dry_cleaning"]'],
  },
  // ------------------------------------------------------------------ travel
  {
    id: 'gas', label: 'Gas Station', caption: 'Gasolina at diesel', emoji: '⛽',
    color: '#4d7c0f', group: 'travel', osm: ['["amenity"="fuel"]'],
  },
  {
    id: 'vulcanizing', label: 'Vulcanizing / Tire Shop', caption: 'Gulong at repair', emoji: '🛞',
    color: '#525252', group: 'travel', osm: ['["shop"="tyres"]', '["shop"="car_repair"]'],
  },
  {
    id: 'terminal', label: 'Tricycle / Jeep Terminal', caption: 'Sakayan at babaan', emoji: '🛺',
    color: '#d97706', group: 'travel', osm: ['["highway"="bus_stop"]', '["amenity"="bus_station"]'],
  },
  {
    id: 'parking', label: 'Parking Area', caption: 'Lugar na paradahan', emoji: '🅿️',
    color: '#334155', group: 'travel', osm: ['["amenity"="parking"]'],
  },
  // ------------------------------------------------------------------- money
  {
    id: 'atm', label: 'ATM', caption: 'Kuhanan ng cash', emoji: '🏧',
    color: '#059669', group: 'money', osm: ['["amenity"="atm"]'],
  },
  {
    id: 'bank', label: 'Bangko / Bank', caption: 'Deposito at account', emoji: '🏦',
    color: '#1e40af', group: 'money', osm: ['["amenity"="bank"]'],
  },
  {
    id: 'pawnshop', label: 'Pawnshop', caption: 'Sangla at money lender', emoji: '💰',
    color: '#b91c1c', group: 'money', osm: ['["shop"="pawnbroker"]'],
  },
  {
    id: 'remittance', label: 'Padala / Remittance', caption: 'Perang padala', emoji: '📤',
    color: '#9a3412', group: 'money',
    osm: ['["amenity"="money_transfer"]', '["shop"="money_transfer"]', '["shop"="money_lender"]'],
  },
  // --------------------------------------------------------------- community
  {
    id: 'school', label: 'Paaralan / School', caption: 'Elementarya at high school', emoji: '🎓',
    color: '#4338ca', group: 'community', osm: ['["amenity"="school"]', '["amenity"="kindergarten"]'],
  },
  {
    id: 'church', label: 'Simbahan / Church', caption: 'Misa at worship', emoji: '⛪',
    color: '#9333ea', group: 'community', osm: ['["amenity"="place_of_worship"]'],
  },
  {
    id: 'court', label: 'Covered Court / Plaza', caption: 'Ligaan at assembly', emoji: '🏀',
    color: '#c2410c', group: 'community', osm: ['["leisure"="pitch"]', '["leisure"="sports_centre"]'],
  },
  {
    id: 'wifi', label: 'Free WiFi / Load', caption: 'Internet at load station', emoji: '📶',
    color: '#0ea5e9', group: 'community',
    osm: ['["internet_access"="wlan"]', '["shop"="mobile_phone"]'],
  },
  {
    id: 'food', label: 'Kainan / Karinderya', caption: 'Restaurant at fast food', emoji: '🍜',
    color: '#f97316', group: 'community',
    osm: ['["amenity"="restaurant"]', '["amenity"="fast_food"]', '["amenity"="cafe"]'],
  },
  {
    id: 'salon', label: 'Salon / Barber', caption: 'Gupit at beauty care', emoji: '💈',
    color: '#ec4899', group: 'community', osm: ['["shop"="hairdresser"]', '["shop"="beauty"]'],
  },
  {
    id: 'dental', label: 'Dental Clinic', caption: 'Ngipin at braces', emoji: '🦷',
    color: '#38bdf8', group: 'community', osm: ['["amenity"="dentist"]'],
  },
  {
    id: 'vet', label: 'Veterinary / Pet', caption: 'Gamot ng alaga', emoji: '🐾',
    color: '#84cc16', group: 'community', osm: ['["amenity"="veterinary"]'],
  },
  {
    id: 'gym', label: 'Gym / Fitness', caption: 'Workout at boxing', emoji: '🏋️',
    color: '#7c3aed', group: 'community', osm: ['["leisure"="fitness_centre"]'],
  },
];

export const CATEGORY_BY_ID: Record<PlaceCategoryId, PlaceCategory> = HELP_CENTER_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.id] = category;
    return acc;
  },
  {} as Record<PlaceCategoryId, PlaceCategory>,
);

/** Categories grouped for the picker screen. */
export const CATEGORIES_BY_GROUP: { group: PlaceGroupId; categories: PlaceCategory[] }[] =
  PLACE_GROUPS.map((group) => ({
    group: group.id,
    categories: HELP_CENTER_CATEGORIES.filter((category) => category.group === group.id),
  }));

/** Ready-made bundles so a user can answer in one tap. */
export const CATEGORY_PRESETS: { id: string; label: string; emoji: string; categories: PlaceCategoryId[] }[] = [
  {
    id: 'saklolo',
    label: 'Saklolo agad',
    emoji: '🆘',
    categories: ['police', 'fire', 'hospital', 'clinic', 'evacuation', 'barangay'],
  },
  {
    id: 'bilihin',
    label: 'Bili-bili essentials',
    emoji: '🛒',
    categories: ['seven_eleven', 'convenience', 'supermarket', 'market', 'pharmacy', 'bigasan', 'water', 'bakery'],
  },
  {
    id: 'panggabi',
    label: 'Buksan kahit gabi',
    emoji: '🌙',
    categories: ['seven_eleven', 'convenience', 'atm', 'gas', 'pharmacy'],
  },
  {
    id: 'pera',
    label: 'Pera at padala',
    emoji: '💸',
    categories: ['atm', 'bank', 'pawnshop', 'remittance'],
  },
  {
    id: 'biyahe',
    label: 'Biyahe at sasakyan',
    emoji: '🛺',
    categories: ['terminal', 'gas', 'vulcanizing', 'parking'],
  },
  {
    id: 'pamilya',
    label: 'Pamilya at komunidad',
    emoji: '👨‍👩‍👧',
    categories: ['school', 'church', 'court', 'food', 'salon', 'laundry', 'wifi', 'dental', 'vet', 'gym'],
  },
  {
    id: 'lahat',
    label: 'Lahat ng kategorya',
    emoji: '🗂️',
    categories: HELP_CENTER_CATEGORIES.map((category) => category.id),
  },
];

/**
 * Community-mapped places around Barangay San Jose (Rodriguez, Rizal).
 * Coordinates are approximate anchors around the known sitios — the
 * "Live OSM" switch pulls the surveyed OpenStreetMap pins on top of these.
 */
export const HELP_CENTER_PLACES: Place[] = [
  // ------------------------------------------------------------ 7-Eleven 🏪
  {
    id: 'sev-kasiglahan-1k1', category: 'seven_eleven', name: '7-Eleven Kasiglahan Village (1K1)',
    coords: [14.7456, 121.1366], address: 'Kasiglahan Village 1K1, Brgy. San Jose, Rodriguez, Rizal',
    hours: 'Open 24 hours', note: 'Slurpee, load, bills payment, GCash cash-in', approx: true, source: 'curated',
  },
  {
    id: 'sev-town-center', category: 'seven_eleven', name: '7-Eleven Montalban Town Center',
    coords: [14.7402, 121.1489], address: 'Montalban Town Center, Rodriguez Highway, Brgy. San Jose',
    hours: 'Open 24 hours', note: 'Malapit sa BDO at tricycle terminal', approx: true, source: 'curated',
  },
  {
    id: 'sev-eastwood', category: 'seven_eleven', name: '7-Eleven Eastwood Greenview',
    coords: [14.7386, 121.1222], address: 'Eastwood Greenview Subd., Phase 4, Brgy. San Jose',
    hours: 'Open 24 hours', note: 'Malapit sa Eastwood chapel at Phase 2 gate', approx: true, source: 'curated',
  },
  {
    id: 'sev-litex', category: 'seven_eleven', name: '7-Eleven Litex Road',
    coords: [14.7289, 121.1131], address: 'Litex Market Access Road, Brgy. San Jose (Litex corridor)',
    hours: 'Open 24 hours', note: 'Kabilang side ng Gravel Pit', approx: true, source: 'curated',
  },
  {
    id: 'sev-jp-rizal', category: 'seven_eleven', name: '7-Eleven J.P. Rizal (San Jose Proper)',
    coords: [14.7431, 121.1452], address: 'J.P. Rizal Avenue, San Jose Proper, Brgy. San Jose',
    hours: 'Open 24 hours', note: 'Malapit sa Barangay San Jose Hall', approx: true, source: 'curated',
  },
  {
    id: 'sev-tagumpay', category: 'seven_eleven', name: '7-Eleven Tagumpay / Metro Montana',
    coords: [14.7559, 121.1331], address: 'Tagumpay Main Spine Road, Metro Montana, Brgy. San Jose',
    hours: 'Open 24 hours', approx: true, source: 'curated',
  },
  // --------------------------------------------------------- convenience 🛒
  {
    id: 'cv-kasiglahan-mini', category: 'convenience', name: 'Kasiglahan 24/7 Mini Mart',
    coords: [14.7449, 121.1358], address: 'Kasiglahan Village 1K1 Main Road, Brgy. San Jose',
    hours: '5:00 AM – 11:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'cv-sanjose-sari', category: 'convenience', name: 'San Jose Sari-Sari & Mini Mart',
    coords: [14.7419, 121.1463], address: 'J.P. Rizal Avenue, San Jose Proper, Brgy. San Jose',
    hours: '6:00 AM – 10:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'cv-tagumpay-hub', category: 'convenience', name: 'Tagumpay Convenience Hub',
    coords: [14.7556, 121.1328], address: 'Tagumpay Village entrance, Brgy. San Jose', approx: true, source: 'curated',
  },
  {
    id: 'cv-amityville', category: 'convenience', name: 'Amityville Community Store',
    coords: [14.7338, 121.1277], address: 'Amityville 4th Avenue, Brgy. San Jose', approx: true, source: 'curated',
  },
  // --------------------------------------------------------- supermarket 🛍️
  {
    id: 'sm-puregold', category: 'supermarket', name: 'Puregold Montalban',
    coords: [14.7368, 121.1379], address: 'Rodriguez Highway, Brgy. Rosario (katabi ng San Jose)',
    hours: '8:00 AM – 9:00 PM', note: 'Full grocery, ATM sa loob', approx: true, source: 'curated',
  },
  {
    id: 'sm-town-center', category: 'supermarket', name: 'Montalban Town Center Supermarket',
    coords: [14.7403, 121.1486], address: 'Montalban Town Center, Rodriguez Highway, Brgy. San Jose',
    hours: '9:00 AM – 8:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'sm-kasiglahan-grocery', category: 'supermarket', name: 'Kasiglahan Village Grocery',
    coords: [14.7452, 121.1362], address: 'Kasiglahan Village 1K2, Brgy. San Jose', approx: true, source: 'curated',
  },
  // -------------------------------------------------------------- market 🥬
  {
    id: 'mk-talipapa', category: 'market', name: 'Kasiglahan Talipapa',
    coords: [14.7446, 121.1360], address: 'Kasiglahan Village 1K1, Brgy. San Jose',
    hours: '4:30 AM – 7:00 PM', note: 'Isda, gulay, karne tuwing umaga', approx: true, source: 'curated',
  },
  {
    id: 'mk-rodriguez-market', category: 'market', name: 'Montalban Public Market',
    coords: [14.7330, 121.1180], address: 'Rodriguez (Montalban) town proper, malapit sa San Jose',
    hours: '4:00 AM – 8:00 PM', approx: true, source: 'curated',
  },
  // ------------------------------------------------------------ pharmacy 💊
  {
    id: 'ph-mercury-kasiglahan', category: 'pharmacy', name: 'Mercury Drug – Kasiglahan Village',
    coords: [14.7450, 121.1357], address: 'Kasiglahan Village 1K1 Commercial Row, Brgy. San Jose',
    hours: '7:00 AM – 10:00 PM', note: 'May free blood pressure check', approx: true, source: 'curated',
  },
  {
    id: 'ph-mercury-town-center', category: 'pharmacy', name: 'Mercury Drug – Montalban Town Center',
    coords: [14.7401, 121.1487], address: 'Montalban Town Center, Brgy. San Jose',
    hours: '7:00 AM – 10:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'ph-generika', category: 'pharmacy', name: 'Generika Drugstore – Litex',
    coords: [14.7291, 121.1133], address: 'Litex Market Access Road, Brgy. San Jose',
    hours: '8:00 AM – 9:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'ph-botika-bayan', category: 'pharmacy', name: 'Botika ng Barangay San Jose',
    coords: [14.7414, 121.1466], address: 'Katabi ng Barangay San Jose Hall, J.P. Rizal Avenue',
    hours: '8:00 AM – 5:00 PM', note: 'Murang gamot para sa residente', approx: true, source: 'curated',
  },
  // ------------------------------------------------------------- bigasan 🌾
  {
    id: 'bg-sanjose-rice', category: 'bigasan', name: 'San Jose Bigasan & Rice Retailer',
    coords: [14.7421, 121.1460], address: 'San Jose Proper, Brgy. San Jose', approx: true, source: 'curated',
  },
  {
    id: 'bg-kasiglahan-rice', category: 'bigasan', name: 'Kasiglahan Rice Supply',
    coords: [14.7447, 121.1356], address: 'Kasiglahan Village 1K1, Brgy. San Jose', approx: true, source: 'curated',
  },
  // --------------------------------------------------------------- water 💧
  {
    id: 'wt-aquabest-kasiglahan', category: 'water', name: 'Aquabest Water Refilling – Kasiglahan',
    coords: [14.7454, 121.1364], address: 'Kasiglahan Village 1K1, Brgy. San Jose',
    hours: '7:00 AM – 8:00 PM', note: 'Delivery sa buong Kasiglahan', phone: '0917-000-0000', approx: true, source: 'curated',
  },
  {
    id: 'wt-sanjose-proper', category: 'water', name: 'Crystal Clear Water Station',
    coords: [14.7417, 121.1468], address: 'J.P. Rizal Avenue, San Jose Proper, Brgy. San Jose',
    hours: '7:00 AM – 8:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'wt-amityville', category: 'water', name: 'Amityville Water Depot',
    coords: [14.7336, 121.1281], address: 'Amityville Subdivision, Brgy. San Jose',
    hours: '6:30 AM – 8:30 PM', approx: true, source: 'curated',
  },
  {
    id: 'wt-tagumpay', category: 'water', name: 'AquaQuest Water Station – Tagumpay',
    coords: [14.7562, 121.1329], address: 'Tagumpay Village, Brgy. San Jose', approx: true, source: 'curated',
  },
  // ----------------------------------------------------------------- lpg 🔥
  {
    id: 'lpg-kasiglahan', category: 'lpg', name: 'Gasul Dealer – Kasiglahan 1K1',
    coords: [14.7448, 121.1363], address: 'Kasiglahan Village 1K1 Main Road, Brgy. San Jose',
    hours: '7:00 AM – 7:00 PM', note: 'Tank swap at pang-deliver', approx: true, source: 'curated',
  },
  {
    id: 'lpg-amityville', category: 'lpg', name: 'LPG Republic – Amityville',
    coords: [14.7339, 121.1274], address: 'Amityville Subdivision, Brgy. San Jose',
    hours: '8:00 AM – 6:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'lpg-litex', category: 'lpg', name: 'Petron Gasul – Litex Corridor',
    coords: [14.7287, 121.1126], address: 'Litex / Gravel Pit Corridor, Brgy. San Jose',
    hours: '7:00 AM – 7:00 PM', approx: true, source: 'curated',
  },
  // -------------------------------------------------------------- bakery 🥖
  {
    id: 'bk-julies-kasiglahan', category: 'bakery', name: "Julie's Bakeshop – Kasiglahan Village",
    coords: [14.7451, 121.1361], address: 'Kasiglahan Village 1K1, Brgy. San Jose',
    hours: '5:00 AM – 9:00 PM', note: 'Mainit na pandesal tuwing umaga', approx: true, source: 'curated',
  },
  {
    id: 'bk-san-jose-bakery', category: 'bakery', name: 'Panaderia de San Jose',
    coords: [14.7416, 121.1459], address: 'San Jose Proper, Brgy. San Jose', approx: true, source: 'curated',
  },
  {
    id: 'bk-town-center', category: 'bakery', name: 'Montalban Bakeshop – Town Center',
    coords: [14.7400, 121.1484], address: 'Montalban Town Center, Brgy. San Jose', approx: true, source: 'curated',
  },
  // ------------------------------------------------------------ hardware 🧰
  {
    id: 'hw-sanjose-hardware', category: 'hardware', name: 'San Jose Hardware & Construction Supply',
    coords: [14.7424, 121.1455], address: 'J.P. Rizal Avenue, San Jose Proper, Brgy. San Jose',
    hours: '7:30 AM – 6:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'hw-builders-depot', category: 'hardware', name: 'Montalban Builders Depot',
    coords: [14.7345, 121.1265], address: 'Rodriguez Highway area, Brgy. San Jose', approx: true, source: 'curated',
  },
  {
    id: 'hw-eastwood', category: 'hardware', name: 'Eastwood Hardware',
    coords: [14.7384, 121.1226], address: 'Eastwood Greenview Phase 2, Brgy. San Jose', approx: true, source: 'curated',
  },
  // ------------------------------------------------------------- laundry 🧺
  {
    id: 'ld-amityville', category: 'laundry', name: 'Wash & Fold Laundry – Amityville',
    coords: [14.7337, 121.1279], address: 'Amityville Subdivision, Brgy. San Jose',
    hours: '7:00 AM – 8:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'ld-kasiglahan', category: 'laundry', name: 'Kasiglahan Laundry Hub',
    coords: [14.7453, 121.1359], address: 'Kasiglahan Village 1K2, Brgy. San Jose', approx: true, source: 'curated',
  },
  // -------------------------------------------------------------- police 🚓
  {
    id: 'po-sanjose-outpost', category: 'police', name: 'Barangay San Jose Police Outpost / Tanod Station',
    coords: [14.7426, 121.1462], address: 'Katabi ng Barangay Hall, San Jose Proper',
    hours: '24 oras (tanod duty)', phone: '(02) 8997-1823', approx: true, source: 'curated',
  },
  {
    id: 'po-pnp-rodriguez', category: 'police', name: 'PNP Rodriguez Sub-Station',
    coords: [14.7306, 121.1196], address: 'Rodriguez (Montalban) town proper, malapit sa San Jose',
    hours: '24 oras', phone: '(02) 8941-1191', approx: true, source: 'curated',
  },
  // ---------------------------------------------------------------- fire 🚒
  {
    id: 'fi-bfp-rodriguez', category: 'fire', name: 'BFP Rodriguez Fire Station',
    coords: [14.7309, 121.1201], address: 'Municipal compound, Rodriguez (Montalban), Rizal',
    hours: '24 oras', phone: '(02) 8948-2211', approx: true, source: 'curated',
  },
  // ------------------------------------------------------------ hospital 🏥
  {
    id: 'hs-rodriguez-municipal', category: 'hospital', name: 'Rodriguez Municipal Hospital (Emergency Room)',
    coords: [14.7325, 121.1215], address: 'Rodriguez (Montalban) town proper, ~2 km mula sa San Jose',
    hours: '24 oras emergency', note: 'Pinakamalapit na ER sa barangay', approx: true, source: 'curated',
  },
  {
    id: 'hs-montalban-medical', category: 'hospital', name: 'Montalban Medical Center',
    coords: [14.7360, 121.1341], address: 'Rodriguez Highway, Brgy. Rosario (boundary ng San Jose)',
    hours: '24 oras emergency', approx: true, source: 'curated',
  },
  // ------------------------------------------------------------- clinic 🩺
  {
    id: 'cl-sanjose-health', category: 'clinic', name: 'Brgy. San Jose Health Center (Main)',
    coords: [14.7422, 121.1464], address: 'Katabi ng Barangay Hall, San Jose Proper',
    hours: '8:00 AM – 5:00 PM (Lun–Biy)', note: 'Prenatal, immunization, libreng check-up', phone: '(02) 8997-1823', approx: true, source: 'curated',
  },
  {
    id: 'cl-kasiglahan-birthing', category: 'clinic', name: 'Kasiglahan Birthing Home & Clinic',
    coords: [14.7457, 121.1361], address: 'Kasiglahan Village 1K1, Brgy. San Jose', hours: '24 oras', approx: true, source: 'curated',
  },
  {
    id: 'cl-eastwood-medical', category: 'clinic', name: 'Eastwood Medical Clinic & Laboratory',
    coords: [14.7388, 121.1218], address: 'Eastwood Greenview Phase 1, Brgy. San Jose', approx: true, source: 'curated',
  },
  // --------------------------------------------------------- evacuation ⛺
  {
    id: 'ev-kasiglahan-gym', category: 'evacuation', name: 'Kasiglahan Village Elementary School Gym',
    coords: [14.7461, 121.1352], address: 'Kasiglahan Village, Brgy. San Jose',
    note: 'Pangunahing evacuation center kapag tumaas ang ilog', approx: true, source: 'curated',
  },
  {
    id: 'ev-covered-court', category: 'evacuation', name: 'Brgy. San Jose Covered Court (Evacuation Center)',
    coords: [14.7413, 121.1470], address: 'San Jose Proper, katabi ng Barangay Hall',
    note: 'May generator at stock na tubig', approx: true, source: 'curated',
  },
  {
    id: 'ev-suburban-hall', category: 'evacuation', name: 'Sub-Urban Housing Multi-Purpose Hall',
    coords: [14.7508, 121.1410], address: 'Sub-Urban Housing, Brgy. San Jose', approx: true, source: 'curated',
  },
  {
    id: 'ev-amityville-hall', category: 'evacuation', name: 'Amityville Subdivision Multi-Purpose Hall',
    coords: [14.7334, 121.1282], address: 'Amityville Subdivision, Brgy. San Jose', approx: true, source: 'curated',
  },
  // ----------------------------------------------------------- barangay 🏛️
  {
    id: 'br-sanjose-hall', category: 'barangay', name: 'Barangay San Jose Hall & Operations Center',
    coords: [14.7411, 121.1471], address: 'J.P. Rizal Avenue, San Jose Proper, Brgy. San Jose',
    hours: '8:00 AM – 5:00 PM (Lun–Biy)', phone: '(02) 8997-1823', approx: true, source: 'curated',
  },
  {
    id: 'br-bdrrmc', category: 'barangay', name: 'BDRRMC San Jose Emergency Operations Center',
    coords: [14.7409, 121.1474], address: 'Barangay Hall compound, San Jose Proper',
    hours: '24 oras tuwing may bagyo', phone: '0917-890-7265', approx: true, source: 'curated',
  },
  {
    id: 'br-satellite-1k2', category: 'barangay', name: 'Barangay San Jose Satellite Office (Kasiglahan 1K2)',
    coords: [14.7455, 121.1368], address: 'Kasiglahan Village 1K2, Brgy. San Jose', approx: true, source: 'curated',
  },
  // ------------------------------------------------------------- school 🎓
  {
    id: 'sc-sanjose-elem', category: 'school', name: 'San Jose Elementary School',
    coords: [14.7415, 121.1467], address: 'San Jose Proper, Brgy. San Jose', approx: true, source: 'curated',
  },
  {
    id: 'sc-kasiglahan-elem', category: 'school', name: 'Kasiglahan Village Elementary School',
    coords: [14.7460, 121.1353], address: 'Kasiglahan Village 1K1, Brgy. San Jose',
    note: 'Evacuation center din kapag baha', approx: true, source: 'curated',
  },
  {
    id: 'sc-kasiglahan-nhs', category: 'school', name: 'Kasiglahan Village National High School',
    coords: [14.7443, 121.1374], address: 'Kasiglahan Village 1K2, Brgy. San Jose', approx: true, source: 'curated',
  },
  {
    id: 'sc-eastwood-learning', category: 'school', name: 'Eastwood Greenview Learning Center',
    coords: [14.7391, 121.1213], address: 'Eastwood Greenview Phase 3, Brgy. San Jose', approx: true, source: 'curated',
  },
  {
    id: 'sc-tagumpay-daycare', category: 'school', name: 'Tagumpay Village Day Care Center',
    coords: [14.7557, 121.1324], address: 'Tagumpay Village, Brgy. San Jose', approx: true, source: 'curated',
  },
  // ------------------------------------------------------------- church ⛪
  {
    id: 'ch-san-jose-parish', category: 'church', name: 'San Jose Parish Church',
    coords: [14.7418, 121.1476], address: 'San Jose Proper, Brgy. San Jose',
    note: 'Misa tuwing Linggo 6AM / 8AM / 5PM', approx: true, source: 'curated',
  },
  {
    id: 'ch-kasiglahan-chapel', category: 'church', name: 'Kasiglahan Village Chapel',
    coords: [14.7458, 121.1357], address: 'Kasiglahan Village 1K1, Brgy. San Jose', approx: true, source: 'curated',
  },
  {
    id: 'ch-inc-kasiglahan', category: 'church', name: 'Iglesia ni Cristo – Lokal ng Kasiglahan',
    coords: [14.7445, 121.1370], address: 'Kasiglahan Village, Brgy. San Jose', approx: true, source: 'curated',
  },
  // -------------------------------------------------------------- court 🏀
  {
    id: 'ct-sanjose-covered', category: 'court', name: 'Brgy. San Jose Covered Court',
    coords: [14.7412, 121.1468], address: 'Barangay Hall compound, San Jose Proper',
    note: 'Ginagamit ding evacuation center', approx: true, source: 'curated',
  },
  {
    id: 'ct-kasiglahan', category: 'court', name: 'Kasiglahan Village Basketball Court',
    coords: [14.7459, 121.1363], address: 'Kasiglahan Village 1K1, Brgy. San Jose', approx: true, source: 'curated',
  },
  {
    id: 'ct-tagumpay', category: 'court', name: 'Tagumpay Village Court & Plaza',
    coords: [14.7554, 121.1330], address: 'Tagumpay Village, Brgy. San Jose', approx: true, source: 'curated',
  },
  // --------------------------------------------------------------- wifi 📶
  {
    id: 'wf-barangay-hall', category: 'wifi', name: 'Free WiFi Zone – Barangay San Jose Hall',
    coords: [14.7412, 121.1472], address: 'San Jose Proper, Brgy. San Jose',
    hours: '8:00 AM – 5:00 PM', note: 'Libreng WiFi (project ng barangay)', approx: true, source: 'curated',
  },
  {
    id: 'wf-kasiglahan-plaza', category: 'wifi', name: 'Free WiFi Zone – Kasiglahan Plaza',
    coords: [14.7450, 121.1365], address: 'Kasiglahan Village 1K1 Plaza, Brgy. San Jose', approx: true, source: 'curated',
  },
  {
    id: 'wf-load-station', category: 'wifi', name: 'Load & E-Load Station – San Jose Proper',
    coords: [14.7420, 121.1458], address: 'J.P. Rizal Avenue, Brgy. San Jose', approx: true, source: 'curated',
  },
  // --------------------------------------------------------------- food 🍜
  {
    id: 'fd-jollibee-montalban', category: 'food', name: 'Jollibee Montalban',
    coords: [14.7354, 121.1338], address: 'Rodriguez Highway, Brgy. Rosario (katabi ng San Jose)',
    hours: '6:00 AM – 10:00 PM', note: 'Drive-thru', approx: true, source: 'curated',
  },
  {
    id: 'fd-karinderya', category: 'food', name: "Aling Nena's Karinderya",
    coords: [14.7452, 121.1354], address: 'Kasiglahan Village 1K1, Brgy. San Jose',
    hours: '6:00 AM – 8:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'fd-sanjose-eatery', category: 'food', name: 'San Jose Eatery & Grill',
    coords: [14.7423, 121.1457], address: 'San Jose Proper, Brgy. San Jose',
    hours: '10:00 AM – 10:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'fd-milk-tea', category: 'food', name: 'Milk Tea Corner Kasiglahan',
    coords: [14.7447, 121.1361], address: 'Kasiglahan Village 1K2, Brgy. San Jose', approx: true, source: 'curated',
  },
  // -------------------------------------------------------------- salon 💈
  {
    id: 'sa-sanjose-barber', category: 'salon', name: 'San Jose Barbershop',
    coords: [14.7419, 121.1456], address: 'J.P. Rizal Avenue, San Jose Proper, Brgy. San Jose',
    hours: '9:00 AM – 8:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'sa-kasiglahan-glam', category: 'salon', name: 'Kasiglahan Glam Salon',
    coords: [14.7451, 121.1358], address: 'Kasiglahan Village 1K1, Brgy. San Jose', approx: true, source: 'curated',
  },
  // ------------------------------------------------------------- dental 🦷
  {
    id: 'de-sanjose-dental', category: 'dental', name: 'San Jose Dental Clinic',
    coords: [14.7425, 121.1461], address: 'San Jose Proper, Brgy. San Jose',
    hours: '9:00 AM – 6:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'de-kasiglahan-smile', category: 'dental', name: 'Kasiglahan Smile Dental Center',
    coords: [14.7449, 121.1364], address: 'Kasiglahan Village 1K1, Brgy. San Jose', approx: true, source: 'curated',
  },
  // ---------------------------------------------------------------- vet 🐾
  {
    id: 've-sanjose-vet', category: 'vet', name: 'San Jose Veterinary Clinic',
    coords: [14.7417, 121.1450], address: 'J.P. Rizal Avenue, Brgy. San Jose',
    hours: '9:00 AM – 6:00 PM', approx: true, source: 'curated',
  },
  {
    id: 've-paws-claws', category: 'vet', name: 'Paws & Claws Animal Clinic – Amityville',
    coords: [14.7341, 121.1276], address: 'Amityville Subdivision, Brgy. San Jose', approx: true, source: 'curated',
  },
  // ---------------------------------------------------------------- gym 🏋️
  {
    id: 'gy-sanjose-fitness', category: 'gym', name: 'San Jose Fitness Gym & Boxing',
    coords: [14.7293, 121.1138], address: 'Litex Market Access Road, Brgy. San Jose',
    hours: '5:00 AM – 10:00 PM', approx: true, source: 'curated',
  },
  // ----------------------------------------------------------------- gas ⛽
  {
    id: 'ga-petron-highway', category: 'gas', name: 'Petron – Rodriguez Highway (San Jose)',
    coords: [14.7362, 121.1345], address: 'Rodriguez Highway, Brgy. San Jose', hours: '24 oras', approx: true, source: 'curated',
  },
  {
    id: 'ga-shell-litex', category: 'gas', name: 'Shell – Litex / J.P. Rizal',
    coords: [14.7286, 121.1128], address: 'Litex corridor, Brgy. San Jose', hours: '24 oras', approx: true, source: 'curated',
  },
  {
    id: 'ga-phoenix-kasiglahan', category: 'gas', name: 'Phoenix – Kasiglahan Village',
    coords: [14.7464, 121.1372], address: 'Kasiglahan Village, Brgy. San Jose', hours: '5:00 AM – 10:00 PM', approx: true, source: 'curated',
  },
  // --------------------------------------------------------- vulcanizing 🛞
  {
    id: 'vu-kuya-boy', category: 'vulcanizing', name: 'Kuya Boy Vulcanizing – Kasiglahan',
    coords: [14.7446, 121.1366], address: 'Kasiglahan Village 1K1, Brgy. San Jose',
    hours: '6:00 AM – 9:00 PM', note: 'Tire patch at interior repair', approx: true, source: 'curated',
  },
  {
    id: 'vu-sanjose-tire', category: 'vulcanizing', name: 'San Jose Tire Supply & Vulcanizing',
    coords: [14.7427, 121.1449], address: 'J.P. Rizal Avenue, Brgy. San Jose', approx: true, source: 'curated',
  },
  {
    id: 'vu-amityville-auto', category: 'vulcanizing', name: 'Amityville Auto Repair & Vulcanizing',
    coords: [14.7332, 121.1284], address: 'Amityville Subdivision, Brgy. San Jose', approx: true, source: 'curated',
  },
  // ------------------------------------------------------------ terminal 🛺
  {
    id: 'te-sanjose-plaza', category: 'terminal', name: 'Tricycle Terminal – Barangay San Jose Plaza',
    coords: [14.7413, 121.1466], address: 'San Jose Proper, Brgy. San Jose', hours: '4:30 AM – 10:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'te-kasiglahan-toda', category: 'terminal', name: 'Kasiglahan TODA Terminal (1K1)',
    coords: [14.7454, 121.1356], address: 'Kasiglahan Village 1K1, Brgy. San Jose', hours: '5:00 AM – 11:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'te-highway-jeep', category: 'terminal', name: 'Jeepney Terminal – Rodriguez Highway',
    coords: [14.7357, 121.1342], address: 'Rodriguez Highway (San Jose / Rosario boundary)',
    note: 'Biyaheng Rodriguez–Cubao at San Mateo', approx: true, source: 'curated',
  },
  // ------------------------------------------------------------- parking 🅿️
  {
    id: 'pa-barangay-hall', category: 'parking', name: 'Barangay San Jose Hall Parking',
    coords: [14.7414, 121.1473], address: 'Barangay Hall compound, San Jose Proper', approx: true, source: 'curated',
  },
  {
    id: 'pa-town-center', category: 'parking', name: 'Montalban Town Center Parking',
    coords: [14.7404, 121.1488], address: 'Montalban Town Center, Rodriguez Highway', approx: true, source: 'curated',
  },
  // ----------------------------------------------------------------- atm 🏧
  {
    id: 'at-bdo-town-center', category: 'atm', name: 'BDO ATM – Montalban Town Center',
    coords: [14.7402, 121.1485], address: 'GF, Montalban Town Center, Rodriguez Highway cor. Lardizabal St.',
    hours: '24 oras', approx: true, source: 'curated',
  },
  {
    id: 'at-bpi-kasiglahan', category: 'atm', name: 'BPI ATM – Kasiglahan Village',
    coords: [14.7450, 121.1360], address: 'Kasiglahan Village 1K1 Commercial Row, Brgy. San Jose',
    hours: '24 oras', approx: true, source: 'curated',
  },
  {
    id: 'at-landbank-municipal', category: 'atm', name: 'Landbank ATM – Rodriguez Municipal Hall',
    coords: [14.7307, 121.1198], address: 'Municipal compound, Rodriguez, Rizal', hours: '24 oras', approx: true, source: 'curated',
  },
  {
    id: 'at-gcash-kiosk', category: 'atm', name: 'GCash / Cash-in Kiosk – Kasiglahan 1K1',
    coords: [14.7448, 121.1354], address: 'Kasiglahan Village 1K1, Brgy. San Jose',
    hours: '7:00 AM – 9:00 PM', approx: true, source: 'curated',
  },
  // ---------------------------------------------------------------- bank 🏦
  {
    id: 'ba-bdo-montalban', category: 'bank', name: 'BDO Montalban Town Center',
    coords: [14.7401, 121.1485], address: 'GF, Montalban Town Center, Rodriguez Highway cor. Lardizabal St., Brgy. San Jose',
    hours: '9:00 AM – 4:00 PM (Lun–Biy)', phone: '948-2718', approx: true, source: 'curated',
  },
  {
    id: 'ba-landbank-rodriguez', category: 'bank', name: 'Landbank Rodriguez Branch',
    coords: [14.7308, 121.1199], address: 'Rodriguez (Montalban) town proper', hours: '9:00 AM – 4:00 PM (Lun–Biy)', approx: true, source: 'curated',
  },
  {
    id: 'ba-card-kasiglahan', category: 'bank', name: 'CARD Bank – Kasiglahan Village',
    coords: [14.7453, 121.1365], address: 'Kasiglahan Village 1K1, Brgy. San Jose', approx: true, source: 'curated',
  },
  // ------------------------------------------------------------ pawnshop 💰
  {
    id: 'pw-cebuana', category: 'pawnshop', name: 'Cebuana Lhuillier – Kasiglahan',
    coords: [14.7451, 121.1359], address: 'Kasiglahan Village 1K1, Brgy. San Jose', hours: '8:00 AM – 6:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'pw-mlhuillier', category: 'pawnshop', name: 'M Lhuillier – Montalban Town Center',
    coords: [14.7403, 121.1483], address: 'Montalban Town Center, Brgy. San Jose', hours: '8:00 AM – 6:00 PM', approx: true, source: 'curated',
  },
  {
    id: 'pw-palawan', category: 'pawnshop', name: 'Palawan Pawnshop – San Jose Proper',
    coords: [14.7422, 121.1454], address: 'J.P. Rizal Avenue, Brgy. San Jose', approx: true, source: 'curated',
  },
  // ---------------------------------------------------------- remittance 📤
  {
    id: 're-palawan-express', category: 'remittance', name: 'Palawan Express Padala – Kasiglahan',
    coords: [14.7450, 121.1355], address: 'Kasiglahan Village 1K1, Brgy. San Jose', hours: '8:00 AM – 7:00 PM', approx: true, source: 'curated',
  },
  {
    id: 're-lbc', category: 'remittance', name: 'LBC Express – San Jose Proper',
    coords: [14.7424, 121.1452], address: 'J.P. Rizal Avenue, Brgy. San Jose', approx: true, source: 'curated',
  },
  {
    id: 're-gcash-padala', category: 'remittance', name: 'GCash Padala Partner – Kasiglahan 1K1',
    coords: [14.7446, 121.1352], address: 'Kasiglahan Village 1K1, Brgy. San Jose', approx: true, source: 'curated',
  },
];

/** Curated count per category (used for the badges on the picker buttons). */
export const CURATED_COUNT_BY_CATEGORY: Record<string, number> = HELP_CENTER_PLACES.reduce(
  (acc, place) => {
    acc[place.category] = (acc[place.category] ?? 0) + 1;
    return acc;
  },
  {} as Record<string, number>,
);

/** Barangay San Jose bounding box used for the Overpass ("Live OSM") query. */
export const HELP_CENTER_BBOX: [number, number, number, number] = [14.7150, 121.0980, 14.7780, 121.1680];

/** Great-circle distance in kilometres. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Nice "450 m" / "1.8 km" label. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/**
 * Builds the Overpass QL query for the given categories, limited to the
 * barangay bounding box. Only categories that actually have OSM filters are
 * queried, so a selection of curated-only rows costs nothing.
 *
 * `withLimit` adds the `400` output cap (first attempt — keeps the payload
 * small). The Help Center retries without it if a mirror rejects that form,
 * so live pins still load on stricter endpoints.
 */
export function buildOverpassQuery(categories: PlaceCategoryId[], withLimit = true): string | null {
  const filters = categories
    .map((id) => CATEGORY_BY_ID[id]?.osm ?? [])
    .flat()
    .filter(Boolean);
  if (filters.length === 0) return null;
  const [s, w, n, e] = HELP_CENTER_BBOX;
  const bbox = `${s},${w},${n},${e}`;
  const parts: string[] = [];
  filters.forEach((filter) => {
    parts.push(`node${filter}(${bbox});`);
    parts.push(`way${filter}(${bbox});`);
  });
  return `[out:json][timeout:25];(${parts.join('')});out body center${withLimit ? ' 400' : ''};`;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Normalises a name for duplicate detection (case/punctuation insensitive). */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(inc|corp|branch|brgy|barangay)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Which selected category does an OSM element belong to? Uses the element's
 * tags against the category's OSM filters, with a small fast-path for the
 * 7-Eleven brand (name/brand contains "7 eleven" variants).
 */
function categoryForElement(element: OverpassElement, candidates: PlaceCategoryId[]): PlaceCategoryId | null {
  const tags = element.tags ?? {};
  const name = `${tags.name ?? ''} ${tags.brand ?? ''} ${tags.operator ?? ''}`.toLowerCase();

  const matches = (id: PlaceCategoryId): boolean => {
    switch (id) {
      case 'seven_eleven':
        return /7\s*-?\s*eleven/i.test(name);
      case 'convenience':
        return tags.shop === 'convenience';
      case 'supermarket':
        return tags.shop === 'supermarket' || tags.shop === 'grocery';
      case 'market':
        return tags.amenity === 'marketplace';
      case 'pharmacy':
        return tags.amenity === 'pharmacy' || tags.shop === 'chemist';
      case 'bigasan':
        return tags.shop === 'rice' || /bigas/i.test(name);
      case 'water':
        return tags.amenity === 'water_point' || tags.shop === 'water' || tags.man_made === 'water_tap';
      case 'lpg':
        return tags.shop === 'gas' || /gasul|lpg/i.test(name);
      case 'bakery':
        return tags.shop === 'bakery';
      case 'hardware':
        return tags.shop === 'hardware' || tags.shop === 'doityourself' || tags.shop === 'trade';
      case 'laundry':
        return tags.shop === 'laundry' || tags.shop === 'dry_cleaning';
      case 'police':
        return tags.amenity === 'police';
      case 'fire':
        return tags.amenity === 'fire_station';
      case 'hospital':
        return tags.amenity === 'hospital';
      case 'clinic':
        return tags.amenity === 'clinic' || tags.amenity === 'doctors' || tags.healthcare === 'centre';
      case 'evacuation':
        return (
          tags.emergency === 'assembly_point' ||
          tags.amenity === 'shelter' ||
          tags.amenity === 'community_centre'
        );
      case 'barangay':
        return tags.amenity === 'townhall' || tags.office === 'government';
      case 'school':
        return tags.amenity === 'school' || tags.amenity === 'kindergarten';
      case 'church':
        return tags.amenity === 'place_of_worship';
      case 'court':
        return tags.leisure === 'pitch' || tags.leisure === 'sports_centre';
      case 'wifi':
        return tags.internet_access === 'wlan' || tags.shop === 'mobile_phone';
      case 'food':
        return tags.amenity === 'restaurant' || tags.amenity === 'fast_food' || tags.amenity === 'cafe';
      case 'salon':
        return tags.shop === 'hairdresser' || tags.shop === 'beauty';
      case 'dental':
        return tags.amenity === 'dentist';
      case 'vet':
        return tags.amenity === 'veterinary';
      case 'gym':
        return tags.leisure === 'fitness_centre';
      case 'gas':
        return tags.amenity === 'fuel';
      case 'vulcanizing':
        return tags.shop === 'tyres' || tags.shop === 'car_repair';
      case 'terminal':
        return tags.highway === 'bus_stop' || tags.amenity === 'bus_station';
      case 'parking':
        return tags.amenity === 'parking';
      case 'atm':
        return tags.amenity === 'atm';
      case 'bank':
        return tags.amenity === 'bank';
      case 'pawnshop':
        return tags.shop === 'pawnbroker';
      case 'remittance':
        return (
          tags.amenity === 'money_transfer' ||
          tags.shop === 'money_transfer' ||
          tags.shop === 'money_lender'
        );
      default:
        return false;
    }
  };

  for (const id of candidates) {
    if (matches(id)) return id;
  }
  return null;
}

/** Turns an Overpass response into Place rows for the map. */
export function osmElementsToPlaces(
  elements: OverpassElement[],
  candidates: PlaceCategoryId[],
): Place[] {
  const places: Place[] = [];
  elements.forEach((element) => {
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    const category = categoryForElement(element, candidates);
    if (!category) return;
    const tags = element.tags ?? {};
    const name =
      tags.name ||
      tags['name:en'] ||
      tags.brand ||
      tags.operator ||
      CATEGORY_BY_ID[category]?.label ||
      'Unnamed place';
    const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
    const address =
      tags['addr:full'] ||
      [street, tags['addr:city'] || tags['addr:town'] || tags['addr:municipality'] || 'Rodriguez, Rizal']
        .filter(Boolean)
        .join(', ') ||
      'Rodriguez, Rizal';
    places.push({
      id: `osm-${element.type}-${element.id}`,
      category,
      name,
      coords: [lat, lng],
      address,
      hours: tags.opening_hours,
      phone: tags.phone || tags['contact:phone'],
      note: tags.description || tags['addr:place'] || undefined,
      source: 'osm',
    });
  });
  return places;
}

/** Dedupe helper: same normalised name within 120 m counts as the same place. */
export function mergePlaces(curated: Place[], live: Place[]): Place[] {
  const merged = [...curated];
  live.forEach((candidate) => {
    const key = normalizeName(candidate.name);
    const duplicate = merged.some((existing) => {
      const existingKey = normalizeName(existing.name);
      if (key && existingKey && key === existingKey) return true;
      return distanceKm(existing.coords, candidate.coords) < 0.12 && (!key || !existingKey || key.startsWith(existingKey) || existingKey.startsWith(key));
    });
    if (!duplicate) merged.push(candidate);
  });
  return merged;
}
