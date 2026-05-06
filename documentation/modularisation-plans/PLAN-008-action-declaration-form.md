# Plan de Modularisation : Action Declaration Form

**Fichier Cible** : `apps/web/src/components/actions/action-declaration-form.tsx`
**Taille Actuelle** : ~531 lignes, 21 KB
**Objectif** : Isoler l'UI du Stepper, les hooks à effets (photos, route preview), et la logique de soumission pour rendre l'orchestrateur limpide (< 150 lignes).

Validez chaque phase avec `npm run typecheck` et `npm run lint`.

---

## Phase 1 : Mise en place de la structure

**Instructions pour l'agent** :
```markdown
1. Crée le dossier `apps/web/src/components/actions/action-declaration-form/`.
2. Crée le fichier `index.ts` qui ré-exportera le composant principal (l'orchestrateur).
```

## Phase 2 : Extraction de l'UI du Stepper

**Instructions pour l'agent** :
```markdown
1. Crée `apps/web/src/components/actions/action-declaration-form/form-stepper.tsx`.
2. Déplaces-y le bloc JSX "Premium Progress Stepper" (le conteneur avec la barre de progression et les icônes).
3. Le composant `FormStepper` doit accepter les props `currentStep`, `totalSteps`, et `isCleanPlaceMode`.
4. Importe `FormStepper` dans `action-declaration-form.tsx` pour remplacer le bloc natif.
```

## Phase 3 : Extraction des effets complexes (Hooks)

**Instructions pour l'agent** :
```markdown
1. Crée `apps/web/src/components/actions/action-declaration-form/use-action-effects.ts`.
2. Déplaces-y les deux `useEffect` lourds liés au "Route preview effect" et au traitement des "photoAssets" (`inferActionVisionEstimate`).
3. Ce hook retournera les états calculés (`routePreviewDrawing`, `visionEstimate`, `visionStatus`) et gèrera les fonctions d'upload/clear photos.
4. Remplacer cette logique dans l'orchestrateur par un appel à `useActionEffects(...)`.
```

## Phase 4 : Extraction de la logique de soumission

**Instructions pour l'agent** :
```markdown
1. Crée `apps/web/src/components/actions/action-declaration-form/use-action-submission.ts`.
2. Déplaces-y la fonction `handleConfirmSubmit`, la gestion du `submissionState`, `createdId`, `errorMessage`, `validationIssues`, et `retentionLoop`.
3. Assure-toi que le hook gère la préparation du payload via `prepareCreateActionPayload` et l'appel réseau `createAction`.
4. Remplacer cette logique dans l'orchestrateur.
```

## Phase 5 : Améliorations Kaizen (Mode Mixte & UI)

**Instructions pour l'agent** :
```markdown
1. Assure-toi qu'aucune mention explicite de `dark:` n'est présente dans les classes Tailwind du `FormStepper` et de l'orchestrateur.
2. Utilise le Design System "Mode Mixte" avec des couleurs translucides (ex: `bg-white/80`, `backdrop-blur-xl`, `border-slate-200/60`).
3. Renomme le fichier `action-declaration-form.tsx` en `orchestrator.tsx` et déplace-le dans le nouveau dossier `action-declaration-form/`. Expose-le depuis `index.ts`.
```

## Résultat Attendu
L'orchestrateur `orchestrator.tsx` (ex `action-declaration-form.tsx`) devient un simple aiguilleur qui combine `useActionEffects`, `useActionSubmission`, `FormStepper`, les sous-étapes existantes (`ActionStepIdentity`, etc.), et le footer de navigation, tout en respectant l'esthétique du Mode Mixte.
