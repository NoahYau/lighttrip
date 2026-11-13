import {
  carbonKilograms,
  compareCarbonModes,
  type CarbonLeg,
  type CarbonMode,
  type CarbonOption,
} from '@trek/shared'

/**
 * The carbon panel's pure half: labels, numbers and the two decisions the view
 * makes (which leg to open on, which option is the lowest).
 *
 * Its own module rather than a corner of the hook so the awkward cases — a leg
 * with no figure, a trip whose total is zero, a mode the estimate does not know —
 * are a test with no DOM in it.
 */

/**
 * Every mode's label key. The `labelKey` property name is what the i18n key gate
 * reads: a table of plain strings would leave these keys looking unreferenced.
 */
export const MODE_LABELS: Record<CarbonMode, { labelKey: string }> = {
  walk: { labelKey: 'carbon.mode.walk' },
  cycle: { labelKey: 'carbon.mode.cycle' },
  rail: { labelKey: 'carbon.mode.rail' },
  bus: { labelKey: 'carbon.mode.bus' },
  coach: { labelKey: 'carbon.mode.coach' },
  car: { labelKey: 'carbon.mode.car' },
  car_electric: { labelKey: 'carbon.mode.car_electric' },
  taxi: { labelKey: 'carbon.mode.taxi' },
  motorbike: { labelKey: 'carbon.mode.motorbike' },
  ferry: { labelKey: 'carbon.mode.ferry' },
  cruise: { labelKey: 'carbon.mode.cruise' },
  flight: { labelKey: 'carbon.mode.flight' },
}

/** Kilograms with at most one decimal, in the reader's number format. */
export function kilograms(grams: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(carbonKilograms(grams))
}

/** Kilometres with at most one decimal, in the reader's number format. */
export function kilometres(km: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(km)
}

/** A leg as one line: "Hotel → Museum". */
export function routeLabel(leg: CarbonLeg): string {
  return `${leg.from_name} → ${leg.to_name}`
}

/**
 * Whether this leg has alternatives worth showing. A leg without a distance or
 * without a mode the estimate knows has nothing to compare, and a zero-length leg
 * would rank every mode at zero.
 */
export function isComparable(leg: CarbonLeg | null): leg is CarbonLeg {
  return leg != null && leg.distance_km > 0 && leg.mode != null
}

/** The mode comparison for one leg, the leg's own mode as the baseline. */
export function comparisonFor(leg: CarbonLeg | null): CarbonOption[] {
  if (!isComparable(leg)) return []
  return compareCarbonModes({ distanceKm: leg.distance_km, baseline: leg.mode })
}

/**
 * The lowest option worth naming in a comparison.
 *
 * Walking and cycling always sit at the top of the list with nothing to emit, and
 * "Lowest" on a 600 km walk helps nobody: the badge names the lowest option that
 * actually burns something, which is the choice a traveller can take. Options come
 * in cheapest first, so the first one with a figure is it.
 */
export function bestOf(options: readonly CarbonOption[]): CarbonOption | null {
  return options.find((option) => option.grams > 0) ?? null
}

/** The part of a total a figure is, 0 to 1, for a bar's width. */
export function shareOf(grams: number, total: number): number {
  if (!(total > 0)) return 0
  return Math.min(1, Math.max(0, grams / total))
}

/**
 * The leg the panel opens its comparison on: the one the traveller could most
 * reduce. It needs a measured figure and a comparable route, so a trip's biggest
 * number is never a booking with no stations, which has no alternatives at all.
 */
export function mostEmittingLeg(legs: readonly CarbonLeg[]): CarbonLeg | null {
  let worst: CarbonLeg | null = null
  for (const leg of legs) {
    if (leg.grams == null || !isComparable(leg)) continue
    if (!worst || (worst.grams ?? 0) < leg.grams) worst = leg
  }
  return worst
}

/** An option's saving as a whole percentage of the baseline, or null when it has none. */
export function savingPercent(option: CarbonOption): number | null {
  if (option.saving_share == null) return null
  return Math.round(option.saving_share * 100)
}
