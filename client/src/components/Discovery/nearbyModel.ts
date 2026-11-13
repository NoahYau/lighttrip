import type { DiscoveryCategory, DiscoverySuggestion } from '@trek/shared';

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
