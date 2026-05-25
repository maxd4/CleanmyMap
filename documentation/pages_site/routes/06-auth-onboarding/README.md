# Auth & Onboarding

Connexion, inscription et configuration initiale.

## Routes canoniques

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/onboarding` | [Onboarding](./onboarding/README.md) | onboarding | auth | terminé | oui | faible | apps/web/src/app/onboarding/page.tsx |
| `/onboarding/localisation` | [Onboarding localisation](./onboarding-localisation/README.md) | redirection | auth | hors scope | non | faible | apps/web/src/app/onboarding/localisation/page.tsx |
| `/sign-in` | [Connexion](./sign-in/README.md) | authentification | auth | terminé | oui | faible | apps/web/src/app/sign-in/[[...sign-in]]/page.tsx |
| `/sign-up` | [Inscription](./sign-up/README.md) | authentification | auth | terminé | oui | faible | apps/web/src/app/sign-up/[[...sign-up]]/page.tsx |



## Notes

- Les fiches de cette famille suivent le format d'audit standard du dossier `pages_site`.
- Les captures officielles vivent dans `photo/desktop/` et `photo/mobile/` à la racine du bloc 06 et sont en WebP.
- La configuration initiale vit désormais sur une seule page canonique: `/onboarding`.
- `/onboarding/localisation` est conservée comme redirection historique vers `/onboarding`.
- Les boutons auth font partie du périmètre UI et doivent être harmonisés avec les surfaces de la famille, sans modifier la logique Clerk.
- Les captures de référence sont maintenant présentes pour `/sign-in`, `/sign-up` et `/onboarding`; la redirection historique `/onboarding/localisation` n'a pas de capture propre.
