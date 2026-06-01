# Agir

Parcours d'action, déclaration, signalement et préparation terrain.

## Routes canoniques

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/actions/history` | [Historique des actions](./actions-history/README.md) | page d'action | protégé | à corriger | non | faible | apps/web/src/app/(app)/actions/history/page.tsx |
| `/actions/new` | [Déclarer une action](./actions-new/README.md) | page d'action | protégé | à corriger | non | faible | apps/web/src/app/(app)/actions/new/page.tsx |
| `/missions/[id] (ex. /missions/terrain-2026)` | [Mission détaillée](./missions-id/README.md) | dynamique — mission | dynamique | à corriger | non | moyenne | apps/web/src/app/(app)/missions/[id]/page.tsx |
| `/sections/route` | [Itinéraire IA](./sections-route/README.md) | page de bloc | protégé | à corriger | non | faible | apps/web/src/app/(app)/sections/route/page.tsx |
| `/signalement` | [Signalement déchets](./signalement/README.md) | page d'action | protégé | à corriger | non | faible | apps/web/src/app/(app)/signalement/page.tsx |

## Redirections et alias

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/declaration` | [Déclaration](./declaration/README.md) | redirection | redirection | hors scope | non | moyenne | apps/web/src/app/declaration/page.tsx |


## Notes

- Les fiches de cette famille suivent le format d'audit standard du dossier `pages_site`.
- Les captures officielles, quand elles existent, vivent dans `photo/` de chaque route canonique et sont en `WebP`.
