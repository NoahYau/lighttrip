import type { DiscoveryScanRequest, DiscoverySuggestion } from '@trek/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GeoOnceError, getCurrentPositionOnce } from '../../hooks/useGeolocation';
import { useTranslation } from '../../i18n';
import { discoveryRepo } from '../../repo/discoveryRepo';
import { OnlineOnlyError } from '../../repo/onlineOnly';
import { useTripStore } from '../../store/tripStore';
import {
  DEFAULT_SCAN_RADIUS_M,
  originFromViewport,
  toCell,
  type NearbyOriginMode,
  type NearbyStatus,
} from './nearbyModel';

/** How long the map must settle before the auto-follow re-asks, in ms. */
const AUTO_FOLLOW_DEBOUNCE_MS = 400;

/** The status an error maps to, shared by the two failure points in `run`. */
function nearbyErrorStatus(error: unknown): NearbyStatus {
  if (error instanceof OnlineOnlyError) return 'offline';
  if (error instanceof GeoOnceError && error.code === 'permission-denied') return 'denied';
  if (error instanceof GeoOnceError) return 'unavailable';
  return 'error';
}

/** A position the scan can be run from: a fix, or the map centre the caller hands over. */
interface Origin {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
}

/** The device's one-shot fix as a scan origin, carrying its fix quality. */
function originFromFix(fix: {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
}): Origin {
  return { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, heading: fix.heading, speed: fix.speed };
}

/** A point the caller supplied (map centre, viewport centre) as a scan origin. */
function originFromPoint(point: { lat: number; lng: number }): Origin {
  return { lat: point.lat, lng: point.lng, accuracy: 0, heading: null, speed: null };
}

/**
 * What the callers may configure. Everything is optional: calling the hook with
 * the two positional arguments only keeps the original "near me" behaviour.
 */
export interface UseNearbyDiscoveryOptions {
  /**
   * Where the scan asks about. `'device'` (the default) is the original flow: one
   * GPS fix, sent without a radius so the server's 250 m default applies.
   * `'map'` answers for the region the plan map is showing: the viewport centre
   * and a quantised radius, with **no** geolocation call while a viewport is
   * available (see `originFromViewport`); it falls back to `getFallbackCenter`
   * and then to the device fix when there is none.
   */
  origin?: NearbyOriginMode;
  /**
   * Whether the view is open; defaults to `true`. The phone sheet stays mounted
   * while closed, so it passes its `open` flag here: while `false` no scan
   * starts, a pending auto-follow does not fire, and an in-flight scan is
   * aborted so a late answer never writes into a closed view.
   */
  enabled?: boolean;
}

/** What the views get back. `scan`, `retry` and `rescan` are the same action. */
export interface UseNearbyDiscoveryResult {
  status: NearbyStatus;
  suggestions: DiscoverySuggestion[];
  /**
   * The radius the current answer (or the one now loading) asked for, in metres:
   * 250 for a device scan, the quantised region radius for a map scan, `null`
   * before the first scan resolves. Feed it to `showsWalkTime` to decide whether
   * the card may say "walk {time}".
   *
   * Always present at runtime; typed optional so a view test double written
   * before the field existed (a structural mock, `Partial<ReturnType<…>>`)
   * stays assignable without editing every existing view test.
   */
  radiusM?: number | null;
  /** Ask the server again for the current origin: the device fix or the map region. */
  scan: () => void;
  /** The same action, under the name the empty states have always used. */
  retry: () => void;
  /**
   * The same action, for a view's persistent "look around again" button. Always
   * present at runtime; optional in the type for the same structural-mock reason
   * as {@link UseNearbyDiscoveryResult.radiusM}.
   */
  rescan?: () => void;
}

/**
 * The one shared hook behind the desktop panel and the phone sheet: decide what
 * to ask about (a one-shot device fix, or the plan map's region), then ask the
 * server what is nearby.
 *
 * The manual "near me" flow, online only through the repo. Both views import
 * this hook and only this hook (`lint:pairs`); the pure mapping lives in
 * `nearbyModel.ts`. Nothing runs until `scan` is called, and nothing runs at all
 * while `enabled` is false.
 *
 * Origins: in `device` mode a failed fix falls back to the map's current centre
 * through `getFallbackCenter`, so "near me" still means "near where I am
 * looking" instead of failing. In `map` mode the viewport *is* the question: no
 * GPS read, and only an absent/foreign/degenerate viewport falls back.
 *
 * Auto-follow: once a scan has been started and the view is open, a moved
 * viewport (or a switched origin) re-asks after {@link AUTO_FOLLOW_DEBOUNCE_MS}.
 * The timer reads the latest scan through a ref, so a caller passing a fresh
 * `getFallbackCenter` every render does not schedule anything by itself.
 */
export function useNearbyDiscovery(
  tripId: number,
  getFallbackCenter?: () => { lat: number; lng: number } | null,
  options: UseNearbyDiscoveryOptions = {}
): UseNearbyDiscoveryResult {
  const { origin: originMode = 'device', enabled = true } = options;
  const { language } = useTranslation();
  const [status, setStatus] = useState<NearbyStatus>('idle');
  const [suggestions, setSuggestions] = useState<DiscoverySuggestion[]>([]);
  const [radiusM, setRadiusM] = useState<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);
  // Read reactively so a move re-renders (and the auto-follow effect sees it);
  // the scan itself reads the store at run time, so it never uses a stale box.
  const viewport = useTripStore((s) => s.planMapViewport);

  const resolveOrigin = useCallback(
    async (signal: AbortSignal): Promise<{ origin: Origin; radiusM: number } | null> => {
      if (originMode === 'map') {
        const region = originFromViewport(useTripStore.getState().planMapViewport, tripId);
        if (region) return { origin: originFromPoint(region), radiusM: region.radiusM };
        // No usable viewport: answer for the centre the caller hands over, and
        // reach for the device only when there is no centre at all.
        const fallback = getFallbackCenter?.();
        if (fallback) return { origin: originFromPoint(fallback), radiusM: DEFAULT_SCAN_RADIUS_M };
        try {
          return { origin: originFromFix(await getCurrentPositionOnce()), radiusM: DEFAULT_SCAN_RADIUS_M };
        } catch (error) {
          if (!signal.aborted) setStatus(nearbyErrorStatus(error));
          return null;
        }
      }

      try {
        return { origin: originFromFix(await getCurrentPositionOnce()), radiusM: DEFAULT_SCAN_RADIUS_M };
      } catch (error) {
        if (signal.aborted) return null;
        const fallback = getFallbackCenter?.();
        if (!fallback) {
          setStatus(nearbyErrorStatus(error));
          return null;
        }
        return { origin: originFromPoint(fallback), radiusM: DEFAULT_SCAN_RADIUS_M };
      }
    },
    [originMode, tripId, getFallbackCenter]
  );

  const run = useCallback(
    async (signal: AbortSignal) => {
      const resolved = await resolveOrigin(signal);
      if (!resolved || signal.aborted) return;
      setRadiusM(resolved.radiusM);

      try {
        const body: DiscoveryScanRequest = {
          lat: resolved.origin.lat,
          lng: resolved.origin.lng,
          accuracy: resolved.origin.accuracy,
          heading: resolved.origin.heading,
          speed: resolved.origin.speed,
          cell: toCell(resolved.origin.lat, resolved.origin.lng),
          mode: 'manual',
          at: new Date().toISOString(),
          // Device mode keeps today's body exactly: no radius, so the server's
          // 250 m default applies. Only a map-region scan names its circle.
          ...(originMode === 'map' ? { radius: resolved.radiusM } : {}),
        };
        const result = await discoveryRepo.scan(tripId, body, language, signal);
        if (signal.aborted) return;
        setSuggestions(result.suggestions);
        setStatus('ready');
      } catch (error) {
        if (signal.aborted) return;
        setStatus(nearbyErrorStatus(error));
      }
    },
    [resolveOrigin, originMode, tripId, language]
  );

  const scan = useCallback(() => {
    if (!enabled) return;
    startedRef.current = true;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('loading');
    setSuggestions([]);
    void run(controller.signal);
  }, [enabled, run]);

  // The auto-follow timer must call the latest `scan` without making a caller's
  // fresh callback identity (a new `getFallbackCenter` per render) schedule one.
  const scanRef = useRef(scan);
  useEffect(() => {
    scanRef.current = scan;
  }, [scan]);

  // Abort an in-flight scan when the panel unmounts, so a late answer never
  // writes into a closed view.
  useEffect(() => () => controllerRef.current?.abort(), []);

  // A mounted-but-closed view (the phone sheet) must not keep a scan running.
  useEffect(() => {
    if (!enabled) controllerRef.current?.abort();
  }, [enabled]);

  // Auto-follow: after the first scan, a moved viewport re-asks (map mode), and
  // switching origin re-asks either way. The debounce keeps a pan from billing
  // one scan per frame. `viewport` is the dependency that arms the timer; the
  // origin bookkeeping keeps a device-mode pan from re-triggering a GPS read.
  const previousOriginRef = useRef(originMode);
  useEffect(() => {
    const originChanged = previousOriginRef.current !== originMode;
    previousOriginRef.current = originMode;
    if (!enabled || !startedRef.current) return;
    if (originMode !== 'map' && !originChanged) return;
    const timer = setTimeout(() => scanRef.current(), AUTO_FOLLOW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [enabled, originMode, viewport]);

  return { status, suggestions, radiusM, scan, retry: scan, rescan: scan };
}
