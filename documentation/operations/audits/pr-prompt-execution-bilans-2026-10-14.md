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

## Hygiène des PR Dependabot — snapshot distant en lecture seule

Vérification effectuée le 14 octobre 2026 sur le dépôt distant
`maxd4/CleanmyMap`. `HEAD` local et `origin/main` sont tous deux
`7dd860bbcb9cf9c247eb318603699c076c0c04dd` (`ahead=0`, `behind=0`). Les
manifests et le lockfile cités sont ceux de ce commit. Les SHA `head` ci-dessous
sont les SHA actuellement observés pour les PR ; ils ne constituent pas une
autorisation de merge, de fermeture ou de suppression.

| PR | versions demandées | versions sur main | état | CI pertinente | décision proposée | justification |
| --- | --- | --- | --- | --- | --- | --- |
| [#133](https://github.com/maxd4/CleanmyMap/pull/133) | GitHub Actions : `setup-node` `949feb…`, `upload-artifact` `cf430…`, `setup-python` `5fda…`, `download-artifact` `900082…`, CodeQL `24c541…` | Les mêmes références sont présentes dans les workflows versionnés | `FULLY_INTEGRATED` — PR `CLOSED` | `13 SUCCESS`, `1 NEUTRAL`, `5 SKIPPED`, aucune failure ; `head=ca76400d2104b0b85672a7740adf8972cb51e4ea` | `CLOSE` (déjà fermée) | Toutes les références proposées sont déjà dans `main`; aucune action GitHub n'est requise. |
| [#134](https://github.com/maxd4/CleanmyMap/pull/134) | Clerk `backend 3.23.2`, `localizations 4.23.0`, `nextjs 7.9.14`; Upstash `ratelimit 2.2.0`, `redis 1.39.0`; groupe web également `lucide-react 1.55.0`, `posthog-js 1.438.7`, `posthog-node 5.55.1`, `resend 6.32.1`, `tailwind-merge 3.7.0`, `zod 4.6.5` | Clerk/Upstash et `next 16.4.0` sont intégrés; `lucide-react` reste déclaré `^1.33.0` (lock `1.45.0`), et les autres versions du groupe web restent aux déclarations précédentes | `PARTIALLY_INTEGRATED` — PR `CLOSED` | `13 SUCCESS`, `1 NEUTRAL`, `3 SKIPPED`, failures `Persistent E2E on ephemeral Supabase` et `web-governance` ; `head=5aa8d3a6dc6c5c0cb4ac69fbad53c41f2a33f74e` | `CLOSE` (déjà fermée) | Le lot compatible Clerk/Upstash a été publié séparément (`87415b54`); le reste n'a pas été validé ni intégré par ce lot et ne doit pas être réintroduit implicitement. |
| [#135](https://github.com/maxd4/CleanmyMap/pull/135) | `@supabase/supabase-js 2.117.3` dans les trois workspaces; React/React DOM `19.3.0`; mobile `@types/react ~19.3.0` | Supabase JS `2.117.3` partout; React et React DOM restent `19.2.3`, mobile `@types/react ~19.2.18` | `PARTIALLY_INTEGRATED` — PR `CLOSED` | `8 SUCCESS`, `1 NEUTRAL`, `3 SKIPPED`, failures `Persistent E2E on ephemeral Supabase`, `dependency-audit`, `web-governance`, `web-static`, `web-tests`, `web-vercel-audit`, `web-build`, `mobile-validation` ; `head=4e8252da340ceb4570cf9411d6e28ae7024a6d3e` | `CLOSE` (déjà fermée) | Supabase a été publié par `3200ae42`; React `19.3.0` reste explicitement différé pour préserver les contrats Web/mobile et les overrides `19.2.3`. |
| [#137](https://github.com/maxd4/CleanmyMap/pull/137) | `@sentry/nextjs 11.6.0` | `@sentry/nextjs 11.5.0` | `STILL_RELEVANT` — PR `CLOSED` | `14 SUCCESS`, `1 NEUTRAL`, `3 SKIPPED`, failure `Persistent E2E on ephemeral Supabase` ; `head=2b8b430f10e66009714235b9c5ef6451397fef55` | `REVIEW_LATER` | La migration `10 → 11.5.0` a été validée et publiée par `1287928a`, mais la cible réelle de cette PR est `11.6.0`, qui n'est pas sur `main`; ne pas rouvrir automatiquement. |
| [#138](https://github.com/maxd4/CleanmyMap/pull/138) | `apps/web @types/node ^26` → `^26.6.4` | `apps/web @types/node ^26.6.4`; lock workspace `26.6.5` (le hoisting racine conserve `26.5.1`) | `FULLY_INTEGRATED` — PR `CLOSED` | `14 SUCCESS`, `1 NEUTRAL`, `3 SKIPPED`, failure `Persistent E2E on ephemeral Supabase` ; `head=6c54cef2908350699f9b65e805ee33c13cd511ba` | `CLOSE` (déjà fermée) | La déclaration cible et la résolution du workspace Web sont déjà présentes; la différence de hoisting racine ne contredit pas le contrat du workspace. |
| [#139](https://github.com/maxd4/CleanmyMap/pull/139) | optional `@rolldown/binding-linux-x64-gnu 1.2.13` | Manifest et lockfile racine `1.2.13` | `FULLY_INTEGRATED` — PR `OPEN` | `15 SUCCESS`, `1 NEUTRAL`, `3 SKIPPED`, failure `Persistent E2E on ephemeral Supabase` ; `head=1c01a4a20fba470a4dae75565d62a0e564e163cc` | `CLOSE` (candidat à fermeture, sans l'exécuter) | La cible exacte est déjà présente dans `main`; la fermeture doit être approuvée et effectuée séparément. |
| [#140](https://github.com/maxd4/CleanmyMap/pull/140) | `@clerk/testing 2.2.44`, `typescript-eslint 8.71.1`, `eslint-config-next 16.4.0`, `jscpd ^5.4.0`, `knip 6.40.0` | Clerk testing, TypeScript ESLint, ESLint Next et Knip sont intégrés; `jscpd` reste `5.3.0` | `PARTIALLY_INTEGRATED` — PR `CLOSED` | `11 SUCCESS`, `1 NEUTRAL`, `3 SKIPPED`, failures `Persistent E2E on ephemeral Supabase`, `web-governance`, `web-tests`, `mobile-validation` ; `head=715e646f0a75e480f655baef31fd801da876a1c2` | `CLOSE` (déjà fermée) | Le tooling compatible a été intégré par `a9865f33`; la montée `jscpd 5.4.0` n'est pas présente et n'est pas validée par ce bilan. |
| [#142](https://github.com/maxd4/CleanmyMap/pull/142) | `@clerk/expo 4.10.1`, React Native `0.87.1`, Maps `1.29.11`, SVG `15.15.5` | `@clerk/expo 4.10.0`, React Native `0.86.3`, Maps `1.27.2`, SVG `15.15.4` | `INCOMPATIBLE` — PR `OPEN` | `7 SUCCESS`, `1 NEUTRAL`, `3 SKIPPED`, failures `Persistent E2E on ephemeral Supabase`, `dependency-audit`, `web-governance`, `web-static`, `web-tests`, `web-vercel-audit`, `web-build`, `mobile-validation` ; `head=7a7dc68e5d62dd7664359c4d302314eea8af7915` | `REVIEW_LATER` | React Native `0.87.1` ne respecte pas le contrat Expo SDK 57 / React Native `0.86.3`; les versions natives ne doivent pas être forcées. La mise à jour Clerk `4.10.1` doit être réévaluée séparément dans un lot mobile compatible. |

### Bilan de classement et limites

- PR ouvertes pouvant être proposées à la fermeture : **1** (`#139`). La
  fermeture n'a pas été exécutée.
- PR ouvertes à conserver pour revue ultérieure : **1** (`#142`). Elle est
  bloquée par incompatibilité avec le socle Expo SDK 57 et ne doit pas être
  fusionnée ou contournée.
- Six PR sont déjà fermées (`#133`, `#134`, `#135`, `#137`, `#138`, `#140`) ;
  aucune fermeture distante supplémentaire n'était possible ou nécessaire.
- Aucune PR n'est classée `SUPERSEDED` au sens strict : lorsque la cible est
  sur `main`, elle est déjà intégrée à la même version, et non remplacée par
  une version supérieure.

Ce snapshot est strictement read-only côté GitHub : aucune PR, branche,
configuration Dependabot, alerte ou règle distante n'a été modifiée. Les
échecs CI communs à l'E2E Supabase ne sont pas convertis en preuve de
compatibilité ou d'incompatibilité applicative sans analyse propre au lot.

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

La candidate publiée est explicitement `@sentry/nextjs` `11.5.0`, tandis que la
PR distante proposait `11.6.0` et est désormais fermée. Le lot a adapté l'uploader de
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
