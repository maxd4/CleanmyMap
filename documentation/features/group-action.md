# Group Action

Cette page explique le flux de groupe pour CleanMyMap.

## But

Permettre a une personne de publier une action de groupe, puis a d'autres volontaires de la rejoindre sans refaire tout le formulaire.

## Flux utilisateur

1. Un organisateur ouvre le formulaire de groupe.
2. Il publie une action partagée.
3. Un autre volontaire voit un point d'entree `Rejoindre un formulaire`.
4. Il rejoint l'action.
5. Sa participation est comptee dans ses statistiques.

## Points d'entree UI

- Bloc `Agir`
- Cartes d'accueil
- Historique des actions
- Bulles de carte

## Règles de comportement

- Le flux doit eviter la double saisie.
- La repartition de contribution doit etre definie explicitement.
- Les participations doivent rester traçables.

## Validation

- Verifier que le bouton de join est visible sur les surfaces ciblees.
- Verifier que la participation remonte dans les statistiques.
- Verifier qu'une double participation est bloquee ou geree selon la regle retenue.

