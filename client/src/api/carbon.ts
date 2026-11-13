import { tripCarbonResponseSchema, type TripCarbonResponse } from '@trek/shared'
import apiClient from './client'

/**
 * The carbon footprint of a trip, computed by the server from the itinerary on
 * every read — there is nothing to write and nothing to cache.
 *
 * The parsed response schema is the same one the route declares, so a server that
 * drifts from the contract fails here, in the panel's own error state, instead of
 * rendering `undefined kg`.
 */
export const carbonApi = {
  footprint: (tripId: number, signal?: AbortSignal): Promise<TripCarbonResponse> =>
    apiClient
      .get(`/trips/${tripId}/carbon`, { signal })
      .then((r) => tripCarbonResponseSchema.parse(r.data)),
}
