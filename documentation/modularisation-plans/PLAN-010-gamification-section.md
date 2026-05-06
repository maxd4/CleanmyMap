# Plan de Modularisation : Gamification Section

**Fichier Cible** : `apps/web/src/components/sections/rubriques/gamification-section.tsx`
**Taille Actuelle** : ~447 lignes, 19 KB
**Objectif** : Isoler la logique de récupération de données, l'affichage du profil personnel, et la table de classement collectif/individuel.

Validez chaque phase avec `npm run typecheck` et `npm run lint`.

---

## Phase 1 : Types et Constantes

**Instructions pour l'agent** :
```markdown
1. Crée le dossier `apps/web/src/components/sections/rubriques/gamification/`.
2. Crée `gamification-types.ts` et déplaces-y tous les types lourds : `PersonalHistoryItem`, `MeResponse`, `IndividualItem`, `CollectiveItem`, `LeaderboardResponse`.
```

## Phase 2 : Table de Classement (Leaderboard)

**Instructions pour l'agent** :
```markdown
1. Crée `apps/web/src/components/sections/rubriques/gamification/leaderboard-table.tsx`.
2. Ce composant doit accepter en props les données `rows`, `scope` ("individual" | "collective"), `loading`, et `error`.
3. Déplaces-y toute la structure `<table ...>` et la logique de rendu des lignes `individualRows` / `collectiveRows`.
4. Applique les règles Kaizen : s'assurer que les couleurs (ex: `bg-slate-950/20`) s'intègrent dans un contexte Mode Mixte sans directive `dark:`.
```

## Phase 3 : Tableau de bord personnel (Progression)

**Instructions pour l'agent** :
```markdown
1. Crée `apps/web/src/components/sections/rubriques/gamification/personal-progress.tsx`.
2. Ce composant doit accepter en props `progression`, `progressToNext`, `loading`, `error`, et `personalMapItems`.
3. Déplaces-y la grille de KPIs personnels (Niveau actuel, Ranking, XP Validée, XP Attente), le composant `GamificationImpactMethodologyCard`, et la jauge d'objectif.
```

## Phase 4 : Orchestration

**Instructions pour l'agent** :
```markdown
1. Dans `apps/web/src/components/sections/rubriques/gamification/index.tsx` (nouveau nom pour l'ancien `gamification-section.tsx`), rassemble la logique SWR (`useSWR`), le formatage des `personalMapItems`, et le state `scope`.
2. Rends les nouveaux composants `PersonalProgress` (GAUCHE) et `LeaderboardTable` (DROITE), ainsi que la carte dynamique `ActionsMapCanvas`.
3. Supprime l'ancien fichier `gamification-section.tsx`.
```

## Phase 5 : Améliorations Kaizen

**Instructions pour l'agent** :
```markdown
1. Ajoute un mécanisme de skeleton loading (ou a minima des états vides soignés) dans `PersonalProgress` au lieu de simples textes en italique.
2. Vérifie la cohérence visuelle des effets de brillance (`shadow-[0_0_15px...]`) pour s'assurer qu'ils sont subtils et lisibles en Mode Mixte.
```

## Résultat Attendu
Une section gamification éclatée en petits composants spécialisés (Profil vs Classement), facilitant l'évolution indépendante du moteur de classement sans alourdir le composant principal.
