import { RainViewerData, RainViewerFrame } from '../types/weather';

export async function fetchRainViewerData(): Promise<RainViewerData | null> {
  try {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json', { cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`RainViewer fetch failed with status ${res.status}`);
    }
    const data: RainViewerData = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching RainViewer maps:', error);
    return null;
  }
}

/**
 * Constructs the tile URL for a RainViewer frame
 * colorScheme: 2 (Universal Doppler rainbow), 1 (Original), 4 (Smooth)
 * smooth: 1, snow: 1
 */
export function getRainViewerTileUrl(host: string, frame: RainViewerFrame, colorScheme: number = 2): string {
  return `${host}${frame.path}/256/{z}/{x}/{y}/${colorScheme}/1_1.png`;
}

/**
 * Format timestamp into readable Philippine local time string (e.g. "01:26 AM" or "-30 min")
 */
export function formatFrameTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila'
  });
}
