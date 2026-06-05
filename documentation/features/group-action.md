# Group Action

Cette page documente le flux `Rejoindre un formulaire` pour CleanMyMap.

## But

Permettre a un bénévole de rejoindre le formulaire d'une action deja validee par les administrateurs, sans creer une nouvelle action.

## Flux utilisateur

1. Un organisateur declare une action via la rubrique `Déclarer une action`.
2. L'action passe par la validation admin.
3. Une fois validée, elle apparait dans `Rejoindre un formulaire`.
4. Le bénévole rejoint ce formulaire existant.
5. La participation est enregistrée dans `action_participants` et remonte dans les badges et les stats collectives.

## Placement dans le bloc Agir

- La rubrique `Rejoindre un formulaire` est la deuxieme rubrique du bloc `Agir`.
- Elle se situe juste sous la rubrique du formulaire benevole.
- Les points d'entree doivent rester visibles depuis l'accueil, le sommaire et les surfaces terrain associees.

## Points d'entree UI

- Bloc `Agir`
- Cartes d'accueil
- Historique des actions
- Bulles de carte
- Les liens profonds avec `actionId` doivent remonter l'action cible en tête de liste si elle est validee.

## Règles de comportement

- Le flux doit eviter la double saisie.
- Le formulaire rejoint doit deja exister et etre valide par un admin.
- Les participations doivent rester traçables.
- La jonction ne cree pas de nouveau formulaire.
- Une seule participation est enregistree par benevole et par action.

## Données

- Source d'affichage: table `actions` filtree sur `status = approved`.
- Source de participation: table `action_participants`.
- Source badge: `action_participants` alimente la famille `Participant`.
- Source stats: `action_participants` compte pour la progression collective.

## Validation

- Verifier que le bouton de join est visible sur les surfaces ciblees.
- Verifier que la participation remonte dans les statistiques.
- Verifier qu'une double participation est bloquee ou geree selon la regle retenue.
- Verifier qu'aucune action non validée n'affiche de CTA de jonction.
- Verifier qu'un lien profond `actionId` affiche bien l'action cible, meme hors du lot par défaut.
