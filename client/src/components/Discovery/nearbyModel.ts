import type { DiscoveryCategory, DiscoverySuggestion } from '@trek/shared';
import { pointFromBox, radiusKm, viewportBox } from '../../hooks/useLocationBias';
import type { PlanMapViewport } from '../../store/tripStore';

/**
 * The nearby panel's pure half: category catalog, distance/walk-time labels,
 * the category filter and the status→message mapping. Its own module rather
 * than a corner of the hook so the mapping and the labels are a test with no
 * DOM in it, and so the desktop and phone views share one decision instead of
 * copying it (`lint:dup`).
 */

export type NearbyStatus = 'idle' | 'loading' | 'ready' | 'offline' | 'denied' | 'unavailable' | 'error';

/** What the panel shows for a status: an empty state, or the list. */
export type NearbyStatusView = { kind: 'empty'; text: string; action: string | null } | { kind: 'list' };

/** The status → message mapping the two views share, so neither copies it. */
export function nearbyStatusView(
  status: NearbyStatus,
  hasSuggestions: boolean,
  t: (key: string) => string
): NearbyStatusView {
  switch (status) {
    case 'idle':
      return { kind: 'empty', text: t('discovery.idle'), action: t('discovery.scan') };
    case 'loading':
      return { kind: 'empty', text: t('discovery.loading'), action: null };
    case 'offline':
      return { kind: 'empty', text: t('discovery.offline'), action: t('discovery.retry') };
    case 'denied':
      return { kind: 'empty', text: t('discovery.denied'), action: null };
    case 'unavailable':
      return { kind: 'empty', text: t('discovery.unavailable'), action: t('discovery.retry') };
    case 'error':
      return { kind: 'empty', text: t('discovery.error'), action: t('discovery.retry') };
    case 'ready':
      return hasSuggestions
        ? { kind: 'list' }
        : { kind: 'empty', text: t('discovery.empty'), action: t('discovery.scanAgain') };
  }
}

/** The category chip order. */
export const CATEGORY_ORDER: readonly DiscoveryCategory[] = ['nature', 'culture', 'food', 'shopping', 'other'];

/** Every category's label key. `labelKey` is what the i18n key gate reads. */
export const CATEGORY_LABELS: Record<DiscoveryCategory, { labelKey: string }> = {
  nature: { labelKey: 'discovery.category.nature' },
  culture: { labelKey: 'discovery.category.culture' },
  food: { labelKey: 'discovery.category.food' },
  shopping: { labelKey: 'discovery.category.shopping' },
  other: { labelKey: 'discovery.category.other' },
};

/** Metres per degree of latitude, used to snap a position onto a ~150 m grid cell. */
const CELL_DEG = 150 / 111320;

/**
 * The 150 m grid id a position belongs to. The scan sends only this, never the
 * raw coordinate — the privacy promise the settings screen makes.
 */
export function toCell(lat: number, lng: number): string {
  return `${Math.floor(lat / CELL_DEG)}:${Math.floor(lng / CELL_DEG)}`;
}

/** A distance as the reader's number format: metres under a kilometre, else km. */
export function distanceLabel(distanceM: number, locale: string): string {
  if (distanceM >= 1000) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(distanceM / 1000)} km`;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(distanceM)} m`;
}

/** Walking minutes as the reader's number format, with the shared unit. */
export function walkTimeLabel(minutes: number, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(minutes)} min`;
}

/** The suggestions a chip shows: all, or those of one category. */
export function filterByCategory(
  suggestions: readonly DiscoverySuggestion[],
  chip: DiscoveryCategory | 'all'
): DiscoverySuggestion[] {
  if (chip === 'all') return [...suggestions];
  return suggestions.filter((s) => s.category === chip);
}

/** How many suggestions each category holds, for the chip counts. */
export function categoryCounts(suggestions: readonly DiscoverySuggestion[]): Record<DiscoveryCategory, number> {
  const counts: Record<DiscoveryCategory, number> = { nature: 0, culture: 0, food: 0, shopping: 0, other: 0 };
  for (const s of suggestions) counts[s.category] += 1;
  return counts;
}

// ── The scan origin: the device fix, or the plan map's region ────────────────

/** Which point a scan answers for: the device's fix, or the plan map's region. */
export type NearbyOriginMode = 'device' | 'map';

/** The radius ladder the map-region scan quantises onto, in metres. */
const SCAN_RADIUS_LADDER_M = [250, 500, 1000, 2000, 5000] as const;

/** The radius a scan asks for when there is no viewport to measure: the device default. */
export const DEFAULT_SCAN_RADIUS_M = 250;

/** The narrowest and widest radius `/discovery/scan` accepts, matching `/api/maps/nearby`. */
const MIN_SCAN_RADIUS_M = 50;
const MAX_SCAN_RADIUS_M = 5000;

/**
 * The radius a map-region scan asks for: `radiusM` rounded up onto
 * {@link SCAN_RADIUS_LADDER_M} and clamped to the contract's 50..5000.
 *
 * The ladder is not cosmetic. The server's `nearbyCacheKey` includes the
 * radius, so a per-pixel radius would miss the maps cache on every pan and bill
 * Google for each frame; five steps keep two panes over the same block on one
 * cache key. Rounding up (never down) keeps the whole visible area covered; a
 * non-finite radius falls back to the device default rather than sending junk.
 */
export function quantiseScanRadiusM(radiusM: number): number {
  if (Number.isNaN(radiusM)) return DEFAULT_SCAN_RADIUS_M;
  const clamped = Math.min(MAX_SCAN_RADIUS_M, Math.max(MIN_SCAN_RADIUS_M, radiusM));
  return SCAN_RADIUS_LADDER_M.find((step) => step >= clamped) ?? MAX_SCAN_RADIUS_M;
}

/** A map-region scan's question: the centre of the visible area and how far around it. */
export interface NearbyScanRegion {
  lat: number;
  lng: number;
  radiusM: number;
}

/**
 * The map-region scan's question, derived from the plan map's viewport, or null
 * when there is no viewport to ask about: none has been reported yet, it belongs
 * to another trip, or its bounds are not a box (the antimeridian, a world map
 * scrolled past ±180, an inverted or non-finite box). A caller treats null as
 * "no region" and falls back to the map centre and then to the device fix.
 */
export function originFromViewport(
  viewport: PlanMapViewport | null | undefined,
  tripId: number
): NearbyScanRegion | null {
  if (!viewport || viewport.tripId !== tripId) return null;
  const box = viewportBox(viewport);
  if (!box) return null;
  const centre = pointFromBox(box);
  if (!centre) return null;
  return { lat: centre.lat, lng: centre.lng, radiusM: quantiseScanRadiusM(radiusKm(box) * 1000) };
}

/** The widest scan that may still say "walk {time}": 400 m, a short walk's edge. */
const WALK_TIME_MAX_RADIUS_M = 400;

/**
 * Whether a scan of this radius may show walking minutes. Above 400 m the walk
 * wording would be false (2–5 km is not a short walk), so the row keeps the
 * distance and drops the chip. Pure and shared so the desktop panel and the
 * phone sheet cannot answer it differently.
 */
export function showsWalkTime(radiusM: number): boolean {
  return Number.isFinite(radiusM) && radiusM <= WALK_TIME_MAX_RADIUS_M;
}
