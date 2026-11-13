import { CARBON_MODES } from './carbon';

import { z } from 'zod';

/**
 * Carbon-footprint API contract — single source of truth for
 * /api/trips/:tripId/carbon and /api/carbon/compare.
 *
 * Two read-only surfaces:
 *
 * - the trip footprint, which the server derives from the itinerary on every read
 *   (places with coordinates, their per-leg and per-day transport modes, and
 *   booked transport with located endpoints) — nothing is stored, so no write
 *   route, no migration and no broadcast;
 * - the mode comparison for one distance, which the client also runs locally from
 *   the same `@trek/shared` arithmetic when it wants to rank the alternatives for
 *   a leg without a round trip.
 *
 * Figures are whole grams of CO₂e: the sums are integers, and a leg of a fraction
 * of a gram must not round to nothing. The client converts to kilograms for
 * display. A mode TREK cannot estimate (a plugin profile, `transport_other`) is
 * null on the leg and left out of the totals rather than counted as zero.
 */

export const carbonModeSchema = z.enum(CARBON_MODES).describe('One of CARBON_MODES');

/** The longest distance a comparison accepts: half the equator, rounded up. */
export const CARBON_MAX_DISTANCE_KM = 20_000;

const gramsSchema = z.number().int().nonnegative();

/** One leg of the trip: between two places of a day, or a booked transport. */
export const carbonLegSchema = z.object({
  /** Stable across reads: `day-<dayId>-<assignmentId>-<assignmentId>` or `reservation-<id>`. */
  id: z.string(),
  source: z.enum(['day', 'reservation']),
  /** The day the leg belongs to; null for a booking with no day position. */
  day_id: z.number().nullable(),
  day_number: z.number().nullable(),
  date: z.string().nullable(),
  from_name: z.string(),
  to_name: z.string(),
  distance_km: z.number().nonnegative(),
  /** The mode as the trip stores it (free text), for wording the raw value. */
  transport_mode: z.string().nullable(),
  /** The estimate's mode, after mapping the stored one; null when it is not one we can estimate. */
  mode: carbonModeSchema.nullable(),
  grams: z.number().int().nonnegative().nullable(),
});
export type CarbonLeg = z.infer<typeof carbonLegSchema>;

/** One row of the per-mode breakdown, in catalog order. */
export const carbonModeTotalSchema = z.object({
  mode: carbonModeSchema,
  legs: z.number().int().nonnegative(),
  km: z.number().nonnegative(),
  grams: gramsSchema,
});
export type CarbonModeTotal = z.infer<typeof carbonModeTotalSchema>;

/** One day's share of the trip, in day order. */
export const carbonDayTotalSchema = z.object({
  day_id: z.number(),
  day_number: z.number().nullable(),
  date: z.string().nullable(),
  title: z.string().nullable(),
  legs: z.number().int().nonnegative(),
  km: z.number().nonnegative(),
  grams: gramsSchema,
});
export type CarbonDayTotal = z.infer<typeof carbonDayTotalSchema>;

export const tripCarbonResponseSchema = z.object({
  total_grams: gramsSchema,
  total_km: z.number().nonnegative(),
  /** Legs that carry a figure; the two together are every leg found. */
  estimated_legs: z.number().int().nonnegative(),
  unestimated_legs: z.number().int().nonnegative(),
  /** Only the modes that occur, cheapest first. */
  by_mode: z.array(carbonModeTotalSchema),
  days: z.array(carbonDayTotalSchema),
  legs: z.array(carbonLegSchema),
});
export type TripCarbonResponse = z.infer<typeof tripCarbonResponseSchema>;

/**
 * Query of the comparison route. `distance_km` arrives as a string from Express,
 * so it coerces; `baseline` is the mode the traveller is weighing the others
 * against, and omitting it drops the savings columns rather than assuming one.
 */
export const carbonCompareQuerySchema = z.object({
  distance_km: z.coerce.number().finite().min(0).max(CARBON_MAX_DISTANCE_KM),
  baseline: carbonModeSchema.optional(),
});
export type CarbonCompareQuery = z.infer<typeof carbonCompareQuerySchema>;

export const carbonOptionSchema = z.object({
  mode: carbonModeSchema,
  grams: gramsSchema,
  grams_per_km: z.number().nonnegative(),
  /** Positive when this option emits less than the baseline; null without one. */
  saving_grams: z.number().nullable(),
  /** The same saving as a share of the baseline, 0 to 1 (negative when it emits more). */
  saving_share: z.number().nullable(),
});
export type CarbonOptionRow = z.infer<typeof carbonOptionSchema>;

export const carbonCompareResponseSchema = z.object({
  distance_km: z.number().nonnegative(),
  baseline: carbonModeSchema.nullable(),
  /** Cheapest first. */
  options: z.array(carbonOptionSchema),
});
export type CarbonCompareResponse = z.infer<typeof carbonCompareResponseSchema>;

/** Grams to the kilograms the UI shows, one decimal at most (12 345 g → 12.3). */
export function carbonKilograms(grams: number): number {
  return Math.round(grams / 100) / 10;
}
