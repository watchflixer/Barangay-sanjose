import type { OverpassElement } from '../data/helpCenterPlaces';

export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

/** POST avoids URL length limits when many categories are selected. Each
 * mirror gets a bounded attempt; cancellation stops retries and stale updates. */
export async function fetchOverpassElements(query: string, signal: AbortSignal): Promise<OverpassElement[]> {
  let lastError: unknown = new Error('Overpass unavailable');
  for (const endpoint of OVERPASS_ENDPOINTS) {
    signal.throwIfAborted();
    const attempt = new AbortController();
    const abort = () => attempt.abort();
    signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 10000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: new URLSearchParams({ data: query }),
        signal: attempt.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      // Overpass can return HTTP 200 with a timeout remark and partial results.
      // Do not cache that as a successful empty result.
      if (!Array.isArray(payload?.elements) || payload.remark) throw new Error('Incomplete Overpass response');
      signal.throwIfAborted();
      return payload.elements.filter((element: OverpassElement) => element &&
        ['node', 'way', 'relation'].includes(element.type) && Number.isFinite(element.id) &&
        (!element.tags || Object.values(element.tags).every(value => typeof value === 'string')));
    } catch (error) {
      signal.throwIfAborted();
      lastError = error;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
    }
  }
  throw lastError;
}
