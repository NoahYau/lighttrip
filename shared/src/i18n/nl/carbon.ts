import type { TranslationStrings } from '../types';

/** Het CO₂-voetafdrukpaneel en de vergelijking van vervoersmiddelen. */
const carbon: TranslationStrings = {
  'carbon.title': 'CO₂-voetafdruk',
  'carbon.subtitle': 'Geschatte CO₂e van het vervoer in deze reis',
  'carbon.total': 'Geschat totaal',
  'carbon.totalValue': '{value} kg CO₂e',
  'carbon.measuredLegs': 'Gemeten trajecten',
  'carbon.measuredValue': '{estimated} / {total}',
  'carbon.km': '{value} km',
  'carbon.disclaimer': 'Schatting: grootcirkelafstanden en gemiddelde emissiefactoren, geen koolstofaudit.',
  'carbon.byMode': 'Waar het vandaan komt',
  'carbon.perDay': 'Per dag',
  'carbon.legs': 'Reistrajecten',
  'carbon.empty': 'Nog niets te meten — voeg stops met een locatie toe, of boek een transport met beide stations.',
  'carbon.loading': 'Bezig met meten…',
  'carbon.offline': 'De CO₂-schatting heeft een verbinding nodig.',
  'carbon.error': 'De CO₂-schatting kon niet worden geladen.',
  'carbon.retry': 'Opnieuw proberen',
  'carbon.unknownMode': 'Niet geschat',
  'carbon.compareTitle': 'Vervoersmiddelen vergelijken',
  'carbon.compareFor': 'Voor {route}',
  'carbon.comparePick': 'Selecteer een traject om de alternatieven te zien.',
  'carbon.compareMode': 'Vervoer',
  'carbon.compareEmissions': 'CO₂e',
  'carbon.compareSaved': 'Besparing',
  'carbon.compareBest': 'Laagst',
  'carbon.compareCurrent': 'Huidig',
  'carbon.mode.walk': 'Lopen',
  'carbon.mode.cycle': 'Fietsen',
  'carbon.mode.rail': 'Trein',
  'carbon.mode.bus': 'Bus', // same-as-en
  'carbon.mode.coach': 'Touringcar',
  'carbon.mode.car': 'Auto (benzine of diesel)',
  'carbon.mode.car_electric': 'Elektrische auto',
  'carbon.mode.taxi': 'Taxi', // same-as-en
  'carbon.mode.motorbike': 'Motorfiets',
  'carbon.mode.ferry': 'Veerboot',
  'carbon.mode.cruise': 'Cruiseschip',
  'carbon.mode.flight': 'Vlucht',
};

export default carbon;
