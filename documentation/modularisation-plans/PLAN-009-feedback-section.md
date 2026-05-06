# Plan de Modularisation : Feedback Section

**Fichier Cible** : `apps/web/src/components/sections/rubriques/feedback-section.tsx`
**Taille Actuelle** : ~580 lignes, 20 KB
**Objectif** : Séparer les données statiques (configurations des questionnaires), la logique des cartes individuelles, et l'en-tête de section.

Validez chaque phase avec `npm run typecheck` et `npm run lint`.

---

## Phase 1 : Extraction des constantes statiques

**Instructions pour l'agent** :
```markdown
1. Crée le dossier `apps/web/src/components/sections/rubriques/feedback/`.
2. Crée `questionnaire-config.ts`.
3. Déplaces-y les types statiques (`L10n`, `FeedbackType`, `FeedbackField`, `QuestionnaireConfig`) et la constante lourde `QUESTIONNAIRES`.
4. N'oublie pas d'exporter ces types et la constante.
```

## Phase 2 : Extraction de la carte Questionnaire

**Instructions pour l'agent** :
```markdown
1. Crée `apps/web/src/components/sections/rubriques/feedback/questionnaire-card.tsx`.
2. Déplaces-y le composant `QuestionnaireCard` et la fonction utilitaire `formatQuestionnaireDescription`.
3. Assure-toi que les imports vers Clerk (`useUser`, `SignInButton`) et le Site Preferences (`useSitePreferences`) sont corrects.
4. Supprime toute référence `dark:` (Kaizen) pour s'aligner sur le Mode Mixte (utiliser `bg-white/[0.03]`, `border-white/10`, etc. qui fonctionnent sans media query).
```

## Phase 3 : Reconstruction et En-tête

**Instructions pour l'agent** :
```markdown
1. Crée `apps/web/src/components/sections/rubriques/feedback/feedback-header.tsx`.
2. Déplaces-y la première carte d'introduction (celle avec le titre, la description, et les 3 boutons de navigation "Bug", "Amélioration", "Collaboration").
3. Remplace le contenu de l'ancien fichier `feedback-section.tsx` par l'orchestration des nouveaux sous-composants (`FeedbackHeader` et la liste de `QuestionnaireCard`).
4. Renomme optionnellement `feedback-section.tsx` en `index.tsx` à l'intérieur du dossier `feedback/` et ajuste les imports dans le reste du projet.
```

## Phase 4 : Améliorations Kaizen

**Instructions pour l'agent** :
```markdown
1. Vérifie toutes les classes Tailwind (`accentClasses` notamment). Assure-toi que les tons respectent l'ambiance douce (pas de couleurs pures saturées, préférer `rose-400/15`, `emerald-500/10`, etc.).
2. Ajoute des commentaires explicatifs sur les types d'erreurs potentielles dans `handleSubmit`.
```

## Résultat Attendu
Une section `feedback` modulaire, où la configuration des formulaires est décorrélée du rendu, et où chaque carte gère son propre état Clerk indépendamment, le tout sous un Design System Mixte.
