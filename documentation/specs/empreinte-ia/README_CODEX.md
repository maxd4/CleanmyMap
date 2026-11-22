# CleanMyMap, dossier de passation IA (PLAN / candidats)

> **Statut documentaire : PLAN.** Date de mise à jour : 22 novembre 2026. Dossier temporaire à placer **dans le checkout**, sous `documentation/specs/empreinte-ia/`. Il ne faut pas écraser les modules applicatifs existants, ni placer ce dossier dans `artifacts/`, `tmp/` ou un dossier externe que Codex pourrait ne pas explorer. Le dossier de préparation n'est ni une fonctionnalité déployée, ni la documentation canonique CURRENT.

## Pour Codex : ordre strict de lecture

1. Lire `SPECIFICATIONS_PLAN/00_LIRE_EN_PREMIER.md`, `01_DECISIONS_SCIENTIFIQUES_ET_CALCULS.md`, `ERRATA_CONTRATS_0_08.md` et **`24_ARBITRAGES_PREUVES_ET_PRIORITES.md`**, puis les fiches exactes du lot demandé. L'errata prévaut sur les anciennes formulations des prompts `03` à `07`, surtout le ratio obsolète « nombre de cleanwalks de 5 kg ». Le document `24` précise les décisions produit et les exigences de preuve datées du 22 novembre, sans transformer un PLAN en CURRENT. Il tranche explicitement l'accès gratuit/abonnement, le mode rapide sans tokens, les exports des particuliers, la conditionnalité de l'XP et le report des classements d'offres non prouvés.
2. Lire `PASSATIONS/PASSATION_CODEX_LOTS_0_08.md` pour les lots 0, 08, 1, 2, 3, 4 ; `PASSATIONS/PASSATION_CODEX_LOT21.md` pour le lot 21. Les passations datées ne remplacent jamais le `main` actuel.
3. Lire les **fichiers de code candidat** du lot dans `CANDIDATS_LOTS_0_08/apps/web/...` ou `CANDIDATS_LOT_21/apps/web/...`, et leurs `.test.ts(x)`. La partie qui suit `CANDIDATS_LOTS_0_08/` ou `CANDIDATS_LOT_21/` indique le **chemin cible suggéré**, PAS un ordre de copie brute.
4. Relire `main`, `CHATGPT.md`, les instructions applicables du dépôt et des sous-arbres, le code des propriétaires canoniques, leurs consommateurs et les tests. **Intégrer ou adapter les candidats**, préserver le code courant, supprimer les doublons créés par l'intégration, ne pas déclarer les tests isolés équivalents aux tests Next/Vitest.
5. Le SQL `SQL_CANDIDATE_NOT_APPLIED/` est une ébauche hors migrations. Ne jamais le déplacer directement dans `apps/web/supabase/migrations/` sans vérification complète du schéma, des règles Supabase et des rôles Clerk, ni considérer les preuves statiques comme des tests PostgreSQL.
6. Les sources de prix, qualité, carbone, eau, région et hypothèses sont `PLAN` sauf preuve externe vérifiée. `NA` ≠ zéro. La sécurité, la confidentialité et les véritables propriétaires de données restent prioritaires.

## Priorités et ordre des lots

**Ordre technique historique et dépendances conservés :** `0 + 08 -> 1 -> 2 -> 3 -> 4 + 09 -> 11 -> 12 -> 10 -> 14 -> 15 -> 16 -> 18 -> 21`.

**Priorité fonctionnelle actualisée :** les lots 0+08 sont intégrés; la saisie privée du lot 1 et l'extension rapide sont publiées; les imports du lot 2 et leurs corrections d'identité sont également publiés. Les lots 1 et 2 ne sont pas à relancer comme créations initiales : il reste à corriger le chemin du formulaire technique indiqué dans `24` et à obtenir les preuves PostgreSQL/E2E bloquées. Le mode rapide est une extension du lot 1, sans numéro de lot, moteur ni table métier supplémentaires. Le lot 3 reste PLAN; les exports personnels de conversations non qualifiés restent non supportés. Les lots ultérieurs conservent leurs dépendances; gamification quantitative, RSE et comparaison d'offres réelles restent conditionnelles aux preuves détaillées dans [le document 24](SPECIFICATIONS_PLAN/24_ARBITRAGES_PREUVES_ET_PRIORITES.md).

**État vérifié sur `main` publié le 22 novembre 2026 :** le noyau 0+08 est `CURRENT`; les déclarations et imports des lots 1 et 2 sont `CODE_PUBLISHED`, mais leur validation intégrée reste `PARTIELLE`. L'estimation rapide anonyme a passé l'E2E public; la persistance et l'E2E authentifiés n'ont pas été prouvés. Les workflows [E2E éphémère](https://github.com/maxd4/CleanmyMap/actions/runs/44975700101) et [preuve SQL éphémère](https://github.com/maxd4/CleanmyMap/actions/runs/44975700144) ont échoué à `Start ephemeral Supabase`, avant migration et tests métier. Le défaut de payload demeure dans le formulaire technique classique; la voie rapide sérialise séparément un brouillon compatible. Le statut détaillé, les preuves et les limites figurent dans [24](SPECIFICATIONS_PLAN/24_ARBITRAGES_PREUVES_ET_PRIORITES.md). Le lot 3 et les exports personnels ChatGPT/Claude restent `PLAN`.

## Règle sur l'indexation / publication

Codex peut rechercher des fichiers présents dans son checkout local, **mais rien ne garantit qu'une recherche générique découvrira ces candidats**. Les chemins ci-dessus doivent figurer explicitement dans le prompt de chaque lot. Ce dossier de passation n'a pas à être inclus dans les commits applicatifs : conserver les pièces utilisateurs, staging explicite, et ne publier que les changements intégrés et les documents canoniques réellement mis à jour, selon les règles de contribution applicables. Ne pas effacer ce dossier local avant d'avoir vérifié les intégrations qui en dépendent.

## Vérifications déjà réalisées sur les archives d'origine

Les passations distinguent prévalidation TypeScript isolée / cas synthétiques Node de Vitest réel, tests navigateur, SQL exécuté, migration appliquée, production. Ne jamais convertir ces prévalidations en « lot terminé ».

**Provenance :** fichiers `00..08` issus de `CleanMyMap_lots_0_08_preintegration.zip` ; `09..20` issus des documents plan existants ; fichiers `21..23` et leurs candidats du `CleanMyMap_lot21_qualite_code_raisonnement_abonnement.zip`. `00/01` des deux archives sont identiques. `24` est la décision de cohérence transversale ajoutée le 22 novembre 2026, pas une pièce de ces archives ni une preuve d'intégration.
