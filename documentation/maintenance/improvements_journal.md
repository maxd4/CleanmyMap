# Journal des Améliorations & Bonnes Pratiques

Ce document répertorie les améliorations structurelles, visuelles et techniques apportées au repo afin d'éviter les régressions et de maintenir le standard de qualité "Premium/Futuriste" de CleanmyMap.

## 🎨 Design System & UI (Charte Moderne/Futuriste)

### Principes Visuels
- **Arrondis Généreux** : Utiliser systématiquement `rounded-[2.5rem]` ou `rounded-[3rem]` pour les conteneurs principaux (sections, cards premium, heros).
- **Glassmorphism** : Pour les éléments sur fonds sombres ou complexes, utiliser `bg-white/10 backdrop-blur-md border border-white/20`.
- **Typographie High-End** : 
    - Surtitres : Utiliser `tracking-[0.3em]` ou `tracking-widest` en majuscules pour un aspect "dossier technique/premium".
    - Titres : Utiliser les classes sémantiques `cmm-text-h1` à `cmm-text-h4`.
- **Gradients & Textures** : Les heros doivent combiner des gradients directionnels (ex: `from-violet-900 via-slate-900 to-black`) avec des lueurs radiales (`radial-gradient`) et une texture de grain (`opacity-20` ou `mix-blend-soft-light`).

### Composants Canoniques
- Toujours utiliser `CmmCard` et `CmmButton` de `@/components/ui`.
- Éviter les couleurs Tailwind brutes (ex: `text-blue-500`). Utiliser les classes sémantiques `cmm-text-primary`, `cmm-text-secondary`, `cmm-text-muted`.

## 🛠️ Standards Techniques & Performance

### Sérialisation Next.js (RSC -> Client)
- **Erreur à éviter** : Passer des fonctions ou des composants Lucide directement en props à un Client Component.
- **Solution** : Utiliser un `ICON_MAP` dans le composant Client qui mappe des strings (clés) vers les composants Icons. Passer uniquement la string en prop.
    - *Fichier de référence* : `apps/web/src/components/ui/navigation-grid.tsx`.

### Hygiène du Code
- **Imports inutilisés** : Nettoyer régulièrement les imports via `tsc`. Attention aux icônes importées mais non référencées directement (utilisées via `ICON_MAP`).
- **Nommage des fonctions** : Préférer des noms explicites comme `inferActionVisionEstimate` plutôt que `runActionVisionEstimate` pour refléter la nature probabiliste de l'IA.
- **Types Readonly** : Pour trier (`sort()`) un tableau constant/readonly (ex: `ASSOCIATION_SELECTION_OPTIONS`), toujours créer une copie via le spread operator : `[...ARRAY].sort()`.

### Gestion des Erreurs
- Ne jamais afficher "Une erreur est survenue" ou "Erreur technique".
- **Format Premium** : 
    - "Nous rencontrons une difficulté temporaire pour [action]."
    - "Veuillez vérifier [champ] ou réessayer dans quelques instants."
    - Garder les logs détaillés en console (`console.error`) mais rester évasif et aidant dans l'UI.

## 🏗️ Architecture Produit

### Navigation & Espaces
- **Bloc "Échanges" (Connect)** : Espace dédié à la communication (id: `connect`, icône: `MessageSquare`).
    - Thème : Violet / Rose / Fuchsia.
- **Séparation Discussions / DMs** :
    - `messagerie` (Discussions) : Canaux publics/thématiques/territoriaux.
    - `dm` (Messages privés) : Échanges directs 1-to-1.
- **Registry** : Toute nouvelle rubrique doit être déclarée dans `src/lib/sections-registry.ts` ET mappée dans `src/lib/navigation.ts`.

## 🚀 Checklist de Validation
- [ ] Le build passe (`npm run build` ou `npx tsc --noEmit`).
- [ ] Aucun import ou variable locale inutilisée.
- [ ] Pas de passage de fonctions/composants à travers la frontière RSC/Client.
- [ ] Les textes UI sont en français, élégants et incitatifs.
- [ ] Les contrastes respectent l'accessibilité tout en restant "Dark/Premium".
