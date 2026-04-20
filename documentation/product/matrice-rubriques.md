# Matrice rubriques

## Vue architecture blocs -> rubriques
```mermaid
flowchart LR
  ACC[Accueil] --> DASH[dashboard]
  AGIR[Agir] --> ITI[route]
  AGIR --> SPOT[trash-spotter]
  VISU[Visualiser] --> MAP[cartographie]
  VISU --> TAB[graphiques/tableaux]
  IMP[Impact] --> REP[reports]
  IMP --> CLA[gamification]
  RES[Reseau] --> DISC[community]
  RES --> PART[partenaires/funding/open-data]
  APP[Apprendre] --> CLIM[climate]
  APP --> GUIDE[guide + seconde vie + kit]
  PIL[Piloter] --> ADM[admin]
  PIL --> ELU[elus/coordinateur]
  REG[sections-registry.ts] --> NAV[navigation.ts]
  NAV --> UI[Rubriques visibles]
```
Fallback statique:
```md
![Matrice rubriques fallback](../archive/fallback-matrice-rubriques-architecture.png)
```

## Blocs cibles
- Accueil: formulaire benevole + parametres de compte
- Agir: itineraire IA, trash spotter
- Visualiser: cartographie + graphiques/tableaux dynamiques
- Impact: rapports d'impact, classement
- Reseau: discussion, partenaires engages, donnees ouvertes, financement/sponsoring
- Apprendre: developpement durable, guide pratique, seconde vie, kit terrain
- Piloter: admin, elus, coordinateur

## Source technique
- `apps/web/src/lib/sections-registry.ts`
- `apps/web/src/lib/navigation.ts`
