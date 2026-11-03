# UI web — primitives et états partagés

Ce dossier rassemble les primitives visuelles réutilisables et les états d’interface : `CmmButton`, `CmmCard`, `CmmField`, `CmmDialog`, `CmmDisclosure`, `CmmSkeleton`, `PageHeader`, `PageStructure`, erreurs, feedback et contrôles de préférences.

Les composants ici restent génériques : ils ne possèdent ni taxonomie métier, ni règle d’AuthZ, ni accès Supabase. Une surface métier doit consommer les contrats de `apps/web/src/lib/` et garder son orchestration dans son dossier de capacité. Les tests `*.test.*` voisins sont la preuve locale des comportements d’accessibilité, d’état et de rendu qu’ils couvrent.

## Sources canoniques

- [`documentation/design-system/README.md`](../../../../../documentation/design-system/README.md) route vers les contrats de couleurs, layout, titres, actions, formulaires, mouvement et états.
- [`PAGE_HEADER.md`](../../../../../documentation/design-system/PAGE_HEADER.md), [`LAYOUT_SPACING.md`](../../../../../documentation/design-system/LAYOUT_SPACING.md) et [`STATES_FEEDBACK.md`](../../../../../documentation/design-system/STATES_FEEDBACK.md) détaillent les primitives concernées.
- [`section-ownership-boundaries.md`](../../../../../documentation/architecture/section-ownership-boundaries.md) définit les frontières registre ↔ rendu ↔ route.

Ce README oriente uniquement la lecture ; les props, variants et contrats exécutables restent dans les fichiers propriétaires et leurs tests.
