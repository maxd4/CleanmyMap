# Prévalidation autonome (pas Vitest officiel)

Commande: tsc -p /mnt/data/cmm_lots_0_08_check/tsconfig.json, strict/noUnused/noImplicitReturns.

TypeScript strict isolate: PASS

47/47 tests de cas synthétiques exécutés avec Node et un shim de tests minimal : PASS. Les tests originaux sont écrits pour Vitest mais Vitest officiel est absent de cette prévalidation.

## Limites
- Contrôle Node avec shim de `describe/it/expect`, pas exécution de Vitest réel.
- TSX typé avec déclarations React minimales, pas avec le build Next du dépôt.
- Aucune couverture instrumentée, aucun navigateur, aucune requête Supabase, aucune vérification RLS ou migration appliquée.
- Tests de provenance numériques sur fixtures, pas preuve d impacts physiques réels.
