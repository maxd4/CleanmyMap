# Auth & Onboarding

Connexion, inscription et configuration initiale.

## Routes canoniques

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/onboarding` | [Onboarding](./onboarding/README.md) | onboarding | auth | à corriger | non | moyenne | apps/web/src/app/onboarding/page.tsx |
| `/sign-in` | [Connexion](./sign-in/README.md) | authentification | auth | à corriger | non | moyenne | apps/web/src/app/sign-in/[[...sign-in]]/page.tsx |
| `/sign-up` | [Inscription](./sign-up/README.md) | authentification | auth | à corriger | non | moyenne | apps/web/src/app/sign-up/[[...sign-up]]/page.tsx |

## Redirections et alias

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/onboarding/localisation` | [Onboarding localisation](./onboarding-localisation/README.md) | redirection | redirection | hors scope | non | moyenne | apps/web/src/app/onboarding/localisation/page.tsx |


## Notes

- Les fiches de cette famille suivent le format d'audit standard du dossier `pages_site`.
- Les captures officielles, quand elles existent, vivent dans `photo/` de chaque route canonique et sont en `WebP`.
