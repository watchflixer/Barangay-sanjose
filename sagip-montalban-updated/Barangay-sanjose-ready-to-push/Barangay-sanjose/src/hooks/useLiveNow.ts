import { useEffect, useState } from 'react';

/**
 * Returns the current epoch timestamp in ms, refreshed periodically and
 * immediately whenever the browser tab regains focus or visibility so
 * relative incident timestamps ("Just now", "5 minutes ago", "3 hours ago")
 * stay accurate without reloading the page.
 */
export function useLiveNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const sync = () => setNow(Date.now());
    const timer = window.setInterval(sync, intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);

  return now;
}
