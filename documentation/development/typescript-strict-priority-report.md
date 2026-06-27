# TypeScript strict - backlog priorisé

Source: `npm run -s typecheck` dans `apps/web`

Statut: aucun blocage TypeScript actif au moment de la dernière vérification.

## Lecture rapide

Le `typecheck` est revenu propre dans `apps/web`. Les anciens écarts listés ici ont été corrigés et servent seulement de trace historique.

## État courant

- Aucun fichier `apps/web/src/**` n'est remonté par `npm run -s typecheck`.
- Les fixtures `progression-data.*`, les tests `referrals`, `organizers`, `counters` et `badges/listing`, ainsi que les routes `group-join` ont été réalignés.
- Il n'y a plus d'ordre de correction prioritaire à maintenir pour le moment.

## Historique des chantiers clos

- Routes API et contrats runtime: `group-join`, `gamification/badges/list`.
- Composants et helpers partagés: `referrals`, `organizers`, `counters`, `badges/listing`.
- Fixtures volumineuses et tests de régression: `progression-data.*`.

## Prochaine action si un écart réapparaît

1. Relancer `npm run -s typecheck` dans `apps/web`.
2. Reclassifier les erreurs par fichier et par impact runtime.
3. Mettre à jour ce document avec les nouveaux fichiers réellement bloquants.
