import { carbonLeg } from '../../../tests/helpers/carbon';
import {
  MODE_LABELS,
  bestOf,
  comparisonFor,
  isComparable,
  kilograms,
  kilometres,
  mostEmittingLeg,
  routeLabel,
  savingPercent,
  shareOf,
} from './carbonModel';

import { describe, expect, it } from 'vitest';

describe('MODE_LABELS', () => {
  it('names every mode the estimate knows', () => {
    expect(Object.keys(MODE_LABELS)).toHaveLength(12);
    expect(MODE_LABELS.flight.labelKey).toBe('carbon.mode.flight');
    expect(MODE_LABELS.car_electric.labelKey).toBe('carbon.mode.car_electric');
  });
});

describe('kilograms', () => {
  it('shows grams as kilograms with one decimal at most', () => {
    expect(kilograms(0, 'en')).toBe('0');
    expect(kilograms(12_345, 'en')).toBe('12.3');
    expect(kilograms(21_000, 'en')).toBe('21');
  });

  it('follows the reader’s decimal separator', () => {
    expect(kilograms(12_345, 'de-DE')).toBe('12,3');
  });
});

describe('kilometres', () => {
  it('shows a distance with one decimal at most', () => {
    expect(kilometres(2.44, 'en')).toBe('2.4');
    expect(kilometres(1180.12, 'en')).toBe('1,180.1');
    expect(kilometres(0.4, 'en')).toBe('0.4');
  });
});

describe('routeLabel', () => {
  it('names the leg as one line', () => {
    expect(routeLabel(carbonLeg({ from_name: 'Hotel', to_name: 'Museum' }))).toBe('Hotel → Museum');
  });
});

describe('isComparable', () => {
  it('needs a distance and a mode to compare', () => {
    expect(isComparable(carbonLeg())).toBe(true);
    expect(isComparable(carbonLeg({ distance_km: 0 }))).toBe(false);
    expect(isComparable(carbonLeg({ mode: null, grams: null }))).toBe(false);
    expect(isComparable(null)).toBe(false);
  });
});

describe('comparisonFor', () => {
  it('ranks the modes for the leg over its own distance, against its own mode', () => {
    const options = comparisonFor(carbonLeg({ distance_km: 600, mode: 'car' }));
    expect(options).toHaveLength(12);
    expect(options[0]?.mode).toBe('walk');
    expect(options.find((option) => option.mode === 'car')?.saving_grams).toBe(0);
    expect(options.find((option) => option.mode === 'rail')?.grams).toBe(21_000);
  });

  it('offers nothing for a leg it cannot compare', () => {
    expect(comparisonFor(carbonLeg({ distance_km: 0 }))).toEqual([]);
    expect(comparisonFor(null)).toEqual([]);
  });
});

describe('bestOf', () => {
  it('names the lowest option that burns something', () => {
    // A ferry emits least of the motorised modes; a walk or a cycle emits nothing at all.
    expect(bestOf(comparisonFor(carbonLeg({ distance_km: 600 })))?.mode).toBe('ferry');
  });

  it('names nothing when every option emits nothing', () => {
    expect(bestOf([{ mode: 'walk', grams: 0, grams_per_km: 0, saving_grams: null, saving_share: null }])).toBeNull();
  });

  it('makes no recommendation for an empty comparison', () => {
    expect(bestOf([])).toBeNull();
  });
});

describe('shareOf', () => {
  it('is the part of the total a figure is, capped to the bar it fills', () => {
    expect(shareOf(25, 100)).toBe(0.25);
    expect(shareOf(150, 100)).toBe(1);
    expect(shareOf(-5, 100)).toBe(0);
  });

  it('is zero for a trip that emits nothing', () => {
    expect(shareOf(0, 0)).toBe(0);
  });
});

describe('mostEmittingLeg', () => {
  it('opens on the leg with the biggest figure that has alternatives', () => {
    const legs = [
      carbonLeg({ id: 'a', grams: 300 }),
      carbonLeg({ id: 'b', grams: 21_000, mode: 'flight' }),
      carbonLeg({ id: 'c', grams: 1000 }),
    ];
    expect(mostEmittingLeg(legs)?.id).toBe('b');
  });

  it('skips a leg with no figure and one with no alternatives', () => {
    const legs = [
      carbonLeg({ id: 'unmeasured', grams: null, mode: null }),
      carbonLeg({ id: 'zero', distance_km: 0 }),
      carbonLeg({ id: 'measured', grams: 500 }),
    ];
    expect(mostEmittingLeg(legs)?.id).toBe('measured');
  });

  it('answers nothing for a trip without a comparable leg', () => {
    expect(mostEmittingLeg([])).toBeNull();
    expect(mostEmittingLeg([carbonLeg({ grams: null, mode: null })])).toBeNull();
  });
});

describe('savingPercent', () => {
  it('turns a saving into a whole percentage, negative when it emits more', () => {
    const options = comparisonFor(carbonLeg({ distance_km: 600, mode: 'car' }));
    const rail = options.find((option) => option.mode === 'rail');
    const flight = options.find((option) => option.mode === 'flight');
    expect(rail ? savingPercent(rail) : null).toBe(79);
    expect(flight ? savingPercent(flight) : null).toBe(11);
  });

  it('has no percentage without a baseline', () => {
    expect(
      savingPercent({ mode: 'walk', grams: 0, grams_per_km: 0, saving_grams: null, saving_share: null })
    ).toBeNull();
  });
});
