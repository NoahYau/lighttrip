import type { TranslationStrings } from '../types';

/** Panelen för koldioxidavtryck och jämförelsen av färdmedel. */
const carbon: TranslationStrings = {
  'carbon.title': 'Koldioxidavtryck',
  'carbon.subtitle': 'Uppskattad CO₂e för transporterna i den här resan',
  'carbon.total': 'Uppskattad total',
  'carbon.totalValue': '{value} kg CO₂e',
  'carbon.measuredLegs': 'Mätta etapper',
  'carbon.measuredValue': '{estimated} / {total}',
  'carbon.km': '{value} km',
  'carbon.disclaimer': 'Uppskattning: storcirkelavstånd och genomsnittliga utsläppsfaktorer, inte en utsläppsrevision.',
  'carbon.byMode': 'Var det kommer ifrån',
  'carbon.perDay': 'Per dag',
  'carbon.legs': 'Etapper',
  'carbon.empty': 'Inget att mäta än — lägg till stopp med en plats, eller boka en transport med båda stationerna.',
  'carbon.loading': 'Mäter…',
  'carbon.offline': 'Koldioxiduppskattningen behöver en anslutning.',
  'carbon.error': 'Det gick inte att läsa in koldioxiduppskattningen.',
  'carbon.retry': 'Försök igen',
  'carbon.unknownMode': 'Inte uppskattad',
  'carbon.compareTitle': 'Jämför färdmedel',
  'carbon.compareFor': 'För {route}',
  'carbon.comparePick': 'Välj en etapp för att se alternativen.',
  'carbon.compareMode': 'Färdmedel',
  'carbon.compareEmissions': 'CO₂e',
  'carbon.compareSaved': 'Besparing',
  'carbon.compareBest': 'Lägst',
  'carbon.compareCurrent': 'Nuvarande',
  'carbon.mode.walk': 'Till fots',
  'carbon.mode.cycle': 'Cykel',
  'carbon.mode.rail': 'Tåg',
  'carbon.mode.bus': 'Buss',
  'carbon.mode.coach': 'Långfärdsbuss',
  'carbon.mode.car': 'Bil (bensin eller diesel)',
  'carbon.mode.car_electric': 'Elbil',
  'carbon.mode.taxi': 'Taxi', // same-as-en
  'carbon.mode.motorbike': 'Motorcykel',
  'carbon.mode.ferry': 'Färja',
  'carbon.mode.cruise': 'Kryssningsfartyg',
  'carbon.mode.flight': 'Flyg',
};

export default carbon;
