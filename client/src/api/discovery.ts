import {
  discoveryScanResponseSchema,
  type AdminFeatureToggleResponse,
  type DiscoveryScanRequest,
  type DiscoveryScanResponse,
} from '@trek/shared';
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

/**
 * The admin's instance-wide switch for searching around the map area (Discovery):
 * whether a nearby scan may cover the region a traveller has panned to, not only
 * where the device is standing. Off until an admin turns it on.
 */
export const discoveryMapAreaAdminApi = {
  get: (): Promise<AdminFeatureToggleResponse> => apiClient.get('/admin/discovery-map-area').then((r) => r.data),
  update: (enabled: boolean): Promise<AdminFeatureToggleResponse> =>
    apiClient.put('/admin/discovery-map-area', { enabled }).then((r) => r.data),
};
