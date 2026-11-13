import type { CarbonLeg, TripCarbonResponse } from '@trek/shared';

/** A measured day leg; override what a case cares about. */
export function carbonLeg(over: Partial<CarbonLeg> = {}): CarbonLeg {
  return {
    id: 'day-1-1-2',
    source: 'day',
    day_id: 1,
    day_number: 1,
    date: '2026-05-01',
    from_name: 'Hotel',
    to_name: 'Museum',
    distance_km: 27.3,
    transport_mode: 'train',
    mode: 'rail',
    grams: 21_000,
    ...over,
  };
}

/** The footprint of a one-leg trip, in the shape the route answers with. */
export function tripCarbon(over: Partial<TripCarbonResponse> = {}): TripCarbonResponse {
  const legs = over.legs ?? [carbonLeg()];
  return {
    total_grams: 21_000,
    total_km: 600,
    estimated_legs: 1,
    unestimated_legs: 0,
    by_mode: [{ mode: 'rail', legs: 1, km: 600, grams: 21_000 }],
    days: [{ day_id: 1, day_number: 1, date: '2026-05-01', title: 'Arrival', legs: 1, km: 600, grams: 21_000 }],
    legs,
    ...over,
  };
}
