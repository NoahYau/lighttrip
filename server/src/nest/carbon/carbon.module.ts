import { DaysModule } from '../days/days.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { CarbonController, TripCarbonController } from './carbon.controller';
import { CarbonService } from './carbon.service';
import { Module } from '@nestjs/common';

/**
 * Carbon footprint (read-only). Depends on the days and reservations services
 * rather than on their tables: they already load a trip's plan and bookings, and
 * asking them keeps this domain out of the schema and out of their repositories
 * (`lint:boundaries`' `foreignRepositories` rule).
 *
 * `PermissionsModule` is imported although this domain asks for no permission: its
 * `TripAccessGuard` is deliberately not `@Global`, so an e2e TestingModule resolves
 * what the controller's guard chain needs only through the consumer's own imports.
 */
@Module({
  imports: [DaysModule, ReservationsModule, PermissionsModule],
  controllers: [TripCarbonController, CarbonController],
  providers: [CarbonService],
  exports: [CarbonService],
})
export class CarbonModule {}
