import { discoveryScanResponseSchema, type DiscoveryScanRequest, type DiscoveryScanResponse } from '@trek/shared';
import apiClient from './client';

/**
 * The Discovery scan, computed by the server from the nearby providers on every
 * call — nothing to write and nothing to cache on the device.
 *
 * The parsed response schema is the same one the route declares, so a server
 * that drifts from the contract fails here, in the panel's error state.
 */
export const discoveryApi = {
  scan: (
    tripId: number,
    body: DiscoveryScanRequest,
    lang?: string,
    signal?: AbortSignal
  ): Promise<DiscoveryScanResponse> =>
    apiClient
      .post(`/trips/${tripId}/discovery/scan`, body, { params: { lang }, signal })
      .then((r) => discoveryScanResponseSchema.parse(r.data)),
};
