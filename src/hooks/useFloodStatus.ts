import { useEffect, useState } from 'react';
import { FloodStatusData, FLOOD_DATA_URL, FLOOD_LIVE_URL } from '../lib/flood';

// Matches the live server's own cache window (server/index.mjs CACHE_MS) —
// polling faster than that just re-requests the same cached snapshot.
const REFRESH_MS = 12 * 1000;

export function useFloodStatus() {
  const [data, setData] = useState<FloodStatusData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const url = FLOOD_LIVE_URL || FLOOD_DATA_URL;

    const load = async () => {
      try {
        const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('bad response');
        const json = (await res.json()) as FloodStatusData;
        if (!cancelled) {
          setData(json);
          setError(false);
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
