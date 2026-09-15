# Suivi Trash Spotter

## Fiche canonique

- **Route** : `/sections/trash-spotter`
- **Fichier(s) source(s)** :
  - `apps/web/src/lib/sections-registry/config.ts`
  - `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
  - `apps/web/src/components/sections/rubriques/trash-spotter-section.tsx`
- **Statut produit** : `TRASH_SPOTTER=SECONDARY_MONITORING`
- **Type fonctionnel** : surface secondaire de consultation et de monitoring
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Accès runtime** : `auth-blur-gate` ; un aperçu de la surface de consultation est présenté avant connexion.
- **Objectif utilisateur principal** : Consulter l'état courant des signalements Trash Spotter et leur répartition sur la carte.
- **Action principale attendue** : Lire les signalements `spot` approuvés sur la carte et dans la liste récente.
- **Création** : aucune création n'est proposée ici. Pour saisir une observation et retrouver la boucle propriétaire « Mes observations », utiliser exclusivement [`/signalement`](/signalement).
- **Palette attendue** : emerald / vert doux
- **Scope** : flux public de signalements `spot` sur 180 jours, carte globale filtrée approuvée, liste récente et états de qualité des coordonnées.
- **Terminée** : oui pour le périmètre de consultation/monitoring ; la saisie reste portée par `/signalement`.
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne — la création et la lecture des signalements restent des surfaces sensibles.

## États à documenter

- **loading** : état de chargement du flux de monitoring lorsque les données Trash Spotter sont en cours de récupération.
- **empty state** : aucun signalement récent ; la carte et la liste affichent un état vide sans inventer de donnée.
- **access refused** : aperçu flouté avant connexion ; la création et la boucle propriétaire sont portées par `/signalement` et ses contrôles d'authentification.
- **Architecture commune** : `SectionShell`, `PageHeader`, `ActionsMapFeed`, `useTrashSpotter` et `SpotterRecentList`. Le formulaire canonique `TrashSpotterObservationForm` est rendu par `/signalement`, pas par cette surface secondaire.
- **Variantes** : aperçu anonyme, chargement, erreur de données, données récentes et liste vide.
- **Règle** : seuls les éléments de type `spot` sont agrégés ici ; aucun formulaire concurrent n'est rendu dans cette section.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Compléter après alignement visuel et métier.

## Fichiers associés

- [Présentation détaillée](./trash-spotter-presentation-detaillee.md)
- [Liste des propositions à traiter](./trash-spotter-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./trash-spotter-objectifs-non-pertinents.md)
