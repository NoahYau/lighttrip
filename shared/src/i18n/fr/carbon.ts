import type { TranslationStrings } from '../types';

/** L’empreinte carbone du voyage, sa répartition et le comparatif des modes. */
const carbon: TranslationStrings = {
  'carbon.title': 'Empreinte carbone',
  'carbon.subtitle': 'Émissions de CO₂e estimées pour les trajets de ce voyage',
  'carbon.total': 'Total estimé',
  'carbon.totalValue': '{value} kg CO₂e',
  'carbon.measuredLegs': 'Trajets mesurés',
  'carbon.measuredValue': '{estimated} / {total}',
  'carbon.km': '{value} km',
  'carbon.disclaimer': 'Estimation : distances à vol d’oiseau et facteurs d’émission moyens, pas un bilan carbone.',
  'carbon.byMode': 'D’où viennent les émissions',
  'carbon.perDay': 'Par jour',
  'carbon.legs': 'Trajets du voyage',
  'carbon.empty':
    'Rien à mesurer pour l’instant — ajoutez des étapes avec un lieu ou réservez un transport avec ses deux gares.',
  'carbon.loading': 'Mesure en cours…',
  'carbon.offline': 'L’estimation carbone nécessite une connexion.',
  'carbon.error': 'Impossible de charger l’estimation carbone.',
  'carbon.retry': 'Réessayer',
  'carbon.unknownMode': 'Non estimé',
  'carbon.compareTitle': 'Comparer les modes de transport',
  'carbon.compareFor': 'Pour {route}',
  'carbon.comparePick': 'Sélectionnez un trajet pour voir les alternatives.',
  'carbon.compareMode': 'Mode', // same-as-en
  'carbon.compareEmissions': 'CO₂e',
  'carbon.compareSaved': 'Économie',
  'carbon.compareBest': 'Le plus bas',
  'carbon.compareCurrent': 'Actuel',
  'carbon.mode.walk': 'À pied',
  'carbon.mode.cycle': 'Vélo',
  'carbon.mode.rail': 'Train', // same-as-en
  'carbon.mode.bus': 'Bus', // same-as-en
  'carbon.mode.coach': 'Autocar',
  'carbon.mode.car': 'Voiture (essence ou diesel)',
  'carbon.mode.car_electric': 'Voiture électrique',
  'carbon.mode.taxi': 'Taxi', // same-as-en
  'carbon.mode.motorbike': 'Moto',
  'carbon.mode.ferry': 'Ferry', // same-as-en
  'carbon.mode.cruise': 'Navire de croisière',
  'carbon.mode.flight': 'Avion',
};

export default carbon;
