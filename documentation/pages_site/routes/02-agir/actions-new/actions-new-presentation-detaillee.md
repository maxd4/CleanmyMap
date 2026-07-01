# Déclarer une action - Présentation détaillée

## Fiche canonique

- **Route** : `/actions/new`
- **Dossier canonique** : `actions-new`
- **Rôle** : point d'entrée du bloc Agir pour déclarer une action après terrain ou préparer une pré-déclaration avant terrain
- **Périmètre** : écran d'entrée à deux parcours, formulaire bénévole existant, retour au choix, états de transition et shell de pré-déclaration
- **États à documenter** : choix initial, chargement, succès, erreur, retour au choix, parcours après action, shell avant action
- **Composants concernés** : cartes de parcours, état de transition, formulaire bénévole actuel, message de pré-déclaration
- **Notes d'audit** : le parcours avant action reste un shell tant que le futur formulaire n'est pas créé et ne doit jamais produire une validation de collecte incomplète
