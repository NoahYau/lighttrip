import type { TranslationStrings } from '../types';

/** Az utazás szénlábnyoma: panel, közlekedési mód és nap szerinti bontás, összehasonlító táblázat. */
const carbon: TranslationStrings = {
  'carbon.title': 'Szénlábnyom',
  'carbon.subtitle': 'Az utazás becsült CO₂e-kibocsátása',
  'carbon.total': 'Becsült összesen',
  'carbon.totalValue': '{value} kg CO₂e',
  'carbon.measuredLegs': 'Mért szakaszok',
  'carbon.measuredValue': '{estimated} / {total}',
  'carbon.km': '{value} km',
  'carbon.disclaimer': 'Becslés: légvonalbeli távolságok és átlagos kibocsátási tényezők, nem karbonaudit.',
  'carbon.byMode': 'Honnan származik',
  'carbon.perDay': 'Napok szerint',
  'carbon.legs': 'Útszakaszok',
  'carbon.empty':
    'Még nincs mit mérni — adj hozzá helyszínnel rendelkező megállókat, vagy foglalj olyan közlekedést, ahol mindkét állomás meg van adva.',
  'carbon.loading': 'Mérés…',
  'carbon.offline': 'A szénlábnyom-becsléshez kapcsolat kell.',
  'carbon.error': 'Nem sikerült betölteni a szénlábnyom-becslést.',
  'carbon.retry': 'Újrapróbálás',
  'carbon.unknownMode': 'Nincs becsülve',
  'carbon.compareTitle': 'Közlekedési módok összehasonlítása',
  'carbon.compareFor': '{route} útvonalra',
  'carbon.comparePick': 'Válassz egy szakaszt az alternatívák megtekintéséhez.',
  'carbon.compareMode': 'Mód',
  'carbon.compareEmissions': 'CO₂e',
  'carbon.compareSaved': 'Megtakarítás',
  'carbon.compareBest': 'Legalacsonyabb',
  'carbon.compareCurrent': 'Jelenlegi',
  'carbon.mode.walk': 'Gyaloglás',
  'carbon.mode.cycle': 'Kerékpár',
  'carbon.mode.rail': 'Vonat',
  'carbon.mode.bus': 'Busz',
  'carbon.mode.coach': 'Távolsági busz',
  'carbon.mode.car': 'Autó (benzin vagy dízel)',
  'carbon.mode.car_electric': 'Elektromos autó',
  'carbon.mode.taxi': 'Taxi', // same-as-en
  'carbon.mode.motorbike': 'Motorkerékpár',
  'carbon.mode.ferry': 'Komp',
  'carbon.mode.cruise': 'Tengerjáró hajó',
  'carbon.mode.flight': 'Repülőgép',
};

export default carbon;
