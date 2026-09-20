import { useEffect, useState } from 'react';
import { FloodStatusData, FLOOD_DATA_URL, FLOOD_LIVE_URL } from '../lib/flood';

// Cache window to avoid flooding the server with requests and respect rate limits
const REFRESH_MS = 60 * 1000;

export function useFloodStatus() {
  const [data, setData] = useState<FloodStatusData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const url = FLOOD_LIVE_URL || FLOOD_DATA_URL;

    const load = async () => {
      try {
        const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as any;
        if (json && Array.isArray(json.stations) && json.stations.length > 0) {
          if (!cancelled) {
            setData(json as FloodStatusData);
            setError(false);
          }
        } else {
          throw new Error('Invalid flood status payload');
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { data, error };
}
