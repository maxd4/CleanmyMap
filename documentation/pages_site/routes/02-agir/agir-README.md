# Agir

Parcours de déclaration, préparation terrain, orientation, signalement et coordination.

## Fiche de bloc

- **Nom canonique** : Agir
- **Dossier canonique** : `02-agir`
- **Dossier photo centralisé** : `photo/`

## Routes canoniques

| Route | Fiche | Accès runtime | Palette / famille | Source principale |
|---|---|---|---|---|
| `/actions/history` | [Historique des actions](./actions-history/actions-history-README.md) | `protected` | agir | `apps/web/src/app/(app)/actions/history/page.tsx` |
| `/actions/new` | [Déclarer une action](./actions-new/actions-new-README.md) | `protected` | agir | `apps/web/src/app/(app)/actions/new/page.tsx` |
| `/sections/rejoindre-un-formulaire` | [Formulaire de groupe](./formulaire-de-groupe/formulaire-de-groupe-README.md) | `public-visible` ; compte requis pour rejoindre | agir, exception `join-group-form` | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/missions/[id]` | [Missions](./missions/missions-README.md) | dynamique | agir | `apps/web/src/app/(app)/missions/[id]/page.tsx` |
| `/sections/route` | [Où agir](./ou-agir/ou-agir-README.md) | `public-visible` | agir | `apps/web/src/app/(app)/sections/route/page.tsx` |
| `/sections/weather` | [Organiser une action](./weather/weather-README.md) | `public-visible` | agir, exception `weather-operations` | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/signalement` | [Signalement déchets](./signalement/signalement-README.md) | `protected` | agir | `apps/web/src/app/(app)/signalement/page.tsx` |

## Alias et redirections

| Route | Cible | Statut |
|---|---|---|
| `/declaration` | `/actions/new` | alias technique |
| `/sections/guide` | `/sections/weather` | redirection dans la route dynamique |

## Frontière avec les rubriques non classées

Les sections suivantes existent dans le runtime mais ne sont pas rattachées ici sans décision produit explicite :

```txt
/sections/recycling
/sections/compost
```

Leur présence dans la catégorie runtime `terrain` ne suffit pas à trancher leur famille documentaire définitive, car les contenus de tri et compost existent aussi dans le bloc Apprendre.

## Captures

Un seul dossier photo centralisé pour le bloc.

Aucun dossier photo par page enfant.

## Maintenance

Après modification d'une route du bloc :

```bash
npm run audit:pages-site-drift
```
