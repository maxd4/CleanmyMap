# CleanMyMap — clôture duplication — 2026-10-28

> Statut : `AUDIT CURRENT` / `PARTIEL` — les justifications stale sont
> réconciliées, mais le ratchet jscpd conserve des familles nouvelles non
> attribuées et des écarts métriques actionnables.

## 1. Référence et provenance

Le SHA observé au démarrage du lot était `b70704d228ad6a79ebe93bd0324d5f1c5dd04651`.
Un writer a ensuite publié `2687c97d98daf96d8dbe34b538877fd38727f803`
(`fix(quality): make report sorting deterministic`) sur `main`. La mesure
CURRENT et la candidate ML5 sont donc requalifiées sur ce dernier SHA, qui
était `HEAD = origin/main` au moment de l'audit.

La mesure a été exécutée avec jscpd `5.3.0`, la politique
`93c9f907e5320ec229f6df6e7aad86b37b0f4ef5273530b2875a49c3b8945783` et les
scopes définis dans `scripts/checks/duplication-policy.mjs`. Le runner a été
exécuté sur une exportation propre du commit `2687c97d…`, avec uniquement la
candidate ML5 `scripts/checks/duplication-justifications.json` superposée.
Le runner conserve la provenance sémantique `WORKTREE_LIVE` pour ce mode,
mais aucun fichier dirty étranger du checkout partagé n'a été inclus dans
l'exportation mesurée.

## 2. Mesure comparable au ratchet

La baseline métrique provient de
`scripts/checks/duplication-metrics-baseline.json`, source commit
`b7c37c2bf00a00f5dc3e454b453ce0db7edf73a2`. Elle est comparable au CURRENT
sur l'outil, la politique et les scopes, mais elle n'est pas une mesure
« avant ML5 » et aucun gain global ne lui est attribué.

| Scope | Baseline : lignes / tokens dupliqués | CURRENT : lignes / tokens dupliqués | Variation | Fingerprints nouveaux non qualifiés | Statut |
| --- | ---: | ---: | ---: | ---: | --- |
| `runtime` | `1 353` / `8 293` | `1 716` / `13 158` | `+363` / `+4 865` ; `+0,038363` / `+0,124344` point | `123` | `FAIL` |
| `tests` | `3 023` / `18 338` | `6 505` / `47 988` | `+3 482` / `+29 650` ; `+0,822298` / `+1,060161` point | `454` | `FAIL` |
| `fixtures/data` | `0` / `0` | `0` / `0` | `0` / `0` | `0` | `PASS` |

Le CURRENT contient `206` occurrences runtime et `702` occurrences tests.
Les fichiers couverts sont respectivement `2 386`, `1 527` et `13` pour les
trois scopes. Les périmètres Python, SQL et E2E ne sont pas instrumentés par
ce gate ; le mobile est inclus dans `runtime` et `tests` selon la politique
effective.

## 3. Matrice de réconciliation des familles relues

| Famille | Scope | Owner | Fingerprint CURRENT | Décision | Commit(s) | Propriété protégée | Statut | Mesure attribuable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fixtures de routes `administrative-requirements` / `publish` | tests | contrats de tests des deux routes | `c561e1ab08cf1860` | `NO_ACTION_NOISE` | Aucun changement métier ML5 | garder les mocks explicites par contrat | `NO_ACTION_NOISE` | relue sur `2687c97d…`, lignes `1–6` / `5–10` |
| Rendus de marqueurs dans deux branches du même composant | runtime | `map-layers-point-markers.tsx` | `7e3897fcd34f0214` | `KEEP_INTENTIONAL` | `b70704d…` | préserver les styles, fallbacks, popups et branches autonomes | `KEEP_INTENTIONAL` | relue sur `2687c97d…`, lignes `186–202` / `275–291` |
| Enveloppes `email/test` / `send` | runtime | handlers de routes distincts | `8ea49e28fb7b6c53` | `NO_ACTION_NOISE` | Aucun changement métier ML5 | ne pas coupler deux contrats d'envoi différents | `NO_ACTION_NOISE` | relue sur `2687c97d…`, lignes `1–15` / `2–16` |
| Types de panneaux `deferred-mission-panels` / `mission-map` | runtime | owners UI missions distincts | `365684e7a4979738` | `NO_ACTION_NOISE` | Aucun changement | conserver l'autonomie des panneaux et de la carte | `NO_ACTION_NOISE` | family CURRENT déjà justifiée |
| Scénarios `route.impact-override` | tests | suite de preuve AuthZ et audit | `87f9507d509939e8` et autres occurrences actuelles | `KEEP_INTENTIONAL` | Aucun changement métier ML5 | garder les raisons, rôles et snapshots d'audit visibles | `KEEP_INTENTIONAL` | fingerprints CURRENT déjà couverts |
| Justifications stale supprimées ou remplacées | runtime/tests | registre canonique jscpd | `02f5…`, `21691…`, `923d…`, `d2ba…`, `f223…`, `a4e…`, `d893…`, `39a…` | retrait des identités disparues ; remplacement par `c561…`, `8ea…`, `7e…` lorsque la paire subsiste | candidate ML5 | aucune justification ne cible une paire absente | `RESOLVED` | `STALE_KEEP_INTENTIONAL=0`, `STALE_NO_ACTION_NOISE=0` |
| Autres fingerprints nouveaux CURRENT | runtime/tests | owner à relire par famille de responsabilité | inventaire du rapport jscpd : `123` runtime, `454` tests non qualifiés | revue et attribution restantes | Aucun | ne pas inventer de façade, baseline ou exclusion | `BLOCKED` | preuve d'owner et de décision non complète |

Les ressemblances de types, fixtures de notifications, petits sous-rendus et
formulaires ont été conservées lorsqu'elles ne démontraient pas un owner, un
contrat et un cycle de vie communs. Aucune extraction locale suffisamment
cohésive et sûre n'a été démontrée sur les familles explicitement candidates ;
aucun comportement métier n'a donc été déplacé pour réduire un score.

## 4. Validation et limites

- `PASS` — JSON du registre parsé ; aucune baseline, exclusion, marge ou
  politique modifiée.
- `PASS` — jscpd `5.3.0` exécuté sur les trois scopes du snapshot exact.
- `PASS` — le registre canonique ne contient plus de justification stale.
- `FAIL` — `audit:quality -- duplication` : les écarts métriques et les
  fingerprints nouveaux ci-dessus restent bloquants selon le ratchet.
- `NOT_MEASURED` — couverture `statements/branches/functions/lines` : ce lot
  n'a pas modifié de code fonctionnel et aucune collecte de couverture n'est
  comparable à cette mesure de duplication.
- `NOT_RUN_POLICY` — `FULL` n'a pas été lancé ; il n'était pas demandé pour
  ce lot d'audit ordinaire.
- `OUT_OF_INSTRUMENTATION` — Python, SQL et E2E ne sont pas conclus par ce
  rapport de duplication.

Le verdict `TERMINÉ` est interdit tant que les `123` / `454` fingerprints
nouveaux n'ont pas reçu une attribution vérifiable ou une correction. La
clôture actuelle est donc `PARTIELLE`, sans prétendre à une réduction globale
attribuable à ML5.
