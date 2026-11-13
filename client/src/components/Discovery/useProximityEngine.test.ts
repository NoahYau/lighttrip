import { act, renderHook } from '@testing-library/react';
import type { DiscoverySuggestion } from '@trek/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGeolocation } from '../../hooks/useGeolocation';
import { discoveryRepo } from '../../repo/discoveryRepo';
import { createInitialProximityState, useDiscoveryStore } from '../../store/slices/discoverySlice';
import { useProximityEngine } from './useProximityEngine';

vi.mock('../../hooks/useGeolocation', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../hooks/useGeolocation')>();
  return { ...mod, useGeolocation: vi.fn() };
});
vi.mock('../../repo/discoveryRepo', () => ({ discoveryRepo: { scan: vi.fn() } }));
vi.mock('../../i18n', () => ({ useTranslation: () => ({ language: 'en' }) }));

const mockUseGeolocation = vi.mocked(useGeolocation);
const scan = vi.mocked(discoveryRepo.scan);
const setMode = vi.fn();

const NOON = new Date(2026, 0, 1, 12, 0, 0).getTime();

function geoPosition(over: Partial<{ lat: number; lng: number; accuracy: number; speed: number | null }> = {}) {
  return { lat: 22.3027, lng: 114.1772, accuracy: 24, speed: null, heading: null, timestamp: NOON, ...over };
}

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

function setGeo(over: Partial<{ lat: number; lng: number; accuracy: number; speed: number | null }> = {}) {
  mockUseGeolocation.mockReturnValue({
    position: geoPosition(over),
    mode: 'follow',
    error: null,
    errorCode: null,
    cycleMode: vi.fn(),
    setMode,
  });
}

function goodScan() {
  scan.mockResolvedValue({
    suggestions: [suggestion()],
    servedAt: '2026-01-01T12:00:00.000Z',
    cell: 'c',
    ttlSeconds: 86400,
  });
}

function showOne() {
  setGeo();
  goodScan();
  const view = renderHook(() => useProximityEngine(7));
  act(() => view.result.current.toggleRoam());
  return view;
}

beforeEach(() => {
  mockUseGeolocation.mockReset();
  scan.mockReset();
  setMode.mockReset();
  localStorage.clear();
  useDiscoveryStore.setState(createInitialProximityState());
  vi.useFakeTimers();
  vi.setSystemTime(NOON);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useProximityEngine', () => {
  it('starts idle and toggles into tracking with follow mode', () => {
    setGeo();
    const { result } = renderHook(() => useProximityEngine(7));

    expect(result.current.roamEnabled).toBe(false);
    expect(result.current.status).toBe('idle');

    act(() => result.current.toggleRoam());
    expect(result.current.roamEnabled).toBe(true);
    expect(result.current.status).toBe('tracking');
    expect(setMode).toHaveBeenCalledWith('follow');
  });

  it('stops and returns to idle', () => {
    setGeo();
    const { result } = renderHook(() => useProximityEngine(7));

    act(() => result.current.toggleRoam());
    act(() => result.current.toggleRoam());
    expect(result.current.roamEnabled).toBe(false);
    expect(result.current.status).toBe('idle');
    expect(setMode).toHaveBeenCalledWith('off');
  });

  it('scans after the first interval and shows a candidate', async () => {
    setGeo();
    goodScan();
    const { result } = renderHook(() => useProximityEngine(7));

    act(() => result.current.toggleRoam());
    expect(result.current.status).toBe('tracking');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.status).toBe('showing');
    expect(result.current.current?.name).toBe('Old Pumping Station');
    expect(scan).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ mode: 'roam', cell: expect.any(String) as string }),
      'en',
      expect.any(AbortSignal)
    );
  });

  it('stays suppressed when the fix is too inaccurate and never scans', async () => {
    setGeo({ accuracy: 90 });
    const { result } = renderHook(() => useProximityEngine(7));

    act(() => result.current.toggleRoam());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.status).toBe('suppressed');
    expect(scan).not.toHaveBeenCalled();
  });

  it('dismiss records the dismissal and enters cooldown', async () => {
    const { result } = showOne();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.status).toBe('showing');

    act(() => result.current.dismiss());
    expect(result.current.status).toBe('cooldown');
    expect(result.current.current).toBeNull();
    expect(useDiscoveryStore.getState().dismissed['osm:node:1']).toBeDefined();
  });

  it('accept records the acceptance and enters cooldown', async () => {
    const { result } = showOne();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    act(() => result.current.accept());
    expect(result.current.status).toBe('cooldown');
    expect(useDiscoveryStore.getState().inTrip).toContain('osm:node:1');
    expect(useDiscoveryStore.getState().cooldown.poi['osm:node:1']).toBeDefined();
  });

  it('collapses a shown card on its own after the card TTL', async () => {
    const { result } = showOne();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.status).toBe('showing');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });
    expect(result.current.status).toBe('cooldown');
  });

  it('leaves cooldown for tracking after the cooldown elapses', async () => {
    const { result } = showOne();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    act(() => result.current.dismiss());
    expect(result.current.status).toBe('cooldown');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(90_000);
    });
    expect(result.current.status).toBe('tracking');
  });

  it('returns to tracking when the scan finds nothing nearby', async () => {
    setGeo();
    scan.mockResolvedValue({ suggestions: [], servedAt: '2026-01-01T12:00:00.000Z', cell: 'c', ttlSeconds: 86400 });
    const { result } = renderHook(() => useProximityEngine(7));

    act(() => result.current.toggleRoam());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.status).toBe('tracking');
  });

  it('suppresses when every candidate is already in the trip', async () => {
    setGeo();
    goodScan();
    useDiscoveryStore.setState({ inTrip: ['osm:node:1'] });
    const { result } = renderHook(() => useProximityEngine(7));

    act(() => result.current.toggleRoam());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.status).toBe('suppressed');
  });

  it('falls back to tracking when the scan fails', async () => {
    setGeo();
    scan.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useProximityEngine(7));

    act(() => result.current.toggleRoam());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.status).toBe('tracking');
  });

  it('suppresses while speed has been sustained over the limit', async () => {
    setGeo({ speed: 6 });
    useDiscoveryStore.setState({ speedAboveLimitSince: NOON - 30_000 });
    const { result } = renderHook(() => useProximityEngine(7));

    act(() => result.current.toggleRoam());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.status).toBe('suppressed');
    expect(scan).not.toHaveBeenCalled();
  });
});
