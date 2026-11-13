import type { DiscoveryCategory } from '@trek/shared';
import type { StoreApi } from 'zustand';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Discovery roaming state (PR2). This slice owns the roaming engine's durable
 * state — the roam switch, the per-day shown count, the cooldown tables and the
 * negative feedback — and persists it under the `discovery` key so a reload
 * does not restart the day's budget or re-offer a place the user dismissed.
 *
 * `ProximityState` lives here, not in `proximityModel.ts`, because the layering
 * gate forbids a store from importing `components/`; the model re-exports it so
 * callers keep importing the type from the model as the contract describes.
 */

/**
 * The full roaming state the engine hands to the pure functions in
 * `proximityModel`. `dailyShownDate` is the one addition over the §A field
 * list: the daily cap resets at midnight, so the store has to remember which
 * day `dailyShown` counts.
 */
export interface ProximityState {
  roamEnabled: boolean;
  dailyShown: number;
  /** 'YYYY-MM-DD' in the device's local time — the day `dailyShown` counts. */
  dailyShownDate: string;
  lastScanAt: number;
  lastCell: string;
  lastShownCategory: DiscoveryCategory | null;
  cooldown: {
    poi: Record<string, number>;
    category: Record<DiscoveryCategory, number>;
  };
  dismissed: Record<string, number>;
  inTrip: string[];
  speedAboveLimitSince: number | null;
}

/** 'YYYY-MM-DD' for a timestamp in the device's local time. */
export function localDateKey(now: number): string {
  const d = new Date(now);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** A fresh category cooldown table: every category starts "never cooled down". */
export function emptyCategoryCooldown(): Record<DiscoveryCategory, number> {
  return { nature: 0, culture: 0, food: 0, shopping: 0, other: 0 };
}

/** Resets `dailyShown` when `now` has crossed into a new local day. Pure. */
export function resetDailyIfNeeded(state: ProximityState, now: number): ProximityState {
  const today = localDateKey(now);
  if (state.dailyShownDate === today) return state;
  return { ...state, dailyShown: 0, dailyShownDate: today };
}

export function createInitialProximityState(): ProximityState {
  return {
    roamEnabled: false,
    dailyShown: 0,
    dailyShownDate: localDateKey(Date.now()),
    lastScanAt: 0,
    lastCell: '',
    lastShownCategory: null,
    cooldown: { poi: {}, category: emptyCategoryCooldown() },
    dismissed: {},
    inTrip: [],
    speedAboveLimitSince: null,
  };
}

type SetState = StoreApi<DiscoverySlice>['setState'];

export interface DiscoverySlice extends ProximityState {
  setRoamEnabled: (enabled: boolean) => void;
  toggleRoam: () => void;
  recordScan: (cell: string, now: number) => void;
  recordShown: (category: DiscoveryCategory) => void;
  recordAccepted: (providerId: string, category: DiscoveryCategory, now: number) => void;
  recordDismissed: (providerId: string, category: DiscoveryCategory, now: number) => void;
  markInTrip: (providerId: string) => void;
  setSpeedAboveLimit: (since: number | null) => void;
  resetDaily: (now: number) => void;
}

export const createDiscoverySlice = (set: SetState): DiscoverySlice => ({
  ...createInitialProximityState(),

  setRoamEnabled: (enabled) => set({ roamEnabled: enabled }),

  toggleRoam: () => set((state) => ({ roamEnabled: !state.roamEnabled })),

  recordScan: (cell, now) => set({ lastScanAt: now, lastCell: cell }),

  recordShown: (category) =>
    set((state) => {
      // Re-anchor the day first so a card shown just after midnight does not
      // keep counting against yesterday's budget.
      const reset = resetDailyIfNeeded(state, Date.now());
      return { ...reset, dailyShown: reset.dailyShown + 1, lastShownCategory: category };
    }),

  recordAccepted: (providerId, category, now) =>
    set((state) => ({
      cooldown: {
        poi: { ...state.cooldown.poi, [providerId]: now },
        category: { ...state.cooldown.category, [category]: now },
      },
      // "Add to today" means the place is now part of the trip, so the
      // already-in-trip suppression applies to it from here on.
      inTrip: state.inTrip.includes(providerId) ? state.inTrip : [...state.inTrip, providerId],
    })),

  recordDismissed: (providerId, category, now) =>
    set((state) => ({
      dismissed: { ...state.dismissed, [providerId]: now },
      cooldown: {
        ...state.cooldown,
        category: { ...state.cooldown.category, [category]: now },
      },
    })),

  markInTrip: (providerId) =>
    set((state) => (state.inTrip.includes(providerId) ? state : { inTrip: [...state.inTrip, providerId] })),

  setSpeedAboveLimit: (since) => set({ speedAboveLimitSince: since }),

  resetDaily: (now) => set((state) => resetDailyIfNeeded(state, now)),
});

export const useDiscoveryStore = create<DiscoverySlice>()(
  persist((set) => createDiscoverySlice(set), {
    name: 'discovery',
    // Only the durable fields survive a reload: the switch, the day's count
    // (and which day it counts), the cooldown tables and the negative
    // feedback. The scan cadence and the speed tracking are per-session.
    partialize: (state) => ({
      roamEnabled: state.roamEnabled,
      dailyShown: state.dailyShown,
      dailyShownDate: state.dailyShownDate,
      cooldown: state.cooldown,
      dismissed: state.dismissed,
      inTrip: state.inTrip,
    }),
  })
);
