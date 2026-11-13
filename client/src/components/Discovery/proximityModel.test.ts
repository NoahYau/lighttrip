import type { DiscoveryCategory, DiscoverySuggestion } from '@trek/shared';
import { describe, expect, it } from 'vitest';
import { createInitialProximityState, type ProximityState } from '../../store/slices/discoverySlice';
import { rankLocally, resetDailyIfNeeded, scanSuppression, shouldScan, shouldShow, toCell } from './proximityModel';

const NOON = new Date(2026, 0, 1, 12, 0, 0).getTime();
const HOUR = 3_600_000;
const MINUTE = 60_000;

function makeState(over: Partial<ProximityState> = {}): ProximityState {
  return { ...createInitialProximityState(), ...over };
}

function makeFix(
  over: Partial<{
    lat: number;
    lng: number;
    accuracy: number;
    speed: number | null;
    heading: number | null;
    timestamp: number;
  }> = {}
): {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
} {
  return { lat: 22.3027, lng: 114.1772, accuracy: 24, speed: null, heading: null, timestamp: NOON, ...over };
}

function makeSuggestion(over: Partial<DiscoverySuggestion> = {}): DiscoverySuggestion {
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

function categoryCooldown(category: DiscoveryCategory, at: number): Record<DiscoveryCategory, number> {
  return { nature: 0, culture: 0, food: 0, shopping: 0, other: 0, [category]: at };
}

describe('toCell (150 m grid boundary)', () => {
  it('keeps a few metres in one cell and splits past ~150 m', () => {
    const base = toCell(48.8566, 2.3522);
    expect(toCell(48.85665, 2.35225)).toBe(base);
    expect(toCell(48.8588, 2.3522)).not.toBe(base);
  });
});

describe('scanSuppression', () => {
  it('rejects a fix over the 80 m accuracy cap and accepts the boundary', () => {
    expect(scanSuppression(makeState(), makeFix({ accuracy: 81 }), NOON)).toBe('accuracy');
    expect(scanSuppression(makeState(), makeFix({ accuracy: 80 }), NOON)).toBeNull();
  });

  it('rejects speed only once it has been sustained 30 s', () => {
    const sustained = makeState({ speedAboveLimitSince: NOON - 30_000 });
    const notYet = makeState({ speedAboveLimitSince: NOON - 10_000 });
    expect(scanSuppression(sustained, makeFix(), NOON)).toBe('speed');
    expect(scanSuppression(notYet, makeFix(), NOON)).toBeNull();
    expect(scanSuppression(makeState(), makeFix(), NOON)).toBeNull();
  });

  it('rejects during quiet hours (22:00 to 07:00)', () => {
    const night = new Date(2026, 0, 1, 23, 0).getTime();
    const lastMinute = new Date(2026, 0, 1, 6, 59).getTime();
    const morning = new Date(2026, 0, 1, 7, 0).getTime();
    const evening = new Date(2026, 0, 1, 21, 59).getTime();
    expect(scanSuppression(makeState(), makeFix(), night)).toBe('quiet-hours');
    expect(scanSuppression(makeState(), makeFix(), lastMinute)).toBe('quiet-hours');
    expect(scanSuppression(makeState(), makeFix(), morning)).toBeNull();
    expect(scanSuppression(makeState(), makeFix(), evening)).toBeNull();
  });

  it('rejects at the daily cap and allows just under it', () => {
    expect(scanSuppression(makeState({ dailyShown: 8 }), makeFix(), NOON)).toBe('daily-cap');
    expect(scanSuppression(makeState({ dailyShown: 7 }), makeFix(), NOON)).toBeNull();
  });
});

describe('shouldScan', () => {
  it('scans on the very first tick because nothing has scanned yet', () => {
    const state = makeState({ roamEnabled: true, lastScanAt: 0 });
    expect(shouldScan(state, makeFix(), NOON)).toBe(true);
  });

  it('refuses while roaming is off', () => {
    expect(shouldScan(makeState({ roamEnabled: false }), makeFix(), NOON)).toBe(false);
  });

  it('refuses when a fix-quality or environment suppression is active', () => {
    expect(shouldScan(makeState({ roamEnabled: true }), makeFix({ accuracy: 81 }), NOON)).toBe(false);
    expect(shouldScan(makeState({ roamEnabled: true, speedAboveLimitSince: NOON - 30_000 }), makeFix(), NOON)).toBe(
      false
    );
    expect(shouldScan(makeState({ roamEnabled: true, dailyShown: 8 }), makeFix(), NOON)).toBe(false);
  });

  it('scans when the 90 s interval has elapsed even without movement', () => {
    const cell = toCell(22.3027, 114.1772);
    const state = makeState({ roamEnabled: true, lastScanAt: NOON - 90_000, lastCell: cell });
    expect(shouldScan(state, makeFix(), NOON)).toBe(true);
  });

  it('scans when the user has moved into a new cell before the interval', () => {
    const state = makeState({ roamEnabled: true, lastScanAt: NOON - 10_000, lastCell: '0:0' });
    expect(shouldScan(state, makeFix(), NOON)).toBe(true);
  });

  it('does not scan when neither the interval elapsed nor the cell changed', () => {
    const cell = toCell(22.3027, 114.1772);
    const state = makeState({ roamEnabled: true, lastScanAt: NOON - 10_000, lastCell: cell });
    expect(shouldScan(state, makeFix(), NOON)).toBe(false);
  });
});

describe('shouldShow', () => {
  it('returns ok when nothing suppresses the candidate', () => {
    expect(shouldShow(makeState(), makeSuggestion(), NOON)).toEqual({ ok: true });
  });

  it('suppresses an in-trip place before anything else', () => {
    const state = makeState({ inTrip: ['osm:node:1'], dismissed: { 'osm:node:1': NOON } });
    expect(shouldShow(state, makeSuggestion(), NOON)).toEqual({ ok: false, reason: 'already-in-trip' });
  });

  it('suppresses a dismissed place', () => {
    const state = makeState({ dismissed: { 'osm:node:1': NOON } });
    expect(shouldShow(state, makeSuggestion(), NOON)).toEqual({ ok: false, reason: 'dismissed' });
  });

  it('suppresses sustained speed', () => {
    const state = makeState({ speedAboveLimitSince: NOON - 30_000 });
    expect(shouldShow(state, makeSuggestion(), NOON)).toEqual({ ok: false, reason: 'speed' });
  });

  it('suppresses during quiet hours', () => {
    const night = new Date(2026, 0, 1, 23, 0).getTime();
    expect(shouldShow(makeState(), makeSuggestion(), night)).toEqual({ ok: false, reason: 'quiet-hours' });
  });

  it('suppresses a POI inside its 24 h cooldown and releases it after', () => {
    const inside = makeState({
      cooldown: { poi: { 'osm:node:1': NOON - HOUR }, category: categoryCooldown('culture', 0) },
    });
    const released = makeState({
      cooldown: { poi: { 'osm:node:1': NOON - 25 * HOUR }, category: categoryCooldown('culture', 0) },
    });
    expect(shouldShow(inside, makeSuggestion(), NOON)).toEqual({ ok: false, reason: 'poi-cooldown' });
    expect(shouldShow(released, makeSuggestion(), NOON)).toEqual({ ok: true });
  });

  it('suppresses a category inside its 30 min cooldown and releases it after', () => {
    const inside = makeState({ cooldown: { poi: {}, category: categoryCooldown('culture', NOON - 10 * MINUTE) } });
    const released = makeState({ cooldown: { poi: {}, category: categoryCooldown('culture', NOON - 31 * MINUTE) } });
    expect(shouldShow(inside, makeSuggestion(), NOON)).toEqual({ ok: false, reason: 'category-cooldown' });
    expect(shouldShow(released, makeSuggestion(), NOON)).toEqual({ ok: true });
  });

  it('suppresses at the daily cap', () => {
    expect(shouldShow(makeState({ dailyShown: 8 }), makeSuggestion(), NOON)).toEqual({
      ok: false,
      reason: 'daily-cap',
    });
  });
});

describe('rankLocally', () => {
  it('cuts candidates past the radius and ranks by score then distance', () => {
    const far = makeSuggestion({ providerId: 'far', distanceM: 300 });
    const a = makeSuggestion({ providerId: 'a', score: 0.8, distanceM: 200 });
    const b = makeSuggestion({ providerId: 'b', score: 0.8, distanceM: 120 });
    const c = makeSuggestion({ providerId: 'c', score: 0.95, distanceM: 240 });
    expect(rankLocally([far, a, b, c]).map((s) => s.providerId)).toEqual(['c', 'b', 'a']);
  });
});

describe('resetDailyIfNeeded', () => {
  it('leaves the count alone within the same local day', () => {
    const state = makeState({ dailyShown: 5, dailyShownDate: '2026-01-01' });
    const sameDay = new Date(2026, 0, 1, 18, 0).getTime();
    expect(resetDailyIfNeeded(state, sameDay).dailyShown).toBe(5);
  });

  it('resets the count across midnight', () => {
    const state = makeState({ dailyShown: 8, dailyShownDate: '2026-01-01' });
    const nextDay = new Date(2026, 0, 2, 0, 30).getTime();
    const next = resetDailyIfNeeded(state, nextDay);
    expect(next.dailyShown).toBe(0);
    expect(next.dailyShownDate).toBe('2026-01-02');
  });
});
