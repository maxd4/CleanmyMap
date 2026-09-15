# Signaler un déchet

## Fiche canonique

- **Route** : `/sections/trash-spotter`
- **Fichier(s) source(s)** :
  - `apps/web/src/lib/sections-registry/config.ts`
  - `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
  - `apps/web/src/components/sections/rubriques/trash-spotter-section.tsx`
- **Type fonctionnel** : section de réseau
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Accès runtime** : `auth-blur-gate` ; un aperçu de la surface est présenté avant connexion, tandis que la création d'une observation et la boucle propriétaire restent soumises à leurs contrôles d'authentification.
- **Objectif utilisateur principal** : Observer rapidement l'état d'un lieu et contribuer à la cartographie collaborative des signalements.
- **Action principale attendue** : Décrire une observation de terrain puis consulter les signalements `spot` approuvés sur la carte.
- **Palette attendue** : emerald / vert doux
- **Scope** : formulaire partagé d'observation, flux public de signalements `spot` sur 180 jours, carte globale filtrée approuvée, liste récente et états de qualité des coordonnées.
- **Terminée** : non
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne — la création et la lecture des signalements restent des surfaces sensibles.

## États à documenter

- **loading** : skeleton du formulaire/flux lorsque le flux Trash Spotter est en chargement.
- **empty state** : aucun signalement récent ; la carte et la liste affichent un état vide sans inventer de donnée.
- **access refused** : aperçu flouté avant connexion ; la création et la boucle propriétaire restent soumises à l'AuthN du formulaire partagé.
- **Architecture commune** : `SectionShell`, `PageHeader`, `TrashSpotterObservationForm`, `ActionsMapFeed`, `useTrashSpotter` et `SpotterRecentList`.
- **Variantes** : aperçu anonyme, chargement, erreur de données, données récentes et liste vide.
- **Règle** : seuls les éléments de type `spot` sont agrégés ici ; la création ne doit pas être dupliquée dans la section.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Compléter après alignement visuel et métier.

## Fichiers associés

- [Présentation détaillée](./trash-spotter-presentation-detaillee.md)
- [Liste des propositions à traiter](./trash-spotter-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./trash-spotter-objectifs-non-pertinents.md)
