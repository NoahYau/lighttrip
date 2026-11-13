import type { TranslationStrings } from '../types';

/**
 * The carbon-footprint panel and its mode comparison. Kept apart from `trip.ts`
 * and `dayplan.ts` because it is one self-contained read-out: the total, the
 * breakdown, the legs and the alternatives for a leg.
 *
 * No string here carries `{count}`: the figures are shown beside their labels
 * ("{estimated} / {total}" under "Measured legs"), so no language has to agree a
 * plural with a number it only displays.
 */
const carbon: TranslationStrings = {
  'carbon.title': 'Carbon footprint',
  'carbon.subtitle': 'Estimated CO₂e of this trip’s travel',
  'carbon.total': 'Estimated total',
  'carbon.totalValue': '{value} kg CO₂e',
  'carbon.measuredLegs': 'Measured legs',
  'carbon.measuredValue': '{estimated} / {total}',
  'carbon.km': '{value} km',
  'carbon.disclaimer': 'Estimate: great-circle distances and average emission factors, not a carbon audit.',
  'carbon.byMode': 'Where it comes from',
  'carbon.perDay': 'By day',
  'carbon.legs': 'Travel legs',
  'carbon.empty': 'Nothing to measure yet — add stops with a location, or book a transport with both stations.',
  'carbon.loading': 'Measuring…',
  'carbon.offline': 'The carbon estimate needs a connection.',
  'carbon.error': 'Could not load the carbon estimate.',
  'carbon.retry': 'Try again',
  'carbon.unknownMode': 'Not estimated',
  'carbon.compareTitle': 'Compare transport modes',
  'carbon.compareFor': 'For {route}',
  'carbon.comparePick': 'Select a leg to see its alternatives.',
  'carbon.compareMode': 'Mode',
  'carbon.compareEmissions': 'CO₂e',
  'carbon.compareSaved': 'Saved',
  'carbon.compareBest': 'Lowest',
  'carbon.compareCurrent': 'Current',
  'carbon.mode.walk': 'Walking',
  'carbon.mode.cycle': 'Cycling',
  'carbon.mode.rail': 'Train',
  'carbon.mode.bus': 'Bus',
  'carbon.mode.coach': 'Coach',
  'carbon.mode.car': 'Car (petrol or diesel)',
  'carbon.mode.car_electric': 'Electric car',
  'carbon.mode.taxi': 'Taxi',
  'carbon.mode.motorbike': 'Motorbike',
  'carbon.mode.ferry': 'Ferry',
  'carbon.mode.cruise': 'Cruise ship',
  'carbon.mode.flight': 'Flight',
};

export default carbon;
