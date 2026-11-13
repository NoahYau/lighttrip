import type { DiscoverySuggestion } from '@trek/shared';
import { render, screen } from '../../../tests/helpers/render';
import { GeoOnceError, getCurrentPositionOnce } from '../../hooks/useGeolocation';
import { discoveryRepo } from '../../repo/discoveryRepo';
import { OnlineOnlyError } from '../../repo/onlineOnly';
import { useNearbyDiscovery } from './useNearbyDiscovery';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../hooks/useGeolocation', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../hooks/useGeolocation')>();
  return { ...mod, getCurrentPositionOnce: vi.fn() };
});
vi.mock('../../repo/discoveryRepo', () => ({ discoveryRepo: { scan: vi.fn() } }));
vi.mock('../../i18n', () => ({ useTranslation: () => ({ language: 'en' }) }));

const getPos = vi.mocked(getCurrentPositionOnce);
const scan = vi.mocked(discoveryRepo.scan);

function suggestion(over: Partial<DiscoverySuggestion> = {}): DiscoverySuggestion {
  return {
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
    ...over,
  };
}

function Harness({
  tripId,
  getFallbackCenter,
}: {
  tripId: number;
  getFallbackCenter?: () => { lat: number; lng: number } | null;
}) {
  const { status, suggestions, scan: run, retry } = useNearbyDiscovery(tripId, getFallbackCenter);
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="count">{suggestions.length}</span>
      <button onClick={run}>scan</button>
      <button onClick={retry}>retry</button>
    </div>
  );
}

describe('useNearbyDiscovery', () => {
  beforeEach(() => {
    getPos.mockReset();
    scan.mockReset();
  });

  it('starts idle, then scans and reaches ready', async () => {
    getPos.mockResolvedValue({ lat: 22.3027, lng: 114.1772, accuracy: 24, heading: null, speed: null, timestamp: 1 });
    scan.mockResolvedValue({
      suggestions: [suggestion()],
      servedAt: '2026-11-13T14:00:00.000Z',
      cell: 'c',
      ttlSeconds: 86400,
    });

    render(<Harness tripId={7} />);
    expect(screen.getByTestId('status')).toHaveTextContent('idle');

    screen.getByRole('button', { name: 'scan' }).click();
    expect(await screen.findByTestId('status')).toHaveTextContent('ready');
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(scan).toHaveBeenCalledWith(7, expect.objectContaining({ mode: 'manual' }), 'en', expect.any(AbortSignal));
  });

  it('reports offline when the repo has no connection', async () => {
    getPos.mockResolvedValue({ lat: 1, lng: 2, accuracy: 1, heading: null, speed: null, timestamp: 1 });
    scan.mockRejectedValue(new OnlineOnlyError());

    render(<Harness tripId={7} />);
    screen.getByRole('button', { name: 'scan' }).click();
    expect(await screen.findByTestId('status')).toHaveTextContent('offline');
  });

  it('reports denied when the location permission is refused', async () => {
    getPos.mockRejectedValue(new GeoOnceError('permission-denied'));

    render(<Harness tripId={7} />);
    screen.getByRole('button', { name: 'scan' }).click();
    expect(await screen.findByTestId('status')).toHaveTextContent('denied');
  });

  it('falls back to the map centre when the browser cannot locate the device', async () => {
    getPos.mockRejectedValue(new GeoOnceError('unavailable'));
    scan.mockResolvedValue({
      suggestions: [suggestion()],
      servedAt: '2026-11-13T14:00:00.000Z',
      cell: 'c',
      ttlSeconds: 86400,
    });
    const getFallbackCenter = vi.fn(() => ({ lat: 22.5, lng: 114.2 }));

    render(<Harness tripId={7} getFallbackCenter={getFallbackCenter} />);
    screen.getByRole('button', { name: 'scan' }).click();

    expect(await screen.findByTestId('status')).toHaveTextContent('ready');
    expect(getFallbackCenter).toHaveBeenCalled();
    expect(scan).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ lat: 22.5, lng: 114.2, mode: 'manual' }),
      'en',
      expect.any(AbortSignal)
    );
  });
});
