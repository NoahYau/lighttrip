import type { DiscoveryScanRequest, DiscoveryScanResponse } from '@trek/shared';
import { discoveryApi } from '../api/discovery';
import { requireOnline } from './onlineOnly';

/**
 * The Discovery scan, online only on purpose: the answer is composed on the
 * server from the live nearby providers, so a copy kept on the device would go
 * stale. Offline the panel says so instead of showing yesterday's places.
 */
export const discoveryRepo = {
  async scan(
    tripId: number,
    body: DiscoveryScanRequest,
    lang?: string,
    signal?: AbortSignal
  ): Promise<DiscoveryScanResponse> {
    requireOnline();
    return discoveryApi.scan(tripId, body, lang, signal);
  },
};
