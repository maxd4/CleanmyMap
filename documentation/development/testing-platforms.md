# Testing — surfaces et intégration

Ce module porte les validations des surfaces applicatives et les preuves d'intégration.

[Retour au guide canonique](./TESTING.md).

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

Cette lane utilise donc Clerk Development réel et une instance Supabase
éphémère. Les sorties Playwright authentifiées restent locales au runner pour le
diagnostic et ne sont jamais téléversées. L'artefact public est construit dans
`artifacts/ci-public-evidence/`, limité par allowlist, puis contrôlé par
`scripts/checks/check-public-e2e-artifact.mjs`; il ne contient qu'un résumé
synthétique ou une capture explicitement autorisée, jamais de `storageState`,
cookie, trace, HAR, vidéo, header ou token.

L'étape de démarrage demande à la CLI une sortie structurée JSON, conserve la
même suppression du journal brut et ne passe jamais `--ignore-health-check`.
En cas d'échec, `scripts/ci/diagnose-supabase-start.mjs` publie uniquement un
diagnostic borné : catégorie et code stable, phase, service Supabase connu,
versions, disponibilité du daemon, état des images et du réseau Docker,
conflits de ports, santé et présence des services indispensables à cette lane
(`db`, `kong`, `rest`, `storage`), `supabase status`, contrat minimal de
`apps/web/supabase/config.toml` et durée observée. Les sondes ne publient ni
nom d'image, ni sortie Docker, ni variable d'environnement. Une sortie
`UNCLASSIFIED` reste une absence de preuve causale ; elle ne doit pas être
transformée en cause supposée. `START_TIMEOUT` signifie seulement qu'aucun
conteneur et aucun statut n'ont été observés après la durée bornée ; il ne
prouve pas à lui seul une cause réseau ou image. Les codes et les tests du
diagnostic sont la source de preuve pour enrichir la prochaine exécution sans
publier de journal, credential, JWT, URL sensible ou configuration brute.

La preuve des conteneurs distingue explicitement trois situations. Lorsque
`docker ps` réussit avec une sortie vide, `NO_SUPABASE_CONTAINERS` signifie
`OBSERVED_ZERO` : zéro conteneur a été observé. Lorsque l'inspection échoue,
le diagnostic émet `SUPABASE_CONTAINERS_UNOBSERVED`, rend le nombre
`unavailable` et rend chaque état (`running`, `exited`, `created`,
`restarting`, `other`) `unavailable`. Une inspection impossible ne doit donc
jamais être publiée comme une absence confirmée ; son stderr et les identifiants
de conteneurs restent supprimés.

La classification du démarrage utilise le véritable code de sortie de
`supabase start`. Le code zéro produit l'état explicite `START_SUCCEEDED` et
n'émet aucun signal d'échec de journal. Les catégories d'échec, y compris
`UNCLASSIFIED`, ne sont évaluées que pour un démarrage effectivement non nul.

Pendant `supabase start`, la lane exécute en parallèle une sonde bornée toutes
les cinq secondes. Elle conserve uniquement une chronologie NDJSON temporaire
des états synthétiques (`DOCKER_READY`, `IMAGES_OBSERVED`,
`NETWORK_OBSERVED`, `CONTAINERS_OBSERVED`, `SERVICES_READY` ou
`DOCKER_UNAVAILABLE`), les nombres d'images/conteneurs et l'état du réseau et
des services requis. Le fichier est supprimé avec le journal brut ; le rendu
final ne publie que le nombre et la chronologie des observations. Cette
chronologie apporte une preuve de sous-état sans transformer une observation en
cause causale et sans prolonger le délai de `supabase start`.

Les commandes `supabase start`, `supabase status`, `supabase db reset` et
`supabase stop` sont donc réservées à cette CI éphémère explicitement dédiée au
replay ; elles ne font pas partie du workflow local.

### Contrats PostgreSQL existants et pgTAP

La même lane est l'unique owner de la preuve SQL exécutée. Après les migrations
canoniques et `seed.sql`, `scripts/ci/run-supabase-sql-proof.mjs` dérive son
inventaire des fichiers présents sous `apps/web/supabase/tests/` et `e2e/` :

- les fichiers `*.pgtap.sql` passent par `supabase test db --local` et leur
  `plan(N)` est comparé soit au flux TAP détaillé, soit au résumé `pg_prove`
  (`Files=1`, `Tests=N`, `Result: PASS`) lorsqu'il est produit ; le rapport
  conserve le mode de vérification et ne transforme pas un résumé en assertions
  TAP inventées ;
- les scripts SQL contractuels sont exécutés avec `supabase db query --local`
  selon leur protocole propre et doivent émettre leur marqueur de fin ;
- les scripts de concurrence à deux sessions existants sont lancés séparément et
  doivent produire leur propre marqueur de fin.

L'ajout d'un fichier de preuve sans protocole enregistré fait échouer la lane.
Le rapport JSON `supabase-sql-evidence.json`, copié dans l'artefact public
allowlisté `evidence/supabase-sql.json`, contient le SHA exact testé, les
catégories, le résultat et la raison de toute non-exécution ; il ne contient
pas les sorties SQL brutes. Les statuts sont `INTEGRATION_PROOF`, `NOT_RUN` ou
`DB_SEMANTICS_NOT_EXECUTED`. Une CI déclenchée par `push` sur `main` vérifie le
commit déjà publié : elle fournit une vérification post-publication et ne
constitue pas une protection serveur préalable à l'admission du push.

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
npm run mobile:typecheck
npm run mobile:test
npm run mobile:security
npm run mobile:lint
npm run quality:mobile-coverage
```

Pour un changement de code mobile, le mode DEVELOPMENT sélectionne les
contrôles mobiles pertinents ainsi que les garde-fous communs de secrets et de
Semgrep. Le mode FULL ajoute systématiquement la validation Web complète, les
contrôles partagés Knip, jscpd, cycles GitNexus et le build. Un changement
mobile seul n'autorise donc jamais à déclarer le Web non vérifié en FULL,
Vercel ou Playwright.

Le mobile est `CURRENT / ACTIVE DEVELOPMENT` depuis le lot M0, mais reste
`NOT_PRODUCTION_READY`. Les contrats Clerk, RLS et la finalisation des métriques
par trigger invoker sont finalisés et invariants. La baseline de tests couvre :

- restauration d'une mission active ;
- buffer offline ;
- refus des permissions GPS ;
- finalisation d'une mission ;
- erreurs Supabase ;
- propriété d'une mission ;
- cohérence identité Clerk → Supabase ;
- absence d'écriture client directe de `distance_m` et `duration_s`.

Pour les changements de synchronisation GPS, les tests ciblés doivent également
exercer les branches de concurrence et de reprise, et pas seulement vérifier la
présence des appels : ajout/suppression owner-scoped sérialisés, coalescence des
reprises, changement de compte avant émission, identité stable d'un point entre
envoi direct, buffer et rejeu, perte d'acquittement, redémarrage avec un buffer
historique et conservation de `client_point_id` lors de la lecture du tracé.
Les tests unitaires et les assertions statiques de migration prouvent le contrat
du code, mais ne prouvent ni l'unicité PostgreSQL ni les courses RLS à deux
sessions. Une preuve SQL réelle doit utiliser l'environnement Supabase
éphémère autorisé ; à défaut, le compte rendu doit déclarer explicitement
`DB_SEMANTICS_NOT_EXECUTED`.

Cette lane est une validation de code et de contrats. Elle ne constitue pas un
test sur téléphone réel, une validation du background headless ou une preuve de
préparation à la production.

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
  `localhost:3000` strict, `CMM_DISABLE_DEV_AUTH_BYPASS=1` et le
  `storageState`/la session du global setup. `/onboarding` est un exemple ;
- `PROD_SMOKE` : session Clerk Production réelle selon le playbook, sans
  bypass ;
- `E2E_MUTABLE_SUPABASE` : uniquement la lane CI éphémère dédiée, jamais
  Docker/Supabase local.

Le harness Clerk distingue deux cycles de vie sans créer une seconde source de
configuration :

- `TEMPORARY` si `E2E_CLERK_USER_EMAIL` est absent. Le setup crée une adresse
  Development de test, écrit un marqueur local d'appartenance borné au run et
  le teardown ne peut supprimer que cet utilisateur si le marqueur distant
  Clerk et l'adresse `+clerk_test` concordent ;
- `PERSISTENT_DEVELOPMENT` si `E2E_CLERK_USER_EMAIL` est configuré. Le setup
  réutilise l'utilisateur par adresse et ne supprime jamais ce compte, qu'il
  soit préexistant ou provisionné une seule fois avec les credentials Clerk
  Development vérifiés. Aucun rôle privilégié n'est ajouté implicitement.

Le fichier `managed-user.json` est donc un marqueur local temporaire, jamais
une autorisation de suppression à lui seul. Un marqueur absent, invalide,
humain, persistent ou non possédé est conservé sans suppression distante ; les
fichiers `storageState`, cookies, tokens et traces restent ignorés et ne sont
jamais publiés. En CI, l'absence d'email dédié conserve le cycle `TEMPORARY`.

Si le compte dédié n'est pas disponible, utiliser d'abord le protocole Clerk
Development prévu. Une session humaine préautorisée peut servir de repli
manuel, sans demander ni copier mot de passe, code, cookie ou token dans les
sorties ; elle ne doit pas être transformée en privilège ou en session forgée.
Un scénario admin exige un compte de test déjà autorisé ou cette session
humaine préautorisée ; le harness ne donne jamais le rôle `admin` par défaut.

GitHub Codespaces est un environnement interactif Development : il utilise une
vraie AuthN Clerk avec les credentials Development fournis hors dépôt et ne
peut jamais activer `CMM_DEV_AUTH_BYPASS`, même si `CODESPACES=true` et si un
lanceur a laissé cette variable. Si les credentials Clerk requis manquent, le
démarrage doit échouer avec une erreur de configuration explicite. Le bypass
synthétique reste réservé au launcher Codex localhost explicite.

Le launcher manuel/Codex utilise `3000` de préférence et peut basculer sur un
port libre ; reprendre l'URL annoncée. Le harness Clerk doit libérer l'ancien
serveur et rester strict sur `3000`. Ne jamais lancer Playwright Clerk contre
un serveur bypass, ni supposer `localhost:3000` après un fallback.

La configuration Playwright utilise `http://localhost:3000` par défaut, en
cohérence avec la configuration Clerk Development locale. Pour lancer
explicitement le scénario sans fallback de port :

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://localhost:3000"
$env:DEV_HOST = "localhost"
$env:CMM_DISABLE_DEV_AUTH_BYPASS = "1"
npx playwright test --project="soft-gate authentication"
```

`PLAYWRIGHT_BASE_URL` est refusée pour toute origine distante, tout protocole
autre que HTTP ou tout port différent de `3000`.

### Tester le redirect automatique de Clerk

Pour prouver le retour produit par le composant Clerk `<SignIn>`, exercer le
formulaire UI sur le parcours `PROTECTED_CLERK_CLIENT` : depuis la route
anonyme, cliquer le CTA, vérifier l'URL `/sign-in?redirect_url=...`, terminer
une vraie connexion Clerk Development puis attendre le `waitForURL` de la route
cible. Ne pas appeler `page.goto()` vers la cible après la connexion : cela
masquerait un redirect cassé. `clerk.signIn()` et un `storageState` servent à
préparer une session pour tester une route protégée ; ils ne prouvent pas le
callback de navigation du composant `<SignIn>`.

Pour une connexion par code email en Development, le setup Playwright utilise
l'adresse `+clerk_test` et le code de test `424242`. Attendre `clerk.loaded`,
utiliser le formulaire Clerk et attendre la réponse `attempt_first_factor`.
Dans le widget actuel, la saisie complète du code lance elle-même la
vérification et désactive le bouton principal pendant le traitement : ne pas
cliquer une seconde fois. `setupClerkTestingToken({ page })` ne crée pas de
session et ne remplace pas l'authentification ; il prépare les requêtes Clerk
au test navigateur.

Après la réponse Clerk, vérifier dans cet ordre : session et utilisateur
présents sur `window.Clerk`, URL cible exacte, gate anonyme absent, contenu
authentifié visible. Une réponse HTTP 200 seule ne prouve pas une session. Si la
réponse FAPI indique `status: "complete"` et un premier facteur `verified`,
mais que `window.Clerk.session` reste absent, classer d'abord le blocage comme
`AUTH_SESSION` ; le redirect du composant n'a pas encore été isolé. Éviter de
modifier `forceRedirectUrl` tant qu'une session active n'est pas observée.

Commande ciblée du scénario de retour :

```bash
npx playwright test --project="soft-gate authentication" --grep="returns to the canonical route"
```

Le projet dépend du global setup Clerk et de son teardown. Le teardown supprime
uniquement un utilisateur `TEMPORARY` dont l'appartenance est prouvée ; il ne
supprime jamais un compte `PERSISTENT_DEVELOPMENT`. Exécuter ce parcours seul,
sans test parallèle utilisant le même harness.

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

Avant de tester les formulaires Actions sur le terrain :

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
