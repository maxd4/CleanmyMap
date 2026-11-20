# CleanMyMap, dossier de passation IA (PLAN / candidats)

**Date : 20 novembre 2026.** Dossier temporaire à extraire **à la racine du checkout** `maxd4/CleanmyMap`, dans `documentation/specs/empreinte-ia/`. Il ne faut pas écraser les modules applicatifs existants, ni placer ce dossier dans `artifacts/`, `tmp/` ou un dossier externe que Codex pourrait ne pas explorer. Le dossier de préparation n'est ni une fonctionnalité déployée, ni la documentation canonique CURRENT.

## Pour Codex : ordre strict de lecture

1. Lire `SPECIFICATIONS_PLAN/00_LIRE_EN_PREMIER.md`, `01_DECISIONS_SCIENTIFIQUES_ET_CALCULS.md`, **`ERRATA_CONTRATS_0_08.md`**, puis les fiches exactes du lot demandé. **L'errata prévaut sur les anciennes formulations des prompts 03 à 07**, surtout le ratio ancien « nombre de cleanwalks de 5 kg » dans `03_LOT_0_SCIENCE_CLEANWALK.md`. Ne pas implémenter ce ratio.
2. Lire `PASSATIONS/PASSATION_CODEX_LOTS_0_08.md` pour les lots 0, 08, 1, 2, 3, 4 ; `PASSATIONS/PASSATION_CODEX_LOT21.md` pour le lot 21.
3. Lire les **fichiers de code candidat** du lot dans `CANDIDATS_LOTS_0_08/apps/web/...` ou `CANDIDATS_LOT_21/apps/web/...`, et leurs `.test.ts(x)`. La partie qui suit `CANDIDATS_LOTS_0_08/` ou `CANDIDATS_LOT_21/` indique le **chemin cible suggéré**, PAS un ordre de copie brute.
4. Relire `main`, `CHATGPT.md`, `AGENTS.md`, les règles scoped, le code des propriétaires canoniques, leurs consommateurs et les tests. **Intégrer ou adapter les candidats**, préserver le code courant, supprimer les doublons créés par l'intégration, ne pas déclarer les tests isolés équivalents aux tests Next/Vitest.
5. Le SQL `SQL_CANDIDATE_NOT_APPLIED/` est une ébauche hors migrations. Ne jamais le déplacer directement dans `apps/web/supabase/migrations/` sans vérification complète du schéma, des règles Supabase et des rôles Clerk, ni considérer les preuves statiques comme des tests PostgreSQL.
6. Les sources de prix, qualité, carbone, eau, région et hypothèses sont `PLAN` sauf preuve externe vérifiée. `NA` ≠ zéro. La sécurité, la confidentialité et les véritables propriétaires de données restent prioritaires.

## Ordre des lots

`0 + 08 -> 1 -> 2 -> 3 -> 4 + 09 -> 11 -> 12 -> 10 -> 14 -> 15 -> 16 -> 18 -> 21`.

**0 + 08** : reprendre et intégrer la comptabilité physique et le solveur à double seuil. Ne pas utiliser le ratio cleanwalk obsolète de 03 ; appliquer l'errata. **1** : saisie, stockage privé, AuthN/AuthZ et SQL à adapter. **2** : imports, prévisualisation et confirmation idempotente. **3** : budgets et historique. **4** : parcours complet, interface et navigation. **21** : seulement après le lot 18 ; moteur de comparaison prix/qualité/raisonnement/carbone et nuage de points, recalcul non destructif au moyen du solveur 0 + 08.

## Règle sur l'indexation / publication

Codex peut rechercher des fichiers présents dans son checkout local, **mais rien ne garantit qu'une recherche générique découvrira ces candidats**. Les chemins ci-dessus doivent figurer explicitement dans le prompt de chaque lot. Ce dossier de passation n'a pas à être inclus dans les commits applicatifs : conserver les pièces utilisateurs, stage explicite, et ne publier que les changements intégrés et les documents canoniques réellement mis à jour, suivant `AGENTS.md`. Ne pas effacer ce dossier local avant d'avoir vérifié les intégrations qui en dépendent.

## Vérifications déjà réalisées sur les archives d'origine

Les passations distinguent prévalidation TypeScript isolée / cas synthétiques Node de Vitest réel, tests navigateur, SQL exécuté, migration appliquée, production. Ne jamais convertir ces prévalidations en « lot terminé ».

**Provenance:** fichiers `00..08` issus de `CleanMyMap_lots_0_08_preintegration.zip` ; `09..20` issus des documents plan existants ; fichiers `21..23` et leurs candidats du dernier `CleanMyMap_lot21_qualite_code_raisonnement_abonnement.zip`. `00/01` des deux archives sont identiques. Aucune copie historique contradictoire de `00`, `01`, `21`, `22`, `23` n'est conservée dans cette consolidation.
