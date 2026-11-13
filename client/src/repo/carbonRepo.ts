import type { TripCarbonResponse } from '@trek/shared'
import { carbonApi } from '../api/carbon'
import { requireOnline } from './onlineOnly'

/**
 * The trip's footprint, online only on purpose: the figure is derived on the
 * server from the itinerary, so a copy kept on the device would drift from the
 * plan the user is looking at — the one thing an estimate of that plan must not
 * do. Offline the panel says so instead of showing a stale number.
 */
export const carbonRepo = {
  async footprint(tripId: number, signal?: AbortSignal): Promise<TripCarbonResponse> {
    requireOnline()
    return carbonApi.footprint(tripId, signal)
  },
}
