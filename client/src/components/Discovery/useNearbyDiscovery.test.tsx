import type { DiscoverySuggestion } from '@trek/shared';
import { act, render, screen, waitFor } from '../../../tests/helpers/render';
import { GeoOnceError, getCurrentPositionOnce } from '../../hooks/useGeolocation';
import { discoveryRepo } from '../../repo/discoveryRepo';
import { OnlineOnlyError } from '../../repo/onlineOnly';
import { useTripStore } from '../../store/tripStore';
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

/** A 0.01° × 0.01° viewport around Tsim Sha Tsui: ~756 m to a corner, so the 1000 m rung. */
const VIEWPORT = { tripId: 7, south: 22.3, west: 114.17, north: 22.31, east: 114.18 };
/** The same map, panned east: still the same rung, so the cache key stays useful. */
const VIEWPORT_MOVED = { tripId: 7, south: 22.3, west: 114.27, north: 22.31, east: 114.28 };

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

function answer(suggestions: DiscoverySuggestion[] = [suggestion()]) {
  return { suggestions, servedAt: '2026-11-13T14:00:00.000Z', cell: 'c', ttlSeconds: 86400 };
}

function Harness({
  tripId,
  getFallbackCenter,
  origin,
  enabled,
}: {
  tripId: number;
  getFallbackCenter?: () => { lat: number; lng: number } | null;
  origin?: 'device' | 'map';
  enabled?: boolean;
}) {
  const {
    status,
    suggestions,
    radiusM,
    scan: run,
    retry,
    rescan,
  } = useNearbyDiscovery(tripId, getFallbackCenter, {
    origin,
    enabled,
  });
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="count">{suggestions.length}</span>
      <span data-testid="radius">{radiusM ?? 'none'}</span>
      <button onClick={run}>scan</button>
      <button onClick={retry}>retry</button>
      <button onClick={() => rescan?.()}>rescan</button>
    </div>
  );
}

describe('useNearbyDiscovery', () => {
  beforeEach(() => {
    getPos.mockReset();
    scan.mockReset();
    useTripStore.setState({ planMapViewport: null });
  });

  it('starts idle, then scans and reaches ready', async () => {
    getPos.mockResolvedValue({ lat: 22.3027, lng: 114.1772, accuracy: 24, heading: null, speed: null, timestamp: 1 });
    scan.mockResolvedValue(answer());

    render(<Harness tripId={7} />);
    expect(screen.getByTestId('status')).toHaveTextContent('idle');

    screen.getByRole('button', { name: 'scan' }).click();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(scan).toHaveBeenCalledWith(7, expect.objectContaining({ mode: 'manual' }), 'en', expect.any(AbortSignal));
  });

  it('sends no radius in device mode, so the server default applies byte-identically', async () => {
    getPos.mockResolvedValue({ lat: 1, lng: 2, accuracy: 1, heading: null, speed: null, timestamp: 1 });
    scan.mockResolvedValue(answer());

    render(<Harness tripId={7} />);
    screen.getByRole('button', { name: 'scan' }).click();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));

    const body = scan.mock.calls[0]?.[1];
    expect(body).toBeDefined();
    expect('radius' in (body as object)).toBe(false);
    expect(body).toMatchObject({ lat: 1, lng: 2, cell: expect.any(String) });
    expect(screen.getByTestId('radius')).toHaveTextContent('250');
  });

  it('reports offline when the repo has no connection', async () => {
    getPos.mockResolvedValue({ lat: 1, lng: 2, accuracy: 1, heading: null, speed: null, timestamp: 1 });
    scan.mockRejectedValue(new OnlineOnlyError());

    render(<Harness tripId={7} />);
    screen.getByRole('button', { name: 'scan' }).click();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('offline'));
  });

  it('reports denied when the location permission is refused', async () => {
    getPos.mockRejectedValue(new GeoOnceError('permission-denied'));

    render(<Harness tripId={7} />);
    screen.getByRole('button', { name: 'scan' }).click();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('denied'));
  });

  it('falls back to the map centre when the browser cannot locate the device', async () => {
    getPos.mockRejectedValue(new GeoOnceError('unavailable'));
    scan.mockResolvedValue(answer());
    const getFallbackCenter = vi.fn(() => ({ lat: 22.5, lng: 114.2 }));

    render(<Harness tripId={7} getFallbackCenter={getFallbackCenter} />);
    screen.getByRole('button', { name: 'scan' }).click();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(getFallbackCenter).toHaveBeenCalled();
    expect(scan).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ lat: 22.5, lng: 114.2, mode: 'manual' }),
      'en',
      expect.any(AbortSignal)
    );
  });

  it('in map mode answers for the viewport centre and sends the quantised radius, with no geolocation', async () => {
    useTripStore.setState({ planMapViewport: VIEWPORT });
    scan.mockResolvedValue(answer());

    render(<Harness tripId={7} origin="map" />);
    screen.getByRole('button', { name: 'scan' }).click();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(getPos).not.toHaveBeenCalled();
    const body = scan.mock.calls[0]?.[1] as { lat: number; lng: number; radius?: number; mode: string };
    expect(body.lat).toBeCloseTo(22.305, 6);
    expect(body.lng).toBeCloseTo(114.175, 6);
    expect(body.radius).toBe(1000);
    expect(body.mode).toBe('manual');
    expect(screen.getByTestId('radius')).toHaveTextContent('1000');
  });

  it('in map mode ignores a viewport left over from another trip', async () => {
    useTripStore.setState({ planMapViewport: { ...VIEWPORT, tripId: 99 } });
    scan.mockResolvedValue(answer());
    const getFallbackCenter = vi.fn(() => ({ lat: 22.5, lng: 114.2 }));

    render(<Harness tripId={7} getFallbackCenter={getFallbackCenter} origin="map" />);
    screen.getByRole('button', { name: 'scan' }).click();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(getPos).not.toHaveBeenCalled();
    expect(scan).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ lat: 22.5, lng: 114.2, radius: 250 }),
      'en',
      expect.any(AbortSignal)
    );
  });

  it('in map mode falls back to the device fix when there is neither a viewport nor a map centre', async () => {
    getPos.mockResolvedValue({ lat: 1, lng: 2, accuracy: 3, heading: null, speed: null, timestamp: 1 });
    scan.mockResolvedValue(answer());

    render(<Harness tripId={7} origin="map" />);
    screen.getByRole('button', { name: 'scan' }).click();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(getPos).toHaveBeenCalled();
    expect(scan).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ lat: 1, lng: 2, radius: 250 }),
      'en',
      expect.any(AbortSignal)
    );
  });

  it('re-asks exactly once, debounced, when the map viewport moves', async () => {
    useTripStore.setState({ planMapViewport: VIEWPORT });
    scan.mockResolvedValue(answer());

    render(<Harness tripId={7} origin="map" />);
    screen.getByRole('button', { name: 'scan' }).click();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(scan).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    try {
      act(() => useTripStore.setState({ planMapViewport: VIEWPORT_MOVED }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(399);
      });
      expect(scan).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
        await Promise.resolve();
      });
      expect(scan).toHaveBeenCalledTimes(2);
      const movedBody = scan.mock.calls[1]?.[1] as { lat: number; lng: number; radius?: number };
      expect(movedBody.lat).toBeCloseTo(22.305, 6);
      expect(movedBody.lng).toBeCloseTo(114.275, 6);
      expect(movedBody.radius).toBe(1000);

      // A settle, then nothing more: the debounce fires once per move.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(scan).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-asks when the user switches the origin, even though the viewport did not move', async () => {
    useTripStore.setState({ planMapViewport: VIEWPORT });
    getPos.mockResolvedValue({ lat: 1, lng: 2, accuracy: 1, heading: null, speed: null, timestamp: 1 });
    scan.mockResolvedValue(answer());

    const { rerender } = render(<Harness tripId={7} origin="device" />);
    screen.getByRole('button', { name: 'scan' }).click();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(scan).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    try {
      rerender(<Harness tripId={7} origin="map" />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
        await Promise.resolve();
      });
      expect(scan).toHaveBeenCalledTimes(2);
      expect(scan.mock.calls[1]?.[1]).toMatchObject({ radius: 1000 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('never scans while the view is closed, even if asked or when the map moves', async () => {
    useTripStore.setState({ planMapViewport: VIEWPORT });
    scan.mockResolvedValue(answer());

    render(<Harness tripId={7} origin="map" enabled={false} />);
    screen.getByRole('button', { name: 'scan' }).click();

    vi.useFakeTimers();
    try {
      act(() => useTripStore.setState({ planMapViewport: VIEWPORT_MOVED }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(scan).not.toHaveBeenCalled();
      expect(screen.getByTestId('status')).toHaveTextContent('idle');
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops a superseded answer instead of writing it into a newer list', async () => {
    getPos.mockResolvedValue({ lat: 1, lng: 2, accuracy: 1, heading: null, speed: null, timestamp: 1 });
    let resolveFirst: ((value: ReturnType<typeof answer>) => void) | undefined;
    scan.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
    );
    scan.mockResolvedValueOnce(answer([suggestion({ providerId: 'newer' })]));

    render(<Harness tripId={7} />);
    screen.getByRole('button', { name: 'scan' }).click();
    await screen.findByTestId('status');

    screen.getByRole('button', { name: 'rescan' }).click();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    await act(async () => {
      resolveFirst?.(answer([suggestion({ providerId: 'late' }), suggestion({ providerId: 'later' })]));
      await Promise.resolve();
    });
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(scan).toHaveBeenCalledTimes(2);
  });
});
