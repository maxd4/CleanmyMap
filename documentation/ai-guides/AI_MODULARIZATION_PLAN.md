# Plan de modularisation IA

## Statut

Plan exécutable pour GPT-5.4 mini.

Ce document ne maintient plus une liste figée de 15 fichiers héritée d'avril 2026. La priorité réelle doit être déterminée depuis l'état courant du dépôt.

Sources de vérité, dans cet ordre :

1. `documentation/architecture/monolith-split-plan.md`
2. `scripts/heavy-files-baseline.json`
3. résultat du scan courant des fichiers lourds
4. tests, lint et erreurs réellement observés

En cas de conflit, l'état réel du code prime sur ce document.

## Objectif

Réduire progressivement les fichiers trop longs ou trop couplés sans modifier le comportement public, les contrats métier ni les parcours utilisateurs.

Une exécution traite une seule cible principale à la fois.

## Contraintes critiques

- Ne jamais créer un découpage sur la seule base d'un ancien plan.
- Vérifier d'abord que le fichier existe encore et mesurer son état actuel.
- Préserver les props, exports, routes, contrats API et comportements visibles.
- Extraire seulement quand la responsabilité obtenue est claire et cohérente.
- Éviter les micro-fichiers artificiels et les wrappers sans valeur.
- Ajouter ou conserver les tests avant de supprimer une logique existante.
- Ne pas mélanger refactor structurel, refonte UI, migration Supabase et correction de dépendances dans le même lot.
- Respecter `AGENTS.md`, l'architecture, la sécurité et le design system applicables au périmètre.

## Backlog courant

### P1 — Cibles à forte valeur de maintenance

Traiter une cible uniquement après vérification de son état réel :

- `components/sections/rubriques/free-plan-services-methodology-visual.tsx`
- `components/admin/free-plan-services-visual.tsx`
- `components/sections/rubriques/partners-network-section.tsx`
- `app/api/actions/group-join/route.test.ts`

### P2 — Cibles moyennes à reprendre ensuite

- `components/actions/action-before-declaration-form.tsx`
- `components/actions/action-declaration-form/action-declaration-export-picker.tsx`
- `components/admin/free-plan-services-panel.tsx`
- `components/sections/rubriques/rejoindre-un-formulaire-section.controller.ts`
- `components/learn/environmental-quiz.tsx`
- `components/sections/rubriques/weather-section.tsx`
- `components/reports/reports-web-document.tsx`
- `components/sections/rubriques/rejoindre-un-formulaire-section.tsx`
- `lib/actions/group-participation.ts`
- `lib/learning/quiz-personal-progress.ts`
- `components/sections/rubriques/recycling-question-assistant/assistant-utils.ts`
- `lib/supabase/storage-business-contribution.ts`

### Déjà absorbé — ne pas refaire sans nouvelle preuve

- `lib/environmental-impact-estimator/project-signals.impl.ts`
- `app/api/actions/[actionId]/group-join/route.test.ts`
- `components/learn/quiz-session-panel.tsx`
- `components/sections/rubriques/feedback-section.tsx`
- `components/sections/rubriques/gamification/index.tsx`

## Procédure d'exécution GPT-5.4 mini

### Étape 1 — Vérifier la cible

Avant toute modification :

1. confirmer que le fichier existe ;
2. relever sa taille et ses responsabilités réelles ;
3. rechercher les tests associés ;
4. identifier les imports et exports publics ;
5. vérifier si une modularisation récente a déjà absorbé le problème.

Si la cible n'est plus pertinente, ne rien modifier et mettre à jour le plan concerné.

### Étape 2 — Définir un découpage minimal

Produire un plan court contenant uniquement :

- responsabilité du fichier actuel ;
- problème concret ;
- sous-modules réellement nécessaires ;
- API publique à préserver ;
- validations à lancer.

Ne pas inventer à l'avance une arborescence détaillée si l'analyse du code ne la justifie pas.

### Étape 3 — Exécuter

Ordre conseillé :

1. extraire constantes et données pures ;
2. extraire helpers purs ;
3. extraire logique d'état ou de domaine ;
4. extraire sous-composants cohérents ;
5. garder un point d'entrée lisible qui orchestre l'ensemble.

### Étape 4 — Valider

Minimum attendu :

- tests ciblés du périmètre ;
- contrôle TypeScript si types ou exports changent ;
- lint ciblé si disponible ;
- `node scripts/check-top-heavy-files.mjs --top=25` pour une cible de modularisation ;
- build complet uniquement si le périmètre le justifie.

Ne jamais annoncer un test non exécuté.

## Critères de fin

Un lot est terminé uniquement si :

- le comportement visible reste inchangé ;
- les contrats publics restent compatibles ;
- la cible est devenue plus lisible ou plus testable ;
- aucune duplication significative n'a été introduite ;
- les validations pertinentes passent ou leurs échecs sont documentés précisément ;
- le radar ou la baseline sont mis à jour si nécessaire.

## Prompt exécutable

```text
Travaille sur une seule cible de modularisation dans CleanMyMap.

Objectif : réduire le couplage et améliorer la testabilité sans changer le comportement public.

Avant toute modification : vérifie l'état réel du fichier, sa taille, ses responsabilités, ses imports/exports et ses tests. Ne suis pas aveuglément un ancien plan si le code a déjà changé.

Périmètre : la cible choisie et les seuls fichiers directement nécessaires.

Contraintes : préserver routes, props, exports, contrats API et comportement visible ; ne pas créer de micro-fichiers inutiles ; ne pas mélanger refactor, refonte UI, migration Supabase ou mise à jour de dépendances.

Livrable : code modularisé, validations ciblées exécutées, résumé des fichiers modifiés, risques restants et éventuelle mise à jour du plan.
```
