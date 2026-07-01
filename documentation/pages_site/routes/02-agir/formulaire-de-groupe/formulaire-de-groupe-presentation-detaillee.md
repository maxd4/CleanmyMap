# Rejoindre un formulaire - Présentation détaillée

## Fiche canonique

- **Route** : `/sections/rejoindre-un-formulaire`
- **Dossier canonique** : `formulaire-de-groupe`
- **Rôle** : permettre de rejoindre une action de groupe validée, de consulter sa file publique et de suivre le statut des participations.
- **Périmètre** : liste des actions ouvertes, recherche, filtres, tri, demande de participation, file publique, suivi personnel et confirmation avant envoi.
- **États à documenter** : chargement, absence d'actions, erreur de chargement, file publique vide, file publique alimentée, modale de confirmation, accès refusé si le compte n'est pas disponible selon le contexte.
- **Composants concernés** : `SectionShell`, `PageHero`, `PageHeroBadge`, `FamilyRubriqueCard`, `CmmButton`, `FilterPill`, modale de confirmation, cartes d'action, panneau de résumé, panneau de file publique, suivi personnel.
- **Notes d'audit** :
  - le point d'entrée est la route `/sections/rejoindre-un-formulaire` ;
  - la page consomme les actions validées ouvertes au groupe ;
  - seules les actions avec `groupJoinEnabled !== false` remontent dans la liste ;
  - la file publique des demandes s'ouvre à partir de `actionId` ou de la première action visible ;
  - le CTA principal oriente vers une demande de participation, pas vers une création de rubrique distincte ;
  - le vocabulaire UI doit rester cohérent avec la page en production, qui parle de `Rejoindre un formulaire`.

## Structure visuelle cible

- **Fil d'Ariane** : `Agir > Formulaire de groupe`.
- **Hero** : fond vert très clair, titre large, sous-titre explicatif, badge de contexte et illustration panoramique.
- **Zone de recherche et filtres** : recherche texte + 4 contrôles alignés pour localisation, période, statut et tri.
- **Bloc principal** : liste des actions validées, avec vignette visuelle, métadonnées, badges d'état et CTA `Demander à participer`.
- **Colonne latérale** : résumé chiffré, raccourcis, carte `Mon suivi`, aide.
- **Bas de page** : file publique des demandes, légende des actions de traitement, rappel de sécurité.
- **Interaction critique** : ouverture d'une modale avant validation d'une demande de participation.

## Intentions UI

- La page doit rester lisible sur desktop avec une hiérarchie forte entre la liste principale et la colonne latérale.
- Le vert doit rester la teinte dominante unique de la page.
- Les cartes doivent rester aérées et garder un rythme de lecture simple.
- Les états vides doivent proposer un CTA utile, pas une simple notice.
- La file publique doit rester visible comme un bloc métier à part entière, et non comme un simple détail de la liste.
