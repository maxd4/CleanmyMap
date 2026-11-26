# Audit global de couverture — référence 2026-11-26

**Nature :** `AUDIT / SNAPSHOT` — photographie descriptive, sans modification de politique, seuils, baselines ou exclusions.
**SHA mesuré :** `54be42e7d5f365230fa74ccd9e05deeb413526e9`
**SHA de publication :** le commit Git qui contient cette photographie est vérifié par le compte rendu final ; il est distinct du SHA mesuré lorsque le document est ajouté après la mesure.

## Résumé exécutif

États de provenance vérifiés par le générateur canonique (`scripts/reports/generate-coverage-reference.mjs`) :
- `web=EVIDENCE_UNVERIFIED` (`WORKTREE`, 1 test préexistant en échec : `apps/web/src/lib/profiles.test.ts` sur l'ordre d'actions `elu`, `1 966` fichiers passés / `1` ignoré / `1` échec) ;
- `node=EVIDENCE_UNVERIFIED` (preuve produite au SHA `755c12210d4c9840e443cb75ca074d8e4598d9e7`, `0` diff `scripts/` jusqu'à `54be42e7`) ;
- `mobile=EVIDENCE_UNVERIFIED` (preuve produite au SHA `f33e7b3c6a84d4ea42e269f1b824c0c52c276acb`, `0` diff `apps/mobile/` jusqu'à `54be42e7`, `45` fichiers / `402` tests passés) ;
- `python=EVIDENCE_UNVERIFIED` (preuve produite au SHA `f33e7b3c6a84d4ea42e269f1b824c0c52c276acb`, `0` diff `maintenance/python/` jusqu'à `54be42e7`, `137` tests passés).

Un scope n'est marqué `CI_EXACT_SHA` qu'après validation d'une preuve de publication CI (`CI_CANDIDATE`). Les chiffres ci-dessous distinguent donc explicitement le verdict strict du générateur (`EVIDENCE_UNVERIFIED`) et les **observations locales non attestées** (`PRESENT_NOT_ATTESTED` / `WORKTREE_LIVE`) extraites des rapports produits (`coverage-summary.json`, `lcov.info`, `coverage.xml`). Les preuves PostgreSQL/pgTAP, RLS, RPC, concurrence, Playwright E2E, Clerk réel et device natif ne sont pas exécutées par cette photographie (`DB_SEMANTICS_NOT_EXECUTED` / `NOT_RUN`).

Aucun seuil n'est activé sur Web/Node/Python : toutes les familles restent `OBSERVE` (seul le gate Mobile `quality:mobile-coverage` applique son seuil de `80 %`, satisfait sur les 4 métriques).

## Tableau global (verdict générateur vs observation locale non attestée)

| Scope | Provenance générateur | Statut observation | Statements | Branches | Functions | Lines |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| web | `EVIDENCE_UNVERIFIED` | `PRESENT_NOT_ATTESTED` (`WORKTREE_LIVE`, 1 fail) | 77 238 / 95 433 — 80,93 % | 74 524 / 104 180 — 71,53 % | 19 944 / 24 939 — 79,97 % | 70 268 / 83 579 — 84,07 % |
| mobile | `EVIDENCE_UNVERIFIED` | `PRESENT_NOT_ATTESTED` (`PASS` 402/402) | 2 498 / 2 779 — 89,89 % | 1 799 / 2 122 — 84,78 % | 684 / 798 — 85,71 % | 2 153 / 2 259 — 95,31 % |
| node | `EVIDENCE_UNVERIFIED` | `PRESENT_NOT_ATTESTED` (`PASS` 182 fichiers) | 56 988 / 80 272 — 70,99 % | 16 113 / 20 567 — 78,34 % | 2 673 / 3 357 — 79,62 % | 56 988 / 80 272 — 70,99 % |
| python | `EVIDENCE_UNVERIFIED` | `PRESENT_NOT_ATTESTED` (`PASS` 137/137) | `NOT_MEASURED` | 562 / 766 — 73,37 % | `NOT_MEASURED` | 2 451 / 2 883 — 85,02 % |

## Seuils et politique

- Empreinte politique : `e6d14163f019bf06adf963041f33fec80cd6a576009acf786eb1f13139826e29` ; empreinte risques : `3c341077b40b736da099a047d87ba85dc6f668c0444f6021a5d1307410574bcd`.
- Empreintes de scope : Web `f39357edc99c09ae1903eac2ca0cf8aacb64d390d82656b3f3f18135f37412b1`, Mobile `e50eeed2bae7b1dc71b65b93e00a5a710c451d2427cc65938c640fbd1dd9c3bd`.
- Web `security` : 90/85/90/90 ; `business` : 85/80/85/85 ; `api-persistence` : 85/80/85/85 (S/B/F/L).
- Web `ui-presentational` : `NO_TARGET_DEFINED` ; Web `unclassified` : `RISK_CLASSIFICATION_REQUIRED` ; Web `new-code-non-critical` : non mesuré car aucun préfixe n'est qualifié.
- Mobile (`80 %` sur les 4 métriques côté `quality:mobile-coverage`), Node et Python : `NO_TARGET_DEFINED` dans `COVERAGE_RISK_FAMILIES`.

## Familles Web (observation locale `PRESENT_NOT_ATTESTED`)

| Famille | Fichiers | Statements | Branches | Functions | Lines | Écart S/B/F/L (pp) | Unités S/B/F/L | Objectif | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `security` | 392 | 8 677 / 11 412 — 76,03 % | 7 957 / 11 984 — 66,40 % | 2 271 / 3 158 — 71,91 % | 8 188 / 10 490 — 78,06 % | 13,97 / 18,60 / 18,09 / 11,94 | 1 594 / 2 230 / 572 / 1 253 | 90 / 85 / 90 / 90 | `OBSERVE` |
| `business` | 1 708 | 49 251 / 61 653 — 79,88 % | 52 320 / 74 066 — 70,64 % | 13 842 / 17 508 — 79,06 % | 44 185 / 53 007 — 83,36 % | 5,12 / 9,36 / 5,94 / 1,64 | 3 155 / 6 933 / 1 040 / 871 | 85 / 80 / 85 / 85 | `OBSERVE` |
| `api-persistence` | 471 | 15 814 / 18 115 — 87,30 % | 11 504 / 14 458 — 79,57 % | 2 924 / 3 197 — 91,46 % | 14 590 / 16 134 — 90,43 % | 0,00 / 0,43 / 0,00 / 0,00 | 0 / 63 / 0 / 0 | 85 / 80 / 85 / 85 | `OBSERVE` |
| `ui-presentational` | 168 | 3 026 / 3 620 — 83,59 % | 2 382 / 3 108 — 76,64 % | 797 / 939 — 84,88 % | 2 872 / 3 391 — 84,69 % | — | — | `NO_TARGET_DEFINED` | `NO_TARGET_DEFINED` |
| `new-code-non-critical` | 0 | `NOT_MEASURED` | `NOT_MEASURED` | `NOT_MEASURED` | `NOT_MEASURED` | — | — | lines 90 % (min 80 %) | `NOT_MEASURED` |
| `unclassified` | 19 | 470 / 633 — 74,25 % | 361 / 564 — 64,01 % | 110 / 137 — 80,29 % | 433 / 557 — 77,74 % | — | — | `NO_TARGET_DEFINED` | `RISK_CLASSIFICATION_REQUIRED` |

## Domaines métier prioritaires (source : `module-test-metrics.json`)

| Domaine | Runtime (fichiers / lignes) | Tests directs (fichiers / lignes) | Sans test direct | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `auth-authz` | 52 / 4 776 | 23 / 2 625 | 23 | 90,58 % | 85,33 % | 92,45 % | 91,85 % |
| `api` | 136 / 19 393 | 62 / 6 260 | 28 | 88,72 % | 79,54 % | 93,40 % | 90,86 % |
| `actions` | 629 / 98 477 | 166 / 19 429 | 212 | 80,12 % | 74,00 % | 79,45 % | 82,92 % |
| `account` | 51 / 6 835 | 23 / 1 769 | 6 | 71,58 % | 66,23 % | 64,63 % | 75,47 % |
| `maps-location` | 44 / 8 707 | 14 / 1 359 | 9 | 88,05 % | 78,18 % | 90,67 % | 89,87 % |
| `payments` | 1 / 87 | 1 / 77 | 0 | 75,00 % | 57,89 % | 100,00 % | 81,82 % |
| `import-export` | 1 / 132 | 1 / 64 | 0 | 85,42 % | 75,00 % | 100,00 % | 85,11 % |
| `learning` | 105 / 18 324 | 18 / 1 201 | 37 | 76,76 % | 69,27 % | 78,87 % | 78,29 % |
| `spogomi` | 237 / 28 381 | 116 / 11 860 | 42 | 79,66 % | 71,16 % | 79,57 % | 88,27 % |

## Top 15 — plus grands déficits relatifs (pp)

| Rang | Famille | Fichier | Delta max (pp) | Unités additionnelles max |
| ---: | --- | --- | ---: | ---: |
| 1 | `security` | `apps/web/src/components/chat/chat-context-sidebar.tsx` | 90,00 | 52 |
| 2 | `security` | `apps/web/src/components/chat/hooks/use-chat-shell-feed-effects.ts` | 90,00 | 41 |
| 3 | `security` | `apps/web/src/components/posthog-provider.tsx` | 90,00 | 40 |
| 4 | `security` | `apps/web/src/components/reports/admin-workflow/action-cancellation-control.tsx` | 90,00 | 39 |
| 5 | `security` | `apps/web/src/components/chat/chat-shell.behavior.ts` | 90,00 | 37 |
| 6 | `security` | `apps/web/src/components/profil/impact-profile-page.tsx` | 90,00 | 37 |
| 7 | `security` | `apps/web/src/components/reports/admin-workflow/step-journal.tsx` | 90,00 | 36 |
| 8 | `security` | `apps/web/src/components/chat/ui/chat-action-reference-card.tsx` | 90,00 | 34 |
| 9 | `security` | `apps/web/src/components/chat/hooks/use-chat-shell-dm-navigation.ts` | 90,00 | 33 |
| 10 | `security` | `apps/web/src/components/admin/quiz-pedagogical-metrics-panel.tsx` | 90,00 | 32 |
| 11 | `security` | `apps/web/src/components/chat/hooks/use-chat-shell-runtime-context.ts` | 90,00 | 32 |
| 12 | `security` | `apps/web/src/components/chat/ui/channel-button.tsx` | 90,00 | 29 |
| 13 | `security` | `apps/web/src/components/chat/chat-shell.layout.tsx` | 90,00 | 28 |
| 14 | `security` | `apps/web/src/components/account/use-active-role-mutation.ts` | 90,00 | 27 |
| 15 | `security` | `apps/web/src/components/chat/hooks/use-chat-shell-selection.ts` | 90,00 | 27 |

## Top 15 — plus grand volume absolu manquant

| Rang | Famille | Fichier | Lignes à couvrir | Branches à couvrir |
| ---: | --- | --- | ---: | ---: |
| 1 | `business` | `apps/web/src/lib/actions/external-sync/store.ts` | 114 | 189 |
| 2 | `business` | `apps/web/src/components/sections/rubriques/annuaire/annuaire-map-3d-canvas.tsx` | 113 | 103 |
| 3 | `business` | `apps/web/src/app/learn/empreinte-ia/personal-ai-import-client.tsx` | 97 | 117 |
| 4 | `business` | `apps/web/src/components/actions/action-declaration/ui/action-declaration-export-picker.controller.ts` | 80 | 47 |
| 5 | `business` | `apps/web/src/components/sections/rubriques/annuaire/territory-network-combobox.tsx` | 73 | 91 |
| 6 | `business` | `apps/web/src/components/learn/quiz/session/use-quiz-session-controller.ts` | 72 | 21 |
| 7 | `business` | `apps/web/src/components/learn/quiz/use-environmental-quiz-mode.ts` | 66 | 8 |
| 8 | `business` | `apps/web/src/components/sections/rubriques/annuaire/annuaire-map-canvas.tsx` | 56 | 49 |
| 9 | `security` | `apps/web/src/components/chat/hooks/use-chat-search.ts` | 55 | 47 |
| 10 | `business` | `apps/web/src/components/sections/rubriques/action-rides-panel.tsx` | 51 | 71 |
| 11 | `business` | `apps/web/src/app/learn/empreinte-ia/personal-ai-quick-scenario-client.tsx` | 45 | 52 |
| 12 | `security` | `apps/web/src/components/chat/hooks/use-chat-shell-feed-effects.ts` | 40 | 32 |
| 13 | `business` | `apps/web/src/components/sections/rubriques/rejoindre-une-action/rejoindre-un-formulaire-section.controller.ts` | 40 | 15 |
| 14 | `security` | `apps/web/src/components/chat/hooks/use-chat-shell-composer.ts` | 39 | 16 |
| 15 | `security` | `apps/web/src/components/account/greater-paris-select.tsx` | 38 | 27 |

## Inventaire physique et ratios (source canonique : `repository-growth`)

Conformément à la politique de publication de `scripts/reports/repository-growth.mjs`, l'inventaire complet par catégorie et l'historique mensuel sont générés dans `artifacts/repository-growth/repository-growth.md` et `.json` sans duplication de l'arbre complet. Synthèse au SHA `54be42e7d5f365230fa74ccd9e05deeb413526e9` :

- **Total monorepo (15 catégories disjointes)** : **7 649** fichiers, **144 372 002** octets, **1 908 207** lignes physiques.
- **Runtime** : Web **2 924** fichiers (`435 351` lignes), Mobile **46** fichiers (`6 764` lignes).
- **Tests** : Web **2 089** fichiers (`308 410` lignes), Mobile **60** fichiers (`10 645` lignes), E2E **78** fichiers (`14 006` lignes), Script tests **161** fichiers (`37 399` lignes).
- **Autres catégories** : Documentation **838** (`379 360` lignes), Scripts / CI **298** (`83 885` lignes), Shared infrastructure **24** (`3 149` lignes), SQL / migrations **536** (`81 047` lignes), Data / configuration **55** (`473 242` lignes), Media / binaries **352**, Vendored / generated / lockfiles **123** (`65 520` lignes), Other text **65** (`9 429` lignes).
- **Ratios tests / runtime (lignes physiques)** : Web **70,8 %**, Mobile **157,4 %**, Monorepo (Web + Mobile + E2E + scripts / runtime Web + Mobile) **83,8 %**.
- **Top-heavy (`quality:top-heavy`)** : **73** REVIEW, **3** HARD, **333** préventifs.

## Typologie et volume des tests (statique sur `HEAD` vs exécutés)

| Type de test | Fichiers (`HEAD`) | Cas statiques recensés | Tests réellement exécutés (campagne) | Statut |
| --- | ---: | ---: | --- | --- |
| Vitest Web (`apps/web/src`) | 1 968 | 10 766 | 1 968 fichiers : `12 387` passés, `1` échec (`profiles.test.ts`), `1` ignoré | `PRESENT_NOT_ATTESTED` |
| Vitest Mobile (`apps/mobile`) | 54 | 418 | 45 fichiers : `402` passés | `PASS` (observation locale) |
| Node `node:test` (`scripts/` + `apps/web/scripts/`) | 183 | 1 637 | 182 fichiers (`run-script-tests.mjs`) | `PASS` (observation locale) |
| Python `pytest` (`maintenance/python`) | 18 | 114 (`def test_`) | `137` passés (`@pytest.mark.parametrize` inclus) | `PASS` (observation locale) |
| Playwright E2E (`e2e/`) | 42 | 164 | `0` (`NOT_RUN`) | `NOT_RUN` |
| pgTAP SQL (`apps/web/supabase/tests/`) | 61 | 1 587 assertions | `0` (`DB_SEMANTICS_NOT_EXECUTED`) | `DB_SEMANTICS_NOT_EXECUTED` |

Répartition thématique par chemin sur `HEAD` (fichiers non disjoints) : **185** sécurité/AuthN/AuthZ/RLS, **596** intégration/API/E2E/Supabase, **17** concurrence/race/CAS/idempotence, **137** tests comportementaux `.behavior.test.*`.

## Duplication des tests et modules sans test direct (`module-test-metrics.json`)

- **Périmètre `SOURCE_ROOTS` (`apps/web/src`, `apps/mobile`, `scripts`)** : **3 144** fichiers runtime (`483 176` lignes), **2 223** fichiers de test (`339 879` lignes), ratio global **0,7071** (fichiers) / **0,7034** (lignes).
- **Modules sans test directement associé** : **1 095** fichiers runtime sur **3 144** (**34,8 %**), dont principalement `web/components` (`310/672`), `actions` (`212/629`), `web/lib` (`201/666`), `web/app` (`65/99`), `reports` (`46/148`), `scripts/checks` (`46/100`), `spogomi` (`42/237`), `learning` (`37/105`), `api` (`28/136`), `auth-authz` (`23/52`). L'absence de test direct ne vaut pas absence de couverture indirecte.
- **Duplication des tests (`jscpd` checkout propre)** : **1 334** clones sur **2 014** fichiers (`295 811` lignes), **13 977** lignes dupliquées (**4,72 %**), **+807** lignes et **140** nouveaux clones vs baseline (`FAIL` sur le ratchet informatif `module-test-metrics`).

## Évolution depuis les photographies précédentes

Les comparaisons ci-dessous rapprochent des photographies de SHAs et périmètres différents ; elles restent descriptives et non équivalentes à une mesure avant/après sur dénominateur figé :

| Photographie | Date / SHA | Web (S / B / F / L) | Mobile (S / B / F / L) | Node (S / B / F / L) | Python (B / L) |
| --- | --- | --- | --- | --- | --- |
| Référence historique | `2026-10-26` (`6d838f8`) | 73,65 / 62,83 / 72,70 / 76,16 % | 91,08 / 85,78 / 84,60 / 96,33 % | 62,73 / 78,00 / 77,21 / 62,73 % | 73,37 / 85,02 % |
| Photographie 80 % | `2026-10-31` (`e99974f`) | 79,11 / 68,41 / 77,55 / 81,75 % | 91,09 / 85,84 / 84,60 / 96,34 % | 68,61 / 78,18 / 79,36 / 68,61 % | 73,37 / 85,02 % |
| Photographie courante | `2026-11-26` (`54be42e`) | **80,93 / 71,53 / 79,97 / 84,07 %** | **89,89 / 84,78 / 85,71 / 95,31 %** | **70,99 / 78,34 / 79,62 / 70,99 %** | **73,37 / 85,02 %** |

Évolution structurelle (`module-test-metrics.json` `2026-11-03` SHA `753f1b6` → `2026-11-26` SHA `54be42e`) :
- Web runtime : `2 516` → `2 924` fichiers (`+408`), Web tests : `1 677` → `2 089` fichiers (`+412`).
- Mobile runtime : `38` → `46` fichiers, Mobile tests : `55` → `60` fichiers.
- `repository-growth` : croissance sur 30 jours (`0ca65ac3` → `54be42e7`) de `+1 565` fichiers / `+550 261` lignes physiques (`+25,7 %` / `+40,5 %`), et sur 90 jours (`48283399` → `54be42e7`) de `+4 666` fichiers / `+1 449 768` lignes physiques (`+156,4 %` / `+316,2 %`).

## Méthode, limites et verdict

**STOP CONDITION : PARTIELLE (attestation CI absente en local).** Les quatre campagnes de couverture (Web, Mobile, Node, Python), `repository-growth` et `module-test-metrics.json` ont été régénérés sur le candidat courant sans modifier aucun seuil, baseline, exclusion ou code métier. Les preuves PostgreSQL/pgTAP (`DB_SEMANTICS_NOT_EXECUTED`), Playwright E2E (`NOT_RUN`) et l'attestation `CI_EXACT_SHA` restent hors portée de l'exécution locale.

Artefact structuré : [`coverage-reference-2026-11-26.json`](coverage-reference-2026-11-26.json) et [`module-test-metrics.json`](module-test-metrics.json).
