import type { TranslationStrings } from '../types';

/** L’impronta di carbonio del viaggio, la sua ripartizione e il confronto dei mezzi. */
const carbon: TranslationStrings = {
  'carbon.title': 'Impronta di carbonio',
  'carbon.subtitle': 'Emissioni di CO₂e stimate per gli spostamenti di questo viaggio',
  'carbon.total': 'Totale stimato',
  'carbon.totalValue': '{value} kg CO₂e',
  'carbon.measuredLegs': 'Tratte misurate',
  'carbon.measuredValue': '{estimated} / {total}',
  'carbon.km': '{value} km',
  'carbon.disclaimer': 'Stima: distanze in linea d’aria e fattori di emissione medi, non un inventario del carbonio.',
  'carbon.byMode': 'Da dove vengono le emissioni',
  'carbon.perDay': 'Per giorno',
  'carbon.legs': 'Tratte del viaggio',
  'carbon.empty':
    'Non c’è ancora niente da misurare — aggiungi tappe con una località o prenota un trasporto con entrambe le stazioni.',
  'carbon.loading': 'Misurazione in corso…',
  'carbon.offline': 'La stima del carbonio richiede una connessione.',
  'carbon.error': 'Impossibile caricare la stima del carbonio.',
  'carbon.retry': 'Riprova',
  'carbon.unknownMode': 'Non stimato',
  'carbon.compareTitle': 'Confronta i mezzi di trasporto',
  'carbon.compareFor': 'Per {route}',
  'carbon.comparePick': 'Seleziona una tratta per vedere le alternative.',
  'carbon.compareMode': 'Mezzo',
  'carbon.compareEmissions': 'CO₂e',
  'carbon.compareSaved': 'Risparmio',
  'carbon.compareBest': 'Il più basso',
  'carbon.compareCurrent': 'Attuale',
  'carbon.mode.walk': 'A piedi',
  'carbon.mode.cycle': 'Bicicletta',
  'carbon.mode.rail': 'Treno',
  'carbon.mode.bus': 'Autobus',
  'carbon.mode.coach': 'Pullman',
  'carbon.mode.car': 'Auto (benzina o diesel)',
  'carbon.mode.car_electric': 'Auto elettrica',
  'carbon.mode.taxi': 'Taxi', // same-as-en
  'carbon.mode.motorbike': 'Moto',
  'carbon.mode.ferry': 'Traghetto',
  'carbon.mode.cruise': 'Nave da crociera',
  'carbon.mode.flight': 'Aereo',
};

export default carbon;
