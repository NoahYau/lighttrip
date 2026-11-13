import { discoveryScanRequestSchema } from '@trek/shared';

import { createZodDto } from 'nestjs-zod';

/** `POST /api/trips/:tripId/discovery/scan` — the body validates through the global Zod pipe. */
export class DiscoveryScanDto extends createZodDto(discoveryScanRequestSchema) {}
