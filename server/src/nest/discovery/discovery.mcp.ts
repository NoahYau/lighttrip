import { McpController, Tool, TOOL_ANNOTATIONS_READONLY, errorResult, ok, type McpContext } from '../../nest-mcp';
import { DiscoveryService } from './discovery.service';
import { discoveryNearbyQuerySchema } from '@trek/shared';

/**
 * The MCP twin of POST /api/trips/:tripId/discovery/scan, for an assistant that
 * holds coordinates rather than a GPS fix. Same dedupe, rank and reason as the
 * REST route; read-only like `search_nearby_places`, so it is not addon-gated —
 * the addon switch only closes the REST surface.
 */
@McpController()
export class DiscoveryMcp {
  constructor(private readonly discovery: DiscoveryService) {}

  @Tool({
    name: 'discover_nearby',
    description:
      'List places worth a short walk from a coordinate, nearest first, each with its distance in metres (`distanceM`), an estimated walking time (`walkMinutes`), a category and a one-line "why now" reason. Use it to answer "what is around here worth seeing". Pass `radius` (metres, 50..5000, 250 when left out) to widen the circle around a map area. Composed from the same nearby providers as search_nearby_places, then deduplicated and ranked.',
    inputSchema: discoveryNearbyQuerySchema,
    annotations: TOOL_ANNOTATIONS_READONLY,
    access: { group: 'geo', mode: 'read' },
  })
  async discoverNearby(args: { lat: number; lng: number; radius?: number; lang?: string }, ctx: McpContext) {
    try {
      const result = await this.discovery.scan(
        ctx.userId,
        {
          lat: args.lat,
          lng: args.lng,
          accuracy: 0,
          heading: null,
          speed: null,
          cell: `${args.lat.toFixed(3)},${args.lng.toFixed(3)}`,
          radius: args.radius,
          mode: 'manual',
          at: new Date().toISOString(),
        },
        args.lang,
      );
      return ok(result);
    } catch {
      return errorResult('Nearby discovery failed.');
    }
  }
}
