# Accueil & Pilotage

Entrées opérationnelles de pilotage, profil et sommaire.

## Routes canoniques

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/dashboard` | [Dashboard](./dashboard/README.md) | page de bloc | protégé | à corriger | non | moyenne | apps/web/src/app/(app)/dashboard/page.tsx |
| `/explorer` | [Sommaire](./explorer/README.md) | exception UI — sommaire | public | terminé | non | faible | apps/web/src/app/(app)/explorer/page.tsx |
| `/parcours` | [Parcours](./parcours/README.md) | page d'action | protégé | à corriger | non | critique | apps/web/src/app/(app)/parcours/page.tsx |
| `/parcours/[profile] (ex. /parcours/benevole)` | [Parcours par profil](./parcours-profile/README.md) | dynamique — parcours | dynamique | à corriger | non | moyenne | apps/web/src/app/(app)/parcours/[profile]/page.tsx |
| `/pilotage` | [Pilotage](./pilotage/README.md) | page de bloc | protégé | à corriger | non | moyenne | apps/web/src/app/(app)/pilotage/page.tsx |
| `/profil` | [Profil](./profil/README.md) | page de bloc | protégé | à corriger | non | moyenne | apps/web/src/app/(app)/profil/page.tsx |
| `/profil/[profile] (ex. /profil/benevole)` | [Profil détaillé](./profil-profile/README.md) | dynamique — profil | dynamique | à corriger | non | moyenne | apps/web/src/app/(app)/profil/[profile]/page.tsx |
| `/sponsor-portal` | [Portail décideur](./sponsor-portal/README.md) | page de bloc | protégé | à corriger | non | faible | apps/web/src/app/(app)/sponsor-portal/page.tsx |



## Notes

- Les fiches de cette famille suivent le format d'audit standard du dossier `pages_site`.
- Les captures officielles, quand elles existent, vivent dans `photo/` de chaque route canonique et sont en `WebP`.
- `/pilotage` est le hub de lecture décisionnelle. La page expose maintenant trois onglets internes - décideurs, pilotage, gouvernance - tandis que `/sponsor-portal` et `/sections/elus` restent accessibles comme surfaces secondaires reliées au même socle de KPI et de synthèse, mais ne sont plus exposées dans la navigation principale afin de réduire le nombre de pages visibles.
- `/methodologie` est désormais documentée dans la famille [Cartographie & Impact](../03-cartographie-impact/cartographie-impact-README.md) et sa fiche canonique vit dans [03-cartographie-impact/methodologie/methodologie-README.md](../03-cartographie-impact/methodologie/methodologie-README.md).
