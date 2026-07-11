# Backlog d'audit GitHub

**Date de référence :** 2026-06-17

Ce document archive les éléments encore à corriger après les ajustements GitHub à faible risque déjà appliqués.
Il sert de backlog de reprise pour les alertes Dependabot, les alertes Code Scanning et les points de gouvernance GitHub qui restent à traiter manuellement.

## Résumé

- Dependabot : 3 alertes ouvertes au moment de l'audit.
- Code Scanning : 127 alertes ouvertes au moment de l'audit, majoritairement des alertes de qualité ou de robustesse JavaScript/TypeScript.
- Secret scanning : 0 alerte ouverte.
- Workflows GitHub Actions : pas de correctif à faible risque restant identifié après revue des fichiers `.github/workflows/ci.yml` et `.github/workflows/codeql.yml`.

## Déjà traités depuis la reprise

- `Dependabot` sur `dompurify` et `vite` : le lockfile courant est déjà au-dessus des versions corrigées listées dans l'audit (`dompurify 3.4.11`, `vite 8.1.3`).
- `js/misleading-indentation-after-control-statement` dans `apps/web/src/components/actions/map/actions-map-geometry.utils.ts` : indentation du retour de branche vide corrigée sans changement de comportement.
- `js/insecure-randomness` dans `apps/web/src/lib/metrics.ts` : génération d'identifiant de session basculée sur Web Crypto, sans fallback prévisible.

## Dependabot à reprendre plus tard

| alerte | fichier source | dépendance | env. | gravité | version actuelle | version corrigée | correction recommandée | risque de casse |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dompurify` | `package-lock.json` | transitive via `posthog-js@1.373.4` | prod | low | `3.4.0` override | `3.4.8` | aligner la chaîne de dépendances ou mettre à jour le lockfile pour supprimer l'override vulnérable | faible |
| `vite` | `package-lock.json` | transitive via `vitest@4.1.5` | dev | high | `8.0.10` | `8.0.16` | mettre à jour la chaîne `vitest`/`vite` et régénérer le lockfile ensemble | faible à moyen |
| `vite` | `package-lock.json` | transitive via `vitest@4.1.5` | dev | medium | `8.0.10` | `8.0.16` | traiter en même temps que l'alerte `high` pour éviter deux PR séparées | faible à moyen |

## Code Scanning à reprendre plus tard

| alerte ou famille | fichier source | direct ou transitive | env. | gravité | version actuelle | version corrigée | correction recommandée | risque de casse |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `js/unused-local-variable` | `apps/web/src/lib/gamification/badges/listing.ts:130` | direct | dev | note | n/a | n/a | supprimer les variables et fonctions mortes, puis relancer le scan | nul |
| `js/unused-local-variable` | nombreux fichiers `apps/web/` et `scripts/` | direct | dev/prod | note | n/a | n/a | reprendre le nettoyage par lots car c'est la famille la plus volumineuse | nul à faible |
| `js/trivial-conditional` | `apps/web/src/components/sections/rubriques/gamification/personal-progress.tsx:174` | direct | dev | warning | n/a | n/a | simplifier la condition et vérifier qu'aucun cas métier n'est perdu | faible |
| `js/file-system-race` | `scripts/split-bibliography.mjs:127` | direct | dev | warning | n/a | n/a | rendre l'écriture de fichier atomique et relire l'état avant écriture | faible à moyen |
| `js/http-to-file-access` | `scripts/export-clerk-users.mjs:247` | direct | dev | warning | n/a | n/a | valider strictement l'entrée avant d'écrire sur disque | moyen |
| `js/useless-assignment-to-local` | `apps/web/src/lib/gamification/engagement.events.ts:114` | direct | dev | warning | n/a | n/a | supprimer l'affectation inutile et vérifier les tests associés | nul |
| `js/incomplete-sanitization` | `scripts/cleanup/run-inventory.js:187` | direct | dev | warning | n/a | n/a | compléter la sanitation avec un helper partagé et des bornes explicites | moyen |
| `js/file-access-to-http` | `apps/web/scripts/lib/sheet-ingestion-core.mjs:250` | direct | dev | warning | n/a | n/a | renforcer la validation avant toute lecture depuis une source HTTP | moyen |
| `js/insecure-temporary-file` | `apps/web/scripts/upload-sentry-sourcemaps.mjs:192` | direct | dev | warning | n/a | n/a | utiliser un dossier temporaire sûr et des noms non prévisibles | faible |
| `js/unneeded-defensive-code` | `apps/web/src/components/admin/free-plan-services-visual.tsx:208` | direct | dev | note | n/a | n/a | simplifier le garde-fou devenu redondant après lecture des flux | nul |

## Notes de gouvernance GitHub

- `SECURITY.md` est déjà présent et doit rester la porte d'entrée pour le signalement responsable des vulnérabilités.
- `main` n'est pas protégé dans l'état actuel du dépôt; ce réglage se fait dans GitHub, pas dans le code.
- Les permissions de `ci.yml` et `codeql.yml` sont déjà à un niveau minimal pour les jobs concernés.
- Les deux workflows principaux utilisent déjà `concurrency` avec `cancel-in-progress: true`.

## Priorité de reprise

1. Corriger les alertes `vite` de Dependabot, car elles touchent le chemin de test courant.
2. Retirer l'override `dompurify` dès qu'une mise à jour sûre de la chaîne de dépendances est possible.
3. Nettoyer les familles Code Scanning les plus volumineuses, en commençant par les variables locales inutilisées.
4. Reprendre ensuite les alertes de robustesse ou de sécurité des scripts.

## Ce qui peut attendre

- Les alertes `note` de Code Scanning peuvent être traitées en lot quand la file de dette technique est plus basse.
- Les points de gouvernance GitHub hors dépôt restent à appliquer manuellement dans l'interface GitHub.
- Les corrections de type "gros nettoyage" ne doivent pas être mélangées à une mise à jour de dépendance ou à une correction CI.
