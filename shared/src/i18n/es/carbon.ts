import type { TranslationStrings } from '../types';

/** La huella de carbono del viaje, su desglose y la comparativa de modos. */
const carbon: TranslationStrings = {
  'carbon.title': 'Huella de carbono',
  'carbon.subtitle': 'Emisiones de CO₂e estimadas de los trayectos de este viaje',
  'carbon.total': 'Total estimado',
  'carbon.totalValue': '{value} kg CO₂e',
  'carbon.measuredLegs': 'Trayectos medidos',
  'carbon.measuredValue': '{estimated} / {total}',
  'carbon.km': '{value} km',
  'carbon.disclaimer':
    'Estimación: distancias en línea recta y factores de emisión medios, no es una auditoría de carbono.',
  'carbon.byMode': 'De dónde vienen las emisiones',
  'carbon.perDay': 'Por día',
  'carbon.legs': 'Trayectos del viaje',
  'carbon.empty':
    'Aún no hay nada que medir — añade paradas con ubicación o reserva un transporte con las dos estaciones.',
  'carbon.loading': 'Midiendo…',
  'carbon.offline': 'La estimación de carbono necesita conexión.',
  'carbon.error': 'No se pudo cargar la estimación de carbono.',
  'carbon.retry': 'Reintentar',
  'carbon.unknownMode': 'Sin estimar',
  'carbon.compareTitle': 'Comparar modos de transporte',
  'carbon.compareFor': 'Para {route}',
  'carbon.comparePick': 'Selecciona un trayecto para ver sus alternativas.',
  'carbon.compareMode': 'Modo',
  'carbon.compareEmissions': 'CO₂e',
  'carbon.compareSaved': 'Ahorro',
  'carbon.compareBest': 'El más bajo',
  'carbon.compareCurrent': 'Actual',
  'carbon.mode.walk': 'A pie',
  'carbon.mode.cycle': 'Bicicleta',
  'carbon.mode.rail': 'Tren',
  'carbon.mode.bus': 'Autobús',
  'carbon.mode.coach': 'Autocar',
  'carbon.mode.car': 'Coche (gasolina o diésel)',
  'carbon.mode.car_electric': 'Coche eléctrico',
  'carbon.mode.taxi': 'Taxi', // same-as-en
  'carbon.mode.motorbike': 'Moto',
  'carbon.mode.ferry': 'Ferri',
  'carbon.mode.cruise': 'Crucero',
  'carbon.mode.flight': 'Avión',
};

export default carbon;
