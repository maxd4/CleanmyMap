# Gouvernance GitHub du dépôt

Ce mémo résume les garde-fous GitHub à garder en place pour CleanMyMap.

## Éléments à conserver

- `SECURITY.md` à la racine du dépôt.
- Template de PR avec description, fichiers touchés et vérifications.
- Templates d'issues pour bug, UI, sécurité, dette technique, `refactor`, `supabase`, `vercel` et `quota`.
- Labels de tri: `security`, `quota`, `ui`, `supabase`, `vercel`, `docs`, `refactor`.
- Milestones pour les grandes étapes de travail.

## Protection de `main`

La branche `main` doit refuser les merges quand les checks requis échouent.

Checks attendus pour la revue manuelle GitHub:

- `scope`
- `web-checks`
- `mobile-validation` lorsque le scope mobile est concerné
- `CodeQL`
- `Vercel`

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
| `ci.yml` / `web-checks` | `npm run security:secrets`; `npm run check:root-files`; `npm run check:doc-governance`; `npm run check:stack-doc-drift`; `npm run check:github-actions`; puis, pour un lot non documentaire, `npm ci`, `npm run check:lockfile-policy`, `npm run typecheck`, `npm run check:utf8-fr`, `npm run quality:top-heavy`, `npm run lint`, la politique de tests, Vitest, l'audit Vercel et le build | Node.js 24.x lu depuis `apps/web/.nvmrc`, npm et un historique Git permettant de comparer deux SHA. Le build attend `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `CONTACT_EMAIL`; ne jamais mettre ces valeurs dans la documentation ou le dépôt. | Oui pour les commandes; non pour l'orchestration exacte GitHub. |
| `ci.yml` / `mobile-validation` | `npm ci`; `node --test apps/mobile/security/*.test.mjs`; `npm run typecheck -w apps/mobile` | Node.js 24.x lu depuis `apps/web/.nvmrc`, `package-lock.json`. Le job est déclenché par le scope mobile et ne dépend pas de `web-checks`. | Oui. |
| `codeql.yml` / `analyze` | Aucun script npm équivalent direct : `actions/checkout`, `github/codeql-action/init`, `autobuild` et `analyze` | Runner GitHub, bundle CodeQL et permission `security-events: write` pour publier les résultats. | Non à l'identique; ce contrôle reste GitHub-dépendant. |

### Séquence locale recommandée

Pour un changement applicatif, cette séquence couvre les contrôles de
`web-checks` et, si nécessaire, de `mobile-validation` :

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

Les réglages de protection de branche, les labels et les milestones vivent dans GitHub, pas dans le dépôt. Si un de ces éléments disparaît côté repo, il faut le remettre à la main dans les réglages GitHub ou via l'API.
