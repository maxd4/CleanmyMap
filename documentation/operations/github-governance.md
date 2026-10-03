# Gouvernance GitHub du dépôt

Ce mémo résume les garde-fous GitHub à garder en place pour CleanMyMap.

## Runbook de maintenance GitHub — `CURRENT`

### Contrat durable

La maintenance suit `MAIN-ONLY / SINGLE-WRITER` : un seul checkout local
mutable sur `main`, un seul writer, des lots isolés et aucune publication
implicite. Les branches distantes attendues sont `main` uniquement.

- Les PR Dependabot de mise à jour de version ne sont pas souhaitées.
- `open-pull-requests-limit: 0` désactive les version updates mais ne doit pas
  masquer ni désactiver les security updates.
- Le ruleset de `main` interdit la suppression de la branche et les mises à
  jour `non_fast_forward` ; un push fast-forward direct reste permis.
- Une alerte CodeQL se corrige dans le code, puis doit être vérifiée par un run
  GitHub réussi sur le SHA publié exact.
- Secret Scanning et Push Protection sont des réglages distants à relire ; un
  check local ne constitue pas une simulation de leur état GitHub.

### Séquence minimale d'audit

Exécuter dans cet ordre, en limitant chaque lecture à la preuve utile :

```text
REMOTE_BASELINE
→ PR/branches
→ ruleset/protection
→ Dependabot
→ CodeQL
→ Secret Scanning
→ corrections locales nécessaires
→ validation finale
→ relecture distante
```

Lire l'état distant avant toute exploration large du checkout. Utiliser les
anciens commits uniquement pour établir une cause ou une régression. Pendant
l'itération, lancer les validations ciblées ; réserver le full/pre-push au
candidat final et ne le relancer qu'après une modification qui invalide sa
preuve. La fermeture d'une PR ou la suppression d'une branche est une mutation
distante et nécessite l'autorisation explicite de l'utilisateur.

### STOP CONDITION

Arrêter le chantier dès que les invariants demandés sont prouvés. Ne pas
poursuivre vers des upgrades, refactors ou nettoyages sans rapport avec ces
invariants.

## Éléments à conserver

- `SECURITY.md` à la racine du dépôt.
- Template de PR avec description, fichiers touchés et vérifications.
- Templates d'issues pour bug, UI, sécurité, dette technique, `refactor`, `supabase`, `vercel` et `quota`.
- Labels de tri: `security`, `quota`, `ui`, `supabase`, `vercel`, `docs`, `refactor`.
- Milestones pour les grandes étapes de travail.

## Protection de `main`

Le dépôt conserve un workflow `MAIN-ONLY / SINGLE-WRITER` : les pushes
fast-forward directs sur `main` restent autorisés pour l'intégrateur légitime.
Le ruleset GitHub actif ciblant uniquement `refs/heads/main` interdit :

- la suppression de `main` ;
- les mises à jour non fast-forward et les force-push.

Le ruleset n'impose ni Pull Request, ni approbation, ni required status check,
ni merge queue. Les contrôles CI et CodeQL restent disponibles pour les runs
GitHub et les revues, sans bloquer le push direct par une règle de branche.

Checks conservés pour la revue manuelle GitHub :

- `scope`
- `web-governance`
- `web-static`
- `web-quality`
- `web-tests`
- `web-coverage`
- `web-vercel-audit` et `web-build` lorsque `build_relevant == 'true'`
- `mobile-validation` lorsque le scope mobile est concerné
- `CodeQL`
- `Vercel`

## Sécurité du dépôt public

Les réglages GitHub attendus et conservés sont :

- Secret Scanning activé ;
- Push Protection activée ;
- mises à jour de sécurité Dependabot activées ;
- workflow CodeQL versionné conservé ; le `default setup` CodeQL reste distinct
  de ce workflow et n'est pas configuré par ce lot.

Les secrets restent uniquement dans les stores GitHub Actions, Vercel, Clerk et
Supabase. Cette documentation ne contient aucune valeur secrète.

## CI et maintenance

- Garder `permissions: {}` au niveau workflow, puis ouvrir uniquement ce qui est nécessaire au niveau job.
- Éviter les runs concurrents avec `concurrency` et `cancel-in-progress: true`.
- Garder un cache npm explicite sur `package-lock.json`.
- Grouper les mises à jour Dependabot, y compris les security updates, pour limiter le bruit.

## Reproductibilité locale des workflows

Audit réalisé le `2026-08-23` sur les workflows versionnés [`ci.yml`](../../.github/workflows/ci.yml) et [`codeql.yml`](../../.github/workflows/codeql.yml).

Le workflow GitHub est une orchestration : les commandes npm sont principalement
reproductibles localement, tandis que le runner GitHub, les conditions calculées
à partir de l'événement et l'analyse CodeQL ne le sont pas à l'identique.

| Workflow / job | Commandes locales correspondantes | Prérequis et limites | Reproductible localement |
| --- | --- | --- | --- |
| `ci.yml` / `scope` | Détecte `docs_only`, `web_code_relevant` et `mobile_code_relevant` à partir d'une paire `base/head` | Node.js non requis; permissions `contents: read`. Le job est indépendant des validations applicatives. | Oui pour le calcul; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `web-governance` | `npm run security:secrets`; `npm run check:root-files`; `npm run check:doc-governance`; `npm run check:stack-doc-drift`; `npm run check:github-actions` | Node.js 24.x lu depuis `apps/web/.nvmrc` et `package-lock.json`. Le job couvre aussi les changements documentaires. | Oui pour les commandes; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `web-static` | `npm run check:semgrep`; `npm run check:lockfile-policy`; `npm run typecheck`; `npm run check:utf8-fr`; `npm run lint` | Job indépendant après `scope`, avec son propre checkout, Node et `npm ci`. | Oui pour les commandes; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `web-quality` | `npm run quality:top-heavy`; `npm run quality:dead-code`; `npm run quality:complexity`; `npm run quality:duplication`; installation puis `npm run audit:gitnexus`; `npm run quality:cycles` | Job indépendant après `scope`; après checkout, setup Node et `npm ci` réussis, `Duplication ratchet` est conditionné par `!cancelled()` et poursuit son exécution même si un ratchet qualité précédent échoue. Son `FAIL` reste bloquant ; GitNexus partage son index/statut candidat avec le ratchet. | Oui pour les commandes; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `web-tests` | `node scripts/checks/validation-policy.mjs --assert-full-suite`; `npm run test:coverage`; publication de `apps/web/coverage` | La suite Web couverte produit aussi la preuve de couverture ; l'artefact est court terme et lié à `github.sha`. | Oui pour les commandes; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `web-coverage` | téléchargement de l'artefact Web; `npm run quality:coverage -- --from-existing-summary` | Le job vérifie uniquement le ratchet sur l'artefact correspondant ; il ne relance pas Vitest. | Oui pour les commandes; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `web-vercel-audit` | `npm run audit:vercel:ci` lorsque `build_relevant == 'true'` | Job indépendant après `scope`; il est `SKIPPED_SCOPE` sinon. | Oui pour la commande; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `web-build` | `npm run build` lorsque `build_relevant == 'true'` | Job indépendant après `scope`; les variables publiques de build sont injectées uniquement dans ce job. | Oui pour la commande; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `mobile-validation` | `npm ci`; `node --test apps/mobile/security/*.test.mjs`; `npm run typecheck -w apps/mobile` | Node.js 24.x lu depuis `apps/web/.nvmrc`, `package-lock.json`. Le job est déclenché par le scope mobile et ne dépend d'aucun gate Web. | Oui. |
| `codeql.yml` / `analyze` | Aucun script npm équivalent direct : `actions/checkout`, `github/codeql-action/init`, `autobuild` et `analyze` | Runner GitHub, bundle CodeQL et permission `security-events: write` pour publier les résultats. | Non à l'identique; ce contrôle reste GitHub-dépendant. |

Les modes locaux `FAST`/`FULL` restent orchestrés séquentiellement. La CI
distante utilise au contraire ces gates Web en parallèle après `scope`, afin
qu'un échec de qualité ne supprime pas les preuves statiques, de tests,
couverture, audit Vercel ou build qui restent techniquement exécutables.

### Séquence locale recommandée

Pour un changement applicatif, cette séquence couvre les contrôles des gates
Web et, si nécessaire, de `mobile-validation` :

```bash
npm ci
node scripts/checks/check-node-version-contract.mjs
npm run security:secrets
npm run check:root-files
npm run check:doc-governance
npm run check:stack-doc-drift
npm run check:github-actions
npm run check:lockfile-policy
npm run typecheck
npm run check:utf8-fr
npm run quality:top-heavy
npm run lint
npm run test
npm run test:regression-gates
npm run audit:vercel:ci
npm run test:security
```

La compilation de production nécessite les trois variables utilisées par CI :

```bash
NEXT_PUBLIC_SUPABASE_URL="<valeur locale>" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="<valeur locale>" \
CONTACT_EMAIL="<valeur locale>" \
npm run build
```

Le contrôle local des workflows lui-même est :

```bash
npm run check:github-actions
```

Résultat observé pendant l'audit : `OK: 2 workflow file(s) audited.`

Cette procédure ne remplace pas l'exécution GitHub de CodeQL, la publication des
résultats de sécurité ou la vérification des conditions propres à l'événement
`push` / `pull_request`.

## Point de vigilance

Les réglages de protection de branche, les labels et les milestones vivent dans
GitHub, pas dans le dépôt. Le contrat distant doit être relu dans GitHub ou via
l'API avant de conclure qu'il est toujours présent ; les checks locaux ne
simulent pas cette lecture distante.
