# Group Action

Cette page documente le flux `Rejoindre un formulaire` pour CleanMyMap.

## But

Permettre a un bénévole de rejoindre le formulaire d'une action deja validee par les administrateurs, sans creer une nouvelle action.

## Flux utilisateur

1. Un organisateur crée un formulaire de groupe depuis la déclaration d'action.
2. L'action passe par la validation admin.
3. Une fois validée, elle apparait dans `Rejoindre un formulaire`.
4. Le bénévole rejoint ce formulaire existant.
5. La participation est enregistrée dans `action_participants` avec un statut, une origine et une date de jonction, puis remonte dans les badges et les stats collectives.
6. Si le bénévole s'est trompé, il peut annuler une demande en attente ou quitter un formulaire accepté, tout en conservant la trace historique.

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
- Les participations doivent rester traçables, y compris si leur statut change.
- La jonction ne cree pas de nouveau formulaire.
- Une seule participation active est conservee par benevole et par action.
- L'organisateur peut fermer ou rouvrir les inscriptions apres publication.
- La participation reste tracée, mais la page benevole permet d'annuler une demande en attente ou de quitter un formulaire accepté.

## Données

- Source d'affichage: table `actions` filtree sur `status = approved`.
- Source de participation: table `action_participants` avec `participation_status`, `participation_source` et `joined_at`.
- Source badge: `action_participants` alimente la famille `Participant`.
- Source stats: `action_participants` compte pour la progression collective.
- Source fermeture: metadata de `actions.notes` via `groupJoinEnabled`.

## Validation

- Verifier que le bouton de join est visible sur les surfaces ciblees.
- Verifier que la participation remonte dans les statistiques.
- Verifier qu'une demande en attente peut etre annulée par son auteur.
- Verifier qu'une participation acceptée peut etre quittée par son auteur.
- Verifier qu'aucune action non validée n'affiche de CTA de jonction.
- Verifier qu'un lien profond `actionId` affiche bien l'action cible, meme hors du lot par défaut.
