# Auth & Onboarding

Connexion, inscription et configuration initiale.

## Fichiers de bloc

- [Auth & Onboarding - Présentation détaillée](./auth-onboarding-presentation-detaillee.md)
- [Auth & Onboarding - Liste des propositions à traiter](./auth-onboarding-liste-propositions-a-traiter.md)
- [Auth & Onboarding - Objectifs non pertinents](./auth-onboarding-objectifs-non-pertinents.md)

## Routes canoniques

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/onboarding` | [Onboarding](./onboarding/onboarding-README.md) | onboarding | auth | à corriger | non | moyenne | apps/web/src/app/onboarding/page.tsx |
| `/sign-in` | [Connexion](./sign-in/sign-in-README.md) | authentification | auth | à corriger | non | moyenne | apps/web/src/app/sign-in/[[...sign-in]]/page.tsx |
| `/sign-up` | [Inscription](./sign-up/sign-up-README.md) | authentification | auth | à corriger | non | moyenne | apps/web/src/app/sign-up/[[...sign-up]]/page.tsx |

## Redirections et alias

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/onboarding/localisation` | [Onboarding localisation](./onboarding-localisation/onboarding-localisation-README.md) | redirection | redirection | hors scope | non | moyenne | apps/web/src/app/onboarding/localisation/page.tsx |

## Notes

- Les fiches de cette famille suivent le format d'audit standard du dossier `pages_site`.
- Les captures officielles, quand elles existent, vivent dans `photo/` centralisé du bloc et sont en `WebP`.
