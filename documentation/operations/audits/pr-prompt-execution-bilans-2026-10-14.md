# Bilans d'exécution des prompts liés aux PR — 2026-10-14

**État documentaire :** `AUDIT / SNAPSHOT`

**Périmètre :** lots explicitement demandés avec une source `PR` dans la
séquence d'exécution du 13–14 octobre 2026.

**Référence du dépôt :** `main` au moment de la rédaction.
**Règle de lecture :** ce document conserve une preuve contextualisée ; il ne
remplace ni l'état courant du code, ni l'état distant d'une PR, ni une preuve
de production.

## Format retenu pour chaque bilan

Chaque prompt de travail qui cite une PR doit laisser une trace vérifiable avec
les champs suivants :

| Champ | Contenu attendu |
| --- | --- |
| Source | Numéro, URL et titre observé de la PR ; distinguer la version proposée par la PR de la candidate réellement intégrée. |
| Contrat | Objectif, invariants conservés et changements explicitement refusés ou différés. |
| Décision | `INTEGRATED`, `PARTIAL`, `DEFERRED_COMPATIBILITY`, `BLOCKED` ou `REJECTED`. |
| Candidat | Manifests, lockfile, code, tests et documentation effectivement modifiés. |
| Preuves locales | Commande, portée, résultat et limite ; `PASS` signifie uniquement exécuté et réussi. |
| Preuves distantes | SHA, workflows GitHub, déploiement ou service externe ; ne jamais déduire un état distant d'un check local. |
| Limites | Preuves non exécutées : production, appareil réel, PostgreSQL/RLS, ingestion fournisseur, secrets ou déploiement. |
| Publication | Commit, branche, convergence `HEAD`/`origin/main` et état de la PR ; ne jamais fermer une PR sans demande explicite. |

Les statuts `NOT_RUN`, `UNVERIFIED` et `BLOCKED` ne sont pas des succès. Un
test unitaire, un mock, un build local ou un workflow GitHub vert ne prouve pas
à lui seul un comportement de production, une transaction SQL, un appareil
mobile ou l'ingestion effective par un fournisseur tiers.

## Synthèse des lots exécutés

| PR | Sujet du prompt | Décision | Commit publié sur `main` | Preuve distante observée | Limite principale |
| --- | --- | --- | --- | --- | --- |
| [#134](https://github.com/maxd4/CleanmyMap/pull/134) | Mises à jour compatibles Clerk et Upstash | `INTEGRATED` | [`87415b5`](https://github.com/maxd4/CleanmyMap/commit/87415b5) | CI et CodeQL réussis sur le SHA publié ([CI](https://github.com/maxd4/CleanmyMap/actions/runs/38471244184), [CodeQL](https://github.com/maxd4/CleanmyMap/actions/runs/38471244047)) | Les checks ne constituent pas une preuve d'identité Clerk Production ou de permissions réellement exercées en production. |
| [#135](https://github.com/maxd4/CleanmyMap/pull/135) | `@supabase/supabase-js` `2.117.3` dans les trois workspaces | `INTEGRATED` | [`3200ae4`](https://github.com/maxd4/CleanmyMap/commit/3200ae4) | CI et CodeQL réussis sur le SHA publié ([CI](https://github.com/maxd4/CleanmyMap/actions/runs/38478625812), [CodeQL](https://github.com/maxd4/CleanmyMap/actions/runs/38478625794)) | Aucun changement de migration n'a été inclus ; les tests clients ou mocks ne remplacent pas une preuve SQL/RLS réelle. |
| [#142](https://github.com/maxd4/CleanmyMap/pull/142) | Correctifs mobiles compatibles avec Expo SDK 57 | `PARTIAL` | [`8b31f51`](https://github.com/maxd4/CleanmyMap/commit/8b31f51) | CI et CodeQL réussis sur le SHA publié ([CI](https://github.com/maxd4/CleanmyMap/actions/runs/38479859933), [CodeQL](https://github.com/maxd4/CleanMyMap/actions/runs/38479860039)) | Seul `@clerk/expo` `4.10.0` a été retenu ; React Native `0.87.1`, Maps `1.29.11` et SVG `15.15.5` restent différés. Aucune preuve appareil réel n'est déduite de la CI. |
| [#137](https://github.com/maxd4/CleanmyMap/pull/137) | Migration Sentry Next.js 10 → candidate `11.5.0` | `INTEGRATED` pour la candidate `11.5.0` | [`1287928`](https://github.com/maxd4/CleanmyMap/commit/1287928) | Au moment de ce snapshot, CI et CodeQL étaient `IN_PROGRESS` ([CI](https://github.com/maxd4/CleanmyMap/actions/runs/38482177399), [CodeQL](https://github.com/maxd4/CleanmyMap/actions/runs/38482177235)) | La PR propose `11.6.0` et reste ouverte. Aucun événement Sentry, upload authentifié de sourcemaps ou déploiement Vercel Production n'a été exécuté ; la suite Web locale avait `5535 PASS / 1 FAIL`, l'échec SPOGOMI étant préexistant. |

## Détail des décisions

### PR #134 — Clerk et Upstash

Le lot a aligné les versions demandées dans les manifests concernés et le
lockfile, sans modifier les contrats d'identité, les permissions IMU,
Administrateur ou Bénévole, les JWT mobiles, les synchronisations Clerk →
Supabase ni les guards owner-scoped. Le commit publié est isolé et la PR
source n'est pas utilisée comme preuve de production.

### PR #135 — Supabase JS

`@supabase/supabase-js` `2.117.3` a été aligné dans la racine, `apps/web` et
`apps/mobile`. React, React Native, les overrides associés, les migrations,
les RPC métier, les RLS et l'idempotence GPS ont été conservés. Le bilan ne
qualifie pas une preuve SQL réelle lorsque seule une validation applicative ou
un mock est disponible.

### PR #142 — Expo SDK 57

Le contrat mobile reste Expo SDK 57, React Native `0.86.3` et React `19.2.3`.
Seule la mise à jour Clerk Expo compatible a été publiée. La montée native
React Native et les versions Maps/SVG proposées n'ont pas été forcées par des
peer dependencies ou un contournement de build.

### PR #137 — Sentry

La candidate publiée est explicitement `@sentry/nextjs` `11.5.0`, tandis que le
titre de la PR distante propose `11.6.0`. Le lot a adapté l'uploader de
sourcemaps à la CLI `sentry`, ajouté une politique `dataCollection` restrictive
côté serveur et client, ajouté un test de non-régression et mis à jour la
documentation RGPD/opérationnelle. Le build local vérifie le chemin fail-safe
sans credentials ; il ne prouve pas l'arrivée d'un événement dans Sentry.

## Procédure pour les prochains prompts PR

1. Lire l'état distant de la PR, son titre, sa branche, sa base et le diff ;
   conserver la différence entre la proposition distante et la candidate
   autorisée par le prompt.
2. Capturer le SHA de départ, l'état du worktree et les règles scoped
   applicables.
3. Relier chaque changement à un contrat et à un consommateur réel ; consigner
   les incompatibilités, reports et preuves manquantes.
4. Exécuter les validations proportionnées avec un statut explicite :
   `PASS`, `FAIL`, `BLOCKED` ou `NOT_RUN`.
5. Avant publication, vérifier le diff staged, l'ascendance non publiée et la
   branche distante ; après publication, vérifier `HEAD == origin/main`.
6. Archiver le bilan dans ce dossier ou dans un snapshot daté lié au SHA. Ne
   jamais versionner un secret, une valeur d'environnement, un identifiant de
   compte Production ou une donnée personnelle.

La fermeture de la PR, le merge, le déploiement, la migration distante et la
preuve d'un fournisseur externe restent des opérations distinctes qui doivent
être rapportées séparément et ne sont jamais implicites dans `INTEGRATED`.
