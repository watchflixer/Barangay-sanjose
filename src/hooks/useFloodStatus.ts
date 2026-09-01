import { useEffect, useState } from 'react';
import { FloodStatusData, FLOOD_DATA_URL } from '../lib/flood';

const REFRESH_MS = 5 * 60 * 1000; // re-check every 5 minutes while the page is open

export function useFloodStatus() {
  const [data, setData] = useState<FloodStatusData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${FLOOD_DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
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
