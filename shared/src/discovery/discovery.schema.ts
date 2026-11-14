import { z } from 'zod';

/**
 * Discovery API contract — single source of truth for
 * /api/trips/:tripId/discovery/scan.
 *
 * "What is worth a short walk from where I am standing." The scan is read-only
 * by construction: it composes an answer on the spot from the nearby-place
 * providers the maps domain already owns, and stores nothing — no suggestion
 * row, no cache table, no migration. The client's roaming mode (PR2) keeps its
 * suppression state on the device, so the only wire shape here is the question
 * and the answer.
 *
 * The request carries the raw position (lat/lng plus the fix quality), the 150m
 * cell the client snaps the position to for idempotency, the caller's intent
 * (`manual` for the "near me" button, `roam` for the foreground engine) and the
 * time of the fix. The server uses the position once and keeps only the cell,
 * which is the privacy line the settings screen promises (§4.10 of the design).
 */

export const discoverySourceSchema = z.enum(['trek-places', 'google', 'openstreetmap']);
export type DiscoverySource = z.infer<typeof discoverySourceSchema>;

export const discoveryCategorySchema = z.enum(['nature', 'culture', 'food', 'shopping', 'other']);
export type DiscoveryCategory = z.infer<typeof discoveryCategorySchema>;

/** The longest an answer's "why now" sentence may be, matching the card's one-line cap. */
export const DISCOVERY_REASON_MAX = 240;

export const discoveryScanRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** The fix's accuracy in metres. A reading over the engine's threshold never reaches the server. */
  accuracy: z.number().min(0).max(5000),
  heading: z.number().min(0).max(360).nullable().optional(),
  speed: z.number().min(0).max(100).nullable().optional(),
  /** 150m grid id, used for idempotency and the privacy promise (only the cell is kept). */
  cell: z.string().min(1).max(32),
  /**
   * How far around the position to look, in metres. 250 when left out (the
   * device scan's "short walk"), with the same 50..5000 bounds `/api/maps/nearby`
   * takes — the map-region scan asks for the circle covering what is on screen.
   */
  radius: z.number().int().min(50).max(5000).optional(),
  /** What is on screen: the manual button, or the foreground roaming engine. */
  mode: z.enum(['roam', 'manual']),
  at: z.string().datetime(),
});
export type DiscoveryScanRequest = z.infer<typeof discoveryScanRequestSchema>;

export const discoverySuggestionSchema = z.object({
  /** Stable dedupe key: the provider's id for the place, or a name+coordinate fallback. */
  providerId: z.string(),
  source: discoverySourceSchema,
  name: z.string(),
  category: discoveryCategorySchema,
  lat: z.number(),
  lng: z.number(),
  distanceM: z.number().nonnegative(),
  walkMinutes: z.number().int().nonnegative(),
  /** "Why this is worth a short walk" — rule-composed, empty when there is nothing to say. */
  reason: z.string().max(DISCOVERY_REASON_MAX),
  /** 0..1 proximity score the client displays, never recomputes. */
  score: z.number().min(0).max(1),
  imageUrl: z.string().url().nullable(),
  opensNow: z.boolean().nullable(),
  /** `new` for every PR1/PR2 answer: there is no stored state yet. */
  state: z.enum(['new', 'accepted', 'dismissed']).default('new'),
});
export type DiscoverySuggestion = z.infer<typeof discoverySuggestionSchema>;

/**
 * The MCP twin's input: a coordinate, an optional radius plus the language,
 * without the fix quality or cell a device scan carries. Declared here so the
 * tool file holds no inline zod (`lint:mcp-zod` counts a new `.mcp.ts` against a
 * zero baseline).
 */
export const discoveryNearbyQuerySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** Metres, 250 when left out; the same 50..5000 bounds `/api/maps/nearby` takes. */
  radius: z.number().int().min(50).max(5000).optional(),
  lang: z.string().max(35).optional(),
});
export type DiscoveryNearbyQuery = z.infer<typeof discoveryNearbyQuerySchema>;

export const discoveryScanResponseSchema = z.object({
  suggestions: z.array(discoverySuggestionSchema),
  servedAt: z.string().datetime(),
  cell: z.string(),
  /** How long the client may treat this cell's answer as fresh. */
  ttlSeconds: z.number().int().nonnegative(),
});
export type DiscoveryScanResponse = z.infer<typeof discoveryScanResponseSchema>;
