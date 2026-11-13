/**
 * Discovery scan e2e — the read route through the real addon, auth and
 * trip-access guards, over a temp SQLite db carrying the migrated schema.
 *
 * The addon guard runs before auth, so a disabled Discovery answers 404 to
 * anonymous callers too; a trip the caller cannot reach answers 404 without
 * revealing the route. MapsService is overridden: the scan reshapes a nearby
 * answer, and the provider chain is the maps domain's own concern.
 */
import { ADDON_IDS } from '../../src/addons';
import { TrekExceptionFilter } from '../../src/nest/common/trek-exception.filter';
import { ZodValidationPipe } from '../../src/nest/common/zod-validation.pipe';
import { DiscoveryModule } from '../../src/nest/discovery/discovery.module';
import { MapsService } from '../../src/nest/maps/maps.service';
import { createSnapshotTestDb } from '../helpers/db-mock';
import { setAddonEnabled } from '../helpers/factories/settings';
import { makeTrip } from '../helpers/factories/trips';
import { makeUser } from '../helpers/factories/users';
import { createTestMikroOrmModule, type TestOrm } from '../helpers/test-orm';
import { sharedTestOrm, TestUnitOfWorkModule } from '../helpers/test-uow';
import { sessionCookie } from './harness';
import { Test } from '@nestjs/testing';

import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const testDb = createSnapshotTestDb();

const nearbyPlaces = vi.fn(async () => ({ places: [], source: 'openstreetmap' }));

const SCAN = {
  lat: 22.3027,
  lng: 114.1772,
  accuracy: 24,
  heading: null,
  speed: null,
  cell: 'a1b2',
  mode: 'manual',
  at: '2026-11-13T14:00:00.000Z',
};

describe('Discovery scan e2e (real addon + auth + trip-access guards)', () => {
  let app: Awaited<ReturnType<typeof build>>;
  let server: Server;
  let ownerId: number;
  let strangerId: number;
  let tripId: number;
  let orm: TestOrm;

  async function build() {
    const moduleRef = await Test.createTestingModule({
      imports: [await TestUnitOfWorkModule.forRoot(testDb), await createTestMikroOrmModule(testDb), DiscoveryModule],
    })
      .overrideProvider(MapsService)
      .useValue({ nearbyPlaces })
      .compile();
    const nest = moduleRef.createNestApplication();
    nest.use(cookieParser());
    nest.useGlobalFilters(new TrekExceptionFilter());
    nest.useGlobalPipes(new ZodValidationPipe());
    await nest.init();
    return nest;
  }

  beforeAll(async () => {
    orm = await sharedTestOrm(testDb);
    const { user: owner } = await makeUser(orm);
    const { user: stranger } = await makeUser(orm);
    ownerId = owner.id;
    strangerId = stranger.id;
    const trip = await makeTrip(orm, owner.id);
    tripId = trip.id;
    // The addon guard runs before auth, so the "off" case is tested by toggling
    // it in its own test; the rest of the suite assumes it is on.
    await setAddonEnabled(orm, ADDON_IDS.DISCOVERY, true);
    app = await build();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 401 without a session', async () => {
    const res = await request(server).post(`/api/trips/${tripId}/discovery/scan`).send(SCAN);
    expect(res.status).toBe(401);
  });

  it('answers 404 while the Discovery addon is off, even to a member', async () => {
    await setAddonEnabled(orm, ADDON_IDS.DISCOVERY, false);
    const res = await request(server)
      .post(`/api/trips/${tripId}/discovery/scan`)
      .send(SCAN)
      .set('Cookie', sessionCookie(ownerId));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Discovery addon is not enabled');
    await setAddonEnabled(orm, ADDON_IDS.DISCOVERY, true);
  });

  it('answers 404 for a trip the caller cannot reach, without revealing the route', async () => {
    const res = await request(server)
      .post(`/api/trips/${tripId}/discovery/scan`)
      .send(SCAN)
      .set('Cookie', sessionCookie(strangerId));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Trip not found');
  });

  it('answers the scan to a member when the addon is on', async () => {
    const res = await request(server)
      .post(`/api/trips/${tripId}/discovery/scan`)
      .send(SCAN)
      .set('Cookie', sessionCookie(ownerId));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ suggestions: [], cell: 'a1b2', ttlSeconds: 86400 });
    expect(nearbyPlaces).toHaveBeenCalledWith(ownerId, 22.3027, 114.1772, { radius: 250, limit: 20, lang: undefined });
  });

  it('refuses a malformed body', async () => {
    const res = await request(server)
      .post(`/api/trips/${tripId}/discovery/scan`)
      .send({ lat: 91, lng: 0, accuracy: 0, cell: 'x', mode: 'manual', at: 'bad' })
      .set('Cookie', sessionCookie(ownerId));
    expect(res.status).toBe(400);
  });
});
