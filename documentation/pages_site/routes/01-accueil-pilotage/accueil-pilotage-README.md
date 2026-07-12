# Accueil & Pilotage

Entrées opérationnelles de profil, sommaire, parcours, pilotage et gouvernance.

## Routes canoniques

| Route | Fiche | Accès runtime | Palette / famille | Source principale |
|---|---|---|---|---|
| `/dashboard` | [Dashboard](./dashboard/dashboard-README.md) | `protected` | accueil-pilotage | `apps/web/src/app/(app)/dashboard/page.tsx` |
| `/explorer` | [Sommaire](./explorer/explorer-README.md) | `public-visible` | exception jaune `explorer-sommaire` | `apps/web/src/app/(app)/explorer/page.tsx` |
| `/parcours` | [Parcours](./parcours/parcours-README.md) | `protected` | accueil-pilotage | `apps/web/src/app/(app)/parcours/page.tsx` |
| `/parcours/[profile]` | [Parcours par profil](./parcours-profile/parcours-profile-README.md) | `protected` | accueil-pilotage | `apps/web/src/app/(app)/parcours/[profile]/page.tsx` |
| `/pilotage` | [Pilotage](./pilotage/pilotage-README.md) | `protected` | pilotage | `apps/web/src/app/(app)/pilotage/page.tsx` |
| `/profil` | [Profil](./profil/profil-README.md) | `protected` | accueil-pilotage | `apps/web/src/app/(app)/profil/page.tsx` |
| `/profil/[profile]` | [Profil détaillé](./profil-profile/profil-profile-README.md) | `protected` | accueil-pilotage | `apps/web/src/app/(app)/profil/[profile]/page.tsx` |
| `/sponsor-portal` | [Portail décideur](./sponsor-portal/sponsor-portal-README.md) | `protected` | pilotage | `apps/web/src/app/(app)/sponsor-portal/page.tsx` |
| `/sections/elus` | [Gouvernance](./gouvernance/gouvernance-README.md) | `auth-disabled-gate` | accueil-pilotage | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |

## Captures

Les captures officielles vivent dans un seul dossier photo centralisé au niveau du bloc.

Ne pas recréer un dossier `photo/` dans chaque route enfant.

## Notes

- `/pilotage` reste le hub décisionnel principal.
- `/sponsor-portal` et `/sections/elus` sont des surfaces secondaires.
- `/sections/elus` n'est pas une page librement publique pour un visiteur anonyme : le runtime applique un gate `disabled`.
- `/methodologie` appartient à la famille documentaire Cartographie & Impact.
