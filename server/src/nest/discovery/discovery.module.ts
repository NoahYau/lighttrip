import { AddonsModule } from '../addons/addons.module';
import { MapsModule } from '../maps/maps.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryMcp } from './discovery.mcp';
import { DiscoveryService } from './discovery.service';
import { Module } from '@nestjs/common';

/**
 * Discovery (read-only). Depends on the maps service rather than on any table:
 * the nearby answer already exists there, so this domain stays out of the
 * schema and out of other domains' repositories (`lint:boundaries`).
 *
 * `AddonsModule` provides the `AddonGuard` the controller's guard chain asks for
 * (it is deliberately not `@Global`), and `PermissionsModule` the
 * `TripAccessGuard`, exactly as the assistant and carbon modules do.
 */
@Module({
  imports: [MapsModule, AddonsModule, PermissionsModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, DiscoveryMcp],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
