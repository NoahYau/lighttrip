import type { TranslationStrings } from '../types';

const discovery: TranslationStrings = {
  'discovery.title': 'À proximité',
  'discovery.subtitle': 'Des lieux qui méritent une courte promenade d’ici',
  'discovery.idle': 'Regarde ce qui t’entoure.',
  'discovery.scan': 'Regarder autour',
  'discovery.scanAgain': 'Regarder à nouveau autour',
  'discovery.loading': 'Recherche autour…',
  'discovery.empty': 'Rien ne mérite une courte promenade par ici pour le moment.',
  'discovery.noMatches': 'Rien de cette catégorie à proximité.',
  'discovery.offline': 'Trouver des lieux proches nécessite une connexion.',
  'discovery.denied':
    '« À proximité » a besoin de votre position. Autorisez-la dans les réglages du navigateur puis réessayez.',
  'discovery.unavailable': 'Impossible de lire votre position. Réessayez dans un instant.',
  'discovery.error': 'Impossible de regarder autour.',
  'discovery.retry': 'Réessayer',
  'discovery.filters': 'Catégories',
  'discovery.filterAll': 'Tout',
  'discovery.walkTime': 'marcher {time}',
  'discovery.category.nature': 'Nature', // same-as-en
  'discovery.category.culture': 'Culture', // same-as-en
  'discovery.category.food': 'Restauration',
  'discovery.category.shopping': 'Achats',
  'discovery.category.other': 'Autre',
  'discovery.roam.title': 'Flânerie',
  'discovery.roam.subtitle': 'Suggère des lieux proches pendant que vous marchez.',
  'discovery.roam.on': 'La flânerie est activée',
  'discovery.roam.off': 'La flânerie est désactivée',
  'discovery.roam.privacy':
    'Pendant la flânerie, votre position est utilisée pour trouver des lieux proches. Seule une cellule de grille de 150 m est envoyée — jamais vos coordonnées exactes — et elle est supprimée au bout de 24 heures.',
  'discovery.roam.start': 'Commencer à flâner',
  'discovery.roam.stop': 'Arrêter la flânerie',
  'discovery.roam.tracking': 'Vous suit',
  'discovery.roam.suppressed': 'La flânerie est en pause pour le moment.',
  'discovery.card.add': "Ajouter à aujourd'hui",
  'discovery.card.dismiss': 'Pas maintenant',
  'discovery.card.title': "Ça vaut le coup d'œil",
  'discovery.card.reason': 'Pourquoi maintenant',
  'discovery.suppress.accuracy': "Votre position n'est pas encore assez précise.",
  'discovery.suppress.speed': 'Vous vous déplacez trop vite pour recevoir des suggestions.',
  'discovery.suppress.quietHours': "C'est l'heure de calme — rien ne s'affichera.",
  'discovery.suppress.dailyCap': "C'est assez pour aujourd'hui.",
  'discovery.suppress.poiCooldown': 'Vous avez déjà vu ce lieu.',
  'discovery.suppress.categoryCooldown': "Vous avez assez vu de ce genre aujourd'hui.",
  'discovery.suppress.alreadyInTrip': 'Ce lieu est déjà dans votre voyage.',
  'discovery.suppress.dismissed': 'Vous avez dit « pas maintenant ».',
};

export default discovery;
