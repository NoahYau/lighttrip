import { addonsEnabledResponseSchema } from './addons.schema';

import { describe, it, expect } from 'vitest';

/** The body GET /api/addons answers with, as the addons e2e pins it. */
const base = {
  collabFeatures: { chat: true, notes: true, links: true, polls: true, whatsnext: true },
  bagTracking: false,
  toursWanderer: false,
  toursHikingMap: true,
  toursCycleMap: true,
  discoveryMapArea: false,
  addons: [{ id: 'packing', name: 'Packing', type: 'trip', icon: 'Backpack', enabled: true }],
};

describe('addonsEnabledResponseSchema', () => {
  it('accepts the feed as the server sends it', () => {
    expect(addonsEnabledResponseSchema.safeParse(base).success).toBe(true);
  });

  it('carries the Discovery map-area switch as a required boolean', () => {
    expect(addonsEnabledResponseSchema.parse({ ...base, discoveryMapArea: true }).discoveryMapArea).toBe(true);
    expect(addonsEnabledResponseSchema.safeParse({ ...base, discoveryMapArea: 'false' }).success).toBe(false);

    const missing: Record<string, unknown> = { ...base };
    delete missing.discoveryMapArea;
    expect(addonsEnabledResponseSchema.safeParse(missing).success).toBe(false);
  });

  it('accepts a photo provider riding the Journey addon, config and fields included', () => {
    const body = {
      ...base,
      addons: [
        {
          id: 'immich',
          name: 'Immich',
          type: 'photo_provider',
          icon: 'Image',
          enabled: true,
          config: { settings_get: '/integrations/memories/immich/settings' },
          fields: [
            {
              key: 'base_url',
              label: 'Base URL',
              input_type: 'text',
              placeholder: 'https://...',
              hint: null,
              required: true,
              secret: false,
              settings_key: 'immich_url',
              payload_key: null,
              sort_order: 1,
            },
          ],
        },
      ],
    };
    expect(addonsEnabledResponseSchema.safeParse(body).success).toBe(true);
  });

  it('accepts a null icon, as an add-on row without one answers null', () => {
    const body = {
      ...base,
      addons: [{ id: 'bare', name: 'Bare', type: 'trip', icon: null, enabled: false }],
    };
    expect(addonsEnabledResponseSchema.safeParse(body).success).toBe(true);
    expect(addonsEnabledResponseSchema.safeParse({ ...body, addons: [{ id: 'bare' }] }).success).toBe(false);
  });
});
