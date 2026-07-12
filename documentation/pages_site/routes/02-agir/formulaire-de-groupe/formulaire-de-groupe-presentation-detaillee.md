# Rejoindre un formulaire - Présentation détaillée

## Fiche canonique

- **Route** : `/sections/rejoindre-un-formulaire`
- **Dossier canonique** : `formulaire-de-groupe`
- **Rôle** : permettre de rejoindre une action de groupe prévue et ouverte, de consulter sa file publique, de suivre le statut des participations et de se retirer en cas d'erreur.
- **Périmètre** : liste des actions ouvertes, recherche, filtres, tri, demande de participation, annulation d'une demande, sortie d'un formulaire, file publique, suivi personnel et confirmation avant action sensible.
- **États à documenter** : chargement, absence d'actions, erreur de chargement, file publique vide, file publique alimentée, modale de confirmation, accès refusé si le compte n'est pas disponible selon le contexte, annulation de demande, départ confirmé.
- **Composants concernés** : `SectionShell`, `PageHero`, `PageHeroBadge`, `FamilyRubriqueCard`, `CmmButton`, `FilterPill`, modale de confirmation, cartes d'action, panneau de résumé, panneau de file publique, suivi personnel.
- **Notes d'audit** :
  - le point d'entrée est la route `/sections/rejoindre-un-formulaire` ;
  - la page consomme les pré-actions ouvertes au groupe ;
  - seules les actions en phase `pre_action`, visibles côté modération, en statut `pending` ou `approved`, et avec `groupJoinEnabled === true` remontent dans la liste ;
  - une action masquée par modération reste absente de la liste et du lien direct public ;
  - la file publique des demandes s'ouvre à partir de `actionId` ou de la première action visible ;
  - le CTA principal oriente vers une demande de participation, pas vers une création de rubrique distincte ;
  - le CTA secondaire sur une participation existante permet l'annulation ou la sortie sans effacer l'historique ;
  - le vocabulaire UI doit rester cohérent avec la page en production, qui parle de `Rejoindre un formulaire`.

## Structure visuelle cible

- **Fil d'Ariane** : `Agir > Formulaire de groupe`.
- **Hero** : fond vert très clair, titre large, sous-titre explicatif, badge de contexte et illustration panoramique.
- **Zone de recherche et filtres** : recherche texte + 4 contrôles alignés pour localisation, période, statut et tri.
- **Bloc principal** : liste des pré-actions ouvertes, avec vignette visuelle, métadonnées, badges d'état et CTA `Demander à participer` ou `Quitter` selon l'état de participation.
- **Colonne latérale** : résumé chiffré des inscriptions et participations, raccourcis, carte `Mon suivi`, aide.
- **Bas de page** : file publique des demandes, légende des actions de traitement, rappel de sécurité.
- **Interaction critique** : ouverture d'une modale avant validation d'une demande de participation.

## Intentions UI

- La page doit rester lisible sur desktop avec une hiérarchie forte entre la liste principale et la colonne latérale.
- Le vert doit rester la teinte dominante unique de la page.
- Les cartes doivent rester aérées et garder un rythme de lecture simple.
- Les états vides doivent proposer un CTA utile, pas une simple notice.
- La file publique doit rester visible comme un bloc métier à part entière, et non comme un simple détail de la liste.
- Le retrait d'une participation doit conserver la trace dans `action_participants` et rester visible dans l'historique de l'utilisateur.
