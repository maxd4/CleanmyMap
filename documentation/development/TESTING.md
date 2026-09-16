# Testing Guide

Guide canonique de validation du dépôt CleanMyMap.

## Principe

Une commande ne doit jamais être présentée comme « globale » si elle ne couvre qu'une partie du dépôt.

Le workflow Codex distingue exactement deux modes de validation : `RAPIDE` et
`COMPLET`. Les tests spécialisés restent des briques appelables séparément,
pas des modes supplémentaires.

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

## Deux modes canoniques

Boucle normale, avec sélection selon le blast radius du `WORKTREE` :

```bash
npm run checks:fast
```

Le mode `RAPIDE` est borné à 180 secondes. Il exécute le diff check, l'audit
des secrets et les contrôles pertinents pour les fichiers concernés : tests
ciblés, typecheck, lint, sécurité/AuthZ, qualité, gouvernance documentaire,
pages_site, scripts ou migrations. Les suites lourdes non nécessaires sont
`NOT_RUN` avec leur raison ; elles ne sont pas relancées par redondance.

Clôture complète d'un changement transversal ou sensible :

```bash
npm run checks:full
```

Le mode `COMPLET` est borné à 600 secondes et réutilise la même détection des
domaines concernés que `RAPIDE` : il ne rend pas automatiquement tous les
domaines pertinents. Il renforce les preuves à l'intérieur du scope détecté
(gouvernance, sécurité, typecheck, lint, Vitest Web, quality, migrations, tests
de scripts/Python ou build de production lorsque le domaine le justifie). Une
preuve déjà couverte par `RAPIDE` sur le même candidat et la même configuration
est indiquée `ALREADY_PROVEN` au lieu d'être relancée ; toute modification du
candidat l'invalide.

Chaque exécution produit un rapport avec `VALIDATION_MODE`, `CANDIDATE_SCOPE`,
`ELAPSED_SECONDS`, `TIME_BUDGET_SECONDS`, `CHECKS_PASSED`, `CHECKS_FAILED`,
`CHECKS_NOT_RUN` et `VERDICT`. `TIME_BUDGET_EXCEEDED` et
`NOT_RUN_TIME_BUDGET` sont des résultats explicites, jamais des succès.

Les alias historiques suivants restent disponibles pour compatibilité :

```bash
npm run checks:changed
npm run checks
```

Ils convergent respectivement vers `RAPIDE` et `COMPLET`. Les commandes
spécialisées restent utiles pour une preuve isolée :

```bash
npm run typecheck
npm run lint
npm run test:scripts
npm run test
npm run build
```

Les scopes Git `WORKTREE`, `STAGED`, `PUSH_CANDIDATE` et
`DYNAMIC_CANDIDATE` décrivent le candidat contrôlé ; ils ne constituent pas de
nouveaux modes.

La lane maintenance reste disponible à part, comme compatibilité spécialisée :

```bash
npm run checks:maintenance
```

Ou directement :

```bash
powershell -ExecutionPolicy Bypass -File scripts/ci/run_checks.ps1 -Scope full
```

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

Lister les E2E locaux sans persistence Supabase :

```bash
npm run test:e2e:list
```

Exécuter :

```bash
npm run test:e2e
```

Ces commandes sélectionnent uniquement les projets Playwright locaux qui ne
requièrent pas de base Supabase mutable. Les E2E persistants — partage
d'action, parcours authentifié de recrutement et signalement/Storage — ne sont
pas une obligation pour chaque petit commit et sont exécutés par la lane
GitHub Actions dédiée. Les anciens lanceurs locaux des campagnes persistantes
restent des gardes explicites et échouent sans appeler Docker ni le cycle de
vie Supabase :

```bash
npx playwright test --list --project="action sharing" --project="authenticated campaign" --project="signalement campaign 2"
```

La lane `.github/workflows/e2e-supabase.yml` utilise un runner Linux GitHub
hébergé et éphémère. Elle démarre Supabase, applique les migrations
`apps/web/supabase/migrations/`, charge `apps/web/supabase/seed.sql`, lance
Next.js contre cette instance locale du runner, puis arrête la stack. Elle
utilise exclusivement des identifiants Clerk Development ; l'absence de ces
identifiants fait échouer la lane avant tout E2E. Aucun projet Supabase distant,
URL de production ou clé de production ne doit être injecté dans cette lane.

Les commandes `supabase start`, `supabase status`, `supabase db reset` et
`supabase stop` sont donc réservées à cette CI éphémère explicitement dédiée au
replay ; elles ne font pas partie du workflow local.

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

Avant toute validation navigateur, classifier la surface :

- `PUBLIC` : navigateur intégré ou Playwright public, sans bypass ;
- `PROTECTED_SERVER_ONLY` : launcher local canonique, `CMM_DEV_AUTH_BYPASS=1`,
  rôle minimal, port 3000 préféré avec fallback et URL effectivement annoncée ;
- `PROTECTED_CLERK_CLIENT` : si la route consomme `useUser`, `useAuth`, l'UI
  Clerk, `SignedIn`/`SignedOut` ou une vraie session navigateur, le bypass
  serveur est insuffisant. Utiliser le harness Playwright Clerk Development,
  `127.0.0.1:3000` strict, `CMM_DISABLE_DEV_AUTH_BYPASS=1` et le
  `storageState`/la session du global setup. `/onboarding` est un exemple ;
- `PROD_SMOKE` : session Clerk Production réelle selon le playbook, sans
  bypass ;
- `E2E_MUTABLE_SUPABASE` : uniquement la lane CI éphémère dédiée, jamais
  Docker/Supabase local.

Le launcher manuel/Codex utilise `3000` de préférence et peut basculer sur un
port libre ; reprendre l'URL annoncée. Le harness Clerk doit libérer l'ancien
serveur et rester strict sur `3000`. Ne jamais lancer Playwright Clerk contre
un serveur bypass, ni supposer `localhost:3000` après un fallback.

Annoncer avant le test :

```text
AUTH_SURFACE: PUBLIC | PROTECTED_SERVER_ONLY | PROTECTED_CLERK_CLIENT
BROWSER_HARNESS: INTEGRATED_BROWSER | PLAYWRIGHT_CLERK
AUTH_MODE: NONE | DEV_BYPASS | CLERK_DEVELOPMENT
HOST_URL: URL réellement utilisée
ROLE: rôle réel/simulé
PERSISTENCE: NONE | REMOTE_READONLY | CI_EPHEMERAL
```

Les rôles de bypass canoniques sont `benevole`, `coordinateur`,
`scientifique`, `entreprise`, `elu`, `admin` et `max`. Ne jamais utiliser de
clé Clerk Production sur localhost et ne jamais committer session, token ou
secret.

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
