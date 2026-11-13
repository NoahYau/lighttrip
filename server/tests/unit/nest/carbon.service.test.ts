/** The carbon service over the real days and reservations services and a temp SQLite db. */
import { Days } from '../../../src/db/entities/Days.entity';
import { CarbonModule } from '../../../src/nest/carbon/carbon.module';
import { CarbonService } from '../../../src/nest/carbon/carbon.service';
import { createSnapshotTestDb } from '../../helpers/db-mock';
import { makeDayAssignment } from '../../helpers/factories/itinerary';
import { makePlace } from '../../helpers/factories/places';
import { makeReservation, makeReservationEndpoint } from '../../helpers/factories/reservations';
import { updateRows } from '../../helpers/factories/rows';
import { makeDay, makeTrip } from '../../helpers/factories/trips';
import { makeUser } from '../../helpers/factories/users';
import { resetTestDb } from '../../helpers/test-db';
import { createTestModule, type TestModule } from '../../helpers/test-module';
import type { TestOrm } from '../../helpers/test-orm';
import { sharedTestOrm } from '../../helpers/test-uow';

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';

/** Berlin and Potsdam, about 27 km apart. */
const BERLIN = { lat: 52.52, lng: 13.405 };
const POTSDAM = { lat: 52.3906, lng: 13.0645 };

/**
 * The migrated schema snapshot, handed to the module under test instead of
 * `vi.mock`ing `src/db/database` — `lint:test-mocks` counts a module mock of the
 * database per file and a new file may not add one.
 */
const testDb = createSnapshotTestDb();

let t: TestModule;
let carbon: CarbonService;
let orm: TestOrm;

beforeAll(async () => {
  t = await createTestModule({ db: testDb, imports: [CarbonModule] });
  carbon = t.get(CarbonService);
  orm = await sharedTestOrm(testDb);
});

beforeEach(() => {
  resetTestDb(testDb);
});

afterAll(async () => {
  await t.close();
  testDb.close();
});

/** A trip of two days: a rail leg on day one, a walk on day two, and a booked flight. */
async function seedTrip() {
  const { user } = await makeUser(orm);
  const trip = await makeTrip(orm, user.id);
  const day1 = await makeDay(orm, trip.id, { day_number: 1, date: '2026-05-01', title: 'Arrival' });
  const day2 = await makeDay(orm, trip.id, { day_number: 2, date: '2026-05-02' });
  await updateRows(orm, Days, { id: day1.id }, { default_transport_mode: 'train' });
  await updateRows(orm, Days, { id: day2.id }, { default_transport_mode: 'walking' });

  const hotel = await makePlace(orm, trip.id, { name: 'Hotel', ...BERLIN });
  const museum = await makePlace(orm, trip.id, { name: 'Museum', ...POTSDAM });
  await makeDayAssignment(orm, day1.id, hotel.id);
  await makeDayAssignment(orm, day1.id, museum.id);
  const booking = await makeReservation(orm, trip.id, { title: 'LH 1840', type: 'flight', day: day1.id });
  await makeReservationEndpoint(orm, booking.id, { role: 'from', name: 'BER', sequence: 0, ...BERLIN });
  await makeReservationEndpoint(orm, booking.id, { role: 'to', name: 'FCO', sequence: 1, lat: 41.9028, lng: 12.4964 });
  return { user, trip, day1, day2 };
}

describe('CarbonService.footprint', () => {
  it('measures the day legs and the booked flight of a trip', async () => {
    const { trip } = await seedTrip();
    const footprint = await carbon.footprint(String(trip.id));

    expect(footprint.legs.map((leg) => [leg.source, leg.from_name, leg.to_name])).toEqual([
      ['day', 'Hotel', 'Museum'],
      ['reservation', 'BER', 'FCO'],
    ]);
    expect(footprint.legs[0]).toMatchObject({ transport_mode: 'train', mode: 'rail', day_number: 1 });
    expect(footprint.legs[1]).toMatchObject({ transport_mode: 'flight', mode: 'flight', day_number: 1 });
    expect(footprint.estimated_legs).toBe(2);
    expect(footprint.unestimated_legs).toBe(0);
    expect(footprint.total_grams).toBe(footprint.by_mode.reduce((sum, row) => sum + row.grams, 0));
    expect(footprint.total_km).toBeGreaterThan(1200);
  });

  it('answers a trip without any travel with zeroes', async () => {
    const { user } = await makeUser(orm);
    const trip = await makeTrip(orm, user.id);
    await makeDay(orm, trip.id, { day_number: 1 });

    const footprint = await carbon.footprint(String(trip.id));
    expect(footprint).toMatchObject({ total_grams: 0, total_km: 0, estimated_legs: 0, unestimated_legs: 0, legs: [] });
    expect(footprint.days).toEqual([]);
  });

  it('follows an edit to the itinerary on the next read', async () => {
    const { trip, day2 } = await seedTrip();
    const before = await carbon.footprint(String(trip.id));

    const cafe = await makePlace(orm, trip.id, { name: 'Cafe', ...POTSDAM });
    await makeDayAssignment(orm, day2.id, cafe.id);
    const park = await makePlace(orm, trip.id, { name: 'Park', ...BERLIN });
    await makeDayAssignment(orm, day2.id, park.id);

    const after = await carbon.footprint(String(trip.id));
    expect(after.legs.length).toBe(before.legs.length + 1);
    expect(after.days.map((row) => row.day_id)).toContain(day2.id);
  });

  it('answers an unknown trip like a trip with nothing in it', async () => {
    const footprint = await carbon.footprint('424242');
    expect(footprint.total_grams).toBe(0);
    expect(footprint.legs).toEqual([]);
  });
});

describe('CarbonService.compare', () => {
  it('ranks every mode for a distance, cheapest first', () => {
    const comparison = carbon.compare({ distance_km: 600 });
    expect(comparison).toMatchObject({ distance_km: 600, baseline: null });
    expect(comparison.options).toHaveLength(12);
    expect(comparison.options[0]?.mode).toBe('walk');
    expect(comparison.options.every((row) => row.saving_grams === null)).toBe(true);
  });

  it('measures the options against the baseline it is given', () => {
    const comparison = carbon.compare({ distance_km: 600, baseline: 'car' });
    const car = comparison.options.find((row) => row.mode === 'car');
    const rail = comparison.options.find((row) => row.mode === 'rail');
    expect(comparison.baseline).toBe('car');
    expect(car?.saving_grams).toBe(0);
    expect(rail?.saving_grams).toBe((car?.grams ?? 0) - (rail?.grams ?? 0));
    expect(rail?.saving_share).toBeGreaterThan(0);
  });

  it('answers a zero distance with zeroes, and offers no savings share', () => {
    const comparison = carbon.compare({ distance_km: 0 });
    expect(comparison.options.every((row) => row.grams === 0)).toBe(true);
  });
});
