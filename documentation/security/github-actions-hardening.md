# Durcissement GitHub Actions

Snapshot local du 10/08/2026. Ce document distingue les protections versionnées
des paramètres de dépôt GitHub qui nécessitent une action manuelle.

## Protections versionnées

- `ci.yml` et `codeql.yml` ne se déclenchent que pour `main` et les pull requests
  ciblant `main`.
- Les références `uses:` sont contrôlées par `npm run check:github-actions` et
  doivent être épinglées sur un commit SHA complet.
- `pull_request_target` et les permissions globales `read-all`/`write-all` sont
  refusés par le contrôle local.
- Les valeurs de SHA utilisées par le script de détection de périmètre CI passent
  par des variables d'environnement plutôt que par interpolation directe dans le
  shell.
- Les jobs gardent des permissions minimales et la concurrence annule les runs
  obsolètes.
- Le build CI reçoit uniquement les variables publiques de build
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `CONTACT_EMAIL`;
  aucune `service_role` n’est injectée.

## Paramètres GitHub observés

Lecture effectuée sans mutation :

- Actions activées ;
- actions autorisées : `all` ;
- obligation de SHA côté dépôt : désactivée ;
- secret scanning et push protection activés ;
- branche `main` non protégée.

Ces réglages ne peuvent pas être corrigés par un fichier du dépôt. Leur évolution
doit tenir compte de la politique actuelle de publication directe sur `main`.

## Dépendances

L’override du workspace mobile pour `tar` est passé de `7.5.16` à `7.5.22`, ce qui
supprime localement l’alerte critique `tar`. Le reste de l’audit npm implique
notamment des mises à niveau majeures d’Expo/React Native et doit faire l’objet
d’un lot séparé avec validation mobile.

## Validation locale

```bash
npm run check:github-actions
npm run security:secrets
npm run test:security
npm run typecheck -w apps/mobile
```

Les alertes CodeQL ouvertes doivent être revalidées par une future analyse
autorisée. Aucun run GitHub n’est déclenché par ce document.
