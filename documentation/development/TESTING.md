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

Les validations Supabase courantes utilisent `npx supabase` contre le projet
distant explicitement lié. Les advisors se lancent avec
`npm run backend:supabase:advisors` depuis `apps/web` ; cette commande est
linked-only. Une opération qui exige un runtime conteneurisé local est
`UNSUPPORTED_CONTAINER_RUNTIME` sur le poste utilisateur.

Un runner CI hébergé et éphémère peut toutefois utiliser ce runtime uniquement
dans une CI explicitement dédiée au replay Supabase.

Ne pas lancer `supabase start`, `supabase status` ou `supabase db reset` dans le
workflow local canonique ; ces commandes restent réservées à cette CI de replay
explicitement dédiée.

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

## Protocole manuel des formulaires Actions

Avant de tester les deux formulaires sur le terrain :

1. Verrouiller le scénario de test : une action terrain réelle ou quasi réelle,
   un flux d'action à créer ou modifier, un flux `Rejoindre une action` à
   ouvrir, rejoindre ou modérer, et un objectif de validation par flux.
2. Préparer les comptes : un admin, un créateur d'action, deux à trois
   bénévoles et un compte déjà rejoint pour tester les états déjà inscrits.
   Vérifier que les pseudos et profils sont propres, car ils apparaissent dans
   les journaux et files d'attente.
3. Vérifier les chemins critiques : création et édition admin d'une action,
   journal des modifications, publication/validation, ouverture/fermeture du
   flux de groupe, file d'attente, acceptation/refus, accès admin direct et
   reprise mobile.
4. Faire un test à blanc avec des données factices. Noter ce qui casse, ce qui
   est trop long et ce qui n'est pas compréhensible ; corriger les textes
   ambigus avant d'impliquer les bénévoles.
5. Préparer un protocole terrain avec cinq tâches courtes, un critère de
   réussite par tâche et un canal de retour rapide. Définir qui valide quoi et
   à quel moment.
6. Sécuriser le suivi : journal des erreurs et retours, possibilité de revenir
   en arrière après une modération ou une modification, et vérification du
   pseudo de l'admin dans les journaux.

À confirmer manuellement : affichage du journal sur la fiche action,
lisibilité mobile, états vide/chargement/erreur et droits d'accès du créateur,
de l'admin et du bénévole.
