import type { TranslationStrings } from '../types';

/** El panell de petjada de carboni i la comparació de modes de transport. */
const carbon: TranslationStrings = {
  'carbon.title': 'Petjada de carboni',
  'carbon.subtitle': 'Estimació de CO₂e dels desplaçaments d’aquest viatge',
  'carbon.total': 'Total estimat',
  'carbon.totalValue': '{value} kg CO₂e',
  'carbon.measuredLegs': 'Trams mesurats',
  'carbon.measuredValue': '{estimated} / {total}',
  'carbon.km': '{value} km',
  'carbon.disclaimer': 'Estimació: distàncies ortodròmiques i factors d’emissió mitjans, no una auditoria de carboni.',
  'carbon.byMode': 'D’on ve',
  'carbon.perDay': 'Per dia',
  'carbon.legs': 'Trams del viatge',
  'carbon.empty': 'Res a mesurar encara: afegeix parades amb una ubicació o un transport amb les dues estacions.',
  'carbon.loading': 'Mesurant…',
  'carbon.offline': 'L’estimació de carboni necessita connexió.',
  'carbon.error': 'No s’ha pogut carregar l’estimació de carboni.',
  'carbon.retry': 'Torna-ho a provar',
  'carbon.unknownMode': 'No estimat',
  'carbon.compareTitle': 'Compara els modes de transport',
  'carbon.compareFor': 'Per a {route}',
  'carbon.comparePick': 'Selecciona un tram per veure’n les alternatives.',
  'carbon.compareMode': 'Mode', // same-as-en
  'carbon.compareEmissions': 'CO₂e',
  'carbon.compareSaved': 'Estalvi',
  'carbon.compareBest': 'Més baix',
  'carbon.compareCurrent': 'Actual',
  'carbon.mode.walk': 'A peu',
  'carbon.mode.cycle': 'Bicicleta',
  'carbon.mode.rail': 'Tren',
  'carbon.mode.bus': 'Autobús',
  'carbon.mode.coach': 'Autocar',
  'carbon.mode.car': 'Cotxe (gasolina o dièsel)',
  'carbon.mode.car_electric': 'Cotxe elèctric',
  'carbon.mode.taxi': 'Taxi', // same-as-en
  'carbon.mode.motorbike': 'Moto',
  'carbon.mode.ferry': 'Ferri',
  'carbon.mode.cruise': 'Creuer',
  'carbon.mode.flight': 'Vol',
};

export default carbon;
