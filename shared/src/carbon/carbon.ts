/**
 * The carbon-footprint model: how much CO₂e a distance costs on each transport
 * mode, and how the modes rank against each other.
 *
 * Both sides need the same answer — the server sums a whole trip, the client
 * ranks the alternatives for one leg as you change the mode — so the arithmetic
 * lives here rather than in either of them. It is a pure, isomorphic module: no
 * `node:` imports, no dependencies, no I/O.
 *
 * This is an ESTIMATE by construction, and the UI says so:
 *
 * - Distances are great-circle (haversine) between the stops a traveller placed.
 *   A real road or rail line is longer, so a road mode is understated slightly
 *   and an air mode is close to right (air routes are close to great circles).
 * - Emission factors are rounded averages in the range published for passenger
 *   transport by DEFRA/DESNZ (UK greenhouse-gas conversion factors) and the EEA.
 *   They are not a carbon audit: an empty coach and a full one differ by more
 *   than the difference between two of these rows.
 * - Flights carry a radiative-forcing multiplier, which is why their factors are
 *   several times a train's. They are the only distance-dependent entry: short
 *   hops burn their fuel on take-off, long ones cruise efficiently.
 *
 * Nothing here is stored per trip — the numbers are derived on every read, so
 * editing an itinerary updates its footprint with no migration and no cache to
 * invalidate.
 */

/** The transport modes a footprint can be estimated for, cheapest first by intent. */
export const CARBON_MODES = [
  'walk',
  'cycle',
  'rail',
  'bus',
  'coach',
  'car',
  'car_electric',
  'taxi',
  'motorbike',
  'ferry',
  'cruise',
  'flight',
] as const;
export type CarbonMode = (typeof CARBON_MODES)[number];

/**
 * Grams of CO₂e per passenger-kilometre, one traveller.
 *
 * `walk` and `cycle` are zero because the fuel is food and a bicycle, which this
 * model does not count; leaving them at zero is also what makes them rank first
 * in a comparison, where they belong. `car` is the average petrol/diesel car
 * (TREK does not ask for a fuel type), `car_electric` a battery car on an average
 * grid. `flight` holds the short-haul figure here and is replaced per distance by
 * `flightFactor` — every other entry is a constant.
 */
export const CARBON_FACTORS_GRAMS_PER_KM: Record<CarbonMode, number> = {
  walk: 0,
  cycle: 0,
  rail: 35,
  bus: 103,
  coach: 27,
  car: 170,
  car_electric: 47,
  taxi: 210,
  motorbike: 114,
  ferry: 19,
  cruise: 250,
  flight: 151,
};

/** How far a flight goes, in the three bands its factor differs in. */
export const FLIGHT_HAUL_BANDS_KM = { short: 600, long: 3700 } as const;

/** Grams of CO₂e per passenger-kilometre by flight haul, take-off and landing included. */
export const FLIGHT_FACTORS_GRAMS_PER_KM = {
  domestic: 246,
  short_haul: 151,
  long_haul: 148,
} as const;
export type FlightHaul = keyof typeof FLIGHT_FACTORS_GRAMS_PER_KM;

/** The haul band a flight of this length falls in. */
export function flightHaul(distanceKm: number): FlightHaul {
  if (!(distanceKm >= FLIGHT_HAUL_BANDS_KM.short)) return 'domestic';
  if (distanceKm < FLIGHT_HAUL_BANDS_KM.long) return 'short_haul';
  return 'long_haul';
}

/** Grams of CO₂e per passenger-kilometre for this mode over this distance. */
export function carbonFactor(mode: CarbonMode, distanceKm: number): number {
  if (mode !== 'flight') return CARBON_FACTORS_GRAMS_PER_KM[mode];
  return FLIGHT_FACTORS_GRAMS_PER_KM[flightHaul(distanceKm)];
}

/**
 * The emissions of one leg, in whole grams, or null when the mode is unknown.
 *
 * Whole grams rather than kilograms because the sums are exact integers: a
 * hundred short legs of a fraction of a gram add up to a figure worth showing
 * instead of to zero. A distance that is not a positive finite number is zero
 * kilometres — a stop without coordinates, or the same place twice, emits
 * nothing rather than `NaN` leaking into a total.
 */
export function carbonGrams(mode: CarbonMode | null, distanceKm: number): number | null {
  if (!mode) return null;
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  return Math.round(carbonFactor(mode, distanceKm) * distanceKm);
}

/**
 * TREK stores a transport mode as free text (a day default, a per-leg override, a
 * booking type, a plugin profile). This maps that vocabulary onto the factors
 * above; anything unrecognised is null, so an unknown mode is shown as "not
 * estimated" instead of silently counted as a car.
 *
 * The values are the strings the planner, the transport modal and `TRANSPORT_TYPES`
 * already write — lower-cased here, so `Bicycle` and `bicycle` agree.
 */
const TRANSPORT_MODE_ALIASES: Record<string, CarbonMode> = {
  walking: 'walk',
  walk: 'walk',
  foot: 'walk',
  cycling: 'cycle',
  bicycle: 'cycle',
  bike: 'cycle',
  ebike: 'cycle',
  'e-bike': 'cycle',
  driving: 'car',
  drive: 'car',
  car: 'car',
  car_rental: 'car',
  rental_car: 'car',
  taxi: 'taxi',
  motorbike: 'motorbike',
  motorcycle: 'motorbike',
  scooter: 'motorbike',
  train: 'rail',
  rail: 'rail',
  metro: 'rail',
  subway: 'rail',
  tram: 'rail',
  light_rail: 'rail',
  // An electric short-hop lift carries a handful of people a few hundred metres;
  // rail's figure is the closest of the constants and errs high, not low.
  cable_car: 'rail',
  // "transit" is TREK's generic public transport, which in a city is mostly bus.
  transit: 'bus',
  bus: 'bus',
  coach: 'coach',
  ferry: 'ferry',
  boat: 'ferry',
  ship: 'cruise',
  cruise: 'cruise',
  flight: 'flight',
  plane: 'flight',
  airplane: 'flight',
  air: 'flight',
};

export function carbonModeForTransportMode(mode: string | null | undefined): CarbonMode | null {
  if (!mode) return null;
  const key = mode.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(TRANSPORT_MODE_ALIASES, key) ? TRANSPORT_MODE_ALIASES[key]! : null;
}

/** One row of a mode comparison. */
export interface CarbonOption {
  mode: CarbonMode;
  /** Whole grams for the whole distance. */
  grams: number;
  grams_per_km: number;
  /** Grams this option saves against the baseline; negative when it emits more, null without a baseline. */
  saving_grams: number | null;
  /** The same saving as a share of the baseline's figure, 0 to 1 (negative when it emits more). */
  saving_share: number | null;
}

export interface CarbonComparisonInput {
  distanceKm: number;
  /** The mode the traveller is comparing against — usually the one currently planned. */
  baseline?: CarbonMode | null;
  /** Which modes to rank; every mode by default. */
  modes?: readonly CarbonMode[];
}

/**
 * Every mode's emissions for one distance, cheapest first.
 *
 * Ordering breaks ties by the catalog order rather than by name, so walk and
 * cycle share the top of the list in a stable, meaningful way instead of
 * swapping places per locale.
 */
export function compareCarbonModes(input: CarbonComparisonInput): CarbonOption[] {
  const { distanceKm, baseline = null, modes = CARBON_MODES } = input;
  const baselineGrams = carbonGrams(baseline, distanceKm);
  const options = modes.map((mode): CarbonOption => {
    const grams = carbonGrams(mode, distanceKm) ?? 0;
    const saving = baselineGrams == null ? null : baselineGrams - grams;
    return {
      mode,
      grams,
      grams_per_km: carbonFactor(mode, distanceKm),
      saving_grams: saving,
      saving_share: saving == null || !baselineGrams ? null : saving / baselineGrams,
    };
  });
  const order = (mode: CarbonMode): number => CARBON_MODES.indexOf(mode);
  return options.sort((a, b) => a.grams - b.grams || order(a.mode) - order(b.mode));
}
