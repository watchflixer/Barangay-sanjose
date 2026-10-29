/**
 * HELP CENTER DIRECTORY - category definitions for Barangay San Jose
 * ------------------------------------------------------------------
 * This file holds **only** the filter categories (id, label, group, map code)
 * and small geo helpers. It deliberately contains **no places**: every Help
 * Center pin comes from the barangay's own Supabase tables
 * (`<group>_<category>`, see supabase/help_places.sql), which the barangay
 * edits in the dashboard. There is no bundled fallback list and no live OSM
 * pin layer, so nothing here can ever invent a location.
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
  /** Filipino-friendly label shown on the filter buttons. */
  label: string;
  /** Short English caption under the label. */
  caption: string;
  /**
   * 2-3 letter cartographic code stamped on the map pin ("7E", "RX", "ATM").
   * The Help Center is a black-and-white view by design, so categories are
   * told apart by code rather than by colour.
   */
  code: string;
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
  replaces?: string;
  source: 'curated' | 'osm' | 'supabase';
}

export const PLACE_GROUPS: { id: PlaceGroupId; label: string; caption: string }[] = [
  { id: 'emergency', label: 'Emergency', caption: 'Police, fire, hospital, evacuation' },
  { id: 'essentials', label: 'Everyday essentials', caption: 'Stores, pharmacy, water, rice' },
  { id: 'travel', label: 'Travel / Vehicles', caption: 'Gas, tires, terminals, parking' },
  { id: 'money', label: 'Money / Remittance', caption: 'ATMs, banks, pawnshops, remittance' },
  { id: 'community', label: 'Community / Family', caption: 'Schools, churches, courts, eateries' },
];

export const HELP_CENTER_CATEGORIES: PlaceCategory[] = [
  // ---------------------------------------------------------------- emergency
  {
    id: 'police', label: 'Police', caption: 'Precincts and outposts', code: 'PNP', group: 'emergency', osm: ['["amenity"="police"]'],
  },
  {
    id: 'fire', label: 'Fire Station / BFP', caption: 'Fire trucks and rescue', code: 'BFP', group: 'emergency', osm: ['["amenity"="fire_station"]'],
  },
  {
    id: 'hospital', label: 'Hospital', caption: 'Emergency rooms', code: 'ER', group: 'emergency', osm: ['["amenity"="hospital"]'],
  },
  {
    id: 'clinic', label: 'Health Center / Clinic', caption: 'Doctor consultations', code: 'HC', group: 'emergency',
    osm: ['["amenity"="clinic"]', '["amenity"="doctors"]', '["healthcare"="centre"]'],
  },
  {
    id: 'evacuation', label: 'Evacuation Center', caption: 'Shelter during disasters', code: 'EV', group: 'emergency',
    osm: ['["emergency"="assembly_point"]', '["amenity"="shelter"]', '["amenity"="community_centre"]'],
  },
  {
    id: 'barangay', label: 'Barangay Hall', caption: 'Municipal and government offices', code: 'BR', group: 'emergency', osm: ['["amenity"="townhall"]', '["office"="government"]'],
  },
  // -------------------------------------------------------------- essentials
  {
    id: 'seven_eleven', label: '7-Eleven', caption: 'Open 24 hours', code: '7E', group: 'essentials',
    osm: ['["brand"~"7-?Eleven",i]', '["name"~"7-?Eleven",i]'],
  },
  {
    id: 'convenience', label: 'Convenience Store', caption: 'Mini marts and corner stores', code: 'CV', group: 'essentials', osm: ['["shop"="convenience"]'],
  },
  {
    id: 'supermarket', label: 'Supermarket / Grocery', caption: 'Large grocery stores', code: 'SM', group: 'essentials', osm: ['["shop"="supermarket"]', '["shop"="grocery"]'],
  },
  {
    id: 'market', label: 'Public Market', caption: 'Vegetable and fish stalls', code: 'MK', group: 'essentials', osm: ['["amenity"="marketplace"]'],
  },
  {
    id: 'pharmacy', label: 'Pharmacy', caption: 'Medicine and first aid', code: 'RX', group: 'essentials', osm: ['["amenity"="pharmacy"]', '["shop"="chemist"]'],
  },
  {
    id: 'bigasan', label: 'Rice Store', caption: 'Rice by the sack', code: 'RG', group: 'essentials', osm: ['["shop"="rice"]', '["name"~"bigas",i]'],
  },
  {
    id: 'water', label: 'Water Refilling Station', caption: 'Drinking water', code: 'H2O', group: 'essentials',
    osm: ['["amenity"="water_point"]', '["shop"="water"]', '["man_made"="water_tap"]'],
  },
  {
    id: 'lpg', label: 'LPG / Cooking Gas Dealer', caption: 'Cooking gas tanks', code: 'LPG', group: 'essentials',
    osm: ['["shop"="gas"]', '["name"~"gasul|lpg",i]'],
  },
  {
    id: 'bakery', label: 'Bakery', caption: 'Bread and cakes', code: 'PAN', group: 'essentials', osm: ['["shop"="bakery"]'],
  },
  {
    id: 'hardware', label: 'Hardware', caption: 'Building materials and tools', code: 'HW', group: 'essentials',
    osm: ['["shop"="hardware"]', '["shop"="doityourself"]', '["shop"="trade"]'],
  },
  {
    id: 'laundry', label: 'Laundry', caption: 'Wash, dry and fold', code: 'LD', group: 'essentials', osm: ['["shop"="laundry"]', '["shop"="dry_cleaning"]'],
  },
  // ------------------------------------------------------------------ travel
  {
    id: 'gas', label: 'Gas Station', caption: 'Gasoline and diesel', code: 'GS', group: 'travel', osm: ['["amenity"="fuel"]'],
  },
  {
    id: 'vulcanizing', label: 'Tire Shop', caption: 'Tires, patching and repairs', code: 'VS', group: 'travel', osm: ['["shop"="tyres"]', '["shop"="car_repair"]'],
  },
  {
    id: 'terminal', label: 'Tricycle / Jeep Terminal', caption: 'Boarding and drop-off points', code: 'TR', group: 'travel', osm: ['["highway"="bus_stop"]', '["amenity"="bus_station"]'],
  },
  {
    id: 'parking', label: 'Parking Area', caption: 'Parking spaces', code: 'PK', group: 'travel', osm: ['["amenity"="parking"]'],
  },
  // ------------------------------------------------------------------- money
  {
    id: 'atm', label: 'ATM', caption: 'Cash withdrawal', code: 'ATM', group: 'money', osm: ['["amenity"="atm"]'],
  },
  {
    id: 'bank', label: 'Bank', caption: 'Deposits and accounts', code: 'BK', group: 'money', osm: ['["amenity"="bank"]'],
  },
  {
    id: 'pawnshop', label: 'Pawnshop', caption: 'Pawn and lending', code: 'PW', group: 'money', osm: ['["shop"="pawnbroker"]'],
  },
  {
    id: 'remittance', label: 'Remittance', caption: 'Money transfers', code: 'RM', group: 'money',
    osm: ['["amenity"="money_transfer"]', '["shop"="money_transfer"]', '["shop"="money_lender"]'],
  },
  // --------------------------------------------------------------- community
  {
    id: 'school', label: 'School', caption: 'All schools — elementary to college', code: 'SCH', group: 'community', osm: ['["amenity"~"school|college|university|kindergarten|language_school|music_school|driving_school"]', '["office"="educational_institution"]'],
  },
  {
    id: 'church', label: 'Church', caption: 'Mass and worship', code: 'CH', group: 'community', osm: ['["amenity"="place_of_worship"]'],
  },
  {
    id: 'court', label: 'Covered Court / Plaza', caption: 'Games and assemblies', code: 'CT', group: 'community', osm: ['["leisure"="pitch"]', '["leisure"="sports_centre"]'],
  },
  {
    id: 'wifi', label: 'Free WiFi / Load', caption: 'Internet and load stations', code: 'WF', group: 'community',
    osm: ['["internet_access"="wlan"]', '["shop"="mobile_phone"]'],
  },
  {
    id: 'food', label: 'Eateries', caption: 'Restaurants and fast food', code: 'FD', group: 'community',
    osm: ['["amenity"="restaurant"]', '["amenity"="fast_food"]', '["amenity"="cafe"]'],
  },
  {
    id: 'salon', label: 'Salon / Barber', caption: 'Haircuts and beauty care', code: 'SL', group: 'community', osm: ['["shop"="hairdresser"]', '["shop"="beauty"]'],
  },
  {
    id: 'dental', label: 'Dental Clinic', caption: 'Teeth and braces', code: 'DN', group: 'community', osm: ['["amenity"="dentist"]'],
  },
  {
    id: 'vet', label: 'Veterinary / Pet', caption: 'Pet care and medicine', code: 'VET', group: 'community', osm: ['["amenity"="veterinary"]'],
  },
  {
    id: 'gym', label: 'Gym / Fitness', caption: 'Workouts and boxing', code: 'GYM', group: 'community', osm: ['["leisure"="fitness_centre"]'],
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
 * `withLimit` adds a 400-element output cap to bound the response size.
 * The query timeout is shorter than the client's per-mirror timeout.
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
  return `[out:json][timeout:8];(${parts.join('')});out body center${withLimit ? ' 400' : ''};`;
}

export interface OverpassElement {
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
        return tags.amenity === 'school' || tags.amenity === 'college' || tags.amenity === 'university' || tags.amenity === 'kindergarten' || tags.amenity === 'language_school' || tags.amenity === 'music_school' || tags.amenity === 'driving_school' || tags.office === 'educational_institution';
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
    if (!element || !['node', 'way', 'relation'].includes(element.type) || !Number.isFinite(element.id)) return;
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat!) > 90 || Math.abs(lng!) > 180) return;
    const category = categoryForElement(element, candidates);
    // School pins are maintained manually; do not add live OSM school results.
    if (!category || category === 'school') return;
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
      if (existing.id === candidate.id) return true;
      if (existing.category !== candidate.category) return false;
      return distanceKm(existing.coords, candidate.coords) < 0.12 &&
        !!key && !!existingKey && (key === existingKey || key.startsWith(existingKey) || existingKey.startsWith(key));
    });
    if (!duplicate) merged.push(candidate);
  });
  return merged;
}
