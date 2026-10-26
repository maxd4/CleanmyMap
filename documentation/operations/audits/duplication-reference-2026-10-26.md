# CleanMyMap — référence de duplication — 2026-10-26

> Statut : `AUDIT` / `SNAPSHOT` — photographie mesurée, non contrat bloquant.

## 1. Objet et périmètre

Cette photographie établit l'état de la duplication détectée par la politique
canonique du dépôt et suit une cible informative maximale de **3 %** pour les
lignes et les tokens de chacun des trois périmètres mesurés : `runtime`,
`tests` et `fixtures/data`.

La cible de 3 % n'est pas un nouveau gate. Les ratchets existants restent
prioritaires : nouveaux fingerprints non qualifiés, dépassement des marges
historiques et justifications périmées.

La mesure canonique couvre les chemins déclarés par
`DUPLICATION_SCOPES` dans `scripts/checks/duplication-policy.mjs` :

- `runtime` : `apps/web/src`, `apps/mobile`, `scripts`, hors tests, fixtures,
  snapshots et data déclarées comme ignorées ;
- `tests` : les fichiers `*.test.*` et `*.spec.*` des mêmes racines ;
- `fixtures/data` : `apps/web/src/data`, `apps/web/src/lib/data` et
  `scripts/data`.

Python, SQL, E2E et les autres chemins non déclarés ne sont pas mesurés par
ce gate. Ils sont donc `OUT_OF_INSTRUMENTATION`, pas `0 %`.

## 2. Provenance et comparabilité

| Élément | Valeur |
| --- | --- |
| SHA mesuré | `504d6082ab58a84487a9af7fcf7265e2b74ca4c3` (`HEAD`, lecture du worktree courant) |
| Branche | `main` |
| Provenance de lecture | `WORKTREE_LIVE` ; le worktree contenait les changements non committés de ce lot, conservés séparément des chemins étrangers |
| Mesure duplication | `2026-10-26T19:54:35.896Z` (`audit:quality -- duplication`) |
| Run d'audit | `b6c07bc4-f6b0-4c21-a4c3-7327bfeeee1f` |
| Projection quality-index du SHA final | `NOT_RUN_POLICY` — le lot demandait uniquement l'audit duplication |
| Outil déclaré par la politique et les baselines | `jscpd 5.3.0` |
| Outil installé et exécuté | `jscpd 5.3.0` (`npm ls jscpd`, `node node_modules/jscpd/run-jscpd.js --version`) |
| Seuil de détection | `minLines=5`, `minTokens=50` |
| Fingerprint de politique | `93c9f907e5320ec229f6df6e7aad86b37b0f4ef5273530b2875a49c3b8945783` |
| Source des baselines natives | `b7c37c2bf00a00f5dc3e454b453ce0db7edf73a2` |
| Version package/lockfile | `package.json` et `package-lock.json` déclarent exactement `5.3.0` |

La comparaison avec les baselines est désormais **homogène** : le package, le
lockfile et le runner réellement exécuté annoncent tous `jscpd 5.3.0`. Le
contrôle vérifie `jscpd --version` sur le même runner avant toute mesure et
échoue explicitement si l'exécutable est absent, si sa sortie est invalide ou
si sa version diverge. Les baselines natives, fingerprints, seuils, marges et
exclusions n'ont pas été modifiés.

Les artefacts exhaustifs reproductibles générés par les producteurs canoniques
sont :

```text
artifacts/quality-audits/504d6082ab58a84487a9af7fcf7265e2b74ca4c3/
  duplication--b6c07bc4-f6b0-4c21-a4c3-7327bfeeee1f--report.json
  duplication--b6c07bc4-f6b0-4c21-a4c3-7327bfeeee1f--manifest.json
  duplication--b6c07bc4-f6b0-4c21-a4c3-7327bfeeee1f--summary.md
```

Le rapport duplication conserve tous les fingerprints et toutes les paires
d'occurrences et constitue la matrice exhaustive de ce lot. Aucune projection
quality-index `all` n'a été produite dans ce lot : elle est `NOT_RUN_POLICY` et
ne constitue donc pas une preuve manquante reclassée en succès. Les artefacts
sous `artifacts/` sont générés et ignorés par Git ; ce document enregistre le
rapport canonique courant, mais ne constitue pas un second moteur ni un registre
miroir.

## 3. Tableau global

Les pourcentages sont calculés sur les compteurs exacts avant arrondi. Le
`delta 3 %` est `max(0, taux - 3)`. L'excès théorique est
`max(0, dupliqué - floor(total × 0,03))` ; ce n'est pas un nombre de lignes à
supprimer, car la résolution d'un clone modifie plusieurs occurrences et les
dénominateurs.

| Scope | Fichiers | Lignes totales | Lignes dupliquées | Taux lignes | Tokens totaux | Tokens dupliqués | Taux tokens | Delta 3 % lignes / tokens | Excès théorique lignes / tokens | Gate historique |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `runtime` | 2 370 | 333 706 | 1 917 | 0,574458 % | 1 962 850 | 14 527 | 0,740098 % | 0 / 0 pp | 0 / 0 | `FAIL` — 135 nouveaux fingerprints ; marges dépassées |
| `tests` | 1 470 | 191 264 | 6 037 | 3,156371 % | 1 294 285 | 43 939 | 3,394847 % | 0,156371 / 0,394847 pp | 300 / 5 111 | `FAIL` — 397 nouveaux fingerprints ; marges dépassées |
| `fixtures/data` | 12 | 1 992 | 0 | 0 % | 8 863 | 0 | 0 % | 0 / 0 pp | 0 / 0 | `PASS` |

La cible documentaire est donc atteinte pour `runtime` et `fixtures/data`, et
dépassée pour `tests`. Cela ne signifie ni absence de clones actionnables dans
les scopes sous 3 %, ni autorisation de créer de nouvelles duplications.

### État réel des gates

| Contrôle | Résultat | Détails observés |
| --- | --- | --- |
| `npm run quality:duplication` | `FAIL` | runtime et tests en échec ; fixtures/data `PASS` |
| `npm run audit:quality -- duplication` | `FAIL`, `attention=true` | 225 clones runtime, 650 tests, 0 fixtures/data |
| `npm run audit:quality -- all` sur le SHA final | `NOT_RUN_POLICY` | hors périmètre de ce lot ; aucune projection `all` n'est utilisée |
| Fingerprints qualifiés nouveaux | informatif | runtime 21 ; tests 22 |
| Justifications présentes | informatif | `KEEP_INTENTIONAL=164`, `NO_ACTION_NOISE=133` |
| Justifications périmées | `PASS` | `STALE_KEEP_INTENTIONAL=0`, `STALE_NO_ACTION_NOISE=0` ; les dix entrées obsolètes ont été retirées |

Les deltas historiques bruts homogènes sont : runtime `+564` lignes / `+6 234`
tokens / `+0,101857` pp / `+0,197838` pp tokens ; tests `+3 014` lignes /
`+25 601` tokens / `+0,754972` pp / `+1,000427` pp tokens. Le gate reste donc
intentionnellement en échec : la réduction est mesurée, mais ne suffit pas à
faire disparaître les fingerprints nouveaux ni les dépassements de marges.

## 4. Matrice des clones prioritaires

La matrice exhaustive est le rapport JSON canonique indiqué en section 2. Le
tableau ci-dessous est la projection lisible des 30 occurrences runtime à
impact architectural potentiel les plus volumineuses, relues par famille de
responsabilité. `distinctLines` est l'union des deux intervalles de la paire ;
les tokens ne sont pas exposés de manière fiable par paire et restent donc
mesurés au niveau du scope.

| Rang | Fingerprint | Fichier A / lignes | Fichier B / lignes | Lignes distinctes | Qualification observée | Cause / risque | Décision proposée |
| ---: | --- | --- | --- | ---: | --- | --- | --- |
| 1 | `a4e4193dc4b383b9` | `components/actions/map/layers/map-layers-point-markers.tsx:149-168` | même fichier `:241-260` | 40 | non qualifiée dans la matrice critique | rendu/filtrage de marqueurs répété ; risque de divergence UI-map | P2 — centraliser après vérification du contrat de couche |
| 2 | `365684e7a4979738` | `components/missions/deferred-mission-panels.tsx:24-41` | `components/missions/mission-map.tsx:12-29` | 36 | non qualifiée | orchestration de panneaux/carte ; risque modéré de divergence d'état | P2 — EXTEND_EXISTING côté missions |
| 3 | `31957f807349c194` | `lib/environmental-impact-estimator/codex-usage-store.ts:329-345` | `lib/environmental-impact-estimator/snapshot-store.ts:161-177` | 34 | `NO_ACTION_NOISE` | persistance Supabase/fallback ressemblante mais tables et invariants distincts | KEEP — réexaminer seulement si owner commun démontré |
| 4 | `4c955c9e85c877d7` | `lib/actions/action-media/action-media.ts:100-116` | `lib/actions/signalement/signalement-media.ts:157-173` | 34 | non qualifiée | upload/média et erreurs proches sur deux domaines ; risque d'autorisation ou de cycle de vie | P0/P1 — owner média sécurisé à établir |
| 5 | `f2d822ff3f6f3b5f` | `app/api/community/bug-reports/[reportId]/screenshot/finalize/route.ts:33-49` | `.../screenshot/intent/route.ts:34-50` | 34 | non qualifiée | intentions/finalisation de capture ; risque d'ownership et de validation | P0 — RESTRUCTURE_FIRST avec contrat média |
| 6 | `5d42ee0d7140a691` | `app/api/actions/[actionId]/participation-claim/route.ts:25-40` | `app/api/actions/account-options/route.ts:108-123` | 32 | non qualifiée | résolution d'identité/participant ; risque AuthZ et scope d'action | P0 — EXTEND_EXISTING auth/participation |
| 7 | `65e4850ea310062a` | `app/api/admin/moderation/route.ts:21-36` | `app/api/admin/partners/published-directory/route.ts:389-404` | 32 | `KEEP_INTENTIONAL` | deux gardes admin/publication auditées séparément | KEEP — preuve AuthN/AuthZ explicite |
| 8 | `e2671f933582546c` | `app/api/admin/codex-usage/route.ts:169-184` | `app/api/admin/environmental-impact/route.ts:58-73` | 32 | `NO_ACTION_NOISE` | payloads admin et métriques distincts | KEEP — pas d'owner commun démontré |
| 9 | `86da6ca83f3304a2` | `lib/community/bug-reports-store-contract.ts:133-146` | `lib/community/creator-inbox-pagination.ts:8-24` | 31 | non qualifiée | pagination/contrat communautaire ; risque de comptage et de visibilité | P1 — centraliser la pagination prouvée |
| 10 | `8f85326d4bc277e6` | `lib/actions/store-queries.ts:160-175` | `lib/actions/unified-source/load.ts:120-134` | 31 | non qualifiée | chargement d'actions par deux sources ; risque de source de vérité | P0/P1 — RESTRUCTURE_FIRST autour de unified-source |
| 11 | `80ab3e857d4abcfd` | `app/api/spogomi/events/[eventId]/imports/preview/route.ts:7-21` | `.../route-gpx/route.ts:5-19` | 30 | non qualifiée | lecture/validation d'événement Spogomi ; risque de droits et d'état | P1 — owner Spogomi partagé |
| 12 | `867a2db3241d2b5f` | `app/api/actions/[actionId]/route.patch-preparation.ts:45-59` | même fichier `:83-97` | 30 | non qualifiée | transitions de préparation répétées ; risque de mutation partielle | P0 — préserver fail-closed et tester transitions |
| 13 | `21eb957360498284` | `app/api/actions/invitations/route.ts:64-77` | `app/api/actions/post-action-prompts/route.ts:60-73` | 28 | non qualifiée | accès/invitation et post-action ; risque de droits communautaires | P1 — owner invitations/prompts après cartographie |
| 14 | `3187def9cce3cff1` | `lib/auth/api-authorization-contract.admin-community.ts:4-17` | même fichier `:137-150` | 28 | `KEEP_INTENTIONAL` | contrats endpoint admin distincts et auditables | KEEP — ne pas rendre la policy opaque |
| 15 | `33bd6d2aaa2a460e` | `lib/gamification/quiz-balance-progress.ts:119-132` | `lib/gamification/quiz-progress.ts:132-145` | 28 | non qualifiée | calculs de progression proches ; risque de score divergent | P1 — owner gamification après invariants |
| 16 | `e18f25e401afa877` | `lib/spogomi/organizer-service.ts:22-35` | `lib/spogomi/personal-events-service.ts:75-88` | 28 | non qualifiée | relations organisateur/événement ; risque d'accès incomplet | P1 — EXTEND_EXISTING service Spogomi |
| 17 | `ef2c4a06c2b97a69` | `app/api/email/test/route.ts:1-14` | `app/api/send/route.ts:2-15` | 28 | non qualifiée | deux frontières d'envoi ; risque de secret et de comportement SMTP | P0 — sécuriser l'owner d'envoi |
| 18 | `f6ee16a9022c4b24` | `app/api/account/identity/route.ts:14-27` | `app/api/account/locations/route.ts:33-46` | 28 | non qualifiée | chargement compte/profil ; risque de scope utilisateur | P0 — centraliser l'identité serveur |
| 19 | `f223f8a99dcdba54` | `components/actions/map-marker-categories.ts:122-134` | `components/actions/map/layers/map-layers.shared.ts:153-166` | 27 | non qualifiée | catégories et couches de carte ; risque de mapping incohérent | P2 — owner géométrie/catégories |
| 20 | `2bc66b85271c89bd` | `app/api/actions/[actionId]/media/[mediaId]/finalize/route.ts:5-17` | `app/api/actions/[actionId]/media/route.ts:5-17` | 26 | non qualifiée | upload et finalisation ; risque d'ownership média | P0 — même lot que le lot média |
| 21 | `3188f19706223cf0` | `app/api/chat/polls/[messageId]/vote/route.ts:167-179` | même fichier `:219-231` | 26 | non qualifiée | mutations de vote répétées ; risque d'idempotence | P1 — owner vote/poll après tests de concurrence |
| 22 | `5cef06164a2671a6` | `app/api/account/active-profile/route.ts:94-106` | `app/api/account/identity/route.ts:34-46` | 26 | non qualifiée | identité active et identité brute ; risque de confusion de scope | P0 — même lot identité |
| 23 | `70dc1bab1f74fdce` | `components/actions/map/popup/action-popup-content.helpers.ts:40-52` | `components/actions/map/selection/actions-map-selected-card.utils.ts:66-78` | 26 | non qualifiée | projection d'action côté carte ; risque d'affichage divergeant | P2 — EXTEND_EXISTING map projection |
| 24 | `8508d3dbb4b12738` | `components/reports/web-document/reports-web-document-model.helpers.ts:49-60` | `lib/reports/multi-action-report.ts:42-55` | 26 | non qualifiée | modèle de rapport dans deux couches ; risque de format exporté | P1 — owner report-model |
| 25 | `aac91d0abcd93e58` | `app/api/community/bug-reports/[reportId]/screenshot/finalize/route.ts:16-28` | `.../screenshot/route.ts:18-30` | 26 | non qualifiée | screenshot community ; risque d'ownership et de nettoyage | P0 — même lot média |
| 26 | `bec5f34522a8752b` | `app/api/reports/generations/[id]/csv/route.ts:5-17` | `.../[id]/json/route.ts:3-15` | 26 | non qualifiée | export CSV/JSON ; risque de permissions et de payload | P1 — owner génération rapport |
| 27 | `c279c0a271288285` | `app/api/actions/invitations/route.ts:32-44` | `app/api/actions/post-action-prompts/route.ts:31-43` | 26 | non qualifiée | lecture relationnelle commune apparente | P1 — même lot invitations |
| 28 | `c8c28caec56a0e1f` | `app/api/admin/promotion-requests/route.ts:382-394` | `app/api/admin/role-accounts/route.ts:184-196` | 26 | non qualifiée | mutations admin de rôles ; risque AuthZ/audit | P0 — conserver journalisation et scopes |
| 29 | `bd376f3ce750abd7` | `lib/environmental-impact-estimator/project-signals-scope.ts:33-44` | `.../project-signals.calculations.ts:149-161` | 25 | non qualifiée | signaux et calculs proxy ; risque de double source scientifique | P1 — owner calculs impact |
| 30 | `24897683ebec3ca2` | `lib/actions/participation/group-participation-admin.ts:115-126` | `.../group-participation-review-mutation.ts:134-145` | 24 | non qualifiée | participation/admin/review ; risque de transitions de droits | P0 — même lot participation |

Les lignes et fingerprints de ce tableau restent des occurrences réelles ; une
ressemblance ne prouve pas à elle seule qu'une abstraction métier est sûre.
Les dossiers ou fichiers dirty préexistants `chat`, `notifications`,
`gamification` et `cmm-dialog` n'ont pas été modifiés par l'audit.

## 5. Top 50 des volumes sans double comptage local

Chaque ligne regroupe les occurrences par paire de modules et calcule l'union
des intervalles par fichier. Les lignes d'un même groupe ne sont donc pas
additionnées fingerprint par fingerprint lorsqu'elles se recouvrent. Les
groupes runtime et tests restent séparés.

| Rang | Scope | Groupe de modules | Fichiers | Fingerprints | Lignes distinctes |
| ---: | --- | --- | ---: | ---: | ---: |
| 1 | tests | `app/api/actions ↔ app/api/actions` | 30 | 75 | 1 285 |
| 2 | tests | `components/sections/rubriques ↔ components/sections/rubriques` | 29 | 77 | 1 238 |
| 3 | tests | `app/api/chat ↔ app/api/chat` | 16 | 45 | 713 |
| 4 | runtime | `app/api/spogomi ↔ app/api/spogomi` | 31 | 51 | 553 |
| 5 | tests | `app/api/reports ↔ app/api/reports` | 13 | 41 | 550 |
| 6 | tests | `app/api/spogomi ↔ app/api/spogomi` | 19 | 46 | 472 |
| 7 | tests | `app/api/admin ↔ app/api/admin` | 10 | 20 | 376 |
| 8 | tests | `lib/actions/action-media ↔ lib/actions/action-media` | 2 | 16 | 260 |
| 9 | tests | `app/api/route ↔ app/api/route` | 3 | 13 | 245 |
| 10 | runtime | `components/actions/action-declaration ↔ components/actions/action-declaration` | 12 | 8 | 185 |
| 11 | runtime | `app/api/actions ↔ app/api/actions` | 11 | 8 | 184 |
| 12 | runtime | `components/sections/rubriques ↔ components/sections/rubriques` | 10 | 8 | 176 |
| 13 | tests | `lib/actions/participation ↔ lib/actions/participation` | 6 | 10 | 173 |
| 14 | runtime | `app/api/admin ↔ app/api/admin` | 9 | 8 | 171 |
| 15 | runtime | `lib/ui/button-theme.ts ↔ lib/ui/button-theme.ts` | 1 | 4 | 170 |
| 16 | tests | `components/reports/web-document ↔ components/reports/web-document` | 2 | 9 | 153 |
| 17 | tests | `lib/community/bug-report-screenshot.test.ts ↔ même fichier` | 1 | 7 | 151 |
| 18 | tests | `lib/actions/store.test.ts ↔ même fichier` | 1 | 7 | 147 |
| 19 | tests | `components/actions/action-declaration ↔ même module` | 7 | 8 | 145 |
| 20 | tests | `app/api/api-boundary.test.ts ↔ même fichier` | 1 | 5 | 124 |
| 21 | tests | `lib/reports/multi-action-report.test.ts ↔ même fichier` | 1 | 11 | 122 |
| 22 | tests | `app/api/community ↔ app/api/community` | 7 | 6 | 120 |
| 23 | runtime | `app/learn/ressources ↔ app/learn/ressources` | 3 | 3 | 114 |
| 24 | tests | `lib/reports/report-generation-history-store.test.ts ↔ même fichier` | 1 | 5 | 111 |
| 25 | tests | `lib/community/engagement.test.ts ↔ lib/community/engagement` | 4 | 3 | 110 |
| 26 | tests | `components/spogomi/deep-consumers.behavior.test.tsx ↔ même fichier` | 1 | 9 | 107 |
| 27 | runtime | `app/api/reports ↔ app/api/reports` | 7 | 8 | 96 |
| 28 | tests | `lib/actions/unified-source.test.ts ↔ même fichier` | 1 | 6 | 96 |
| 29 | runtime | `app/api/community ↔ app/api/community` | 3 | 4 | 96 |
| 30 | tests | `components/actions/map ↔ components/actions/map` | 3 | 4 | 93 |
| 31 | tests | `app/api/gamification ↔ app/api/gamification` | 2 | 4 | 88 |
| 32 | runtime | `components/actions/map ↔ components/actions/map` | 4 | 3 | 88 |
| 33 | tests | `lib/environmental-impact-estimator/service.test.ts ↔ même fichier` | 1 | 2 | 87 |
| 34 | tests | `tests/emergency-screens-runtime.test.tsx ↔ même fichier` | 1 | 8 | 83 |
| 35 | tests | `dashboard-notifications-section ↔ notification-bell` | 2 | 5 | 83 |
| 36 | tests | `app/api/mobile ↔ app/api/mobile` | 4 | 8 | 80 |
| 37 | tests | `lib/legal-content-report/...persistence.test.ts ↔ même fichier` | 1 | 4 | 77 |
| 38 | tests | `account-controller-runtime.test.tsx ↔ account-screen-runtime.test.tsx` | 2 | 4 | 75 |
| 39 | runtime | `lib/actions/action-media ↔ lib/actions/signalement` | 4 | 3 | 72 |
| 40 | tests | `lib/pilotage/overview.summary.test.ts ↔ overview.test.ts` | 2 | 2 | 69 |
| 41 | tests | `app/server-translation-boundary.test.ts ↔ components/client-boundary.test.ts` | 2 | 2 | 68 |
| 42 | tests | `lib/reports/report-generation-payload.test.ts ↔ même fichier` | 1 | 6 | 66 |
| 43 | tests | `components/admin/creator-inbox ↔ components/admin/creator-inbox` | 3 | 5 | 65 |
| 44 | tests | `components/chat/chat-search-panel.test.tsx ↔ même fichier` | 1 | 5 | 64 |
| 45 | runtime | `app/api/account ↔ app/api/account` | 3 | 3 | 64 |
| 46 | tests | `app/server-translation-boundary.test.ts ↔ lib/client-boundary.test.ts` | 2 | 2 | 64 |
| 47 | tests | `components/reports/admin-workflow ↔ même module` | 2 | 2 | 64 |
| 48 | tests | `tests/action-join-runtime.test.tsx ↔ tests/signalement-runtime.test.tsx` | 2 | 3 | 62 |
| 49 | tests | `lib/environmental-impact-estimator/project-signals.test.ts ↔ même fichier` | 1 | 2 | 62 |
| 50 | tests | `components/actions/action-formalities-workflow-panel.test.tsx ↔ même fichier` | 1 | 2 | 61 |

Les volumes sont des regroupements documentaires ; ils ne constituent pas un
nouveau compteur de gate et ne doivent pas être additionnés entre groupes.

## 6. Duplications intentionnelles et bruit

### À préserver après contrôle de fraîcheur

`KEEP_INTENTIONAL` compte 180 fingerprints dans le rapport courant. Les
exemples relus comprennent :

- les tests de frontières `server/app`, `client/component` et `server/lib`
  (`d33cb13e5c169272`, `0441c7af01b96961`, `2051a8d78ac4bb70`,
  `69dad6373a596ab8`) ; l'indépendance rend la preuve de frontière lisible ;
- les gardes d'accès admin/publication et les contrats d'autorisation
  endpoint par endpoint (`65e4850ea310062a6`, `275c1597b13ff264`,
  `3187def9cce3cff1`) ;
- les branches visuelles distinctes de `CmmSection`
  (`c711ac6805040ada`).

Ces répétitions restent qualifiées seulement tant que leurs occurrences
CURRENT, raisons et SHA de revue restent présents dans
`scripts/checks/duplication-justifications.json`.

### `NO_ACTION_NOISE`

140 fingerprints sont classés `NO_ACTION_NOISE`. Exemples relus : les routes
admin aux payloads différents (`e2671f933582546c`), les snapshots d'impact et
Codex aux contrats de données distincts (`31957f807349c194`), les calculs
géographiques de sémantiques différentes (`d2d5b18d4caaf2a7`,
`7494dd40970c6add`) et les palettes de thème (`4c125945d94d76ae`,
`758014e00b166d11`, `4eb3bce3d36b1111`, `8a5b404769320ecd`).

### Clones non examinés ou stale

Les autres fingerprints doivent rester dans l'inventaire et ne sont pas
implicitement justifiés. La mesure courante ne signale plus de justification
stale : les dix entrées obsolètes ont été retirées après relecture de leur
provenance.

Une qualification ne peut ni modifier la baseline, ni relever un seuil, ni
élargir une exclusion.

## 7. Plan de réduction priorisé

Les lots regroupent les clones par responsabilité commune. Le choix
`EXTEND_EXISTING` / `RESTRUCTURE_FIRST` est indicatif pour un futur lot ; ce
snapshot ne modifie aucun runtime.

| Rang | Priorité | Macro-lot / owner candidat | Fichiers ou modules concernés | Cause et bénéfice attendu | Risques / tests de clôture |
| ---: | --- | --- | --- | --- | --- |
| 1 | P0 | Contrats AuthN/AuthZ et identité serveur — owner `lib/auth` / frontière API | `app/api/actions`, `app/api/account`, `app/api/admin`, `lib/auth` | réduire les résolutions d'identité et gardes concurrentes sans perdre le fail-closed | vérifier ownership, rôles, scope et réponses 401/403 par route ; tests API adversariaux |
| 2 | P0 | Média, screenshots et finalisation — owner média sécurisé à établir | `app/api/actions/**/media`, `app/api/community/**/screenshot`, `lib/actions/*-media` | unifier validation, ownership, intent/finalize et erreurs ; bénéfice sécurité/données | tests expirations, mauvais owner, replay, idempotence, storage/RLS ; `INTEGRATION_PROOF` requis |
| 3 | P0 | Participation, invitations et mutations de rôles — owner `lib/actions/participation` | `app/api/actions`, `lib/actions/participation`, admin promotion/roles | réduire les chemins concurrents de transition et de scope | tests transactionnels, concurrence, permissions et audit ; préserver `action_registrations` / participants |
| 4 | P1 | Source unifiée des actions — owner `lib/actions/unified-source` | `store-queries.ts`, `unified-source/load.ts`, routes actions | supprimer les doubles lectures et clarifier la source de vérité | tests de fallback, données absentes, pagination, invariants de persistance |
| 5 | P1 | Spogomi événements et relations — owner `lib/spogomi` | routes import/GPX et services organizer/personal-events | mutualiser pagination/normalisation commune sans mélanger les relations | tests organizer/reviewer/participant, visibilité, limites de pages et AuthZ |
| 6 | P1 | Génération et export de rapports — owner `lib/reports/report-model` | routes CSV/JSON, web-document, multi-action-report | maintenir un payload canonique entre formats et réduire les divergences | tests permissions, format, données partielles, exports et compatibilité |
| 7 | P1 | Calculs d'impact et snapshots — owner `lib/environmental-impact-estimator` | `codex-usage-store`, `snapshot-store`, `project-signals*` | distinguer clairement persistence partagée et modèles scientifiques distincts | tests de proxy, incertitude, fallback, upsert et calculs ; aucune mesure proxy transformée en mesure réelle |
| 8 | P2 | Cartographie, marqueurs et projections — owner map/geo existant | `components/actions/map/**`, `lib/geo/**` | réduire les mappings et projections UI répétées | tests géométrie, catégories, sélection, couches et responsive ; ne pas centraliser des sémantiques différentes |
| 9 | P2 | Stores communautaires et pagination — owner store/query existant | bug reports, creator inbox, legal/partner stores | réduire les wrappers de pagination et de lecture réellement identiques | tests exact count, ordre stable, scopes, erreurs Supabase et fallback local |
| 10 | P3 / KEEP | Harnesses et frontières de tests — owner test utilities, sans abstraction globale | `app/api/**.test.*`, `components/sections/**`, frontières server/client | réduire uniquement les setups manifestement communs ; conserver l'isolation des preuves | tests ciblés du harness, exécution isolée des frontières et absence de masquage d'un invariant |

Ordre recommandé : traiter d'abord les lots P0 avec preuves d'autorisation et
de persistance, puis les P1. Les lots P2/P3 ne doivent pas être lancés pour
faire baisser un score si leur abstraction augmente le couplage.

## 8. Zones non mesurées et limites

- Le gate ne mesure pas Python, SQL, E2E ni les fichiers hors
  `DUPLICATION_SCOPES`; aucune duplication nulle ne leur est attribuée.
- `tokens dupliqués` est fiable au niveau du scope fourni par jscpd, pas au
  niveau de chaque paire dans la matrice lisible.
- Les regroupements par module sont une projection d'intervalle, pas une
  preuve de causalité métier.
- Les artefacts ont `WORKTREE_LIVE` pour le run duplication et
  `COMMITTED_SNAPSHOT`/`MIXED` dans la projection complète selon le moteur ;
  ils prouvent le run local identifié, pas un état de production.
- Aucun PostgreSQL, RLS, service SMTP, Clerk réel, navigateur ou E2E n'a été
  exécuté pour cet audit de duplication.
- La version jscpd est alignée et vérifiée avant exécution ; un runner absent,
  invalide ou divergent rend désormais la mesure explicitement non valide.

## 9. Verdict et actions recommandées

La photographie est **HOMOGÈNE** au sens de la mesure : les trois scopes ont
été mesurés avec `jscpd 5.3.0` déclaré, installé et exécuté sur le SHA exact,
et le gate courant reste `FAIL` pour les clones nouveaux, les marges dépassées
et les justifications stale. La cible 3 % est dépassée uniquement par le scope
tests ; aucune correction de clone métier, baseline ou fingerprint n'a été
effectuée dans ce lot.

Actions recommandées avant un lot de réduction :

1. requalifier ou retirer les dix justifications stale après relecture des
   occurrences CURRENT ;
2. préparer les lots P0 AuthN/AuthZ/média/participation avec une matrice
   owner → invariant → tests → preuve d'intégration ;
3. mesurer à nouveau sur le SHA exact du lot suivant et conserver le même
   protocole de projection.
