import { RainViewerData, RainViewerFrame } from '../types/weather';

export interface RadarTileOptions {
  colorScheme?: number; // RainViewer's documented radar palette: 2 (Universal Blue)
  smooth?: boolean;
  snow?: boolean;
}

class RainViewerService {
  private cachedData: RainViewerData | null = null;
  private lastFetchTime = 0;
  private fetchPromise: Promise<RainViewerData> | null = null;

  async getRadarData(force = false): Promise<RainViewerData> {
    const now = Date.now();
    // Cache for 3 minutes since radar updates every ~10 mins
    if (!force && this.cachedData && now - this.lastFetchTime < 3 * 60 * 1000) {
      return this.cachedData;
    }

    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = (async () => {
      try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        if (!res.ok) {
          throw new Error(`RainViewer API responded with status ${res.status}`);
        }
        const data: RainViewerData = await res.json();
        this.cachedData = data;
        this.lastFetchTime = Date.now();
        return data;
      } catch (err) {
        console.error('Failed to fetch RainViewer radar data:', err);
        if (this.cachedData) return this.cachedData;
        throw err;
      } finally {
        this.fetchPromise = null;
      }
    })();

    return this.fetchPromise;
  }

  getAllFrames(data: RainViewerData): RainViewerFrame[] {
    const past = (data.radar?.past || []).map((f) => ({ ...f, isPast: true }));
    const nowcast = (data.radar?.nowcast || []).map((f) => ({ ...f, isPast: false }));
    return [...past, ...nowcast];
  }

  getSatelliteFrames(data: RainViewerData): RainViewerFrame[] {
    return (data.satellite?.infrared || []).map((f) => ({ ...f, isPast: true }));
  }

  getTileUrl(
    host: string,
    framePath: string,
    options: RadarTileOptions = {}
  ): string {
    const colorScheme = options.colorScheme ?? 2;
    const smooth = options.smooth !== false ? 1 : 0;
    const snow = options.snow ? 1 : 0;

    // Format: {host}{path}/256/{z}/{x}/{y}/{colorScheme}/{smooth}_{snow}.png
    return `${host}${framePath}/256/{z}/{x}/{y}/${colorScheme}/${smooth}_${snow}.png`;
  }

  getSatelliteTileUrl(host: string, framePath: string): string {
    return `${host}${framePath}/256/{z}/{x}/{y}/0/0_0.png`;
  }
}

export const rainViewer = new RainViewerService();
