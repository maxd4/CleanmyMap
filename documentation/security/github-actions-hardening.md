# Durcissement GitHub Actions

Ce document distingue les protections versionnées des paramètres de dépôt
GitHub lus à distance. Il décrit le contrat courant sans exposer de secret.

## Protections versionnées

- `ci.yml` et `codeql.yml` ne se déclenchent que pour `main` et les pull requests
  ciblant `main`.
- Le workflow CodeQL versionné analyse `javascript-typescript`, le Python de
  maintenance (les fichiers suivis sous `maintenance/python`) et les workflows
  et métadonnées GitHub Actions (`actions`), avec les suites
  `security-extended,security-and-quality`. L’autobuild reste limité à la lane
  JavaScript/TypeScript ; Python et Actions sont analysés sans étape de build.
- CodeQL conserve son périmètre de fichiers suivis par les extracteurs ; aucune
  inclusion volontaire de caches, artefacts générés ou dépendances vendorisées
  n’est ajoutée.
- Les références `uses:` sont contrôlées par `npm run check:github-actions` et
  doivent être épinglées sur un commit SHA complet.
- Chaque workflow doit déclarer explicitement des permissions top-level,
  normalement `permissions: {}`, puis accorder uniquement les droits
  nécessaires au niveau du job. `pull_request_target` et les permissions
  globales `read-all`/`write-all` sont refusés par le contrôle local.
- Les valeurs de SHA utilisées par le script de détection de périmètre CI passent
  par des variables d'environnement plutôt que par interpolation directe dans le
  shell.
- Les jobs gardent des permissions minimales et la concurrence annule les runs
  obsolètes.
- La lane E2E persistante utilise Clerk Development réel et une instance
  Supabase éphémère; aucun credential de Production n'est injecté.
- Les artefacts Playwright authentifiés bruts ne sont jamais publiés. La lane
  construit `artifacts/ci-public-evidence/` à partir d'une allowlist, exécute
  `scripts/checks/check-public-e2e-artifact.mjs`, puis téléverse uniquement ce
  staging validé. Les `storageState`, cookies, sessions, traces, HAR, vidéos,
  dumps réseau, headers, logs sensibles et tokens sont exclus même lorsque les
  E2E ou leur teardown échouent.
- Le build CI reçoit uniquement les variables publiques de build
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `CONTACT_EMAIL`;
  aucune `service_role` n’est injectée.

## Paramètres GitHub observés

Lecture GitHub effectuée le 16/09/2026 :

- Actions activées ;
- actions autorisées : `all` ;
- obligation de SHA côté dépôt : désactivée ;
- secret scanning et push protection activés ;
- mises à jour de sécurité Dependabot activées ;
- workflow CodeQL versionné conservé ; le `default setup` CodeQL est distinct
  et reste `not-configured` ;
- ruleset actif `Protect main history` ciblant uniquement `refs/heads/main` ;
- suppression de `main` interdite ;
- force-push et mises à jour non fast-forward interdits ;
- push fast-forward direct autorisé ; aucune Pull Request, approbation ou
  required status check n'est imposée par ce ruleset.

Ces réglages vivent dans GitHub et doivent être relus via l'API avant toute
conclusion sur leur état. Les checks locaux ne prétendent pas vérifier le
ruleset distant. Toute évolution doit préserver la publication directe
fast-forward sur `main`.

## Dépendances

L’override du workspace mobile pour `tar` est passé de `7.5.16` à `7.5.22`, ce qui
supprime localement l’alerte critique `tar`. Le reste de l’audit npm implique
notamment des mises à niveau majeures d’Expo/React Native et doit faire l’objet
d’un lot séparé avec validation mobile.

## Validation locale

```bash
npm run check:github-actions
npm run check:public-e2e-artifact
npm run check:devcontainer
npm run security:secrets
npm run test:security
npm run typecheck -w apps/mobile
```

Les alertes CodeQL ouvertes doivent être revalidées par une future analyse
autorisée. Aucun run GitHub n’est déclenché par ce document.
