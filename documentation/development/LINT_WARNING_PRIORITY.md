# Priorité des warnings ESLint restants

**Date du snapshot** : 2026-06-27  
**Source** : `npm run lint -w apps/web`  
**Résultat** : 191 warnings, 0 erreur  

Ce document sert de plan d'action. L'objectif n'est pas de faire baisser un chiffre pour lui-même, mais de corriger les warnings dans l'ordre qui réduit le plus vite le risque de régression et la dette de maintenance.

## État de session

Les lots 1 à 5 ont été traités dans cette session sur les fichiers ciblés du workspace `apps/web`.

- Lot 1: terminé
- Lot 2: terminé
- Lot 3: terminé
- Lot 4: terminé
- Lot 5: terminé

Le snapshot global reste celui du 2026-06-27 tant que `npm run lint -w apps/web` n'a pas été relancé pour recalculer le volume résiduel.

## Règle de tri

Corriger d'abord:

1. les warnings qui peuvent changer le comportement à l'exécution;
2. les warnings présents dans les modules centraux ou très partagés;
3. les warnings qui signalent des fonctions trop longues ou trop complexes;
4. les warnings de rendu, de texte et de code mort;
5. les warnings de tests ou de fichiers périphériques.

## Lot 1 - Runtime et hooks

Traiter en premier les warnings qui peuvent figer des valeurs ou déclencher des effets de bord.

- `react-hooks/purity`
  - Fichier concerné: `apps/web/src/hooks/use-form-analytics.ts`
  - Pourquoi en premier: le rendu doit rester pur, sinon les états deviennent instables.
- `react-hooks/exhaustive-deps`
  - Fichiers concernés: `apps/web/src/hooks/use-form-analytics.ts`, `apps/web/src/lib/geo/greater-paris-filter.tsx`, `apps/web/src/lib/geo/greater-paris-select.tsx`
  - Pourquoi en premier: une dépendance oubliée ou en trop peut produire des données obsolètes ou des rerenders inutiles.

## Lot 2 - Modules centraux à forte dette structurelle

Découper ensuite les gros fichiers partagés. Ce sont les corrections qui font disparaître plusieurs warnings d'un coup.

- `apps/web/src/lib/environmental-impact-estimator/project-signals.ts`
- `apps/web/src/lib/governance/governance-monthly-report.ts`
- `apps/web/src/lib/environmental-impact-estimator/service-risk.ts`
- `apps/web/src/lib/environmental-impact-estimator/services/infrastructure.ts`
- `apps/web/src/lib/environmental-impact-estimator/services/usage-profile.ts`
- `apps/web/src/lib/pdf-export/simple-pdf.ts`
- `apps/web/src/lib/pdf-export/generate-pdf-html.ts`
- `apps/web/src/lib/pdf-export/official-report-html.ts`
- `apps/web/src/lib/authz.ts`
- `apps/web/src/lib/supabase/storage-business-contribution.ts`

Pourquoi ce lot passe avant les autres:

- ces fichiers sont centraux dans le runtime métier;
- ils cumulent souvent `complexity`, `max-lines-per-function` et `max-lines`;
- les décomposer réduit le coût des prochains changements;
- chaque extraction bien nommée clarifie le domaine au lieu d'ajouter un patch cosmétique.

## Lot 3 - Routes et helpers partagés

Corriger les routes et les helpers qui servent plusieurs écrans, surtout quand ils portent encore des variables mortes ou des branches de contrôle difficiles à lire.

- `apps/web/src/app/api/admin/creator-inbox/route.ts`
- `apps/web/src/components/actions/action-declaration-form/action-declaration-form.tsx`
- `apps/web/src/components/admin/quiz-bank-admin-view.tsx`
- `apps/web/src/components/reports/analytics-cockpit.tsx`
- `apps/web/src/components/sections/rubriques/academie-climat-workshops-panel.tsx`
- `apps/web/src/components/sections/rubriques/annuaire-governance-panel.tsx`
- `apps/web/src/components/sections/rubriques/annuaire-sidebar.tsx`
- `apps/web/src/components/sections/rubriques/annuaire-thematic-exploration.tsx`
- `apps/web/src/components/sections/rubriques/discussion-badges-panel.tsx`
- `apps/web/src/components/sections/rubriques/legal-section.tsx`
- `apps/web/src/components/ui/backpressure-feedback.tsx`
- `apps/web/src/lib/chat/channels.ts`
- `apps/web/src/lib/chat/chat-notification-targets.ts`
- `apps/web/src/lib/reports/csv.ts`
- `apps/web/src/lib/services/email.ts`
- `apps/web/src/lib/partners/onboarding-requests-store.ts`
- `apps/web/src/lib/profiles.ts`

Règle de travail:

- supprimer les imports et variables inutilisés au passage;
- extraire une fonction si elle dépasse la taille lisible plutôt que d'empiler des conditions;
- garder les règles métier dans des helpers nommés, pas dans des blocs imbriqués.

## Lot 4 - UI et texte visible

Une fois les modules centraux assainis, terminer les warnings plus locaux.

- `react/no-unescaped-entities`
- `react/jsx-max-depth`
- `@next/next/no-img-element`
- les `no-unused-vars` des composants UI secondaires

Pourquoi après:

- ces warnings sont utiles, mais ils cassent moins souvent la logique métier;
- ils se corrigent bien en fin de session, quand les gros refactors sont déjà faits;
- ils sont nombreux dans les composants et les tests, donc moins rentables au tout début.

## Lot 5 - Tests et surfaces périphériques

Finir par les fichiers de test et les modules de moindre criticité, sauf s'ils touchent un chemin critique.

- tests avec fonctions trop longues;
- tests avec nombreuses assertions répétées;
- helpers de fixture trop volumineux;
- scripts ou fichiers de support peu exposés au runtime.

## Ordre d'exécution recommandé

1. Corriger les warnings de hooks.
2. Décomposer les 10 modules centraux les plus lourds.
3. Nettoyer les routes et helpers partagés.
4. Corriger les warnings UI et texte.
5. Terminer par les tests et fichiers périphériques.
6. Relancer `npm run lint -w apps/web`.
7. Relancer `npm run typecheck -w apps/web`.

## Règle de validation

Après chaque lot:

- lancer un lint ciblé sur les fichiers modifiés;
- lancer le typecheck si un type, un helper partagé ou une route a changé;
- ne pas empiler plusieurs gros refactors sans point de contrôle;
- arrêter le lot si une extraction ajoute une nouvelle complexité sans réduire la dette globale.
