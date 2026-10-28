// Realtime page-load monitoring. Counts are stored per browser; this is not a server-wide analytics total.
export const VISIT_BASELINE = 5000;
export const VISIT_KEY = 'san-jose-local-visits-v1';
export const VISIT_EVENT = 'san-jose-visits-updated';
export interface VisitReading {
  total: number;
  additional: number;
  updatedAt?: string;
  error?: string;
}
export function readVisits(storage: Pick<Storage, 'getItem'>): VisitReading {
  try {
    const raw = JSON.parse(storage.getItem(VISIT_KEY) || 'null');
    const additional =
      raw &&
      Number.isSafeInteger(raw.additional) &&
      raw.additional >= 0 &&
      raw.additional <= Number.MAX_SAFE_INTEGER - VISIT_BASELINE
        ? raw.additional
        : 0;
    return {
      total: VISIT_BASELINE + additional,
      additional,
      updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : undefined,
    };
  } catch {
    return { total: VISIT_BASELINE, additional: 0, error: 'Visit storage is unavailable or invalid.' };
  }
}
export function recordLocalVisit(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  at = new Date().toISOString(),
): VisitReading {
  try {
    const existing = storage.getItem(VISIT_KEY);
    const reading = readVisits(storage);
    // Initialization starts at exactly 5,000. Subsequent document loads add one.
    const additional = existing
      ? Math.min(reading.additional + 1, Number.MAX_SAFE_INTEGER - VISIT_BASELINE)
      : 0;
    storage.setItem(VISIT_KEY, JSON.stringify({ additional, updatedAt: at }));
    return { total: VISIT_BASELINE + additional, additional, updatedAt: at };
  } catch {
    return { ...readVisits(storage), error: 'Visits cannot be persisted in this browser.' };
  }
}
let started: Promise<VisitReading> | undefined;
export function startVisitTracking(): Promise<VisitReading> {
  if (!started) {
    const record = () => {
      let result: VisitReading;
      try {
        result = recordLocalVisit(localStorage);
      } catch {
        result = {
          total: VISIT_BASELINE,
          additional: 0,
          error: 'Visits cannot be persisted in this browser.',
        };
      }
      window.dispatchEvent(new CustomEvent(VISIT_EVENT, { detail: result }));
      return result;
    };
    // Serialize simultaneous page loads across same-origin tabs where supported.
    started = navigator.locks
      ? navigator.locks.request(VISIT_KEY, record).catch(record)
      : Promise.resolve(record());
  }
  return started;
}
