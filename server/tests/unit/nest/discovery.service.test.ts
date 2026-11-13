/** The discovery service over a mocked MapsService: the domain only reshapes the nearby answer. */
import { DiscoveryService } from '../../../src/nest/discovery/discovery.service';
import { MapsService } from '../../../src/nest/maps/maps.service';
import { Test } from '@nestjs/testing';

import { describe, it, expect, vi } from 'vitest';

const nearbyPlaces = vi.fn();

async function service(): Promise<DiscoveryService> {
  const module = await Test.createTestingModule({
    providers: [DiscoveryService, { provide: MapsService, useValue: { nearbyPlaces } }],
  }).compile();
  return module.get(DiscoveryService);
}

const REQUEST = {
  lat: 22.3027,
  lng: 114.1772,
  accuracy: 24,
  heading: null,
  speed: null,
  cell: 'a1b2',
  mode: 'manual' as const,
  at: '2026-11-13T14:00:00.000Z',
};

describe('DiscoveryService.scan', () => {
  it('dedupes the same place across providers, ranks nearest first, and shapes the answer', async () => {
    nearbyPlaces.mockResolvedValueOnce({
      places: [
        {
          osm_id: 'gers:1',
          name: 'Pumping Station',
          category: 'historic',
          lat: 22.3029,
          lng: 114.1772,
          distance_m: 220,
          description: 'Built in 1901.',
          source: 'trek-places',
        },
        {
          osm_id: 'node:2',
          name: 'Pumping Station',
          category: 'historic',
          lat: 22.30292,
          lng: 114.17722,
          distance_m: 221,
          source: 'openstreetmap',
        },
        {
          google_place_id: 'gp1',
          name: 'Corner Cafe',
          category: 'restaurant',
          lat: 22.3027,
          lng: 114.1772,
          distance_m: 100,
          source: 'google',
        },
        {
          osm_id: 'node:3',
          name: 'City Park',
          category: 'park',
          lat: 22.3057,
          lng: 114.1772,
          distance_m: 400,
          source: 'openstreetmap',
        },
      ],
      source: 'google',
    });

    const result = await (await service()).scan(1, REQUEST, 'en');

    expect(result).toMatchObject({
      cell: 'a1b2',
      ttlSeconds: 86400,
      servedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(result.suggestions.map((s) => s.name)).toEqual(['Corner Cafe', 'Pumping Station', 'City Park']);
    expect(result.suggestions[0]).toMatchObject({
      source: 'google',
      category: 'food',
      distanceM: 100,
      walkMinutes: 1,
      state: 'new',
    });
    expect(result.suggestions[1]).toMatchObject({
      providerId: 'gers:1',
      source: 'trek-places',
      category: 'culture',
      reason: 'Built in 1901.',
    });
    expect(result.suggestions[2]).toMatchObject({ category: 'nature' });
    // The two ids for the same pumping station collapse to one.
    expect(result.suggestions).toHaveLength(3);
    expect(nearbyPlaces).toHaveBeenCalledWith(1, 22.3027, 114.1772, { radius: 250, limit: 20, lang: 'en' });
  });

  it('answers an empty list when the providers found nothing', async () => {
    nearbyPlaces.mockResolvedValueOnce({ places: [], source: 'openstreetmap' });
    const result = await (await service()).scan(1, REQUEST, undefined);
    expect(result.suggestions).toEqual([]);
  });

  it('drops a record with no name or no coordinates', async () => {
    nearbyPlaces.mockResolvedValueOnce({
      places: [
        { osm_id: 'node:1', name: '', lat: 1, lng: 1, distance_m: 10, source: 'openstreetmap' },
        { osm_id: 'node:2', name: 'Named', lat: null, lng: 1, distance_m: 10, source: 'openstreetmap' },
        {
          osm_id: 'node:3',
          name: 'Kept',
          lat: 1,
          lng: 1,
          distance_m: 10,
          category: 'shop_shoes',
          source: 'openstreetmap',
        },
      ],
      source: 'openstreetmap',
    });
    const result = await (await service()).scan(1, REQUEST);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({ name: 'Kept', category: 'shopping' });
  });
});
