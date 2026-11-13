import { haversineKm } from '../common/geo';
import type { CarbonDayTotal, CarbonLeg, CarbonModeTotal, TripCarbonResponse } from '@trek/shared';
import { CARBON_MODES, carbonGrams, carbonModeForTransportMode, isTransportReservationType } from '@trek/shared';

/**
 * The pure half of the carbon domain: turn an itinerary into measurable legs,
 * and those legs into the totals the panel shows.
 *
 * Everything here is a function of its arguments — the service loads the trip and
 * hands it in. That keeps the arithmetic testable without a database, and it lets
 * a test pin the awkward cases (a stop with no coordinates, a booking without
 * stations, two bookings on one day) without seeding one.
 *
 * Nothing is written and nothing is cached: the footprint of a trip is derived on
 * every read, so an edit to the itinerary is reflected by the next request.
 */

/** The day shape this domain reads: the subset of `DaysService.list()` it needs. */
export interface CarbonDayInput {
  id: number;
  day_number?: number | null;
  date?: string | null;
  title?: string | null;
  default_transport_mode?: string | null;
  assignments?: CarbonAssignmentInput[] | null;
}

/** One stop on a day, with the leg modes the planner stores on it (#1281). */
export interface CarbonAssignmentInput {
  id: number;
  /** Nullable in the column; a row without one sorts first, as the planner draws it. */
  order_index: number | null;
  leg_transport_mode?: string | null;
  incoming_leg_transport_mode?: string | null;
  /** Kept on the day and the map, but not part of the day's route (#2532). */
  route_excluded?: boolean | null;
  place?: { name?: string | null; lat?: number | null; lng?: number | null } | null;
}

/** The booking shape this domain reads: the subset of `ReservationsService.list()` it needs. */
export interface CarbonReservationInput {
  id: number;
  type?: string | null;
  title?: string | null;
  day_id?: number | null;
  endpoints?: CarbonEndpointInput[] | null;
}

interface CarbonEndpointInput {
  role: string;
  sequence?: number | null;
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
}

/**
 * The mode the day plan would draw for the leg from `origin` to `dest`
 * (`client/src/components/Planner/legMode.ts` keeps the same rule for the line):
 * the origin place's outgoing override first, then the destination's incoming one,
 * then the day default. A day with no default is a drive, which is the profile the
 * planner's map uses before anything is chosen.
 */
const DEFAULT_TRANSPORT_MODE = 'driving';

export function legTransportMode(
  origin: CarbonAssignmentInput,
  dest: CarbonAssignmentInput,
  dayDefault: string | null | undefined,
): string {
  return origin.leg_transport_mode ?? dest.incoming_leg_transport_mode ?? dayDefault ?? DEFAULT_TRANSPORT_MODE;
}

/** A coordinate pair, or null when the row carries no usable position. */
function positionOf(point: { lat?: number | null; lng?: number | null } | null | undefined): {
  lat: number;
  lng: number;
} | null {
  const lat = point?.lat;
  const lng = point?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** Kilometres to two decimals: what a leg shows and what a total sums. */
function roundKm(km: number): number {
  return Math.round(km * 100) / 100;
}

/**
 * The day's measurable legs: one between each pair of consecutive stops that both
 * have a position.
 *
 * A stop without coordinates is skipped rather than splitting the chain in two —
 * a place in the pool the traveller never geocoded must not erase the leg on the
 * other side of it. `route_excluded` stops (#2532) are left out, exactly as the map
 * leaves them off the day's line. The stop a lodging booking put on the day is
 * KEPT: the drive or walk from the hotel to the first sight is real travel, and
 * the day plan only hides that row because it draws the hotel as a bookend.
 */
function dayLegs(day: CarbonDayInput): CarbonLeg[] {
  const assignments = (day.assignments ?? [])
    .filter((assignment) => !assignment.route_excluded)
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  const legs: CarbonLeg[] = [];
  let previous: { assignment: CarbonAssignmentInput; at: { lat: number; lng: number } } | null = null;
  for (const assignment of assignments) {
    const at = positionOf(assignment.place);
    if (!at) continue;
    if (previous) {
      const distanceKm = haversineKm(previous.at.lat, previous.at.lng, at.lat, at.lng);
      const transportMode = legTransportMode(previous.assignment, assignment, day.default_transport_mode);
      const mode = carbonModeForTransportMode(transportMode);
      legs.push({
        id: `day-${day.id}-${previous.assignment.id}-${assignment.id}`,
        source: 'day',
        day_id: day.id,
        day_number: day.day_number ?? null,
        date: day.date ?? null,
        from_name: previous.assignment.place?.name ?? '',
        to_name: assignment.place?.name ?? '',
        distance_km: roundKm(distanceKm),
        transport_mode: transportMode,
        mode,
        grams: carbonGrams(mode, distanceKm),
      });
    }
    previous = { assignment, at };
  }
  return legs;
}

/**
 * A booked transport's legs, summed across its located endpoints: a flight with a
 * stopover flies both hops, so one row carries the whole booking.
 *
 * A booking with fewer than two located endpoints cannot be measured — it still
 * appears, as an unestimated leg, so the panel can say how much of the trip is
 * missing instead of quietly under-reporting it.
 */
function reservationLeg(booking: CarbonReservationInput, day: CarbonDayInput | undefined): CarbonLeg | null {
  // A stay, a restaurant, a note: only a booking whose type is a transport mode is
  // a leg. `transport_other` is one, but has no factor, so it lands unestimated.
  const type = booking.type;
  if (!type || !isTransportReservationType(type)) return null;
  const mode = carbonModeForTransportMode(type);

  const endpoints = (booking.endpoints ?? [])
    .slice()
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map((endpoint) => ({ endpoint, at: positionOf(endpoint) }));
  const located = endpoints.filter(
    (entry): entry is { endpoint: CarbonEndpointInput; at: { lat: number; lng: number } } => entry.at !== null,
  );

  let distanceKm = 0;
  for (let index = 1; index < located.length; index++) {
    const before = located[index - 1];
    const here = located[index];
    if (!before || !here) continue;
    distanceKm += haversineKm(before.at.lat, before.at.lng, here.at.lat, here.at.lng);
  }
  const measurable = located.length >= 2;

  const first = located[0]?.endpoint.name ?? booking.title ?? '';
  const last = located.at(-1)?.endpoint.name ?? booking.title ?? '';
  return {
    id: `reservation-${booking.id}`,
    source: 'reservation',
    day_id: day?.id ?? booking.day_id ?? null,
    day_number: day?.day_number ?? null,
    date: day?.date ?? null,
    from_name: first,
    to_name: last,
    distance_km: roundKm(distanceKm),
    transport_mode: type,
    mode,
    grams: measurable ? carbonGrams(mode, distanceKm) : null,
  };
}

export interface CarbonLegsInput {
  days: CarbonDayInput[];
  reservations: CarbonReservationInput[];
}

/**
 * Every measurable leg of the trip, in day order, with its emissions.
 *
 * The day legs come out of the days in planner order and the bookings are added
 * after them, so the list is sorted back into itinerary order at the end: the panel
 * shows one list, and a flight on day 2 belongs between day 1's drive and day 3's
 * walk, not at the bottom because it happens to be a booking. A booking without a
 * day position sorts last; the sort is stable, so within one day the planned legs
 * stay ahead of the bookings.
 */
export function buildCarbonLegs({ days, reservations }: CarbonLegsInput): CarbonLeg[] {
  const byDayId = new Map(days.map((day) => [day.id, day]));
  const legs = days.flatMap(dayLegs);
  for (const booking of reservations) {
    // A stay, a restaurant, a note: only a booking whose type is a transport mode
    // is a leg. The mapper returns null for everything else.
    const leg = reservationLeg(booking, booking.day_id == null ? undefined : byDayId.get(booking.day_id));
    if (leg) legs.push(leg);
  }
  const dayOrder = (leg: CarbonLeg): number => leg.day_number ?? Number.MAX_SAFE_INTEGER;
  return legs.sort((a, b) => dayOrder(a) - dayOrder(b));
}

/**
 * The totals the endpoint answers with: the whole trip, one row per mode, one row
 * per day.
 *
 * Modes are ordered by what they emit, most first — the breakdown reads as a
 * ranking of where the footprint comes from. Days keep the planner's own order and
 * carry only the days that hold a leg. An unestimated leg contributes to the count
 * and to nothing else: it is neither a zero (which would claim it was measured) nor
 * a guess.
 */
export function summarizeCarbon(legs: CarbonLeg[], days: CarbonDayInput[]): TripCarbonResponse {
  const totalGrams = legs.reduce((sum, leg) => sum + (leg.grams ?? 0), 0);
  const totalKm = legs.reduce((sum, leg) => sum + leg.distance_km, 0);
  const dayTitles = new Map(days.map((day) => [day.id, day.title ?? null]));

  const modes = new Map<string, CarbonModeTotal>();
  for (const leg of legs) {
    if (!leg.mode || leg.grams == null) continue;
    const row = modes.get(leg.mode) ?? { mode: leg.mode, legs: 0, km: 0, grams: 0 };
    row.legs += 1;
    row.km += leg.distance_km;
    row.grams += leg.grams;
    modes.set(leg.mode, row);
  }
  const order = (mode: string): number => CARBON_MODES.indexOf(mode as (typeof CARBON_MODES)[number]);
  const byMode = [...modes.values()]
    .map((row) => ({ ...row, km: roundKm(row.km) }))
    .sort((a, b) => b.grams - a.grams || order(a.mode) - order(b.mode));

  const dayRows = new Map<number, CarbonDayTotal>();
  for (const leg of legs) {
    if (leg.day_id == null) continue;
    const row = dayRows.get(leg.day_id) ?? {
      day_id: leg.day_id,
      day_number: leg.day_number,
      date: leg.date,
      title: dayTitles.get(leg.day_id) ?? null,
      legs: 0,
      km: 0,
      grams: 0,
    };
    row.legs += 1;
    row.km += leg.distance_km;
    row.grams += leg.grams ?? 0;
    dayRows.set(leg.day_id, row);
  }

  return {
    total_grams: totalGrams,
    total_km: roundKm(totalKm),
    estimated_legs: legs.filter((leg) => leg.grams != null).length,
    unestimated_legs: legs.filter((leg) => leg.grams == null).length,
    by_mode: byMode,
    days: [...dayRows.values()].map((row) => ({ ...row, km: roundKm(row.km) })),
    legs,
  };
}
