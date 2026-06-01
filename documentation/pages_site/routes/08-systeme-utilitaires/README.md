# Système & Utilitaires

Réglages, comparateurs, preview et routes techniques. Les pages standalone gardent une mood layer autonome par usage.

## Routes canoniques

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/declaration-simple` | [Déclaration simple](./declaration-simple/README.md) | outil | standalone | à corriger | non | critique | apps/web/src/app/declaration-simple/page.tsx |
| `/error/429` | [Erreur 429](./error-429/README.md) | erreur | erreur | terminé | non | faible | apps/web/src/app/error/429/page.tsx |
| `/form-comparison` | [Comparaison de formulaires](./form-comparison/README.md) | outil | standalone | à corriger | non | critique | apps/web/src/app/form-comparison/page.tsx |
| `/preview/actions/new` | [Preview déclaration](./preview-actions-new/README.md) | outil | standalone | à corriger | non | critique | apps/web/src/app/preview/actions/new/page.tsx |
| `/reglages` | [Réglages](./reglages/README.md) | outil | standalone | à corriger | non | critique | apps/web/src/app/reglages/page.tsx |
| `/sections/[sectionId] (ex. /sections/route)` | [Section dynamique](./sections-sectionid/README.md) | dynamique — section | dynamique | à corriger | non | moyenne | apps/web/src/app/(app)/sections/[sectionId]/page.tsx |



## Notes

- Les fiches de cette famille suivent le format d'audit standard du dossier `pages_site`.
- Les captures officielles, quand elles existent, vivent dans `photo/` de chaque route canonique et sont en `WebP`.
