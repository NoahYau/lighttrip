import { JwtAuthGuard } from '../auth-core/jwt-auth.guard';
import { ResponseContract } from '../common/response-contract';
import { AddonsService } from './addons.service';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { addonsEnabledResponseSchema } from '@trek/shared';

/**
 * GET /api/addons — the enabled trip add-ons + photo providers feed.
 * Byte-identical to the legacy inline handler in server/src/app.ts
 * (authenticate-gated, returns { collabFeatures, addons: [...] }).
 *
 * Distinct from the addon sub-mounts /api/addons/atlas and /api/addons/vacay
 * (their own Nest modules); the strangler routes only the EXACT /api/addons here.
 */
@Controller('api/addons')
@UseGuards(JwtAuthGuard)
export class AddonsController {
  constructor(private readonly addons: AddonsService) {}

  @Get()
  @ResponseContract(addonsEnabledResponseSchema)
  async list() {
    return this.addons.list();
  }
}
