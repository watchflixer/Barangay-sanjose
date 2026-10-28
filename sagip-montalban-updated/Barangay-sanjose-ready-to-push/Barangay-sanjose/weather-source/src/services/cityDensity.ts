/**
 * Progressive city-marker density for the Panahon map.
 *
 * The map used to reveal markers in three hard jumps (19 → 34 → 68 pills), so
 * the far view was already crowded and the markers appeared in lumps as you
 * zoomed. This module hands every city its own reveal threshold instead:
 *
 *   – exactly six national anchors are visible at the far view (the curated
 *     tier-5 list: Manila, Baguio, Cebu, Davao, Puerto Princesa, CDO),
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

/** How many markers the far view keeps — the rest waits for a zoom-in. */
export const OVERVIEW_VISIBLE_LIMIT = 6;

/** Zoom offset (from the overview) where each tier starts revealing. */
const TIER_START: Record<number, number> = { 5: 0.15, 6: 0.3, 7: 0.75, 8: 1.3 };

/** How much zoom a whole tier takes to reveal, smallest city last. */
const TIER_SPREAD: Record<number, number> = { 5: 0.2, 6: 0.45, 7: 0.55, 8: 0.7 };

/** Nothing hides once you are this far in: every city is on screen. */
export const FULL_DENSITY_OFFSET = 2.2;

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

  // Anchors: the first six (curated order) hold the far view. Any extra
  // tier-5 city — e.g. a located-but-unlisted place — waits one small step.
  if (tier === 5) {
    const rank = peersInTier.findIndex((peer) => peer.id === city.id);
    return rank >= 0 && rank < OVERVIEW_VISIBLE_LIMIT ? 0 : TIER_START[5];
  }

  const start = TIER_START[tier];
  const spread = TIER_SPREAD[tier];

  // Everything else ranks by stable hash, so the reveal order never depends
  // on the order the caller happens to pass cities in.
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
 * The far view keeps OVERVIEW_VISIBLE_LIMIT anchors, so it is never empty
 * and never crowded; the rest arrive as you zoom in.
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
    if (offset >= FULL_DENSITY_OFFSET) return true;
    const peers = byTier.get(tierOf(city)) ?? [city];
    return offset >= revealOffset(city, peers);
  });
}
