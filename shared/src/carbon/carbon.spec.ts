import {
  CARBON_FACTORS_GRAMS_PER_KM,
  CARBON_MODES,
  carbonFactor,
  carbonGrams,
  carbonModeForTransportMode,
  compareCarbonModes,
  flightHaul,
} from './carbon';
import { carbonKilograms } from './carbon.schema';

import { describe, expect, it } from 'vitest';

describe('carbonFactor', () => {
  it('reads the constant table for every mode but a flight', () => {
    for (const mode of CARBON_MODES) {
      if (mode === 'flight') continue;
      expect(carbonFactor(mode, 500)).toBe(CARBON_FACTORS_GRAMS_PER_KM[mode]);
      // A constant does not care how far the leg is.
      expect(carbonFactor(mode, 5000)).toBe(CARBON_FACTORS_GRAMS_PER_KM[mode]);
    }
  });

  it('gives walking and cycling no emissions, so they rank first', () => {
    expect(carbonFactor('walk', 12)).toBe(0);
    expect(carbonFactor('cycle', 12)).toBe(0);
  });

  it('bands a flight by how far it goes', () => {
    expect(flightHaul(0)).toBe('domestic');
    expect(flightHaul(599)).toBe('domestic');
    expect(flightHaul(600)).toBe('short_haul');
    expect(flightHaul(3699)).toBe('short_haul');
    expect(flightHaul(3700)).toBe('long_haul');
    expect(flightHaul(9000)).toBe('long_haul');
  });

  it('prices a flight by its band, so a hop emits more per kilometre than a long haul', () => {
    expect(carbonFactor('flight', 200)).toBe(246);
    expect(carbonFactor('flight', 1200)).toBe(151);
    expect(carbonFactor('flight', 6000)).toBe(148);
  });

  it('treats a distance that is not a number as a domestic flight', () => {
    // Defensive: a NaN distance comes back as 0 g below, but the factor itself must stay finite.
    expect(flightHaul(Number.NaN)).toBe('domestic');
  });
});

describe('carbonGrams', () => {
  it('multiplies the factor by the kilometres, in whole grams', () => {
    expect(carbonGrams('car', 100)).toBe(17_000);
    expect(carbonGrams('rail', 100)).toBe(3500);
    expect(carbonGrams('flight', 1000)).toBe(151_000);
  });

  it('rounds to the nearest gram instead of dropping a short leg', () => {
    expect(carbonGrams('rail', 0.1)).toBe(4);
    expect(carbonGrams('rail', 0.5)).toBe(18);
  });

  it('answers null for a mode it cannot estimate', () => {
    expect(carbonGrams(null, 100)).toBeNull();
  });

  it('answers zero for a leg that goes nowhere or has no measurable length', () => {
    expect(carbonGrams('car', 0)).toBe(0);
    expect(carbonGrams('car', -5)).toBe(0);
    expect(carbonGrams('car', Number.NaN)).toBe(0);
    expect(carbonGrams('car', Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('carbonModeForTransportMode', () => {
  it('maps the vocabulary the planner writes onto the factors', () => {
    expect(carbonModeForTransportMode('walking')).toBe('walk');
    expect(carbonModeForTransportMode('cycling')).toBe('cycle');
    expect(carbonModeForTransportMode('bicycle')).toBe('cycle');
    expect(carbonModeForTransportMode('driving')).toBe('car');
    expect(carbonModeForTransportMode('train')).toBe('rail');
    expect(carbonModeForTransportMode('transit')).toBe('bus');
    expect(carbonModeForTransportMode('bus')).toBe('bus');
    expect(carbonModeForTransportMode('taxi')).toBe('taxi');
    expect(carbonModeForTransportMode('cable_car')).toBe('rail');
    expect(carbonModeForTransportMode('flight')).toBe('flight');
    expect(carbonModeForTransportMode('ferry')).toBe('ferry');
    expect(carbonModeForTransportMode('cruise')).toBe('cruise');
  });

  it('ignores case and surrounding spaces', () => {
    expect(carbonModeForTransportMode('  Bicycle ')).toBe('cycle');
    expect(carbonModeForTransportMode('FLIGHT')).toBe('flight');
  });

  it('refuses a mode it has no factor for, rather than guessing one', () => {
    expect(carbonModeForTransportMode('transport_other')).toBeNull();
    expect(carbonModeForTransportMode('plugin:custom/walk')).toBeNull();
    expect(carbonModeForTransportMode('')).toBeNull();
    expect(carbonModeForTransportMode(null)).toBeNull();
    expect(carbonModeForTransportMode(undefined)).toBeNull();
  });

  it('does not answer for a prototype key', () => {
    expect(carbonModeForTransportMode('constructor')).toBeNull();
    expect(carbonModeForTransportMode('toString')).toBeNull();
  });
});

describe('compareCarbonModes', () => {
  it('ranks every mode cheapest first', () => {
    const options = compareCarbonModes({ distanceKm: 600 });
    expect(options).toHaveLength(CARBON_MODES.length);
    const grams = options.map((option) => option.grams);
    expect(grams).toEqual([...grams].sort((a, b) => a - b));
    expect(options[0]!.mode).toBe('walk');
    expect(options[1]!.mode).toBe('cycle');
    // A cruise is the most emitting row there is, ahead of even a short flight.
    expect(options.at(-1)!.mode).toBe('cruise');
  });

  it('keeps the catalog order between two modes that emit the same', () => {
    const options = compareCarbonModes({ distanceKm: 10, modes: ['cycle', 'walk'] });
    expect(options.map((option) => option.mode)).toEqual(['walk', 'cycle']);
  });

  it('prices one leg differently by mode for the same distance', () => {
    const options = compareCarbonModes({ distanceKm: 600, modes: ['rail', 'car', 'flight'] });
    expect(options.map((option) => option.mode)).toEqual(['rail', 'flight', 'car']);
    expect(options.map((option) => option.grams)).toEqual([21_000, 90_600, 102_000]);
  });

  it('measures each mode against the baseline, negative when it emits more', () => {
    const options = compareCarbonModes({ distanceKm: 600, baseline: 'car', modes: ['rail', 'car', 'flight'] });
    const rail = options.find((option) => option.mode === 'rail')!;
    const car = options.find((option) => option.mode === 'car')!;
    const flight = options.find((option) => option.mode === 'flight')!;
    expect(car.saving_grams).toBe(0);
    expect(car.saving_share).toBe(0);
    expect(rail.saving_grams).toBe(102_000 - 21_000);
    expect(rail.saving_share).toBeCloseTo(81_000 / 102_000, 6);
    expect(flight.saving_grams).toBe(102_000 - 90_600);
  });

  it('carries no savings without a baseline', () => {
    const options = compareCarbonModes({ distanceKm: 100, modes: ['rail', 'car'] });
    expect(options.every((option) => option.saving_grams === null && option.saving_share === null)).toBe(true);
  });

  it('cannot divide by a baseline that emits nothing', () => {
    const options = compareCarbonModes({ distanceKm: 100, baseline: 'walk', modes: ['walk', 'rail'] });
    // Nothing to save against a walk: the rail leg emits more, and the share is undefined rather than infinite.
    expect(options.find((option) => option.mode === 'rail')!.saving_grams).toBe(-3500);
    expect(options.find((option) => option.mode === 'rail')!.saving_share).toBeNull();
  });

  it('is empty when asked for no modes', () => {
    expect(compareCarbonModes({ distanceKm: 100, modes: [] })).toEqual([]);
  });
});

describe('carbonKilograms', () => {
  it('shows grams as kilograms with one decimal', () => {
    expect(carbonKilograms(0)).toBe(0);
    expect(carbonKilograms(40)).toBe(0);
    expect(carbonKilograms(12_345)).toBe(12.3);
    expect(carbonKilograms(21_000)).toBe(21);
  });
});
