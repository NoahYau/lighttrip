import { haversineMetres } from '../geo/haversine';
import type { DiscoveryCategory, DiscoverySuggestion } from './discovery.schema';

/**
 * The Discovery scan's pure half: classify a provider's category string, drop
 * the same place twice (same provider id, or two ids within a few metres),
 * order by distance, and compose the card's one-line reason.
 *
 * React-free and Nest-free on purpose: the server ranks the nearby answer, the
 * client's roaming mode re-ranks the local copy, and both must agree.
 */

/** Two ids for the same place sit this far apart at most; within it the second is dropped. */
export const COORD_DEDUP_TOLERANCE_M = 15;

/** The walking pace the card's "3 min" estimate assumes. */
export const WALK_METRES_PER_MINUTE = 80;

/** A provider record normalised to the fields the ranking and the card need. */
export interface NearbyCandidate {
  providerId: string;
  source: DiscoverySuggestion['source'];
  name: string;
  category: DiscoveryCategory;
  lat: number;
  lng: number;
  distanceM: number;
  description: string | null;
}

/** What a raw provider category string (OSM tags, Google types, the index's category) maps to. */
const CATEGORY_RULES: ReadonlyArray<{ category: DiscoveryCategory; match: RegExp }> = [
  { category: 'food', match: /restaurant|cafe|bar|pub|food|bakery|ice_cream|fast_food|cuisine|bistro|diner/i },
  { category: 'shopping', match: /shop_|mall|market|supermarket|department_store|store|boutique|retail/i },
  {
    category: 'nature',
    match: /natural|nature|beach|park|garden|forest|lake|water|mountain|viewpoint|peak|waterfall|reserve|coast|spring/i,
  },
  {
    category: 'culture',
    match:
      /museum|gallery|theatre|theater|historic|heritage|monument|memorial|castle|temple|church|mosque|synagogue|palace|library|art|archaeo|ruins|fort|tower|bridge/i,
  },
  { category: 'other', match: /./ },
];

export function categoryOf(raw: string | null | undefined): DiscoveryCategory {
  if (!raw) return 'other';
  const rule = CATEGORY_RULES.find((r) => r.match.test(raw));
  return rule ? rule.category : 'other';
}

/**
 * Drop the same place twice: once by the provider id, then by coordinates —
 * two providers often give the same place two ids within a few metres of each
 * other. Keeps the first occurrence (nearest, or the index before Google).
 */
export function dedupeCandidates<T extends { providerId: string; lat: number; lng: number }>(
  candidates: readonly T[],
): T[] {
  const byId = new Set<string>();
  const out: T[] = [];
  for (const candidate of candidates) {
    if (byId.has(candidate.providerId)) continue;
    const nearDuplicate = out.some(
      (kept) => haversineMetres(kept.lat, kept.lng, candidate.lat, candidate.lng) <= COORD_DEDUP_TOLERANCE_M,
    );
    if (nearDuplicate) continue;
    byId.add(candidate.providerId);
    out.push(candidate);
  }
  return out;
}

/** Nearest first; equal distances keep the given order (which is already provider order). */
export function rankCandidates<T extends { distanceM: number }>(candidates: readonly T[]): T[] {
  return [...candidates].sort((a, b) => a.distanceM - b.distanceM);
}

/** Walking minutes at {@link WALK_METRES_PER_MINUTE}, at least one. */
export function walkMinutes(distanceM: number): number {
  return Math.max(1, Math.round(distanceM / WALK_METRES_PER_MINUTE));
}

/** 1 at the origin, 0 at the scan radius, clamped — the client never recomputes it. */
export function proximityScore(distanceM: number, radius: number): number {
  if (radius <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - distanceM / radius));
}

/**
 * The card's "why now" line. PR1/PR2 rule-compose it from the description the
 * place index already carries; when there is nothing to say the answer is empty
 * and the card simply omits the line — "better nothing than noise".
 */
export function reasonFor(description: string | null | undefined): string {
  return (description ?? '').trim().slice(0, 240);
}

/** A ranked candidate as the wire suggestion, with the fields the server does not store. */
export function toSuggestion(candidate: NearbyCandidate, radius: number): DiscoverySuggestion {
  return {
    providerId: candidate.providerId,
    source: candidate.source,
    name: candidate.name,
    category: candidate.category,
    lat: candidate.lat,
    lng: candidate.lng,
    distanceM: candidate.distanceM,
    walkMinutes: walkMinutes(candidate.distanceM),
    reason: reasonFor(candidate.description),
    score: proximityScore(candidate.distanceM, radius),
    imageUrl: null,
    opensNow: null,
    state: 'new',
  };
}
