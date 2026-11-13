import type { DiscoveryScanRequest, DiscoverySuggestion } from '@trek/shared';
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useGeolocation, type GeoPosition } from '../../hooks/useGeolocation';
import { useTranslation } from '../../i18n';
import { discoveryRepo } from '../../repo/discoveryRepo';
import { useDiscoveryStore } from '../../store/slices/discoverySlice';
import {
  CARD_TTL_S,
  SCAN_INTERVAL_S,
  SPEED_LIMIT_MPS,
  rankLocally,
  scanSuppression,
  shouldScan,
  shouldShow,
  toCell,
} from './proximityModel';

/**
 * The Discovery roaming engine (PR2 §B). It ties the geolocation watch to the
 * foreground state machine `idle → tracking → suppressed → scanning → showing →
 * cooldown`, fires a `mode: 'roam'` scan on a 90 s / cell-change cadence, and
 * exposes only what a card and a roam pill need. It renders no UI and never
 * touches trip data: `accept` records the acceptance and the caller performs the
 * actual "add to today" against the places store.
 */

export type ProximityStatus = 'idle' | 'tracking' | 'suppressed' | 'scanning' | 'showing' | 'cooldown';

export interface ProximityEngine {
  roamEnabled: boolean;
  toggleRoam: () => void;
  status: ProximityStatus;
  current: DiscoverySuggestion | null;
  dismiss: () => void;
  accept: () => void;
}

const TICK_MS = 1000;
const COOLDOWN_MS = SCAN_INTERVAL_S * 1000;

/** The mutable pieces the scan and the heartbeat share. Held in refs so the top-level helpers stay stable. */
interface EngineInternals {
  tripId: number;
  language: string;
  statusRef: MutableRefObject<ProximityStatus>;
  currentRef: MutableRefObject<DiscoverySuggestion | null>;
  positionRef: MutableRefObject<GeoPosition | null>;
  shownAtRef: MutableRefObject<number>;
  cooldownUntilRef: MutableRefObject<number>;
  scanningRef: MutableRefObject<boolean>;
  controllerRef: MutableRefObject<AbortController | null>;
  setStatus: (s: ProximityStatus) => void;
  setCurrent: (c: DiscoverySuggestion | null) => void;
  goToCooldown: () => void;
}

/** One `mode: 'roam'` scan: dedupe, rank and show the first candidate that passes the suppression rules. */
async function runEngineScan(internal: EngineInternals, fix: GeoPosition): Promise<void> {
  if (internal.scanningRef.current) return;
  internal.scanningRef.current = true;
  internal.setStatus('scanning');
  internal.controllerRef.current?.abort();
  const controller = new AbortController();
  internal.controllerRef.current = controller;
  try {
    const body: DiscoveryScanRequest = {
      lat: fix.lat,
      lng: fix.lng,
      accuracy: fix.accuracy,
      heading: fix.heading,
      speed: fix.speed,
      cell: toCell(fix.lat, fix.lng),
      mode: 'roam',
      at: new Date().toISOString(),
    };
    const result = await discoveryRepo.scan(internal.tripId, body, internal.language, controller.signal);
    if (controller.signal.aborted) return;
    const now = Date.now();
    useDiscoveryStore.getState().recordScan(body.cell, now);
    const ranked = rankLocally(result.suggestions);
    if (ranked.length === 0) {
      internal.setStatus('tracking');
      return;
    }
    for (const candidate of ranked) {
      if (shouldShow(useDiscoveryStore.getState(), candidate, now).ok) {
        useDiscoveryStore.getState().recordShown(candidate.category);
        internal.setCurrent(candidate);
        internal.setStatus('showing');
        internal.shownAtRef.current = now;
        return;
      }
    }
    internal.setStatus('suppressed');
  } catch {
    if (controller.signal.aborted) return;
    internal.setStatus('tracking');
  } finally {
    internal.scanningRef.current = false;
  }
}

/** The one-second heartbeat: re-evaluate suppression and fire a scan on the cadence. */
function tickEngine(internal: EngineInternals, now: number): void {
  const store = useDiscoveryStore.getState();
  store.resetDaily(now);

  const fix = internal.positionRef.current;
  if (fix) {
    const over = fix.speed !== null && fix.speed > SPEED_LIMIT_MPS;
    const since = store.speedAboveLimitSince;
    if (over && since === null) store.setSpeedAboveLimit(now);
    else if (!over && since !== null) store.setSpeedAboveLimit(null);
  }

  const statusNow = internal.statusRef.current;
  if (statusNow === 'showing') {
    if (now - internal.shownAtRef.current >= CARD_TTL_S * 1000) internal.goToCooldown();
    return;
  }
  if (statusNow === 'cooldown') {
    if (now >= internal.cooldownUntilRef.current) internal.setStatus('tracking');
    return;
  }
  if (statusNow === 'scanning') return;
  if (statusNow === 'idle') {
    internal.setStatus('tracking');
    return;
  }
  if (!fix) {
    internal.setStatus('suppressed');
    return;
  }
  if (shouldScan(store, fix, now)) {
    void runEngineScan(internal, fix);
  } else {
    internal.setStatus(scanSuppression(store, fix, now) === null ? 'tracking' : 'suppressed');
  }
}

export function useProximityEngine(tripId: number): ProximityEngine {
  const { position, setMode } = useGeolocation();
  const { language } = useTranslation();
  const roamEnabled = useDiscoveryStore((s) => s.roamEnabled);
  const [status, setStatus] = useState<ProximityStatus>('idle');
  const [current, setCurrent] = useState<DiscoverySuggestion | null>(null);

  const statusRef = useRef(status);
  const currentRef = useRef(current);
  const positionRef = useRef<GeoPosition | null>(null);
  const shownAtRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  const scanningRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  // Latest status/current, for the event handlers and the heartbeat to read
  // without writing a ref during render (react-hooks/refs).
  useEffect(() => {
    statusRef.current = status;
    currentRef.current = current;
  }, [status, current]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const goToCooldown = useCallback(() => {
    setCurrent(null);
    setStatus('cooldown');
    cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
  }, []);

  // The roam pill's one action. It is the user gesture, so the iOS orientation
  // permission prompt is allowed to fire from here (setMode('follow')).
  const toggleRoam = useCallback(() => {
    const next = !useDiscoveryStore.getState().roamEnabled;
    useDiscoveryStore.getState().setRoamEnabled(next);
    if (next) {
      setMode('follow');
      setStatus('tracking');
    } else {
      setMode('off');
      setStatus('idle');
      setCurrent(null);
      controllerRef.current?.abort();
    }
  }, [setMode]);

  const dismiss = useCallback(() => {
    const cur = currentRef.current;
    if (cur) useDiscoveryStore.getState().recordDismissed(cur.providerId, cur.category, Date.now());
    goToCooldown();
  }, [goToCooldown]);

  const accept = useCallback(() => {
    const cur = currentRef.current;
    if (cur) useDiscoveryStore.getState().recordAccepted(cur.providerId, cur.category, Date.now());
    goToCooldown();
  }, [goToCooldown]);

  const internals = useMemo<EngineInternals>(
    () => ({
      tripId,
      language,
      statusRef,
      currentRef,
      positionRef,
      shownAtRef,
      cooldownUntilRef,
      scanningRef,
      controllerRef,
      setStatus,
      setCurrent,
      goToCooldown,
    }),
    [tripId, language, goToCooldown]
  );

  // The foreground heartbeat while roaming.
  useEffect(() => {
    if (!roamEnabled) return;
    const id = setInterval(() => tickEngine(internals, Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [roamEnabled, internals]);

  // Abort an in-flight scan when the host unmounts.
  useEffect(() => () => controllerRef.current?.abort(), []);

  return { roamEnabled, toggleRoam, status, current, dismiss, accept };
}
