import type { DiscoveryScanRequest, DiscoverySuggestion } from '@trek/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GeoOnceError, getCurrentPositionOnce } from '../../hooks/useGeolocation';
import { useTranslation } from '../../i18n';
import { discoveryRepo } from '../../repo/discoveryRepo';
import { OnlineOnlyError } from '../../repo/onlineOnly';
import { toCell, type NearbyStatus } from './nearbyModel';

export type { NearbyStatus } from './nearbyModel';

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

/**
 * The one shared hook behind the desktop panel and the phone sheet: get a
 * one-shot position fix, then ask the server what is worth a short walk.
 *
 * The manual "near me" flow, online only through the repo. Both views import
 * this hook and only this hook (`lint:pairs`); the pure mapping lives in
 * `nearbyModel.ts`. Nothing runs until `scan` is called.
 *
 * When the browser cannot locate the device (desktop Brave without a GPS, a
 * blocked permission, an insecure origin) the scan falls back to the map's
 * current centre through `getFallbackCenter`, so "near me" still means "near
 * where I am looking" instead of failing.
 */
export function useNearbyDiscovery(tripId: number, getFallbackCenter?: () => { lat: number; lng: number } | null) {
  const { language } = useTranslation();
  const [status, setStatus] = useState<NearbyStatus>('idle');
  const [suggestions, setSuggestions] = useState<DiscoverySuggestion[]>([]);
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (signal: AbortSignal) => {
      let origin: Origin;
      try {
        const pos = await getCurrentPositionOnce();
        origin = { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, heading: pos.heading, speed: pos.speed };
      } catch (error) {
        if (signal.aborted) return;
        const fallback = getFallbackCenter?.();
        if (!fallback) {
          setStatus(nearbyErrorStatus(error));
          return;
        }
        origin = { lat: fallback.lat, lng: fallback.lng, accuracy: 0, heading: null, speed: null };
      }

      if (signal.aborted) return;
      try {
        const body: DiscoveryScanRequest = {
          lat: origin.lat,
          lng: origin.lng,
          accuracy: origin.accuracy,
          heading: origin.heading,
          speed: origin.speed,
          cell: toCell(origin.lat, origin.lng),
          mode: 'manual',
          at: new Date().toISOString(),
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
    [tripId, language, getFallbackCenter]
  );

  const scan = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('loading');
    setSuggestions([]);
    void run(controller.signal);
  }, [run]);

  // Abort an in-flight scan when the panel unmounts, so a late answer never
  // writes into a closed view.
  useEffect(() => () => controllerRef.current?.abort(), []);

  return { status, suggestions, scan, retry: scan };
}
