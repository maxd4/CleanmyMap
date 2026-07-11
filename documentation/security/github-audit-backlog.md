# Backlog d'audit GitHub

**Date de référence :** 2026-06-17

Ce document archive les éléments encore à corriger après les ajustements GitHub à faible risque déjà appliqués.
Il sert de backlog de reprise pour les alertes GitHub restantes après les corrections locales déjà appliquées.

## Résumé

- Dependabot : 0 alerte ouverte après la remédiation locale et la régénération du lockfile.
- Code Scanning : les alertes ciblant `js/trivial-conditional`, `js/file-system-race`, `js/http-to-file-access` et `js/insecure-temporary-file` ont été traitées localement dans cette reprise.
- Secret scanning : 0 alerte ouverte.
- Workflows GitHub Actions : pas de correctif à faible risque restant identifié après revue des fichiers `.github/workflows/ci.yml` et `.github/workflows/codeql.yml`.

## Exécuté dans cette passe

- `Dependabot` : mise à jour des dépendances directes et du lockfile, puis validation `npm audit` à `0`.
- `js/trivial-conditional` dans `apps/web/src/components/sections/rubriques/gamification/personal-progress.tsx` : garde JSX simplifié.
- `js/file-system-race` dans `scripts/split-bibliography.mjs` : écritures rendues atomiques via fichier temporaire.
- `js/http-to-file-access` dans `scripts/export-clerk-users.mjs` : valeurs `--out` de type URL rejetées, chemin local normalisé.
- `js/insecure-temporary-file` dans `apps/web/scripts/upload-sentry-sourcemaps.mjs` : répertoire temporaire créé avec `mkdtempSync`.

## Dependabot

Aucune alerte locale restante après la mise à jour du graphe de dépendances. Garder une vérification GitHub en différé si le compteur affiché dans l'interface n'est pas encore rafraîchi.

## Code Scanning à reprendre plus tard

Les entrées ci-dessous restent à revalider sur le prochain scan GitHub ou à traiter si elles réapparaissent dans le code courant.

| alerte ou famille | fichier source | direct ou transitive | env. | gravité | correction recommandée | risque de casse |
| --- | --- | --- | --- | --- | --- | --- |
| `js/unused-local-variable` | nombreux fichiers `apps/web/` et `scripts/` | direct | dev/prod | note | reprendre le nettoyage par lots car c'est la famille la plus volumineuse | nul à faible |
| `js/incomplete-sanitization` | `scripts/cleanup/run-inventory.js:187` | direct | dev | warning | compléter la sanitation avec un helper partagé et des bornes explicites | moyen |
| `js/file-access-to-http` | `apps/web/scripts/lib/sheet-ingestion-core.mjs:250` | direct | dev | warning | renforcer la validation avant toute lecture depuis une source HTTP | moyen |
| `js/unneeded-defensive-code` | `apps/web/src/components/admin/free-plan-services-visual.tsx:208` | direct | dev | note | simplifier le garde-fou devenu redondant après lecture des flux | nul |

## Notes de gouvernance GitHub

- `SECURITY.md` est déjà présent et doit rester la porte d'entrée pour le signalement responsable des vulnérabilités.
- `main` n'est pas protégé dans l'état actuel du dépôt; ce réglage se fait dans GitHub, pas dans le code.
- Les permissions de `ci.yml` et `codeql.yml` sont déjà à un niveau minimal pour les jobs concernés.
- Les deux workflows principaux utilisent déjà `concurrency` avec `cancel-in-progress: true`.

## Priorité de reprise

1. Nettoyer la famille `js/unused-local-variable`, car c'est la dette la plus volumineuse.
2. Revalider les alertes encore listées sur le prochain scan GitHub et retirer les faux positifs éventuels.
3. Reprendre ensuite les alertes de robustesse ou de sécurité des scripts.

## Ce qui peut attendre

- Les alertes `note` de Code Scanning peuvent être traitées en lot quand la file de dette technique est plus basse.
- Les points de gouvernance GitHub hors dépôt restent à appliquer manuellement dans l'interface GitHub.
- Les corrections de type "gros nettoyage" ne doivent pas être mélangées à une mise à jour de dépendance ou à une correction CI.
