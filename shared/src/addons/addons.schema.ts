import { z } from 'zod';

/**
 * The addons-enabled feed — `GET /api/addons`.
 *
 * This is the one payload every client reads to learn what the instance offers:
 * the enabled add-ons and photo providers, the collab sub-features, and the
 * per-addon switches an admin owns. `AddonsController.list()` declares it with
 * `@ResponseContract`, so under test every answer is parsed against it and a
 * field `AddonsService.list()` stops (or starts) sending fails the suite.
 *
 * Objects are not strict, so a provider's own `config` may carry whatever that
 * provider needs; a declared key that is missing or of another type fails.
 */

/** One configurable field of a photo provider's connection form. */
const addonFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  input_type: z.string(),
  placeholder: z.string(),
  hint: z.string().nullable(),
  required: z.boolean(),
  secret: z.boolean(),
  settings_key: z.string().nullable(),
  payload_key: z.string().nullable(),
  // The column is nullable; the service forwards the stored value unchanged.
  sort_order: z.number().nullable(),
});

/**
 * An add-on entry from the `addons` table, or a photo provider riding the
 * Journey addon (a provider adds `config` and its `fields`).
 */
const addonEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  icon: z.string().nullable(),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional(),
  fields: z.array(addonFieldSchema).optional(),
});

/** The collab addon's sub-panels; an absent row reads as on. */
const collabFeaturesSchema = z.object({
  chat: z.boolean(),
  notes: z.boolean(),
  links: z.boolean(),
  polls: z.boolean(),
  whatsnext: z.boolean(),
});

export const addonsEnabledResponseSchema = z.object({
  collabFeatures: collabFeaturesSchema,
  bagTracking: z.boolean(),
  /** Tours is on and the admin allows wanderer under it. */
  toursWanderer: z.boolean(),
  /** Tours is on and the admin offers OpenHikingMap (MAP-01). */
  toursHikingMap: z.boolean(),
  /** Tours is on and the admin offers CyclOSM (BIK-06). */
  toursCycleMap: z.boolean(),
  /** Discovery is on and the admin lets a nearby scan cover the map area a traveller panned to. */
  discoveryMapArea: z.boolean(),
  addons: z.array(addonEntrySchema),
});
export type AddonsEnabledResponse = z.infer<typeof addonsEnabledResponseSchema>;
