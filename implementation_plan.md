# Navigation claire entre blocs et rubriques

## Problème

La navigation actuelle est **plate et verbeuse** :
- Les 7 blocs sont affichés dans une grille statique 2 colonnes (desktop) ou des `<details>` (mobile)
- Pas de moyen rapide de sauter d'un bloc à l'autre une fois dans une rubrique
- Le bloc actif n'est pas visuellement mis en avant
- Sur mobile, tout est plié par défaut → l'utilisateur ne sait pas où il est

## Proposition : Sidebar collapsible + Breadcrumb sticky

### A. Sidebar de navigation (composant `AppSidebar`)

Remplacer la navigation en grille par une **sidebar latérale collapsible** sur desktop et un **drawer** sur mobile :

| Aspect | Comportement |
|--------|-------------|
| Desktop | Sidebar fixe à gauche (~240px), collapsible en icônes (~60px) |
| Mobile | Drawer overlay déclenché par un bouton hamburger |
| Bloc actif | Surligné en emerald, auto-déplié |
| Rubrique active | Indicateur visuel (barre latérale emerald) |
| Transition | Glassmorphism (`bg-white/60 backdrop-blur-md`) |

Structure visuelle :
```
┌──────────────┐
│ 🏠 Accueil   │  ← bloc (clic = toggle)
│   Dashboard  │  ← rubrique
│   Profil     │
│   Déclarer   │
├──────────────┤
│ ⚡ Agir      │
│   Itinéraire │
│   Signalement│
├──────────────┤
│ 🗺 Visualiser│
│   Carte      │
├──────────────┤
│ ...          │
└──────────────┘
```

### B. Breadcrumb sticky (composant `AppBreadcrumb`)

Ajouter un **fil d'Ariane collé en haut** de la zone de contenu :

```
CleanMyMap > Agir > Itinéraire IA
```

- Chaque segment est cliquable
- Le segment "bloc" ouvre un dropdown rapide pour changer de bloc
- Reste visible au scroll (sticky)

### C. Bloc Switcher rapide (composant `BlockSwitcher`)

En bas du breadcrumb ou en haut de la sidebar : une **barre de 7 icônes** permettant de sauter instantanément au premier item d'un bloc :

```
🏠  ⚡  🗺  📊  🤝  📚  🎯
```

Chaque icône = un bloc. Le bloc actif est surligné. Un clic navigue vers la première rubrique du bloc.

## Fichiers à modifier

### [NEW] `components/navigation/app-sidebar.tsx`
Sidebar collapsible avec la liste des blocs et rubriques.

### [NEW] `components/navigation/app-breadcrumb.tsx`
Fil d'Ariane sticky avec navigation rapide.

### [NEW] `components/navigation/block-switcher.tsx`
Barre d'icônes pour changer de bloc en 1 clic.

### [MODIFY] `app/(app)/layout.tsx`
Remplacer la grille de navigation par le layout sidebar + contenu.

### [MODIFY] `components/navigation/app-navigation.tsx`
Simplifier : ce composant deviendra un wrapper qui délègue à `AppSidebar`.

### [MODIFY] `lib/navigation.ts`
Ajouter les icônes/emojis par bloc dans `SPACE_DEFINITIONS`.

## Vérification

- `npm run typecheck` vert
- Navigation fluide entre blocs sur desktop et mobile
- Le bloc et la rubrique actifs toujours visibles
- Pas de régression UI sur les pages existantes
