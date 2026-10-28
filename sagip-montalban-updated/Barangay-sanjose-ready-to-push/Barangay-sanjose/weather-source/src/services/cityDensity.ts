/**
 * Progressive city-marker density for the Panahon map.
 *
 * The map used to reveal markers in three hard jumps (19 → 34 → 68 pills), so
 * the far view was already crowded and the markers appeared in lumps as you
 * zoomed. This module hands every city its own reveal threshold instead:
 *
 *   – the 8 national anchors are always visible at the locked overview,
 *   – every other city trickles in at its own zoom offset,
 *   – the ramp is keyed to the city's `minZoom` tier, and inside a tier the
 *     order is a stable hash of the id, so the same cities always appear in
 *     the same order (no flicker, no random reshuffling between renders).
 *
 * Offsets are measured from the locked overview zoom, so the behaviour is the
 * same whatever the screen size makes that overview.
 */

export interface DensityCity {
  id: string;
  /** Tier at which the city belongs: 5 = anchor … 8 = smallest municipality. */
  minZoom?: number;
}

/** Zoom offset (from the overview) where each tier starts revealing. */
const TIER_START: Record<number, number> = { 5: 0, 6: -0.2, 7: 0.45, 8: 1.05 };

/** How much zoom a whole tier takes to reveal, smallest city last. */
const TIER_SPREAD: Record<number, number> = { 5: 0, 6: 0.5, 7: 0.6, 8: 0.95 };

/** Nothing hides once you are this far in: every city is on screen. */
export const FULL_DENSITY_OFFSET = 2.1;

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
 * Zoom offset (from the locked overview) at which this city appears.
 * Anchors return 0, the smallest municipalities return ~2.1.
 */
export function revealOffset(city: DensityCity, peersInTier: DensityCity[]): number {
  const tier = tierOf(city);
  const start = TIER_START[tier];
  const spread = TIER_SPREAD[tier];
  if (spread === 0) return 0;

  // Rank by stable hash so the reveal order never depends on array order.
  const ordered = [...peersInTier].sort((a, b) => {
    const diff = stableHash(a.id) - stableHash(b.id);
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
  const rank = ordered.findIndex((peer) => peer.id === city.id);
  const fraction = ordered.length <= 1 ? 0 : rank / (ordered.length - 1);
  return start + fraction * spread;
}

/**
 * The cities visible at `zoom`, given the locked overview zoom.
 * Always returns at least the anchors, so a far view is never empty.
 */
export function visibleCitiesAtZoom<T extends DensityCity>(
  cities: T[],
  zoom: number,
  overviewZoom: number
): T[] {
  const byTier = new Map<number, T[]>();
  cities.forEach((city) => {
    const tier = tierOf(city);
    const bucket = byTier.get(tier);
    if (bucket) bucket.push(city);
    else byTier.set(tier, [city]);
  });

  const offset = zoom - overviewZoom;
  return cities.filter((city) => {
    if (outerTier(city)) return offset >= 0; // anchors: always at the overview
    const peers = byTier.get(tierOf(city)) ?? [city];
    if (offset >= FULL_DENSITY_OFFSET) return true;
    return offset >= revealOffset(city, peers);
  });
}

/** Anchors stay put at every zoom, including a hair above the overview. */
function outerTier(city: DensityCity): boolean {
  return tierOf(city) === 5;
}
