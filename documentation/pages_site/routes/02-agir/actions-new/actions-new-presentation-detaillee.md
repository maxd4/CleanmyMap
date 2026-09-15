# Créer une action - Présentation détaillée

## Fiche canonique

- **Route** : `/actions/new`
- **Dossier canonique** : `actions-new`
- **Rôle** : entrée du bloc Agir pour préparer une action avant terrain ou compléter ses résultats après réalisation
- **Périmètre** : écran d'entrée à deux parcours, formulaire bénévole existant, retour au choix, états de transition et préparation avant action
- **États à documenter** : choix initial, chargement, succès, erreur, retour au choix, parcours après action, préparation avant action
- **Composants concernés** : cartes de parcours, état de transition, formulaire bénévole actuel, préparation avant action
- **Notes d'audit** : le parcours avant action enregistre une préparation légère centrée sur le titre, la description, la zone, le point de rendez-vous précis, la localisation si disponible, la zone cible, les horaires, l'objectif prévu, l'estimation de durée, le nombre de bénévoles attendus, la difficulté, l'accessibilité, le message pour les participants, les consignes, le matériel, le commentaire logistique, la checklist, l'organisateur ou référent, l'ouverture à la participation, le lien d'accès à `Rejoindre une action` et le statut de la préparation. Elle reste visible si elle est explicitement publiée et permet de passer au formulaire complet sans valider artificiellement une collecte incomplète ni calculer d'impact. Les noms techniques `groupJoinEnabled` et `groupJoinHref` restent internes.
