import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialProximityState, useDiscoveryStore, type ProximityState } from './discoverySlice';

describe('discoverySlice', () => {
  beforeEach(() => {
    localStorage.clear();
    useDiscoveryStore.setState(createInitialProximityState());
  });

  it('toggleRoam flips the roam switch', () => {
    expect(useDiscoveryStore.getState().roamEnabled).toBe(false);
    useDiscoveryStore.getState().toggleRoam();
    expect(useDiscoveryStore.getState().roamEnabled).toBe(true);
    useDiscoveryStore.getState().toggleRoam();
    expect(useDiscoveryStore.getState().roamEnabled).toBe(false);
  });

  it('setRoamEnabled forces the switch', () => {
    useDiscoveryStore.getState().setRoamEnabled(true);
    expect(useDiscoveryStore.getState().roamEnabled).toBe(true);
  });

  it('recordShown increments the daily count and remembers the category', () => {
    useDiscoveryStore.getState().recordShown('culture');
    expect(useDiscoveryStore.getState().dailyShown).toBe(1);
    expect(useDiscoveryStore.getState().lastShownCategory).toBe('culture');
    useDiscoveryStore.getState().recordShown('food');
    expect(useDiscoveryStore.getState().dailyShown).toBe(2);
    expect(useDiscoveryStore.getState().lastShownCategory).toBe('food');
  });

  it('resetDaily zeroes the count across midnight', () => {
    useDiscoveryStore.setState({ dailyShown: 8, dailyShownDate: '2026-01-01' });
    useDiscoveryStore.getState().resetDaily(new Date(2026, 0, 2, 0, 30).getTime());
    expect(useDiscoveryStore.getState().dailyShown).toBe(0);
    expect(useDiscoveryStore.getState().dailyShownDate).toBe('2026-01-02');
  });

  it('resetDaily leaves the same day untouched', () => {
    useDiscoveryStore.setState({ dailyShown: 5, dailyShownDate: '2026-01-01' });
    useDiscoveryStore.getState().resetDaily(new Date(2026, 0, 1, 18, 0).getTime());
    expect(useDiscoveryStore.getState().dailyShown).toBe(5);
  });

  it('recordAccepted writes the cooldown tables and marks the place in-trip', () => {
    const now = Date.now();
    useDiscoveryStore.getState().recordAccepted('osm:node:1', 'culture', now);
    const s = useDiscoveryStore.getState();
    expect(s.cooldown.poi['osm:node:1']).toBe(now);
    expect(s.cooldown.category.culture).toBe(now);
    expect(s.inTrip).toContain('osm:node:1');
  });

  it('recordDismissed writes the dismissed stamp and the category cooldown', () => {
    const now = Date.now();
    useDiscoveryStore.getState().recordDismissed('osm:node:1', 'culture', now);
    const s = useDiscoveryStore.getState();
    expect(s.dismissed['osm:node:1']).toBe(now);
    expect(s.cooldown.category.culture).toBe(now);
    expect(s.cooldown.poi['osm:node:1']).toBeUndefined();
    expect(s.inTrip).not.toContain('osm:node:1');
  });

  it('markInTrip adds a provider only once', () => {
    useDiscoveryStore.getState().markInTrip('osm:node:1');
    useDiscoveryStore.getState().markInTrip('osm:node:1');
    expect(useDiscoveryStore.getState().inTrip).toEqual(['osm:node:1']);
  });

  it('recordScan stores the cell and the timestamp', () => {
    const now = Date.now();
    useDiscoveryStore.getState().recordScan('c:1', now);
    expect(useDiscoveryStore.getState().lastCell).toBe('c:1');
    expect(useDiscoveryStore.getState().lastScanAt).toBe(now);
  });

  it('setSpeedAboveLimit stores and clears the sustained-speed stamp', () => {
    const now = Date.now();
    useDiscoveryStore.getState().setSpeedAboveLimit(now);
    expect(useDiscoveryStore.getState().speedAboveLimitSince).toBe(now);
    useDiscoveryStore.getState().setSpeedAboveLimit(null);
    expect(useDiscoveryStore.getState().speedAboveLimitSince).toBeNull();
  });

  it('persists only the durable fields under the discovery key', () => {
    useDiscoveryStore.getState().setRoamEnabled(true);
    useDiscoveryStore.getState().recordScan('c:1', 123);

    const raw = localStorage.getItem('discovery');
    expect(raw).toBeTruthy();
    const persisted = JSON.parse(raw ?? '{}') as { state?: Partial<ProximityState> };
    expect(persisted.state?.roamEnabled).toBe(true);
    expect(persisted.state?.cooldown).toBeDefined();
    expect(persisted.state?.lastScanAt).toBeUndefined();
    expect(persisted.state?.speedAboveLimitSince).toBeUndefined();
  });
});
