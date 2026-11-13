/**
 * Carbon footprint e2e — the two read routes through the real auth and trip-access
 * guards, over a temp SQLite db carrying the migrated schema.
 *
 * The trip route is the one worth guarding here: it is trip-scoped but demands no
 * permission, so the only thing standing between a stranger and another trip's
 * itinerary is `TripAccessGuard`'s 404.
 */
import { CarbonModule } from '../../src/nest/carbon/carbon.module';
import { TrekExceptionFilter } from '../../src/nest/common/trek-exception.filter';
import { ZodValidationPipe } from '../../src/nest/common/zod-validation.pipe';
import { createSnapshotTestDb } from '../helpers/db-mock';
import { makeDayAssignment } from '../helpers/factories/itinerary';
import { makePlace } from '../helpers/factories/places';
import { makeDay, makeTrip } from '../helpers/factories/trips';
import { makeUser } from '../helpers/factories/users';
import { createTestMikroOrmModule, type TestOrm } from '../helpers/test-orm';
import { sharedTestOrm, TestUnitOfWorkModule } from '../helpers/test-uow';
import { sessionCookie } from './harness';
import { Test } from '@nestjs/testing';

import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * The migrated schema snapshot, handed to the app instead of `vi.mock`ing
 * `src/db/database`: `lint:test-mocks` counts a database module mock per file and
 * a new file may not add one.
 */
const testDb = createSnapshotTestDb();

describe('Carbon footprint e2e (real auth + trip-access guards)', () => {
  let app: Awaited<ReturnType<typeof build>>;
  let server: Server;
  let ownerId: number;
  let strangerId: number;
  let tripId: number;

  async function build() {
    const moduleRef = await Test.createTestingModule({
      imports: [await TestUnitOfWorkModule.forRoot(testDb), await createTestMikroOrmModule(testDb), CarbonModule],
    }).compile();
    const nest = moduleRef.createNestApplication();
    nest.use(cookieParser());
    nest.useGlobalFilters(new TrekExceptionFilter());
    nest.useGlobalPipes(new ZodValidationPipe());
    await nest.init();
    return nest;
  }

  beforeAll(async () => {
    const orm: TestOrm = await sharedTestOrm(testDb);
    const { user: owner } = await makeUser(orm);
    const { user: stranger } = await makeUser(orm);
    ownerId = owner.id;
    strangerId = stranger.id;
    const trip = await makeTrip(orm, owner.id);
    tripId = trip.id;
    const day = await makeDay(orm, trip.id, { day_number: 1, date: '2026-05-01' });
    const berlin = await makePlace(orm, trip.id, { name: 'Hotel', lat: 52.52, lng: 13.405 });
    const potsdam = await makePlace(orm, trip.id, { name: 'Museum', lat: 52.3906, lng: 13.0645 });
    await makeDayAssignment(orm, day.id, berlin.id, { leg_transport_mode: 'train' });
    await makeDayAssignment(orm, day.id, potsdam.id);

    app = await build();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 401 without a session', async () => {
    const res = await request(server).get(`/api/trips/${tripId}/carbon`);
    expect(res.status).toBe(401);
  });

  it('answers the trip’s footprint to a member', async () => {
    const res = await request(server).get(`/api/trips/${tripId}/carbon`).set('Cookie', sessionCookie(ownerId));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total_km: expect.any(Number), estimated_legs: 1, unestimated_legs: 0 });
    expect(res.body.legs).toHaveLength(1);
    expect(res.body.legs[0]).toMatchObject({ source: 'day', from_name: 'Hotel', to_name: 'Museum', mode: 'rail' });
    expect(res.body.by_mode).toEqual([
      { mode: 'rail', legs: 1, km: res.body.legs[0].distance_km, grams: res.body.total_grams },
    ]);
    expect(res.body.days).toHaveLength(1);
  });

  it('answers 404 for a trip the caller cannot reach, without revealing that it exists', async () => {
    const res = await request(server).get(`/api/trips/${tripId}/carbon`).set('Cookie', sessionCookie(strangerId));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Trip not found');
  });

  it('answers 401 for the comparison without a session', async () => {
    const res = await request(server).get('/api/carbon/compare').query({ distance_km: 600 });
    expect(res.status).toBe(401);
  });

  it('answers the comparison for one distance, cheapest first', async () => {
    const res = await request(server)
      .get('/api/carbon/compare')
      .query({ distance_km: 600, baseline: 'car' })
      .set('Cookie', sessionCookie(ownerId));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ distance_km: 600, baseline: 'car' });
    expect(res.body.options).toHaveLength(12);
    expect(res.body.options[0]).toMatchObject({ mode: 'walk', grams: 0 });
    expect(res.body.options.map((row: { grams: number }) => row.grams)).toEqual(
      [...res.body.options.map((row: { grams: number }) => row.grams)].sort((a, b) => a - b),
    );
  });

  it('refuses a comparison with no distance or an unknown baseline', async () => {
    const missing = await request(server).get('/api/carbon/compare').set('Cookie', sessionCookie(ownerId));
    expect(missing.status).toBe(400);

    const badBaseline = await request(server)
      .get('/api/carbon/compare')
      .query({ distance_km: 600, baseline: 'rocket' })
      .set('Cookie', sessionCookie(ownerId));
    expect(badBaseline.status).toBe(400);
  });
});
