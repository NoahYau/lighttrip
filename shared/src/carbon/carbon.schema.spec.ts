import { carbonCompareQuerySchema, carbonModeSchema, tripCarbonResponseSchema } from './carbon.schema';

import { describe, expect, it } from 'vitest';

const leg = {
  id: 'day-1-10-11',
  source: 'day' as const,
  day_id: 1,
  day_number: 1,
  date: '2026-05-01',
  from_name: 'Hotel',
  to_name: 'Museum',
  distance_km: 2.4,
  transport_mode: 'walking',
  mode: 'walk' as const,
  grams: 0,
};

const trip = {
  total_grams: 21_000,
  total_km: 600,
  estimated_legs: 1,
  unestimated_legs: 1,
  by_mode: [{ mode: 'rail' as const, legs: 1, km: 600, grams: 21_000 }],
  days: [{ day_id: 1, day_number: 1, date: '2026-05-01', title: 'Day one', legs: 1, km: 600, grams: 21_000 }],
  legs: [
    leg,
    {
      ...leg,
      id: 'reservation-7',
      source: 'reservation' as const,
      day_id: null,
      day_number: null,
      date: null,
      transport_mode: 'plugin:custom/teleport',
      mode: null,
      grams: null,
    },
  ],
};

describe('carbonModeSchema', () => {
  it('accepts a catalog mode and refuses a made-up one', () => {
    expect(carbonModeSchema.parse('rail')).toBe('rail');
    expect(carbonModeSchema.safeParse('teleport').success).toBe(false);
    expect(carbonModeSchema.safeParse(null).success).toBe(false);
  });
});

describe('carbonCompareQuerySchema', () => {
  it('coerces the distance a query string carries', () => {
    expect(carbonCompareQuerySchema.parse({ distance_km: '600' })).toEqual({ distance_km: 600 });
  });

  it('carries the optional baseline', () => {
    expect(carbonCompareQuerySchema.parse({ distance_km: '600', baseline: 'rail' })).toEqual({
      distance_km: 600,
      baseline: 'rail',
    });
  });

  it('refuses a distance no trip has, or none at all', () => {
    expect(carbonCompareQuerySchema.safeParse({ distance_km: '20001' }).success).toBe(false);
    expect(carbonCompareQuerySchema.safeParse({ distance_km: '-1' }).success).toBe(false);
    expect(carbonCompareQuerySchema.safeParse({}).success).toBe(false);
    expect(carbonCompareQuerySchema.safeParse({ distance_km: 'far' }).success).toBe(false);
  });

  it('refuses a baseline that is not a mode', () => {
    expect(carbonCompareQuerySchema.safeParse({ distance_km: 1, baseline: 'rocket' }).success).toBe(false);
  });
});

describe('tripCarbonResponseSchema', () => {
  it('describes a trip with estimated and unestimated legs', () => {
    expect(tripCarbonResponseSchema.parse(trip)).toMatchObject({ total_grams: 21_000, estimated_legs: 1 });
  });

  it('refuses a leg whose grams disagree with its type', () => {
    const broken = { ...trip, legs: [{ ...leg, grams: -1 }] };
    expect(tripCarbonResponseSchema.safeParse(broken).success).toBe(false);
  });

  it('refuses a mode outside the catalog', () => {
    const broken = { ...trip, by_mode: [{ mode: 'hovercraft', legs: 1, km: 1, grams: 1 }] };
    expect(tripCarbonResponseSchema.safeParse(broken).success).toBe(false);
  });

  it('refuses a missing total', () => {
    const { total_grams: _total, ...broken } = trip;
    expect(tripCarbonResponseSchema.safeParse(broken).success).toBe(false);
  });
});
