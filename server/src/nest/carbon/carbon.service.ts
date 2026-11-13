import { DaysService } from '../days/days.service';
import { ReservationsService } from '../reservations/reservations.service';
import { buildCarbonLegs, summarizeCarbon } from './carbon.helpers';
import { Injectable } from '@nestjs/common';
import {
  compareCarbonModes,
  type CarbonCompareQuery,
  type CarbonCompareResponse,
  type TripCarbonResponse,
} from '@trek/shared';

/**
 * The carbon footprint of a trip, and the comparison behind it.
 *
 * It owns no table and writes nothing: a footprint is derived from the itinerary
 * on every read, through the services that already own days and bookings. That is
 * the whole design — an estimate that could go stale would need invalidating on
 * every place edit, mode change, reorder and booking, and would still be wrong
 * after a restore. Deriving it costs two reads the planner makes anyway.
 *
 * Both dependencies are public surfaces (`*.service.ts`) of their domains, and
 * neither imports carbon, so the dependency stays a straight line and no module
 * cycle appears (`lint:boundaries`).
 */
@Injectable()
export class CarbonService {
  constructor(
    private readonly days: DaysService,
    private readonly reservations: ReservationsService,
  ) {}

  /** Every measurable leg of the trip with its emissions, plus the per-mode and per-day totals. */
  async footprint(tripId: string): Promise<TripCarbonResponse> {
    const [{ days }, reservations] = await Promise.all([this.days.list(tripId), this.reservations.list(tripId)]);
    return summarizeCarbon(buildCarbonLegs({ days, reservations }), days);
  }

  /**
   * Every transport mode's emissions for one distance, cheapest first.
   *
   * Stateless and permission-free on purpose: it touches no trip data, so any
   * signed-in user may ask what 300 km by rail costs. The client usually runs the
   * same `@trek/shared` comparison locally, and this route is the answer for
   * everything that is not the panel — a script, the assistant, a future report.
   */
  compare(query: CarbonCompareQuery): CarbonCompareResponse {
    const baseline = query.baseline ?? null;
    return {
      distance_km: query.distance_km,
      baseline,
      options: compareCarbonModes({ distanceKm: query.distance_km, baseline }),
    };
  }
}
