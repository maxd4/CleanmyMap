# Plans de Modularisation — Fichiers Monolithiques

Ce dossier contient les plans de modularisation conçus pour être exécutés par un agent IA (type GPT 5.4 mini).

## Convention

Chaque plan est un fichier Markdown autonome, conçu pour être copié-collé en prompt. Il contient :

1. **Phases séquentielles** numérotées, à exécuter dans l'ordre strict.
2. **Prompts d'exécution** délimités par des blocs ` ``` `, prêts à l'emploi.
3. **Critères de validation** entre chaque phase (l'agent ne passe à la suivante qu'après vérification).
4. **Section Kaizen** en fin de plan : suggestions d'amélioration de la logique métier.

## Liste des Plans

### Lot 1 : Priorité Critique
*   [PLAN-001-chat-shell.md](./PLAN-001-chat-shell.md) - Cible: `chat-shell.tsx`
*   [PLAN-003-creator-inbox-panel.md](./PLAN-003-creator-inbox-panel.md) - Cible: `creator-inbox-panel.tsx`

### Lot 2 : Priorité Haute / Moyenne
*   [PLAN-004-annuaire-directory-seed.md](./PLAN-004-annuaire-directory-seed.md) - Cible: `annuaire-directory-seed.ts`
*   [PLAN-005-actions-map-page.md](./PLAN-005-actions-map-page.md) - Cible: `app/(app)/actions/map/page.tsx`
*   [PLAN-006-actions-map-feed.md](./PLAN-006-actions-map-feed.md) - Cible: `actions-map-feed.tsx`
*   [PLAN-007-structured-data.md](./PLAN-007-structured-data.md) - Cible: `structured-data.tsx`
*   [PLAN-008-action-declaration-form.md](./PLAN-008-action-declaration-form.md) - Cible: `action-declaration-form.tsx`
*   [PLAN-009-feedback-section.md](./PLAN-009-feedback-section.md) - Cible: `feedback-section.tsx`
*   [PLAN-010-gamification-section.md](./PLAN-010-gamification-section.md) - Cible: `gamification-section.tsx`
*   [PLAN-011-analytics.md](./PLAN-011-analytics.md) - Cible: `analytics.ts`
*   [PLAN-012-sections-registry.md](./PLAN-012-sections-registry.md) - Cible: `sections-registry.ts`
*   [PLAN-013-use-community-section.md](./PLAN-013-use-community-section.md) - Cible: `use-community-section.ts`

## Règles pour l'agent exécutant

- Lire la phase entière avant de commencer à coder.
- Ne jamais modifier l'API publique (props, exports) sans instruction explicite.
- Valider `npm -C apps/web run lint` et `npm run typecheck` après chaque phase.
- En cas de doute, s'arrêter et lister les options — ne jamais inventer un comportement.
