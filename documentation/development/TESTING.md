# Testing Guide

Guide canonique de validation du dépôt CleanMyMap.

## Principe

Une commande ne doit jamais être présentée comme « globale » si elle ne couvre qu'une partie du dépôt.

Le projet distingue :

- validation ciblée ;
- validation complète ;
- tests spécialisés ;
- E2E explicites.

## Installation

```bash
npm install
```

Pour l'application mobile :

```bash
npm install -w apps/mobile
```

Pour les tests E2E Playwright :

```bash
npx playwright install chromium
```

Sous Windows, démarrer Docker Desktop avec l'exécutable installé à cet emplacement :

```text
C:\Users\sophi\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe
```

## Validation ciblée

Commande recommandée pendant une correction :

```bash
npm run checks:changed
```

Elle inspecte les changements locaux et exécute les contrôles pertinents pour le scope détecté.

## Validation complète

```bash
npm run checks
```

Équivalent explicite :

```bash
powershell -ExecutionPolicy Bypass -File scripts/ci/run_checks2.ps1 -Scope full
```

La lane maintenance reste disponible à part :

```bash
npm run checks:maintenance
```

Ou directement :

```bash
powershell -ExecutionPolicy Bypass -File scripts/ci/run_checks.ps1 -Scope full
```

La validation complète couvre notamment :

- audit de secrets ;
- hygiène de la racine ;
- gouvernance documentaire ;
- dérive de versions documentées ;
- synchronisation des skills miroir ;
- contrôles documentaires ;
- typecheck web ;
- lint web ;
- Vitest ;
- tests de sécurité ;
- tests de régression ;
- audit Vercel CI ;
- build de production ;
- typecheck de l'application mobile ;
- tests Node déterministes des scripts de maintenance ;
- maintenance Python lorsque l'environnement la permet.

Les E2E ne sont pas lancés automatiquement par défaut.

## Commandes ciblées

```bash
npm run security:secrets
npm run check:root-files
npm run check:doc-governance
npm run check:stack-doc-drift
npm run check:agent-skills

npm run typecheck
npm run lint
npm run test:scripts
npm run test
npm run test:security
npm run test:regression-gates
npm run build

npm run typecheck -w apps/mobile
```

## Regression gates

La commande canonique est :

```bash
npm run test:regression-gates
```

La composition exacte de cette suite est définie par le code courant dans :

```text
scripts/checks/validation-policy.mjs
```

Ne pas maintenir dans la documentation une deuxième liste de fichiers de test.

Cette suite protège notamment les contrats à fort risque autour :

- du contrat unifié des actions ;
- de la cohérence registry/navigation ;
- des invariants Vercel explicitement couverts ;
- des routes protégées et du proxy.

Lorsqu'un chantier migre un contrat déjà protégé par ces gates :

1. ajouter ou adapter le garde-fou ;
2. préférer un changement additif et compatible lorsque la migration l'exige ;
3. migrer les consommateurs par périmètre cohérent ;
4. supprimer l'ancien chemin uniquement après validation du contrat cible.

Une baseline, une fixture ou un test de garde ne doit pas être modifié uniquement
pour faire disparaître un échec. Vérifier d'abord si le changement fonctionnel
attendu justifie réellement l'évolution de la preuve.

## E2E

Lister les tests :

```bash
npm run test:e2e:list
```

Exécuter :

```bash
npm run test:e2e
```

Ou via le script PowerShell :

```bash
powershell -ExecutionPolicy Bypass -File scripts/ci/run_checks2.ps1 -Scope full -IncludeE2E
```

Le premier périmètre E2E doit rester limité aux parcours à fort risque :

- pages publiques essentielles ;
- health endpoints ;
- frontière admin ;
- absence d'indexation des surfaces privées ;
- parcours authentifiés critiques quand un `storageState` sécurisé est disponible.

## TypeScript

Commande standard :

```bash
npm run typecheck
```

Diagnostic détaillé :

```bash
npx tsc --noEmit --pretty false
```

Pour exclure un résultat issu du cache TypeScript web :

```bash
npx tsc --noEmit --pretty false --skipLibCheck --incremental false
```

Sortie complète :

```bash
npx tsc --noEmit --pretty false --noErrorTruncation > typescript-errors.txt
```

Méthode :

1. lire la sortie ;
2. grouper les erreurs par cause ;
3. corriger le blocage commun ;
4. relancer le typecheck ;
5. ne pas remplacer mécaniquement `any` par `unknown` sans narrowing.

## Build

Ordre recommandé :

1. lire l'erreur complète ;
2. classer : TypeScript, import, route, Next.js, Vercel, env, Supabase, bundler ;
3. lancer typecheck, lint et tests ciblés ;
4. corriger un lot cohérent ;
5. lancer un seul build complet.

Commandes :

```bash
npm run typecheck
npm run test:regression-gates
npm run build
npm run audit:vercel-quota
```

Si le build semble utiliser un cache incohérent :

```bash
npm run build:clean -w apps/web
```

Ne jamais fabriquer manuellement un fichier interne `.next`.

## Application mobile

Minimum obligatoire :

```bash
npm run typecheck -w apps/mobile
```

Les contrats Clerk, RLS et la finalisation des métriques par trigger invoker
sont finalisés puis gelés. Avant toute reprise fonctionnelle ou validation de production mobile,
ajouter des tests ciblés couvrant :

- restauration d'une mission active ;
- buffer offline ;
- refus des permissions GPS ;
- finalisation d'une mission ;
- erreurs Supabase ;
- propriété d'une mission ;
- cohérence d'identité ;
- calcul de distance.

## QA UI

Pour une page visible modifiée, seulement lorsque demandé :

1. lancer localement ;
2. capturer le rendu desktop ;
3. exporter `.MD this page` ;
4. comparer visuel et sémantique ;
5. vérifier CTA, titres, statistiques, sources, états et accessibilité.

Référence : la section `Vérification UI` de `documentation/pages_site/README.md`.

```text
documentation/pages_site/README.md
```

## Smoke de production

Après déploiement significatif :

```text
/sign-in
/dashboard
/admin
/actions/new
/actions/map
/reports
/api/health
/api/uptime
```

Vérifier :

- auth ;
- admin ;
- pages métier ;
- export si concerné ;
- `criticalStatus: "ok"` sur `/api/uptime`.

## Clerk local

Pour revue UX sans tester Clerk lui-même :

- utiliser le bypass de développement uniquement en `NODE_ENV=development` ;
- ou utiliser `/preview/actions/new`.

Pour tester une vraie route protégée avec Playwright :

- préférer un `storageState` issu d'une connexion réelle ;
- ne jamais committer session, token ou secret.

## Critères de réussite

Une validation est réussie seulement si :

- toutes les commandes réellement exécutées passent ;
- aucune erreur critique n'est masquée ;
- les contrôles non exécutés sont explicitement signalés ;
- le niveau de validation correspond au niveau de risque du changement.
