import { JwtAuthGuard } from '../auth-core/jwt-auth.guard';
import { ResponseContract } from '../common/response-contract';
import { TripAccessGuard } from '../permissions/trip-access.guard';
import { CarbonCompareQueryDto } from './carbon.dto';
import { CarbonService } from './carbon.service';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  carbonCompareResponseSchema,
  tripCarbonResponseSchema,
  type CarbonCompareResponse,
  type TripCarbonResponse,
} from '@trek/shared';

/**
 * The trip's carbon footprint.
 *
 * Read-only: there is no route that stores a figure, because none is stored at
 * all. The trip's access guard answers 404 for a trip the caller cannot reach —
 * the same answer every other trip-scoped read gives — and no permission is
 * demanded on top: whoever may look at the itinerary may look at what it costs
 * the atmosphere.
 */
@Controller('api/trips/:tripId/carbon')
@UseGuards(JwtAuthGuard, TripAccessGuard)
export class TripCarbonController {
  constructor(private readonly carbon: CarbonService) {}

  @Get()
  @ResponseContract(tripCarbonResponseSchema)
  async footprint(@Param('tripId') tripId: string): Promise<TripCarbonResponse> {
    return await this.carbon.footprint(tripId);
  }
}

/**
 * The mode comparison for one distance — the answer to "what if we took the train
 * instead".
 *
 * Signed in, but not tied to a trip: it reads no trip data, so there is nothing to
 * scope it to. The same table is what the planner's panel ranks a leg with, and
 * the client computes it locally from `@trek/shared`; the route exists for every
 * caller that is not that panel.
 */
@Controller('api/carbon')
@UseGuards(JwtAuthGuard)
export class CarbonController {
  constructor(private readonly carbon: CarbonService) {}

  @Get('compare')
  @ResponseContract(carbonCompareResponseSchema)
  async compare(@Query() query: CarbonCompareQueryDto): Promise<CarbonCompareResponse> {
    return this.carbon.compare(query);
  }
}
