import type { DiscoveryCategory } from '@trek/shared';

/**
 * Discovery roaming metrics (PR2, "方案 A"): the event names and a per-day
 * localStorage counter. No table, no network — nothing leaves the device, and
 * the payload never carries the raw coordinate. The only location-ish field is
 * the 150 m grid `cell` the scan already snaps the position onto, which is the
 * privacy line the settings screen promises.
 *
 * The counter is one small `{ date, counts }` object under a single key, reset
 * when the day rolls over. `dailyCount` is the running total for one event
 * today, so the engine can hold a day's emissions to a cap without remembering
 * anything else.
 */

export const DISCOVERY_METRIC_EVENTS = [
  'discovery.scan',
  'discovery.trigger',
  'discovery.suppress',
  'discovery.emit',
  'discovery.accept',
  'discovery.dismiss',
] as const;

export type DiscoveryMetricEvent = (typeof DISCOVERY_METRIC_EVENTS)[number];

/**
 * What one event may carry. Deliberately narrow: `cell` is the grid id, never
 * `lat`/`lng`, and the rest is the place's id, category and the one-line reason.
 * `dailyCount` is filled in by {@link recordDiscoveryMetric}, not by the caller.
 */
export interface DiscoveryMetricPayload {
  /** The 150 m grid cell, never the raw coordinate. */
  cell?: string;
  providerId?: string;
  category?: DiscoveryCategory;
  reason?: string;
  /** How many of this event fired today, including the one just recorded. */
  dailyCount?: number;
}

const STORAGE_KEY = 'trek:discovery:metrics';

interface StoredCounts {
  date: string;
  counts: Partial<Record<DiscoveryMetricEvent, number>>;
}

/** The local date as `YYYY-MM-DD`, so "today" follows the device's own day. */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isStoredCounts(value: unknown): value is StoredCounts {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { date?: unknown; counts?: unknown };
  if (typeof v.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return false;
  if (typeof v.counts !== 'object' || v.counts === null) return false;
  return Object.entries(v.counts).every(
    ([key, n]) =>
      (DISCOVERY_METRIC_EVENTS as readonly string[]).includes(key) && typeof n === 'number' && Number.isInteger(n)
  );
}

/** The stored `{ date, counts }`, or null when storage is absent, empty or malformed. */
function readStoredCounts(): StoredCounts | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredCounts(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Today's running total for one event, 0 before the first one of the day. */
export function readDailyCount(event: DiscoveryMetricEvent, now: Date = new Date()): number {
  const today = todayKey(now);
  const stored = readStoredCounts();
  if (!stored || stored.date !== today) return 0;
  return stored.counts[event] ?? 0;
}

/**
 * Record one event, bumping its daily count. Returns the payload with
 * `dailyCount` set to the new total (this event included). A blocked or full
 * storage drops the count but never the event itself.
 */
export function recordDiscoveryMetric(
  event: DiscoveryMetricEvent,
  payload: DiscoveryMetricPayload,
  now: Date = new Date()
): DiscoveryMetricPayload {
  const today = todayKey(now);
  const stored = readStoredCounts();
  const counts: Partial<Record<DiscoveryMetricEvent, number>> =
    stored && stored.date === today ? { ...stored.counts } : {};
  const dailyCount = (counts[event] ?? 0) + 1;
  counts[event] = dailyCount;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, counts }));
  } catch {
    /* storage blocked: the count is lost, the roam still happens */
  }
  return { ...payload, dailyCount };
}
