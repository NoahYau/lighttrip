import { carbonCompareQuerySchema } from '@trek/shared';

import { createZodDto } from 'nestjs-zod';

/** `GET /api/carbon/compare?distance_km=600&baseline=car` — the query validates through the global Zod pipe. */
export class CarbonCompareQueryDto extends createZodDto(carbonCompareQuerySchema) {}
