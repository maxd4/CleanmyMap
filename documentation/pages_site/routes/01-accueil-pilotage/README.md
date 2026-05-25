# Accueil & Pilotage

Entrées opérationnelles de pilotage, profil, sommaire et méthodologie.

## Routes canoniques

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/dashboard` | [Dashboard](./dashboard/README.md) | page de bloc | protégé | terminé | non | faible | apps/web/src/app/(app)/dashboard/page.tsx |
| `/explorer` | [Sommaire](./explorer/README.md) | exception UI — sommaire | public | terminé | non | faible | apps/web/src/app/(app)/explorer/page.tsx |
| `/methodologie` | [Méthodologie](./methodologie/README.md) | exception UI — impact | public | terminé | non | faible | apps/web/src/app/(app)/methodologie/page.tsx |
| `/parcours` | [Parcours](./parcours/README.md) | page d'action | protégé | à corriger | non | critique | apps/web/src/app/(app)/parcours/page.tsx |
| `/parcours/[profile] (ex. /parcours/benevole)` | [Parcours par profil](./parcours-profile/README.md) | dynamique — parcours | dynamique | à corriger | non | moyenne | apps/web/src/app/(app)/parcours/[profile]/page.tsx |
| `/pilotage` | [Pilotage](./pilotage/README.md) | page de bloc | protégé | à corriger | non | moyenne | apps/web/src/app/(app)/pilotage/page.tsx |
| `/profil` | [Profil](./profil/README.md) | page de bloc | protégé | terminé | non | faible | apps/web/src/app/(app)/profil/page.tsx |
| `/profil/[profile] (ex. /profil/benevole)` | [Profil détaillé](./profil-profile/README.md) | dynamique — profil | dynamique | terminé | non | faible | apps/web/src/app/(app)/profil/[profile]/page.tsx |
| `/sponsor-portal` | [Portail décideur](./sponsor-portal/README.md) | page de bloc | protégé | à corriger | non | faible | apps/web/src/app/(app)/sponsor-portal/page.tsx |



## Notes

- Les fiches de cette famille suivent le format d'audit standard du dossier `pages_site`.
- Les captures officielles, quand elles existent, vivent dans `photo/desktop/` et `photo/mobile/` à la racine de la famille et sont en WebP.
- **Palette bloc 01** : orange + brun **combinés** — `page-families/families/01-accueil-pilotage.ts` + `card-presets.ts` (`ACCUEIL_PILOTAGE_CARD`). Voir [`documentation/development/PAGE_FAMILIES_PLAN.md`](../../development/PAGE_FAMILIES_PLAN.md).
- **Hors scope** : cartes du sommaire `/explorer` (exception `explorer-sommaire`, `BLOCK_THEME` inchangé). Limites complètes dans le plan § « hors périmètre ».
