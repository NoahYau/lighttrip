import type { DiscoveryScanRequest, DiscoverySuggestion } from '@trek/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GeoOnceError, getCurrentPositionOnce } from '../../hooks/useGeolocation';
import { useTranslation } from '../../i18n';
import { discoveryRepo } from '../../repo/discoveryRepo';
import { OnlineOnlyError } from '../../repo/onlineOnly';
import { toCell, type NearbyStatus } from './nearbyModel';

/**
 * The one shared hook behind the desktop panel and the phone sheet: get a
 * one-shot position fix, then ask the server what is worth a short walk.
 *
 * The manual "near me" flow, online only through the repo. Both views import
 * this hook and only this hook (`lint:pairs`); the pure mapping lives in
 * `nearbyModel.ts`. Nothing runs until `scan` is called — the panel opens on an
 * idle "look around" state and the user presses the button.
 */
export function useNearbyDiscovery(tripId: number) {
  const { language } = useTranslation();
  const [status, setStatus] = useState<NearbyStatus>('idle');
  const [suggestions, setSuggestions] = useState<DiscoverySuggestion[]>([]);
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (signal: AbortSignal) => {
      try {
        const pos = await getCurrentPositionOnce();
        if (signal.aborted) return;
        const body: DiscoveryScanRequest = {
          lat: pos.lat,
          lng: pos.lng,
          accuracy: pos.accuracy,
          heading: pos.heading,
          speed: pos.speed,
          cell: toCell(pos.lat, pos.lng),
          mode: 'manual',
          at: new Date().toISOString(),
        };
        const result = await discoveryRepo.scan(tripId, body, language, signal);
        if (signal.aborted) return;
        setSuggestions(result.suggestions);
        setStatus('ready');
      } catch (error: unknown) {
        if (signal.aborted) return;
        if (error instanceof OnlineOnlyError) setStatus('offline');
        else if (error instanceof GeoOnceError && error.code === 'permission-denied') setStatus('denied');
        else if (error instanceof GeoOnceError) setStatus('unavailable');
        else setStatus('error');
      }
    },
    [tripId, language]
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
