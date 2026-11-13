/**
 * The trip planner's core tab ids, in the order the tab bar shows them.
 *
 * These are the German legacy names the planner has always used internally
 * ('buchungen', 'finanzplan', 'dateien', 'listen') — not the English labels.
 * They are what sessionStorage, the ?tab= deep link and the startup-destination
 * setting persist, so renaming one would silently strand saved preferences.
 *
 * Addon-owned tabs are listed here even while their addon is off: useTripPlanner
 * builds TRIP_TABS from what is actually enabled, and anything pointing at a tab
 * that isn't there falls back to the plan view.
 */
export const TRIP_TAB_IDS = [
  'plan',
  'tour-planner',
  'roadtrip',
  'transports',
  'buchungen',
  'listen',
  'finanzplan',
  'carbon',
  'dateien',
  'collab',
  'journal',
] as const

export type TripTabId = (typeof TRIP_TAB_IDS)[number]

/**
 * Translation key per tab, so the startup-destination picker in Settings names
 * the tabs exactly as the planner's own tab bar does. useTripPlanner builds its
 * TRIP_TABS from these too — one source, or the two would drift apart the first
 * time a tab is renamed.
 *
 * Each entry holds the key in a `labelKey` property rather than as a bare string:
 * that is the shape `lint:i18n-keys` reads, and a flat map had left every one of
 * these keys looking unreferenced — a `Carbon` tab that no scan could see is how
 * the ratchet was first hit.
 */
export const TRIP_TAB_LABELS: Record<TripTabId, { labelKey: string }> = {
  plan: { labelKey: 'trip.tabs.plan' },
  'tour-planner': { labelKey: 'trip.tabs.tourPlanner' },
  roadtrip: { labelKey: 'roadtrip.title' },
  transports: { labelKey: 'trip.tabs.transports' },
  buchungen: { labelKey: 'trip.tabs.reservations' },
  listen: { labelKey: 'trip.tabs.lists' },
  finanzplan: { labelKey: 'trip.tabs.budget' },
  carbon: { labelKey: 'trip.tabs.carbon' },
  dateien: { labelKey: 'trip.tabs.files' },
  collab: { labelKey: 'admin.addons.catalog.collab.name' },
  journal: { labelKey: 'trip.tabs.journal' },
}

export const isTripTabId = (value: unknown): value is TripTabId =>
  typeof value === 'string' && (TRIP_TAB_IDS as readonly string[]).includes(value)

/**
 * What `/trips/:id?tab=…` accepts. Trip-page plugins mount as tabs too and are
 * addressable by their `plugin:<id>` form, so a shortcut can point at one — the
 * planner's own guard still drops it if that plugin isn't installed.
 */
export const isDeepLinkableTripTab = (value: string): boolean =>
  isTripTabId(value) || value.startsWith('plugin:')
