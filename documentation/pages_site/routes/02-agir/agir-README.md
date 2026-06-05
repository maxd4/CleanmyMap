# Agir

Parcours d'action, préparation terrain, orientation, signalement et coordination.

## Fiche de bloc

- **Nom canonique** : Agir
- **Dossier canonique** : `02-agir`
- **Dossier photo centralisé** : `photo/`
- **Fichiers de bloc** :
  - [Agir - Présentation détaillée](./agir-presentation-detaillee.md)
  - [Agir - Liste des propositions à traiter](./agir-liste-propositions-a-traiter.md)
  - [Agir - Objectifs non pertinents](./agir-objectifs-non-pertinents.md)

## Routes canoniques

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/actions/history` | [Historique des actions](./actions-history/actions-history-README.md) | page d'action | protégé | à corriger | non | faible | `apps/web/src/app/(app)/actions/history/page.tsx` |
| `/actions/new` | [Déclarer une action](./actions-new/actions-new-README.md) | page d'action | protégé | à corriger | non | faible | `apps/web/src/app/(app)/actions/new/page.tsx` |
| `/sections/rejoindre-un-formulaire` | [Formulaire de groupe](./formulaire-de-groupe/formulaire-de-groupe-README.md) | page de bloc | protégé | finalisée | non | faible | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/missions/[id] (ex. /missions/terrain-2026)` | [Missions](./missions/missions-README.md) | dynamique — mission | dynamique | à corriger | non | moyenne | `apps/web/src/app/(app)/missions/[id]/page.tsx` |
| `/sections/route` | [Où agir](./ou-agir/ou-agir-README.md) | page de bloc | protégé | à corriger | non | faible | `apps/web/src/app/(app)/sections/route/page.tsx` |
| `/signalement` | [Signalement déchets](./signalement/signalement-README.md) | page d'action | protégé | à corriger | non | faible | `apps/web/src/app/(app)/signalement/page.tsx` |

## Redirections et alias

- `/declaration` -> `/actions/new`

## Notes

- Les fiches de cette famille suivent le format d'audit standard du dossier `pages_site`.
- Les captures officielles, quand elles existent, vivent dans `photo/` centralisé du bloc et sont en `WebP`.
- Chaque sous-dossier documentaire reste préfixé par le nom de la page ou de la rubrique.
