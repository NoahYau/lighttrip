import {
  categoryOf,
  dedupeCandidates,
  proximityScore,
  rankCandidates,
  reasonFor,
  toSuggestion,
  walkMinutes,
} from './discovery.ranking';

import { describe, expect, it } from 'vitest';

describe('categoryOf', () => {
  it.each([
    ['restaurant', 'food'],
    ['cafe', 'food'],
    ['shop_clothes', 'shopping'],
    ['museum', 'culture'],
    ['historic', 'culture'],
    ['beach', 'nature'],
    ['national_park', 'nature'],
    ['something_unmapped', 'other'],
    [null, 'other'],
  ])('maps %s to %s', (raw, expected) => {
    expect(categoryOf(raw)).toBe(expected);
  });
});

describe('dedupeCandidates', () => {
  it('keeps the first of two candidates with the same provider id', () => {
    const out = dedupeCandidates([
      { providerId: 'osm:node:1', lat: 1, lng: 1 },
      { providerId: 'osm:node:1', lat: 1, lng: 1 },
    ]);
    expect(out).toHaveLength(1);
  });

  it('drops a second id for the same place within the coordinate tolerance', () => {
    const out = dedupeCandidates([
      { providerId: 'gers:1', lat: 22.3027, lng: 114.1772 },
      { providerId: 'osm:node:2', lat: 22.30272, lng: 114.17725 },
    ]);
    expect(out).toHaveLength(1);
  });

  it('keeps two distinct places apart', () => {
    const out = dedupeCandidates([
      { providerId: 'gers:1', lat: 22.3027, lng: 114.1772 },
      { providerId: 'gers:2', lat: 22.3037, lng: 114.1772 },
    ]);
    expect(out).toHaveLength(2);
  });
});

describe('rankCandidates', () => {
  it('orders nearest first', () => {
    const out = rankCandidates([{ distanceM: 400 }, { distanceM: 120 }, { distanceM: 250 }]);
    expect(out.map((c) => c.distanceM)).toEqual([120, 250, 400]);
  });
});

describe('walkMinutes', () => {
  it('is at least one minute and uses the walking pace', () => {
    expect(walkMinutes(0)).toBe(1);
    expect(walkMinutes(40)).toBe(1);
    expect(walkMinutes(400)).toBe(5);
  });
});

describe('proximityScore', () => {
  it('is 1 at the origin and 0 at the radius, clamped', () => {
    expect(proximityScore(0, 250)).toBe(1);
    expect(proximityScore(250, 250)).toBe(0);
    expect(proximityScore(500, 250)).toBe(0);
    expect(proximityScore(125, 250)).toBeCloseTo(0.5, 5);
    expect(proximityScore(100, 0)).toBe(0);
  });
});

describe('reasonFor', () => {
  it('returns the description trimmed and capped', () => {
    expect(reasonFor('  A short line.  ')).toBe('A short line.');
    expect(reasonFor('x'.repeat(300)).length).toBe(240);
  });

  it('is empty when there is nothing to say', () => {
    expect(reasonFor(null)).toBe('');
    expect(reasonFor(undefined)).toBe('');
  });
});

describe('toSuggestion', () => {
  it('builds the wire suggestion with the derived fields', () => {
    const suggestion = toSuggestion(
      {
        providerId: 'osm:node:1',
        source: 'openstreetmap',
        name: 'Old Pumping Station',
        category: 'culture',
        lat: 22.3,
        lng: 114.1,
        distanceM: 220,
        description: 'Built in 1901.',
      },
      250,
    );
    expect(suggestion).toMatchObject({
      providerId: 'osm:node:1',
      source: 'openstreetmap',
      category: 'culture',
      distanceM: 220,
      walkMinutes: 3,
      reason: 'Built in 1901.',
      imageUrl: null,
      opensNow: null,
      state: 'new',
    });
    expect(suggestion.score).toBeCloseTo(proximityScore(220, 250), 5);
  });
});
