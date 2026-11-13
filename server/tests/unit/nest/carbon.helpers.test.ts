import {
  buildCarbonLegs,
  legTransportMode,
  summarizeCarbon,
  type CarbonAssignmentInput,
  type CarbonDayInput,
  type CarbonReservationInput,
} from '../../../src/nest/carbon/carbon.helpers';
import { haversineKm } from '../../../src/nest/common/geo';
import type { CarbonLeg } from '@trek/shared';

import { describe, expect, it } from 'vitest';

/** Berlin and Potsdam: about 27 km apart, a sensible short leg. */
const BERLIN = { lat: 52.52, lng: 13.405 };
const POTSDAM = { lat: 52.3906, lng: 13.0645 };
const MUNICH = { lat: 48.1372, lng: 11.5756 };
const ROME = { lat: 41.9028, lng: 12.4964 };

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number =>
  Math.round(haversineKm(a.lat, a.lng, b.lat, b.lng) * 100) / 100;

function stop(
  id: number,
  name: string,
  at: { lat: number; lng: number } | null,
  over: Partial<CarbonAssignmentInput> = {},
): CarbonAssignmentInput {
  return {
    id,
    order_index: id,
    place: at ? { name, lat: at.lat, lng: at.lng } : { name, lat: null, lng: null },
    ...over,
  };
}

function day(over: Partial<CarbonDayInput> = {}): CarbonDayInput {
  return {
    id: 1,
    day_number: 1,
    date: '2026-05-01',
    title: 'Day one',
    default_transport_mode: null,
    assignments: [],
    ...over,
  };
}

/** The leg a one-leg fixture must have produced, or a failure that names the fixture. */
function first(legs: CarbonLeg[]): CarbonLeg {
  const leg = legs[0];
  if (!leg) throw new Error(`expected a leg, got ${legs.length}`);
  return leg;
}

function booking(over: Partial<CarbonReservationInput> = {}): CarbonReservationInput {
  return {
    id: 7,
    type: 'flight',
    title: 'LH 1840',
    day_id: 1,
    endpoints: [
      { role: 'from', sequence: 0, name: 'BER', lat: BERLIN.lat, lng: BERLIN.lng },
      { role: 'to', sequence: 1, name: 'FCO', lat: ROME.lat, lng: ROME.lng },
    ],
    ...over,
  };
}

describe('legTransportMode', () => {
  it('takes the origin place’s own override first', () => {
    const from = stop(1, 'A', BERLIN, { leg_transport_mode: 'train' });
    const to = stop(2, 'B', POTSDAM, { incoming_leg_transport_mode: 'bus' });
    expect(legTransportMode(from, to, 'walking')).toBe('train');
  });

  it('falls back to the destination’s incoming mode', () => {
    const from = stop(1, 'A', BERLIN);
    const to = stop(2, 'B', POTSDAM, { incoming_leg_transport_mode: 'bus' });
    expect(legTransportMode(from, to, 'walking')).toBe('bus');
  });

  it('then to the day default', () => {
    expect(legTransportMode(stop(1, 'A', BERLIN), stop(2, 'B', POTSDAM), 'walking')).toBe('walking');
  });

  it('treats a day with no default as a drive', () => {
    expect(legTransportMode(stop(1, 'A', BERLIN), stop(2, 'B', POTSDAM), null)).toBe('driving');
  });
});

describe('buildCarbonLegs — day legs', () => {
  it('measures the leg between two consecutive stops on the day default', () => {
    const legs = buildCarbonLegs({
      days: [
        day({ assignments: [stop(1, 'Hotel', BERLIN), stop(2, 'Museum', POTSDAM)], default_transport_mode: 'cycling' }),
      ],
      reservations: [],
    });
    expect(legs).toHaveLength(1);
    expect(legs[0]).toMatchObject({
      id: 'day-1-1-2',
      source: 'day',
      day_id: 1,
      day_number: 1,
      date: '2026-05-01',
      from_name: 'Hotel',
      to_name: 'Museum',
      distance_km: km(BERLIN, POTSDAM),
      transport_mode: 'cycling',
      mode: 'cycle',
    });
    expect(first(legs).grams).toBe(0);
  });

  it('prices the same leg by the mode its origin override names', () => {
    const legs = buildCarbonLegs({
      days: [
        day({
          assignments: [stop(1, 'Hotel', BERLIN, { leg_transport_mode: 'driving' }), stop(2, 'Museum', POTSDAM)],
          default_transport_mode: 'walking',
        }),
      ],
      reservations: [],
    });
    expect(first(legs).transport_mode).toBe('driving');
    expect(first(legs).mode).toBe('car');
    expect(first(legs).grams).toBe(Math.round(170 * haversineKm(BERLIN.lat, BERLIN.lng, POTSDAM.lat, POTSDAM.lng)));
  });

  it('keeps the chain across a stop the traveller never geocoded', () => {
    const legs = buildCarbonLegs({
      days: [day({ assignments: [stop(1, 'Hotel', BERLIN), stop(2, 'Nowhere', null), stop(3, 'Museum', POTSDAM)] })],
      reservations: [],
    });
    // One leg from the hotel to the museum: the unlocated stop does not cut the day in two.
    expect(legs).toHaveLength(1);
    expect(legs[0]).toMatchObject({ from_name: 'Hotel', to_name: 'Museum', distance_km: km(BERLIN, POTSDAM) });
  });

  it('leaves out a stop excluded from the route', () => {
    const legs = buildCarbonLegs({
      days: [
        day({
          assignments: [
            stop(1, 'Hotel', BERLIN),
            stop(2, 'Detour', MUNICH, { route_excluded: true }),
            stop(3, 'Museum', POTSDAM),
          ],
        }),
      ],
      reservations: [],
    });
    expect(legs).toHaveLength(1);
    expect(first(legs).to_name).toBe('Museum');
  });

  it('orders the legs by the order the day plan shows', () => {
    const legs = buildCarbonLegs({
      days: [
        day({
          assignments: [
            { ...stop(9, 'Third', MUNICH), order_index: 2 },
            { ...stop(8, 'First', BERLIN), order_index: 0 },
            { ...stop(7, 'Second', POTSDAM), order_index: 1 },
          ],
        }),
      ],
      reservations: [],
    });
    expect(legs.map((leg) => [leg.from_name, leg.to_name])).toEqual([
      ['First', 'Second'],
      ['Second', 'Third'],
    ]);
  });

  it('counts a leg between two stops in the same place as measured, at zero grams', () => {
    const legs = buildCarbonLegs({
      days: [day({ assignments: [stop(1, 'A', BERLIN), stop(2, 'B', BERLIN)] })],
      reservations: [],
    });
    expect(legs[0]).toMatchObject({ distance_km: 0, grams: 0, mode: 'car' });
  });

  it('marks a leg whose mode it cannot price as unestimated rather than as zero', () => {
    const legs = buildCarbonLegs({
      days: [
        day({
          assignments: [stop(1, 'A', BERLIN, { leg_transport_mode: 'plugin:custom/teleport' }), stop(2, 'B', POTSDAM)],
        }),
      ],
      reservations: [],
    });
    expect(legs[0]).toMatchObject({ mode: null, grams: null, transport_mode: 'plugin:custom/teleport' });
  });

  it('makes no leg out of a day with a single stop', () => {
    expect(buildCarbonLegs({ days: [day({ assignments: [stop(1, 'Only', BERLIN)] })], reservations: [] })).toEqual([]);
  });

  it('leaves out a stop whose coordinates are not finite numbers', () => {
    const legs = buildCarbonLegs({
      days: [
        day({
          assignments: [
            stop(1, 'Hotel', BERLIN),
            { ...stop(2, 'Broken', BERLIN), place: { name: 'Broken', lat: Number.NaN, lng: BERLIN.lng } },
          ],
        }),
      ],
      reservations: [],
    });
    // The broken stop is not a stop: no leg from it, and no NaN distance either.
    expect(legs).toEqual([]);
  });
});

describe('buildCarbonLegs — booked transport', () => {
  it('measures a flight between its two located endpoints', () => {
    const legs = buildCarbonLegs({ days: [day()], reservations: [booking()] });
    expect(legs).toHaveLength(1);
    expect(legs[0]).toMatchObject({
      id: 'reservation-7',
      source: 'reservation',
      day_id: 1,
      day_number: 1,
      date: '2026-05-01',
      from_name: 'BER',
      to_name: 'FCO',
      distance_km: km(BERLIN, ROME),
      transport_mode: 'flight',
      mode: 'flight',
    });
    expect(first(legs).grams).toBe(Math.round(151 * haversineKm(BERLIN.lat, BERLIN.lng, ROME.lat, ROME.lng)));
  });

  it('adds up both hops of a booking with a stopover', () => {
    const legs = buildCarbonLegs({
      days: [day()],
      reservations: [
        booking({
          endpoints: [
            { role: 'from', sequence: 0, name: 'BER', ...BERLIN },
            { role: 'stop', sequence: 1, name: 'MUC', ...MUNICH },
            { role: 'to', sequence: 2, name: 'FCO', ...ROME },
          ],
        }),
      ],
    });
    expect(first(legs).distance_km).toBe(
      Math.round(
        (haversineKm(BERLIN.lat, BERLIN.lng, MUNICH.lat, MUNICH.lng) +
          haversineKm(MUNICH.lat, MUNICH.lng, ROME.lat, ROME.lng)) *
          100,
      ) / 100,
    );
    expect(first(legs).from_name).toBe('BER');
    expect(first(legs).to_name).toBe('FCO');
  });

  it('carries a booking without stations as an unestimated leg', () => {
    const legs = buildCarbonLegs({
      days: [day()],
      reservations: [booking({ endpoints: [{ role: 'from', sequence: 0, name: 'BER', ...BERLIN }] })],
    });
    expect(legs[0]).toMatchObject({ distance_km: 0, mode: 'flight', grams: null, from_name: 'BER', to_name: 'BER' });
  });

  it('carries a transport booking of an unknown kind as unestimated, not as zero', () => {
    const legs = buildCarbonLegs({ days: [day()], reservations: [booking({ type: 'transport_other' })] });
    expect(legs[0]).toMatchObject({ mode: null, grams: null, transport_mode: 'transport_other' });
  });

  it('names an unnamed endpoint by the booking’s title', () => {
    const legs = buildCarbonLegs({
      days: [day()],
      reservations: [
        booking({
          endpoints: [
            { role: 'from', sequence: 0, ...BERLIN },
            { role: 'to', sequence: 1, ...ROME },
          ],
        }),
      ],
    });
    expect(legs[0]).toMatchObject({ from_name: 'LH 1840', to_name: 'LH 1840' });
  });

  it('names a booking without stations by its title too', () => {
    const legs = buildCarbonLegs({ days: [day()], reservations: [booking({ endpoints: [] })] });
    expect(legs[0]).toMatchObject({ from_name: 'LH 1840', to_name: 'LH 1840', grams: null, distance_km: 0 });
  });

  it('makes no leg out of a stay or a restaurant', () => {
    const legs = buildCarbonLegs({
      days: [day()],
      reservations: [booking({ id: 1, type: 'hotel' }), booking({ id: 2, type: 'restaurant' })],
    });
    expect(legs).toEqual([]);
  });

  it('ties a booking to its day, and leaves it undated when it has none', () => {
    const undated = buildCarbonLegs({ days: [day()], reservations: [booking({ day_id: null })] });
    expect(undated[0]).toMatchObject({ day_id: null, day_number: null, date: null });

    const orphan = buildCarbonLegs({ days: [day()], reservations: [booking({ day_id: 99 })] });
    expect(orphan[0]).toMatchObject({ day_id: 99, day_number: null, date: null });
  });

  it('sorts a booking into the day it belongs to', () => {
    const legs = buildCarbonLegs({
      days: [
        day({ id: 1, day_number: 1, assignments: [stop(1, 'A', BERLIN), stop(2, 'B', POTSDAM)] }),
        day({ id: 2, day_number: 2 }),
        day({ id: 3, day_number: 3, assignments: [stop(3, 'C', BERLIN), stop(4, 'D', POTSDAM)] }),
      ],
      reservations: [booking({ day_id: 2 })],
    });
    expect(legs.map((leg) => leg.id)).toEqual(['day-1-1-2', 'reservation-7', 'day-3-3-4']);
  });

  it('puts a booking with no day at the end of the itinerary', () => {
    const legs = buildCarbonLegs({
      days: [day({ id: 1, day_number: 1, assignments: [stop(1, 'A', BERLIN), stop(2, 'B', POTSDAM)] })],
      reservations: [booking({ day_id: null })],
    });
    expect(legs.map((leg) => leg.id)).toEqual(['day-1-1-2', 'reservation-7']);
  });

  it('keeps the day legs and the bookings in one list', () => {
    const legs = buildCarbonLegs({
      days: [day({ assignments: [stop(1, 'Hotel', BERLIN), stop(2, 'Airport', BERLIN)] })],
      reservations: [booking()],
    });
    expect(legs.map((leg) => leg.source)).toEqual(['day', 'reservation']);
  });
});

describe('summarizeCarbon', () => {
  const days = [day({ id: 1, title: 'Arrival' }), day({ id: 2, day_number: 2, date: '2026-05-02', title: 'Rome' })];

  const legOf = (over: Partial<CarbonLeg>): CarbonLeg => ({
    id: 'leg',
    source: 'day',
    day_id: 1,
    day_number: 1,
    date: '2026-05-01',
    from_name: 'A',
    to_name: 'B',
    distance_km: 1,
    transport_mode: 'walking',
    mode: 'walk',
    grams: 0,
    ...over,
  });

  it('sums the measured legs and leaves the unestimated ones out of the figure', () => {
    const summary = summarizeCarbon(
      [legOf({ grams: 21_000 }), legOf({ id: 'unmeasured', mode: null, grams: null })],
      days,
    );
    expect(summary.total_grams).toBe(21_000);
    expect(summary.estimated_legs).toBe(1);
    expect(summary.unestimated_legs).toBe(1);
  });

  it('reports the distance the trip covers', () => {
    const summary = summarizeCarbon([legOf({ distance_km: 27.3 }), legOf({ id: 'b', distance_km: 1180.12 })], days);
    expect(summary.total_km).toBe(1207.42);
  });

  it('ranks the modes by what they emit, most first', () => {
    const summary = summarizeCarbon(
      [
        legOf({ mode: 'rail', grams: 300 }),
        legOf({ mode: 'flight', grams: 900, distance_km: 10 }),
        legOf({ mode: 'walk', grams: 0 }),
      ],
      days,
    );
    expect(summary.by_mode.map((row) => row.mode)).toEqual(['flight', 'rail', 'walk']);
    expect(summary.by_mode[0]).toEqual({ mode: 'flight', legs: 1, km: 10, grams: 900 });
  });

  it('adds two legs of one mode into one row', () => {
    const summary = summarizeCarbon(
      [legOf({ mode: 'rail', grams: 300 }), legOf({ id: 'b', mode: 'rail', grams: 200 })],
      days,
    );
    expect(summary.by_mode).toEqual([{ mode: 'rail', legs: 2, km: 2, grams: 500 }]);
  });

  it('orders two modes that emit the same by the catalog, not by name', () => {
    const summary = summarizeCarbon(
      [legOf({ mode: 'cycle', grams: 0 }), legOf({ id: 'b', mode: 'walk', grams: 0 })],
      days,
    );
    expect(summary.by_mode.map((row) => row.mode)).toEqual(['walk', 'cycle']);
  });

  it('leaves a day’s title null when the day has none', () => {
    const summary = summarizeCarbon([legOf({ grams: 10 })], [day({ id: 1, title: null })]);
    expect(summary.days[0]).toMatchObject({ day_id: 1, title: null });
  });

  it('keeps a day row per day that holds a leg, with the day’s own title', () => {
    const summary = summarizeCarbon(
      [legOf({ day_id: 1, day_number: 1 }), legOf({ id: 'b', day_id: 2, day_number: 2, grams: 900 })],
      days,
    );
    expect(summary.days.map((row) => [row.day_id, row.title])).toEqual([
      [1, 'Arrival'],
      [2, 'Rome'],
    ]);
    expect(summary.days[1]).toMatchObject({ legs: 1, grams: 900 });
  });

  it('answers an empty trip with zeroes rather than nothing', () => {
    expect(summarizeCarbon([], days)).toEqual({
      total_grams: 0,
      total_km: 0,
      estimated_legs: 0,
      unestimated_legs: 0,
      by_mode: [],
      days: [],
      legs: [],
    });
  });

  it('leaves a booking with no day out of the per-day rows', () => {
    const summary = summarizeCarbon(
      [legOf({ source: 'reservation', day_id: null, day_number: null, date: null, grams: 900 })],
      days,
    );
    expect(summary.days).toEqual([]);
    expect(summary.total_grams).toBe(900);
  });
});
