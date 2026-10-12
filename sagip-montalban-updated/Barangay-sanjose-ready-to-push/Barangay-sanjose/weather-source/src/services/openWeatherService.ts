/**
 * Service for OpenWeatherMap layers and Philippine Area of Responsibility (PAR) bounds.
 */

// PAGASA Philippine Area of Responsibility (PAR) coordinates [latitude, longitude]
export const PAR_COORDINATES: [number, number][] = [
  [25.0, 120.0],
  [25.0, 135.0],
  [5.0, 135.0],
  [5.0, 115.0],
  [15.0, 115.0],
  [21.0, 120.0],
  [25.0, 120.0] // Closes polygon
];

// Philippine geographical bounding box
export const PHILIPPINES_BOUNDS: [[number, number], [number, number]] = [
  [4.2, 114.5], // Southwest corner (Tawi-Tawi / Celebes Sea)
  [21.5, 127.5]  // Northeast corner (Batanes / Philippine Sea)
];

export const PHILIPPINES_CENTER: [number, number] = [12.8797, 121.7740];

export function getStoredOwmKey(): string {
  try {
    return localStorage.getItem('panahon_owm_key') || '';
  } catch {
    return '';
  }
}

export function saveOwmKey(key: string): void {
  try {
    localStorage.setItem('panahon_owm_key', key.trim());
  } catch (e) {
    console.error('Failed to save OWM key:', e);
  }
}

/**
 * Gets OpenWeatherMap tile URL if key is present
 */
export function getOwmTileUrl(layer: 'temp_new' | 'clouds_new' | 'wind_new' | 'precipitation_new', apiKey: string): string | null {
  if (!apiKey || apiKey.length < 10) return null;
  return `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${apiKey}`;
}
