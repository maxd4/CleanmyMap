# Cartographie & Impact

Vue cartographique, méthodologie, progression et rapports d'impact.

## Fiche de bloc

- **Nom canonique** : Cartographie & Impact
- **Dossier canonique** : `03-cartographie-impact`
- **Dossier photo centralisé** : `photo/`

## Routes canoniques

| Route | Fiche | Accès runtime | Palette runtime | Source principale |
|---|---|---|---|---|
| `/actions/map` | [Carte des actions](./actions-map/actions-map-README.md) | `public-visible` | sky | `apps/web/src/app/(app)/actions/map/page.tsx` |
| `/methodologie` | [Méthodologie](./methodologie/methodologie-README.md) | `public-visible` | sky, exception `methodologie-impact` | `apps/web/src/app/(app)/methodologie/page.tsx` |
| `/sections/gamification` | [Progression & badges](./gamification/gamification-README.md) | `auth-disabled-gate` | red, exception `reports-impact` | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/profil/impact` | [Profil impact](./profil-impact/profil-impact-README.md) | `protected` | accueil-pilotage actuellement | `apps/web/src/app/(app)/profil/impact/page.tsx` |
| `/reports` | [Rapports d'impact](./reports/reports-README.md) | `auth-blur-gate` | red | `apps/web/src/app/(app)/reports/page.tsx` |

## Alias

| Route | Cible | Statut |
|---|---|---|
| `/gamification` | `/sections/gamification` | alias technique |

## Point à arbitrer

La section runtime :

```txt
/sections/climate
```

reste à classer entre Cartographie & Impact et Apprendre.

Ne pas lui attribuer une famille documentaire définitive sans décision produit.

## Règles couleur

- carte : sky ;
- méthodologie : sky dans le runtime actuel ;
- rapports et gamification : variante red ;
- toute exception doit rester nommée et testée.

## Captures

Un seul dossier photo centralisé pour le bloc.
