import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { carbonLeg, tripCarbon } from '../../../tests/helpers/carbon';
import { carbonRepo } from '../../repo/carbonRepo';
import { OnlineOnlyError } from '../../repo/onlineOnly';
import { useCarbon } from './useCarbon';

vi.mock('../../repo/carbonRepo', () => ({ carbonRepo: { footprint: vi.fn() } }));

const footprint = vi.mocked(carbonRepo.footprint);

beforeEach(() => {
  footprint.mockReset();
});

describe('useCarbon', () => {
  it('loads the trip’s footprint and opens on the leg worth comparing', async () => {
    footprint.mockResolvedValue(
      tripCarbon({
        total_grams: 30_000,
        legs: [
          carbonLeg({ id: 'small', grams: 500 }),
          carbonLeg({ id: 'big', grams: 30_000, distance_km: 600, mode: 'flight', transport_mode: 'flight' }),
        ],
      })
    );

    const { result } = renderHook(() => useCarbon(7));
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.footprint?.total_grams).toBe(30_000);
    expect(result.current.selectedLeg?.id).toBe('big');
    expect(result.current.options.length).toBe(12);
    expect(result.current.best?.mode).toBe('ferry');
    expect(footprint).toHaveBeenCalledWith(7, expect.any(AbortSignal));
  });

  it('switches the comparison to another leg without asking again', async () => {
    footprint.mockResolvedValue(
      tripCarbon({
        legs: [carbonLeg({ id: 'a', grams: 500 }), carbonLeg({ id: 'b', grams: 900 })],
      })
    );
    const { result } = renderHook(() => useCarbon(7));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.selectedLeg?.id).toBe('b');

    act(() => result.current.selectLeg('a'));
    expect(result.current.selectedLeg?.id).toBe('a');
    expect(footprint).toHaveBeenCalledTimes(1);
  });

  it('shows a leg the trip no longer holds as the default again', async () => {
    footprint.mockResolvedValue(tripCarbon({ legs: [carbonLeg({ id: 'a', grams: 900 })] }));
    const { result } = renderHook(() => useCarbon(7));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.selectLeg('gone'));
    expect(result.current.selectedLeg?.id).toBe('a');
  });

  it('says the estimate needs a connection when the app is offline', async () => {
    footprint.mockRejectedValue(new OnlineOnlyError());
    const { result } = renderHook(() => useCarbon(7));
    await waitFor(() => expect(result.current.status).toBe('offline'));
    expect(result.current.footprint).toBeNull();
  });

  it('shows a failure, and retries it on request', async () => {
    footprint.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(tripCarbon());
    const { result } = renderHook(() => useCarbon(7));
    await waitFor(() => expect(result.current.status).toBe('error'));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(footprint).toHaveBeenCalledTimes(2);
  });

  it('offers no comparison for a trip without a comparable leg', async () => {
    footprint.mockResolvedValue(tripCarbon({ legs: [carbonLeg({ grams: null, mode: null, distance_km: 0 })] }));
    const { result } = renderHook(() => useCarbon(7));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.selectedLeg?.mode).toBeNull();
    expect(result.current.options).toEqual([]);
    expect(result.current.best).toBeNull();
  });
});
