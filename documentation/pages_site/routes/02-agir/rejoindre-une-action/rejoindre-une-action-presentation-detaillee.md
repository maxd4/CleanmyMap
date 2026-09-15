# Rejoindre une action - Présentation détaillée

## Fiche canonique

- **Route** : `/sections/rejoindre-une-action`
- **Dossier canonique** : `rejoindre-une-action`
- **Rôle** : permettre de rejoindre une action future ouverte ou de consulter les résultats publics d'une action passée.
- **Périmètre** : onglets futurs/passés, liste des actions futures, recherche, filtres, tri, demande de participation, annulation d'une demande, file de modération, suivi personnel, résultats finaux publics et confirmation avant action sensible.
- **États à documenter** : chargement, absence d'actions, erreur de chargement, file de modération vide, file de modération alimentée, modale de confirmation, accès refusé si le compte n'est pas disponible selon le contexte, annulation de demande, départ confirmé.
- **Composants concernés** : `SectionShell`, `PageHero`, `PageHeroBadge`, `FamilyRubriqueCard`, `CmmButton`, `FilterPill`, modale de confirmation, cartes d'action, panneau de résumé, panneau de file de modération, suivi personnel.
- **Notes d'audit** :
  - le point d'entrée est la route `/sections/rejoindre-une-action` ;
  - l'ancien chemin `/sections/rejoindre-un-formulaire` redirige en conservant sa query string ;
  - l'onglet futur consomme les pré-actions ouvertes à la participation ;
  - l'onglet passé consomme une lecture publique dédiée des actions `post_action_complete`, sans `historyItems` ;
  - seules les actions satisfaisant `isJoinableFuturePreAction(...)` remontent dans la liste : phase `pre_action`, statut `pending` ou `approved`, `moderation_visibility = visible`, `published_at != null`, début futur selon Europe/Paris et `groupJoinEnabled === true` ;
  - une action masquée par modération reste absente de la liste et du lien direct public ;
  - la file de modération des demandes s'ouvre à partir de `actionId` ou de la première action visible ;
  - le CTA principal oriente vers une demande d'inscription future, pas vers une création de rubrique distincte ;
  - le CTA secondaire sur une inscription existante permet l'annulation sans effacer l'historique ;
  - le vocabulaire UI actif est `Rejoindre une action`, avec `Actions futures` et `Actions passées`.

## Structure visuelle cible

- **Fil d'Ariane** : `Agir > Rejoindre une action`.
- **Hero** : fond vert très clair, titre large, sous-titre explicatif, badge de contexte et illustration panoramique.
- **Onglets** : `Actions futures` est sélectionné par défaut ; `Actions passées` expose les résultats publics terminés.
- **Zone de recherche et filtres** : recherche texte + 4 contrôles alignés sur l'onglet futur.
- **Bloc principal** : liste des actions futures ouvertes, avec vignette visuelle, métadonnées, badges d'état et CTA `Demander à participer` ou `Quitter` selon l'état de participation.
- **Colonne latérale** : résumé chiffré des inscriptions et participations, raccourcis, carte `Mon suivi`, aide.
- **Bas de page** : file de modération des demandes, légende des actions de traitement, rappel de sécurité.
- **Interaction critique** : ouverture d'une modale avant validation d'une demande de participation.

## Intentions UI

- La page doit rester lisible sur desktop avec une hiérarchie forte entre la liste principale et la colonne latérale.
- Le vert doit rester la teinte dominante unique de la page.
- Les cartes doivent rester aérées et garder un rythme de lecture simple.
- Les états vides doivent proposer un CTA utile, pas une simple notice.
- La file de modération doit rester visible comme un bloc métier à part entière, et non comme un simple détail de la liste.
- Le retrait d'une inscription future doit conserver la trace dans `action_registrations` et rester visible dans l'historique de l'utilisateur.
- Une participation finale ne peut être créée que par un flux post-action dédié dans `action_participants`; elle reste distincte de l'inscription future.
