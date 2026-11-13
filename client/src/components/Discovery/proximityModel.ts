import type { DiscoverySuggestion } from '@trek/shared';
import type { ProximityState } from '../../store/slices/discoverySlice';
import { toCell } from './nearbyModel';

/**
 * Discovery roaming — the pure, React-free half (PR2 §A). The constants, the
 * fix/state types, and the three decisions the engine asks on every tick:
 * should we scan now, may we show this candidate, and how do we rank a batch.
 * `ProximityState` is owned by `discoverySlice.ts` (a store may not import a
 * view) and re-exported here so callers keep reading it from the model.
 */

export { localDateKey, resetDailyIfNeeded } from '../../store/slices/discoverySlice';
export type { ProximityState } from '../../store/slices/discoverySlice';
export { toCell };

/** How far (metres) the server's scan reaches around the fix. */
export const SCAN_DISTANCE_M = 100;
/** A scan runs at least this often while roaming, even without movement. */
export const SCAN_INTERVAL_S = 90;
/** The 150 m grid side `toCell` snaps a position onto (privacy promise). */
export const CELL_SIZE_M = 150;
/** A fix this inaccurate never reaches the server. */
export const MAX_ACCURACY_M = 80;
/** A candidate farther than this is cut before suppression is even considered. */
export const DEFAULT_RADIUS_M = 250;
/** Above this speed the engine considers the user "moving, not strolling". */
export const SPEED_LIMIT_MPS = 5;
/** How long over the speed limit before the engine treats it as driving. */
export const SPEED_SUSTAINED_S = 30;
/** Quiet hours: nothing pops up between these local hours (22:00 → 07:00). */
export const QUIET_HOURS_START = 22;
export const QUIET_HOURS_END = 7;
/** The most cards a single local day may show. */
export const DAILY_CAP = 8;
/** A shown POI is suppressed for this long. */
export const POI_COOLDOWN_H = 24;
/** A shown category is suppressed for this long (accept or dismiss). */
export const CATEGORY_COOLDOWN_MIN = 30;
/** The card collapses on its own after this long when the user does nothing. */
export const CARD_TTL_S = 8;
/** Not rendered in PR2 — reserved for the PR3 carbon comparison. */
export const MIN_CARBON_DISTANCE_M = 100;

/** Why the engine refused to show a candidate (matches `discovery.suppress.*`). */
export type SuppressReason =
  | 'accuracy'
  | 'speed'
  | 'quiet-hours'
  | 'daily-cap'
  | 'poi-cooldown'
  | 'category-cooldown'
  | 'already-in-trip'
  | 'dismissed';

/** One geolocation fix, exactly what `useGeolocation` hands the engine. */
export interface ProximityFix {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

const MS = 1000;
const MINUTE_MS = 60 * MS;
const HOUR_MS = 60 * MINUTE_MS;

function isQuietHours(now: number): boolean {
  const hour = new Date(now).getHours();
  return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
}

/** Speed has been over the limit for the sustained window (state carries the stamp). */
function isSpeedSuppressed(state: ProximityState, now: number): boolean {
  return state.speedAboveLimitSince !== null && now - state.speedAboveLimitSince >= SPEED_SUSTAINED_S * MS;
}

/**
 * The fix/environment-level suppression, or null. `shouldShow` cannot decide
 * `accuracy` because it only sees the candidate, so accuracy is checked here
 * (and by `shouldScan`), on the fix, while the candidate-level reasons live in
 * `shouldShow`.
 */
export function scanSuppression(state: ProximityState, fix: ProximityFix, now: number): SuppressReason | null {
  if (fix.accuracy > MAX_ACCURACY_M) return 'accuracy';
  if (isSpeedSuppressed(state, now)) return 'speed';
  if (isQuietHours(now)) return 'quiet-hours';
  if (state.dailyShown >= DAILY_CAP) return 'daily-cap';
  return null;
}

/**
 * Whether the engine should fire a scan now: roaming on, the fix good enough,
 * no active suppression, and either the scan interval has elapsed or the user
 * has moved into a new 150 m cell (the privacy-safe proxy for "walked on").
 */
export function shouldScan(state: ProximityState, fix: ProximityFix, now: number): boolean {
  if (!state.roamEnabled) return false;
  if (scanSuppression(state, fix, now) !== null) return false;
  const cell = toCell(fix.lat, fix.lng);
  const movedCell = state.lastCell !== '' && cell !== state.lastCell;
  const intervalElapsed = now - state.lastScanAt >= SCAN_INTERVAL_S * MS;
  return movedCell || intervalElapsed;
}

/**
 * May this candidate be shown? Returns the first suppression reason in the
 * contract's order, or `{ ok: true }`. `accuracy` and `distance` are decided
 * upstream — accuracy on the fix (`scanSuppression`), distance by
 * `rankLocally` — because neither is visible on a candidate alone.
 */
export function shouldShow(
  state: ProximityState,
  candidate: DiscoverySuggestion,
  now: number
): { ok: true } | { ok: false; reason: SuppressReason } {
  if (state.inTrip.includes(candidate.providerId)) return { ok: false, reason: 'already-in-trip' };
  if (state.dismissed[candidate.providerId] !== undefined) return { ok: false, reason: 'dismissed' };
  if (isSpeedSuppressed(state, now)) return { ok: false, reason: 'speed' };
  if (isQuietHours(now)) return { ok: false, reason: 'quiet-hours' };
  const poiAt = state.cooldown.poi[candidate.providerId];
  if (poiAt !== undefined && now - poiAt < POI_COOLDOWN_H * HOUR_MS) return { ok: false, reason: 'poi-cooldown' };
  const categoryAt = state.cooldown.category[candidate.category];
  if (categoryAt > 0 && now - categoryAt < CATEGORY_COOLDOWN_MIN * MINUTE_MS) {
    return { ok: false, reason: 'category-cooldown' };
  }
  if (state.dailyShown >= DAILY_CAP) return { ok: false, reason: 'daily-cap' };
  return { ok: true };
}

/**
 * Cut the out-of-radius candidates, then rank the rest best-first: score
 * descending, distance ascending as the tiebreak.
 */
export function rankLocally(candidates: readonly DiscoverySuggestion[]): DiscoverySuggestion[] {
  return candidates
    .filter((c) => c.distanceM <= DEFAULT_RADIUS_M)
    .sort((a, b) => b.score - a.score || a.distanceM - b.distanceM);
}
