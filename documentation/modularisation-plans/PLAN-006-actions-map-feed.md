# Plan de Modularisation : Actions Map Feed

**Fichier Cible** : `apps/web/src/components/actions/actions-map-feed.tsx`
**Taille Actuelle** : ~482 lignes, 22 KB
**Objectif** : Isoler la logique de fetching de données, séparer les vues "immersive" et "default", et extraire les composants de légende complexes.

Validez chaque phase avec `npm run typecheck` et `npm run lint`.

---

## Phase 1 : Création de la structure et déplacement des types

**Instructions pour l'agent** :
```markdown
1. Crée le dossier `apps/web/src/components/actions/map-feed/` et déplaces-y le fichier `actions-map-feed.tsx`. 
2. Mets à jour tous les imports qui pointaient vers l'ancien fichier (utilise une recherche globale).
3. Crée `map-feed.types.ts` dans ce nouveau dossier et déplaces-y les types `ActionsMapCanvasComponent` et `ActionsMapFeedProps`.
```

## Phase 2 : Extraction de la logique de données (Data Layer)

**Instructions pour l'agent** :
```markdown
1. Crée `apps/web/src/components/actions/map-feed/use-map-feed-data.ts`.
2. Déplaces-y la logique de fetching SWR (`fetchMapActions`), le filtrage des items visibles (`isVisibleWithCategoryFilter`), et le calcul de `summary` (`totalKg`, `totalButts`).
3. Déplaces-y aussi la logique liée au `lastRefreshedAt` et au `freshnessLabel`.
4. Ce hook doit retourner : `{ data, items, summary, error, isLoading, isValidating, reload, freshnessLabel, partialSourcesLabel }`.
```

## Phase 3 : Extraction des Composants de Légende (UI)

Le mode "default" (non-immersif) contient un lourd bloc de légendes avec Framer Motion.

**Instructions pour l'agent** :
```markdown
1. Crée un dossier `apps/web/src/components/actions/map-feed/_components/`.
2. Crée `impact-legend.tsx`. Extraits-y la section "Légende d'Impact" (le `<motion.div>` contenant le dégradé de couleurs).
3. Crée `geometry-legend.tsx`. Extraits-y la section "Nature de la Géométrie" (Réel / Estimé / Fallback).
4. Crée `infrastructure-legend.tsx`. Extraits-y la section "Infrastructures Suggérées".
5. Remplace ces gros blocs de JSX dans le fichier principal par les appels à ces nouveaux composants. N'oublie pas de passer les imports nécessaires comme `COLOR_TOKENS` et `INFRASTRUCTURE_ALERT_THRESHOLD`.
```

## Phase 4 : Séparation des Layouts (Immersive vs Default)

**Instructions pour l'agent** :
```markdown
1. Crée un dossier `apps/web/src/components/actions/map-feed/_layouts/`.
2. Crée `immersive-layout.tsx`. Ce composant reçoit les données et s'occupe de rendre le cockpit terrain (avec le background gradient, le titre "Cockpit Terrain", la boucle d'actualisation, le `MapCanvas`, et le `ActionStoriesCarousel`).
3. Crée `default-layout.tsx`. Ce composant gère la vue standard et inclut les composants de légende extraits à la Phase 3.
4. Dans `actions-map-feed.tsx`, le composant principal ne doit plus que faire appel au hook `useMapFeedData`, charger dynamiquement le `MapCanvas` (le `useEffect` d'import), puis retourner :
   ```tsx
   return isImmersive ? (
     <ImmersiveLayout {...props} />
   ) : (
     <DefaultLayout {...props} />
   );
   ```
```

## Phase 5 : Améliorations Kaizen (Mode Mixte)

**Instructions pour l'agent (Améliorations directes)** :
```markdown
1. **Éradication du dark mode explicite** : Fais une passe sur tous les composants nouvellement créés (`immersive-layout`, `impact-legend`, etc.) et supprime ou corrige toute classe Tailwind qui utiliserait un préfixe `dark:` abusif. Rappel : le projet utilise un "Mode Mixte" permanent. Si le rendu du "Cockpit" est intentionnellement très sombre, laisse les couleurs (comme `bg-slate-950`), mais retire la notion de classe conditionnelle `dark:`.
2. **Gestion des erreurs du Canvas** : Le chargement dynamique de la carte utilise actuellement des alertes inline. Améliore la lisibilité de cette gestion d'erreur.
```

## Résultat Attendu
Le fichier `actions-map-feed.tsx` agit comme un aiguilleur propre, de moins de 100 lignes. Les layouts et les légendes sont testables séparément.
