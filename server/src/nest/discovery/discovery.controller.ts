import { ADDON_IDS } from '../../addons';
import type { User } from '../../types';
import { AddonGuard } from '../addons/addon.guard';
import { RequireAddon } from '../addons/require-addon.decorator';
import { CurrentUser } from '../auth-core/current-user.decorator';
import { JwtAuthGuard } from '../auth-core/jwt-auth.guard';
import { ResponseContract } from '../common/response-contract';
import { TripAccessGuard } from '../permissions/trip-access.guard';
import { DiscoveryScanDto } from './discovery.dto';
import { DiscoveryService } from './discovery.service';
import { Body, Controller, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { discoveryScanResponseSchema, type DiscoveryScanResponse } from '@trek/shared';

/**
 * "What is worth a short walk from where I am standing" — PR1's read-only scan.
 *
 * Read-only by construction: there is no route that stores a suggestion, no
 * table to invalidate and no migration. Every answer is composed on the spot
 * from the nearby-place providers the maps domain already owns.
 *
 * The addon guard sits BEFORE the auth and trip guards so a disabled Discovery
 * answers 404 to anonymous callers too, rather than revealing that the route
 * exists. No permission is asked on top: whoever may look at the itinerary may
 * look around it.
 */
@Controller('api/trips/:tripId/discovery')
@UseGuards(AddonGuard, JwtAuthGuard, TripAccessGuard)
@RequireAddon(ADDON_IDS.DISCOVERY, 'Discovery')
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Post('scan')
  @HttpCode(200) // Express answered 200; Nest would otherwise default POST to 201.
  @ResponseContract(discoveryScanResponseSchema)
  async scan(
    @CurrentUser() user: User,
    @Body() body: DiscoveryScanDto,
    @Query('lang') lang?: string,
  ): Promise<DiscoveryScanResponse> {
    return await this.discovery.scan(user.id, body, lang);
  }
}
