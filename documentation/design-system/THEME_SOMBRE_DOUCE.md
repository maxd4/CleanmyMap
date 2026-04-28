# Thème Sombre Douce (Unique Visual Direction)

## Concept "Film"
L'objectif est de faire oublier le format "page web" classique au profit d'un visuel "film" immersif. 
- **Transitions fluides** : Utilisation de `framer-motion` pour des transitions de page et de composants douces.
- **Absence de séparation brute** : Pas de lignes de démarcation dures entre les sections.
- **Profondeur** : Superposition de couches translucides (`glassmorphism`).

## Palette de Couleurs (Dark Premium)

### Couleurs de base
- **Fond profond** : `slate-950` (#020617) — Base de toute l'interface.
- **Surfaces de travail** : `slate-900/60` à `slate-900/80` avec `backdrop-blur-xl`.
- **Accents principaux** : 
    - **Émeraude** (`emerald-500`) : Symbole de l'écologie, de la vitalité et de l'action.
    - **Cyan** (`cyan-400`) : Symbole de la technologie pure et de la clarté des données.

### Sémantique des rubriques (Accents)
Chaque rubrique conserve une identité propre via des "glows" et des bordures subtiles :
- **Agir** : `Amber` (Action terrain)
- **Visualiser** : `Sky` (Cartographie)
- **Impact** : `Emerald` (Résultats)
- **Réseau** : `Violet` (Communauté)
- **Apprendre** : `Rose` / `Emerald` (Savoir)
- **Piloter** : `Indigo` (Administration)

## Tokens UI & Glassmorphism

### Surfaces
- **CmmCard (Glass)** : `bg-slate-900/40 border-slate-800/40 backdrop-blur-md`.
- **Panels Immersifs** : `bg-slate-950/20 backdrop-blur-2xl`.

### Typographie (Dark-Optimized)
- **Titres** : `cmm-text-primary` (slate-50), `font-black`, `tracking-tight`.
- **Corps** : `cmm-text-secondary` (slate-300), `font-medium`.
- **Légendes** : `cmm-text-muted` (slate-500), `uppercase`, `tracking-widest`.

### Bordures & Ombres
- **Bordures** : Toujours translucides (`border-white/5` ou `border-slate-800/40`).
- **Ombres** : Profondes et sombres (`shadow-[0_48px_96px_-24px_rgba(0,0,0,0.9)]`).

## Règles d'Or
1.  **Bannir le blanc** : Aucune surface ne doit être blanche ou grise très claire.
2.  **Priorité Visualisation** : Préférer les SVG/D3 au texte brut pour les données.
3.  **Zéro Clavier** : Utiliser des sélecteurs visuels et des sliders.
4.  **Transitions** : Chaque changement d'état doit être accompagné d'une micro-animation fluide.
