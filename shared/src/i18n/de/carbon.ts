import type { TranslationStrings } from '../types';

/** Die CO₂-Bilanz der Reise samt Aufschlüsselung und Verkehrsmittelvergleich. */
const carbon: TranslationStrings = {
  'carbon.title': 'CO₂-Fußabdruck',
  'carbon.subtitle': 'Geschätzte CO₂e-Emissionen der Fahrten dieser Reise',
  'carbon.total': 'Geschätzte Summe',
  'carbon.totalValue': '{value} kg CO₂e',
  'carbon.measuredLegs': 'Gemessene Etappen',
  'carbon.measuredValue': '{estimated} / {total}',
  'carbon.km': '{value} km',
  'carbon.disclaimer':
    'Schätzung: Luftlinienentfernungen und durchschnittliche Emissionsfaktoren, keine CO₂-Bilanzierung.',
  'carbon.byMode': 'Woher die Emissionen kommen',
  'carbon.perDay': 'Pro Tag',
  'carbon.legs': 'Reiseetappen',
  'carbon.empty':
    'Noch nichts zu messen — füge Stopps mit einem Ort hinzu oder buche einen Transport mit beiden Stationen.',
  'carbon.loading': 'Wird gemessen…',
  'carbon.offline': 'Die CO₂-Schätzung braucht eine Verbindung.',
  'carbon.error': 'Die CO₂-Schätzung konnte nicht geladen werden.',
  'carbon.retry': 'Erneut versuchen',
  'carbon.unknownMode': 'Nicht geschätzt',
  'carbon.compareTitle': 'Verkehrsmittel vergleichen',
  'carbon.compareFor': 'Für {route}',
  'carbon.comparePick': 'Wähle eine Etappe, um die Alternativen zu sehen.',
  'carbon.compareMode': 'Verkehrsmittel',
  'carbon.compareEmissions': 'CO₂e',
  'carbon.compareSaved': 'Ersparnis',
  'carbon.compareBest': 'Niedrigster Wert',
  'carbon.compareCurrent': 'Aktuell',
  'carbon.mode.walk': 'Zu Fuß',
  'carbon.mode.cycle': 'Fahrrad',
  'carbon.mode.rail': 'Zug',
  'carbon.mode.bus': 'Bus', // same-as-en
  'carbon.mode.coach': 'Reisebus',
  'carbon.mode.car': 'Auto (Benzin oder Diesel)',
  'carbon.mode.car_electric': 'Elektroauto',
  'carbon.mode.taxi': 'Taxi', // same-as-en
  'carbon.mode.motorbike': 'Motorrad',
  'carbon.mode.ferry': 'Fähre',
  'carbon.mode.cruise': 'Kreuzfahrtschiff',
  'carbon.mode.flight': 'Flug',
};

export default carbon;
