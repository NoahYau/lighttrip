import type { SuppressReason } from './proximityModel';
import type { ProximityStatus } from './useProximityEngine';

/**
 * Discovery roaming — the status and suppression labels (PR2). Pure, React-free
 * maps from the engine's machine states to the `discovery.*` keys the UI shows,
 * so the roam pill, a status line and the card all read the same strings and
 * `lint:i18n-keys` sees every key named. Mirrors `nearbyModel`'s `CATEGORY_LABELS`.
 */

/** Why roaming paused, as the line that explains it (matches `discovery.suppress.*`). */
export const SUPPRESS_REASON_LABELS: Record<SuppressReason, { labelKey: string }> = {
  accuracy: { labelKey: 'discovery.suppress.accuracy' },
  speed: { labelKey: 'discovery.suppress.speed' },
  'quiet-hours': { labelKey: 'discovery.suppress.quietHours' },
  'daily-cap': { labelKey: 'discovery.suppress.dailyCap' },
  'poi-cooldown': { labelKey: 'discovery.suppress.poiCooldown' },
  'category-cooldown': { labelKey: 'discovery.suppress.categoryCooldown' },
  'already-in-trip': { labelKey: 'discovery.suppress.alreadyInTrip' },
  dismissed: { labelKey: 'discovery.suppress.dismissed' },
};

/** The roam state lines: the toggle's on/off and the two "while roaming" statuses. */
export const ROAM_STATUS_LABELS: Record<'on' | 'off' | 'tracking' | 'suppressed', { labelKey: string }> = {
  on: { labelKey: 'discovery.roam.on' },
  off: { labelKey: 'discovery.roam.off' },
  tracking: { labelKey: 'discovery.roam.tracking' },
  suppressed: { labelKey: 'discovery.roam.suppressed' },
};

/** The feature's title, subtitle and privacy note (a settings/info surface reads these). */
export const ROAM_FEATURE_LABELS = {
  title: { labelKey: 'discovery.roam.title' },
  subtitle: { labelKey: 'discovery.roam.subtitle' },
  privacy: { labelKey: 'discovery.roam.privacy' },
} as const;

/** Collapses the six engine states onto the four lines the UI names. */
export function roamStatusKey(status: ProximityStatus, roamEnabled: boolean): keyof typeof ROAM_STATUS_LABELS {
  if (!roamEnabled) return 'off';
  if (status === 'tracking') return 'tracking';
  if (status === 'suppressed') return 'suppressed';
  return 'on';
}
