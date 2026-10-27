---
name: cleanmymap-release-ci
description: "CI GitHub Actions, hooks, checks, candidats Git, Vercel et preuves de publication ou de déploiement CleanMyMap."
category: repository
risk: medium
source: local
tags: "[release, ci]"
---

# CI, validations et publication

## Déclenchement

Activer pour `.github/workflows`, hooks, `scripts/ci`, échec de check, candidat STAGED/PUSH_CANDIDATE, deployment Vercel, configuration de release ou preuve d'un commit.

## Sources

`AGENTS.md`, `scripts/AGENTS.md`, `.github/AGENTS.md`, `documentation/development/TESTING.md`, `documentation/operations/runbook-deploiement.md` et le workflow/script réellement concerné.

## Diagnostic

1. Identifier SHA, candidat, environnement, trigger, condition `if`, permissions, job et artefact. `skipped`, `not run`, `failed` et `passed` sont des états différents.
2. Séparer `WORKTREE_LIVE`, `STAGED`, `COMMITTED_SNAPSHOT`, `PUSH_CANDIDATE` et `DYNAMIC_CANDIDATE` ; une preuve locale ne prouve pas un autre candidat.
3. Remonter au garde-fou et au scénario réel avant de changer un seuil, une baseline, un timeout ou une exclusion. Ne jamais rendre vert en affaiblissant le contrôle.
4. Pour les intégrations externes, séparer Git publié, build terminé, déploiement actif et comportement de production observé.
5. Tester les changements de garde-fou avec cas qui doit réussir et cas qui doit échouer, selon la gouvernance scoped.

## Livraison

Appliquer le workflow Git documenté dans le checkout Codex, avec allowlist et préservation des autres writers ; le skill ne redéfinit pas la politique Git. Ne pas demander de publication hors périmètre. À clôture, citer preuves observées et blocages sans inventer un `PASS`.
