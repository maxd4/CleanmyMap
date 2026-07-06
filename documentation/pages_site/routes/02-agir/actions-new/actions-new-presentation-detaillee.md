# Déclarer une action - Présentation détaillée

## Fiche canonique

- **Route** : `/actions/new`
- **Dossier canonique** : `actions-new`
- **Rôle** : point d'entrée du bloc Agir pour déclarer une action après terrain ou préparer une action avant terrain
- **Périmètre** : écran d'entrée à deux parcours, formulaire bénévole existant, retour au choix, états de transition et pré-formulaire avant action
- **États à documenter** : choix initial, chargement, succès, erreur, retour au choix, parcours après action, pré-formulaire avant action
- **Composants concernés** : cartes de parcours, état de transition, formulaire bénévole actuel, pré-formulaire de groupe
- **Notes d'audit** : le parcours avant action enregistre un pré-formulaire léger centré sur le titre, la description, la zone, le point de rendez-vous précis, la localisation si disponible, la zone cible, les horaires, l'objectif prévu, l'estimation de durée, le nombre de bénévoles attendus, la difficulté, l'accessibilité, le message pour les participants, les consignes, le matériel, le commentaire logistique, la checklist, l'organisateur ou référent, le lien de partage et le statut du formulaire. Il reste visible dans la page Formulaire de groupe et permet de passer au formulaire complet sans valider artificiellement une collecte incomplète ni calculer d'impact.
