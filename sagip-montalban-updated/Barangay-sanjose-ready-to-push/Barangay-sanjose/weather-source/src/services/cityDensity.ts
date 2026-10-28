/**
 * Progressive city-marker density for the Panahon map.
 *
 * The map used to reveal markers in three hard jumps (19 → 34 → 68 pills), so
 * the far view was already crowded and the rest arrived in lumps. Now every
 * city has its own reveal threshold:
 *
 *   – the far view keeps exactly OVERVIEW_VISIBLE_LIMIT markers (the six
 *     national anchors first, then the biggest regional capitals),
 *   – every other city trickles in a few at a time as you zoom in,
 *   – the ranking is fixed: tier first (5 = anchor … 8 = smallest town), then
 *     the curated table order for the anchors and a stable hash for the rest,
 *     so the same cities always appear in the same order — no flicker between
 *     renders and no reshuffling after a reload.
 *
 * Offsets are measured from the locked overview zoom, so the behaviour is the
 * same whatever screen size makes that overview.
 */

export interface DensityCity {
  id: string;
  /** Tier at which the city belongs: 5 = anchor … 8 = smallest municipality. */
  minZoom?: number;
}

/** Markers the far view keeps — the rest waits for a zoom-in. */
export const OVERVIEW_VISIBLE_LIMIT = 10;

/** Zoom offset of the first city that does not fit in the far view. */
const FIRST_REVEAL_OFFSET = 0.15;

/** Nothing hides once you are this far in: every city is on screen. */
export const FULL_DENSITY_OFFSET = 2.0;

/** Stable 32-bit string hash — identical order on every render and reload. */
export function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** The tier a city belongs to, clamped to the four we know about. */
export function tierOf(city: DensityCity): number {
  const tier = city.minZoom ?? 6;
  if (tier <= 5) return 5;
  if (tier >= 8) return 8;
  return tier;
}

/**
 * Stable priority order for the whole table.
 *
 * Tier decides the broad order; inside a tier the six anchors keep the curated
 * table order (so the far view is Manila, Baguio, Cebu, … and not a hash
 * lottery) while everything else is ordered by a stable hash.
 */
export function densityOrder<T extends DensityCity>(cities: T[]): T[] {
  const byTier = new Map<number, T[]>();
  cities.forEach((city) => {
    const tier = tierOf(city);
    const bucket = byTier.get(tier);
    if (bucket) bucket.push(city);
    else byTier.set(tier, [city]);
  });

  const priority = new Map<string, number>();
  byTier.forEach((peers, tier) => {
    const ordered =
      tier === 5
        ? [...peers]
        : [...peers].sort((a, b) => {
            const diff = stableHash(a.id) - stableHash(b.id);
            return diff !== 0 ? diff : a.id.localeCompare(b.id);
          });
    ordered.forEach((city, index) => priority.set(city.id, tier * 1000 + index));
  });

  return [...cities].sort((a, b) => (priority.get(a.id) ?? 0) - (priority.get(b.id) ?? 0));
}

/**
 * The zoom offset (from the locked overview) at which each city appears.
 * The first OVERVIEW_VISIBLE_LIMIT cities map to 0 — visible at the far view.
 */
export function revealOffsets<T extends DensityCity>(cities: T[]): Map<string, number> {
  const ordered = densityOrder(cities);
  const offsets = new Map<string, number>();
  const remaining = Math.max(1, ordered.length - OVERVIEW_VISIBLE_LIMIT);

  ordered.forEach((city, rank) => {
    if (rank < OVERVIEW_VISIBLE_LIMIT) {
      offsets.set(city.id, 0);
      return;
    }
    const progress = (rank - OVERVIEW_VISIBLE_LIMIT) / remaining;
    offsets.set(city.id, FIRST_REVEAL_OFFSET + progress * (FULL_DENSITY_OFFSET - FIRST_REVEAL_OFFSET));
  });

  return offsets;
}

/** Zoom offset at which a single city appears, given the whole table. */
export function revealOffset<T extends DensityCity>(city: T, cities: T[]): number {
  return revealOffsets(cities).get(city.id) ?? 0;
}

/**
 * The cities visible at `zoom`, given the locked overview zoom.
 * The far view keeps OVERVIEW_VISIBLE_LIMIT markers, so it is never empty and
 * never crowded; the rest arrive as you zoom in.
 */
export function visibleCitiesAtZoom<T extends DensityCity>(
  cities: T[],
  zoom: number,
  overviewZoom: number
): T[] {
  const offsets = revealOffsets(cities);

  // Fail safe: a missing/undefined zoom (Leaflet reports `undefined` before the
  // first setView) would make `offset` NaN, and `NaN >= 0` is false — which
  // hides every marker. Treat that as "we are at the overview" instead.
  const offset = Number.isFinite(zoom) && Number.isFinite(overviewZoom)
    ? Math.max(0, zoom - overviewZoom)
    : 0;

  if (offset >= FULL_DENSITY_OFFSET) return cities;
  return cities.filter((city) => offset >= (offsets.get(city.id) ?? 0));
}
