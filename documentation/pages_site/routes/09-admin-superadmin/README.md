# Admin & Super-admin

Administration, services et supervision avancée.

## Routes canoniques

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/admin` | [Administration](./admin/README.md) | administration | technique | à corriger | non | moyenne | apps/web/src/app/(app)/admin/page.tsx |
| `/admin/forms` | [Administration des formulaires](./admin-forms/README.md) | administration | technique | à corriger | non | moyenne | apps/web/src/app/(app)/admin/forms/page.tsx |
| `/admin/godmode` | [Administration avancée](./admin-godmode/README.md) | administration | cachée | à corriger | non | moyenne | apps/web/src/app/(app)/admin/godmode/page.tsx |
| `/admin/services` | [Administration des services](./admin-services/README.md) | administration | technique | à corriger | non | moyenne | apps/web/src/app/(app)/admin/services/page.tsx |



## Notes

- Les fiches de cette famille suivent le format d'audit standard du dossier `pages_site`.
- Les captures officielles, quand elles existent, vivent dans `photo/` de chaque route canonique et sont en `WebP`.
- `/admin/godmode` est une sous-partie cachée de `/admin` réservée au profil `max`. Elle n'apparaît pas dans la navigation publique et reste documentée pour le parcours d'administration avancée.
