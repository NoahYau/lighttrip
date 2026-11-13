import {
  discoveryCategorySchema,
  discoveryScanRequestSchema,
  discoveryScanResponseSchema,
  discoverySuggestionSchema,
  discoverySourceSchema,
} from './discovery.schema';

import { describe, expect, it } from 'vitest';

describe('discoveryScanRequestSchema', () => {
  const valid = {
    lat: 22.3027,
    lng: 114.1772,
    accuracy: 24,
    heading: null,
    speed: null,
    cell: 'a1b2',
    mode: 'manual',
    at: '2026-11-13T14:00:00.000Z',
  };

  it('accepts a full manual scan', () => {
    expect(discoveryScanRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a roam scan with a heading and speed', () => {
    expect(discoveryScanRequestSchema.safeParse({ ...valid, mode: 'roam', heading: 180, speed: 1.2 }).success).toBe(
      true,
    );
  });

  it('rejects an out-of-range coordinate', () => {
    expect(discoveryScanRequestSchema.safeParse({ ...valid, lat: 91 }).success).toBe(false);
    expect(discoveryScanRequestSchema.safeParse({ ...valid, lng: -181 }).success).toBe(false);
  });

  it('rejects a negative accuracy', () => {
    expect(discoveryScanRequestSchema.safeParse({ ...valid, accuracy: -1 }).success).toBe(false);
  });

  it('rejects a missing or empty cell', () => {
    expect(discoveryScanRequestSchema.safeParse({ ...valid, cell: '' }).success).toBe(false);
    expect(discoveryScanRequestSchema.safeParse({ ...valid, cell: undefined }).success).toBe(false);
  });

  it('rejects an unknown mode or a non-datetime timestamp', () => {
    expect(discoveryScanRequestSchema.safeParse({ ...valid, mode: 'auto' }).success).toBe(false);
    expect(discoveryScanRequestSchema.safeParse({ ...valid, at: 'yesterday' }).success).toBe(false);
  });
});

describe('discoverySuggestionSchema', () => {
  const valid = {
    providerId: 'osm:node:1',
    source: 'openstreetmap',
    name: 'Old Pumping Station',
    category: 'culture',
    lat: 22.3027,
    lng: 114.1772,
    distanceM: 220,
    walkMinutes: 3,
    reason: 'Built in 1901 as a freight warehouse.',
    score: 0.5,
    imageUrl: null,
    opensNow: null,
  };

  it('accepts a suggestion and defaults state to new', () => {
    const parsed = discoverySuggestionSchema.parse(valid);
    expect(parsed.state).toBe('new');
  });

  it('rejects an unknown category or source', () => {
    expect(discoverySuggestionSchema.safeParse({ ...valid, category: 'zoo' }).success).toBe(false);
    expect(discoverySuggestionSchema.safeParse({ ...valid, source: 'bing' }).success).toBe(false);
  });

  it('rejects a score outside 0..1 and an overlong reason', () => {
    expect(discoverySuggestionSchema.safeParse({ ...valid, score: 1.5 }).success).toBe(false);
    expect(discoverySuggestionSchema.safeParse({ ...valid, reason: 'x'.repeat(241) }).success).toBe(false);
  });
});

describe('discoveryScanResponseSchema', () => {
  it('accepts an answer with suggestions', () => {
    const parsed = discoveryScanResponseSchema.parse({
      suggestions: [
        {
          providerId: 'osm:node:1',
          source: 'openstreetmap',
          name: 'Old Pumping Station',
          category: 'culture',
          lat: 22.3,
          lng: 114.1,
          distanceM: 220,
          walkMinutes: 3,
          reason: '',
          score: 0.5,
          imageUrl: null,
          opensNow: null,
          state: 'new',
        },
      ],
      servedAt: '2026-11-13T14:00:00.000Z',
      cell: 'a1b2',
      ttlSeconds: 86400,
    });
    expect(parsed.suggestions).toHaveLength(1);
  });

  it('exposes the fixed category and source enums', () => {
    expect(discoveryCategorySchema.options).toEqual(['nature', 'culture', 'food', 'shopping', 'other']);
    expect(discoverySourceSchema.options).toEqual(['trek-places', 'google', 'openstreetmap']);
  });
});
