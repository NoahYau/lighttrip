import { MapsService } from '../maps/maps.service';
import { Injectable } from '@nestjs/common';
import {
  categoryOf,
  dedupeCandidates,
  rankCandidates,
  toSuggestion,
  type DiscoveryScanRequest,
  type DiscoveryScanResponse,
  type NearbyCandidate,
} from '@trek/shared';

/** What "a short walk" means for the scan: the design's default radius. */
export const DISCOVERY_SCAN_RADIUS_M = 250;
/** How many candidates the providers may return before ranking. */
export const DISCOVERY_SCAN_LIMIT = 20;
/** How long a cell's answer stays fresh, the same 24h the privacy copy promises. */
export const DISCOVERY_SCAN_TTL_SECONDS = 86400;

/**
 * The Discovery scan — compose "what is near" from the maps domain and shape it
 * into suggestions, without storing anything.
 *
 * It owns no table and writes nothing: the nearby answer is the maps service's,
 * already cached and provider-ordered; this domain only dedupes, ranks and
 * composes the card's one-line reason. A suggestion that would go stale cannot,
 * because nothing is kept.
 */
@Injectable()
export class DiscoveryService {
  constructor(private readonly maps: MapsService) {}

  async scan(userId: number, body: DiscoveryScanRequest, lang?: string): Promise<DiscoveryScanResponse> {
    const { places } = await this.maps.nearbyPlaces(userId, body.lat, body.lng, {
      radius: DISCOVERY_SCAN_RADIUS_M,
      limit: DISCOVERY_SCAN_LIMIT,
      lang,
    });

    const candidates = places.map(toCandidate).filter((candidate): candidate is NearbyCandidate => candidate !== null);
    const ranked = rankCandidates(dedupeCandidates(candidates));

    return {
      suggestions: ranked.map((candidate) => toSuggestion(candidate, DISCOVERY_SCAN_RADIUS_M)),
      servedAt: new Date().toISOString(),
      cell: body.cell,
      ttlSeconds: DISCOVERY_SCAN_TTL_SECONDS,
    };
  }
}

/**
 * A provider record as the ranking's normalised candidate. The three providers
 * spell their id and category differently; this collapses them onto one shape
 * and drops a record with no name or no coordinates.
 */
function toCandidate(record: Record<string, unknown>): NearbyCandidate | null {
  const name = typeof record.name === 'string' ? record.name : null;
  const lat = typeof record.lat === 'number' ? record.lat : null;
  const lng = typeof record.lng === 'number' ? record.lng : null;
  if (!name || lat == null || lng == null) return null;

  const source =
    record.source === 'google' ? 'google' : record.source === 'openstreetmap' ? 'openstreetmap' : 'trek-places';
  const providerId = String(record.google_place_id ?? record.osm_id ?? `${name}:${lat.toFixed(5)},${lng.toFixed(5)}`);

  return {
    providerId,
    source,
    name,
    category: categoryOf(typeof record.category === 'string' ? record.category : null),
    lat,
    lng,
    distanceM: typeof record.distance_m === 'number' ? Math.round(record.distance_m) : 0,
    description: typeof record.description === 'string' ? record.description : null,
  };
}
