# Audit transversal du dépôt CleanMyMap — première revue GPT-5.6

**Dépôt audité :** `maxd4/CleanmyMap`  
**Branche de référence :** `main`  
**Commit de référence :** `d0bd30937fbe6bc2c56fde5a407f2e090121d58b`  
**Date de l'audit :** 11 juillet 2026  
**Nature de l'audit :** revue statique indépendante du dépôt GitHub, sans modification du dépôt, sans PR et sans exécution locale.

---

## 1. Résumé exécutif

Le dépôt CleanMyMap est nettement plus structuré, documenté et sécurisé qu'un prototype classique codé rapidement. Il possède déjà :

- une séparation assez claire entre application web, scripts, documentation et maintenance ;
- des tests unitaires nombreux sur les routes API, l'autorisation, Supabase et les invariants ;
- un audit de secrets maison ;
- CodeQL et Dependabot ;
- des migrations Supabase versionnées ;
- des règles d'agent détaillées ;
- des garde-fous Vercel, Supabase, TypeScript et documentation.

Cependant, cette première revue indépendante a identifié plusieurs problèmes importants qui ne relèvent pas seulement de « dette technique » :

1. **la CI saute l'audit de secrets précisément pour les commits composés uniquement de documentation, backups ou artefacts**, alors que l'audit de secrets est conçu pour scanner les fichiers Markdown ;
2. **le script présenté comme validation globale (`npm run checks`) ne valide pas l'application web** : pas de typecheck, lint, Vitest, build ni audit de secrets ;
3. **le script `test:security` référence un fichier de test absent** ;
4. **l'application compagnon appelle une RPC Supabase à laquelle son propre rôle n'a pas le droit d'accéder** ;
5. **le modèle d'identité de l'application compagnon semble incohérent avec le modèle principal Clerk + profils Supabase** ;
6. **deux arbres de migrations Supabase coexistent**, créant deux sources de vérité potentielles ;
7. **des règles et skills d'agents sont dupliqués et déjà obsolètes sur la version de Next.js** ;
8. **un backlog terminé reste à la racine alors que le garde-fou racine est censé l'interdire** ;
9. **plusieurs documents de référence annoncent encore Next.js 15 et TypeScript 5 alors que le code utilise Next.js 16.3 canary et TypeScript 6** ;
10. **la politique d'utilisation d'une version canary de Next.js n'est pas documentée** ;
11. **aucune vraie suite E2E Playwright n'est configurée malgré la présence de Playwright dans les dépendances et les guides** ;
12. **l'application compagnon n'a ni script de test, ni lint, ni typecheck dans son `package.json` et n'entre pas dans la CI principale**.

Le risque principal du dépôt n'est donc pas un manque de code. C'est **l'existence de plusieurs couches de règles, documents, plans, scripts et miroirs qui donnent parfois une impression de couverture plus forte que la couverture réelle**.

---

## 2. Méthode et limites

### Ce qui a été inspecté

La revue a porté notamment sur :

- les manifestes `package.json` ;
- les workflows GitHub Actions ;
- les scripts de validation et de sécurité ;
- les règles `AGENTS.md` ;
- les skills `.codex/` et `.agents/` ;
- les routes API sensibles ;
- la configuration des variables d'environnement ;
- les migrations Supabase ;
- l'application compagnon Expo/React Native ;
- les documents de tests, sécurité et architecture ;
- les fichiers de backlog et plans visibles à la racine ou dans la documentation.

### Ce qui n'a pas été exécuté

Cet audit n'a pas exécuté localement :

- `npm ci` ;
- `npm run test` ;
- `npm run build` ;
- `npm run security:secrets` ;
- CodeQL ;
- Supabase CLI ;
- les migrations sur une base locale ;
- la CI GitHub ;
- le site dans un navigateur ;
- Vercel ;
- la base Supabase distante.

Par conséquent, les constats sont classés en trois niveaux :

- **Confirmé** : contradiction ou défaut directement visible dans les fichiers ;
- **Très probable** : plusieurs fichiers convergent vers la même conclusion, mais une validation runtime reste nécessaire ;
- **Suggestion** : amélioration pertinente mais non nécessairement issue d'un bug.

---

# 3. Priorités globales

| ID | Priorité | Confiance | Sujet |
|---|---|---:|---|
| SEC-01 | P0 | Confirmé | La CI saute l'audit de secrets pour les changements docs/backups/artifacts |
| TEST-01 | P0 | Confirmé | `npm run checks` n'est pas une validation globale réelle |
| TEST-02 | P0 | Confirmé | `test:security` référence un fichier de test absent |
| MOB-01 | P0 | Confirmé | L'app compagnon appelle une RPC réservée à `service_role` |
| MOB-02 | P0 | Très probable | Le modèle d'identité mobile est incompatible avec les profils Clerk |
| DB-01 | P0 | Confirmé | Deux arbres de migrations Supabase coexistent |
| SEC-02 | P1 | Confirmé | `main` n'est pas protégé selon le backlog de sécurité courant |
| SEC-03 | P1 | Confirmé | Plusieurs alertes CodeQL de robustesse/sécurité restent documentées |
| SEC-04 | P1 | Confirmé | `/api/send` peut contourner l'admin via un secret statique de test |
| CFG-01 | P1 | Confirmé | `env.ts` annonce un fail-fast mais continue avec des valeurs non validées |
| CI-01 | P1 | Confirmé | La CI ne lance aucun build de production |
| CI-02 | P1 | Confirmé | La CI n'exécute pas les garde-fous racine et gouvernance documentaire |
| E2E-01 | P1 | Confirmé | Aucune vraie suite E2E Playwright n'est configurée |
| MOB-03 | P1 | Confirmé | L'app compagnon n'a ni test, ni lint, ni typecheck automatisé |
| DOC-01 | P1 | Confirmé | Documentation de stack obsolète et contradictoire |
| DOC-02 | P1 | Confirmé | La version Next.js canary n'a pas de décision d'architecture documentée |
| DOC-03 | P1 | Confirmé | `github-audit-backlog.md` contient des états contradictoires |
| GOV-01 | P1 | Confirmé | Les règles de livraison des agents sont incompatibles avec le nouveau workflow |
| TREE-01 | P1 | Confirmé | Un backlog terminé reste à la racine malgré le garde-fou |
| TREE-02 | P1 | Confirmé | Des skills identiques sont dupliqués dans `.codex` et `.agents` |
| DOC-04 | P1 | Confirmé | `README.md` est contradictoire sur la licence |
| DOC-05 | P2 | Confirmé | `TESTING.md` référence des commandes inexistantes |
| MOB-04 | P2 | Confirmé | Le README mobile recommande encore l'éditeur SQL manuel |
| TREE-03 | P2 | Très probable | Le dossier `.kiro/specs/suppression-charte-dark` paraît historique et incompatible avec les règles actuelles |
| TREE-04 | P2 | Confirmé | Le garde-fou racine autorise tous les `.bat` sans contrôle |
| TREE-05 | P2 | Très probable | Des scripts utilitaires ponctuels restent allowlistés à la racine sans usage visible |
| DOC-06 | P2 | Confirmé | `apps/web/README.md` référence un `.env.example` absent |
| RUNTIME-01 | P2 | Confirmé | Deux endpoints de test email se chevauchent |
| ENV-01 | P2 | Confirmé | Aucune version Node canonique n'est matérialisée par `.nvmrc`, `.node-version` ou `engines` |
| OSS-01 | P2 | Confirmé | Dépôt public sans `LICENSE` alors que `package.json` annonce ISC |
| OSS-02 | P3 | Suggestion | Ajouter `CONTRIBUTING.md` si les contributions externes deviennent réelles |
| OSS-03 | P3 | Suggestion | Ajouter `CODEOWNERS` seulement si plusieurs mainteneurs interviennent |

---

# 4. Failles et risques de sécurité

## SEC-01 — P0 — La CI saute l'audit de secrets pour les commits de documentation

**Statut : confirmé.**

### Preuve

Dans `.github/workflows/ci.yml`, un changement est considéré comme `docs_only` lorsqu'il touche uniquement :

```txt
documentation/*
*.md
backups/*
artifacts/*
```

Ensuite, les étapes suivantes sont ignorées lorsque `docs_only == true`, notamment :

```txt
npm run security:secrets
npm run typecheck
npm run lint
npm run test
npm run test:security
```

Or `scripts/secret-audit.mjs` est explicitement conçu pour scanner :

```txt
.md
.json
.yml
.yaml
```

Il utilise aussi `git ls-files` pour parcourir les fichiers suivis et non suivis.

### Pourquoi c'est dangereux

Une clé API, un token, une URL signée, un JWT, une adresse sensible ou un secret collé accidentellement dans :

- un fichier Markdown ;
- un backup ;
- un rapport ;
- un artefact textuel ;

peut être poussé sans que la CI lance l'audit de secrets.

Le problème est structurel : **la catégorie de fichiers qui peut contenir des secrets est précisément exemptée du contrôle capable de les détecter**.

### Correction recommandée

Dans `.github/workflows/ci.yml` :

1. exécuter `npm run security:secrets` pour **tous** les changements ;
2. ne jamais considérer `backups/*` et `artifacts/*` comme intrinsèquement sûrs ;
3. garder le skip de typecheck/lint/tests pour les vrais changements documentaires si nécessaire ;
4. ajouter un test de non-régression du workflow ou un script vérifiant que `security:secrets` n'est jamais conditionné par `docs_only`.

### Validation

- commit factice avec une fausse chaîne de secret détectable dans `documentation/` ;
- vérifier que la CI lance bien `security:secrets` ;
- vérifier qu'un commit documentaire normal reste léger.

---

## SEC-02 — P1 — La branche `main` n'est pas protégée

**Statut : confirmé par le backlog de sécurité courant du dépôt.**

Le fichier `documentation/security/github-audit-backlog.md` indique explicitement que `main` n'est pas protégée.

### Risque

Un push direct erroné peut contourner :

- revue ;
- checks obligatoires ;
- validation humaine ;
- règles de merge.

Même pour un projet solo, une protection minimale de `main` évite une partie des erreurs irréversibles.

### Correction recommandée

À appliquer dans GitHub, pas dans le code :

- interdire le force-push ;
- exiger les checks CI pertinents ;
- conserver la possibilité d'administrer le dépôt sans créer une bureaucratie inutile ;
- ne pas exiger obligatoirement une PR si le workflow personnel ne le souhaite pas, mais au minimum empêcher les pushes qui cassent les checks critiques.

---

## SEC-03 — P1 — Alertes CodeQL de robustesse et sécurité encore ouvertes

**Statut : confirmé dans `documentation/security/github-audit-backlog.md`.**

Les familles explicitement encore listées comprennent notamment :

- `js/file-system-race` dans `scripts/split-bibliography.mjs` ;
- `js/file-system-race` dans `scripts/pre-release-check.mjs` ; le parcours a été durci localement avec `readdirSync(..., { withFileTypes: true })` et un test d'arbre temporaire ;
- `js/incomplete-sanitization` dans `scripts/summarize-jsonl.mjs` et `scripts/cicd-metrics-report.mjs` ; les tableaux Markdown échappent maintenant `\\`, `|`, les backticks et les retours ligne ;
- `js/http-to-file-access` dans `scripts/export-clerk-users.mjs` ;
- `scripts/export-clerk-users.mjs` a été durci localement pour réduire l'export aux champs nécessaires et empêcher une sortie hors workspace ;
- `js/incomplete-sanitization` dans `scripts/cleanup/inventory.ts` ; le doublon historique `scripts/cleanup/run-inventory.js` a été supprimé dans le lot `GHA-020` et `inventory.ts` a été durci localement sur l'échappement Markdown ;
- `js/clear-text-storage-of-sensitive-data` dans `apps/web/src/components/sections/rubriques/use-weather-data.ts` ; le stockage local a été réduit aux champs non sensibles et la migration supprime les coordonnées en clair ;
- `js/file-access-to-http` dans `apps/web/scripts/lib/sheet-ingestion-core.mjs` ; les points d'appel normalisent désormais les libellés avant géocodage et le résolveur rejette les entrées qui ne ressemblent pas à une adresse ou un lieu ;
- `js/insecure-temporary-file` dans `apps/web/scripts/upload-sentry-sourcemaps.mjs`.
- Le script historique `apps/web/scripts/sync-real-data-from-sheet.mjs` a été supprimé; le plan ne doit plus le traiter comme un consommateur actif.
- Le wrapper historique `apps/web/scripts/sync-google-sheet-to-supabase.mjs` a aussi été supprimé; les alertes CodeQL associées ont été rejetées côté GitHub comme historique mort.

### Recommandation

Ne pas lancer une campagne massive de nettoyage CodeQL.

Ordre conseillé :

1. accès HTTP → disque ;
2. sanitation incomplète ;
3. fichiers temporaires ;
4. race filesystem ;
5. warnings de qualité ;
6. variables inutilisées.

Chaque correction doit avoir :

- une preuve du flux d'entrée ;
- une validation ciblée ;
- un test si le helper est réutilisable.

---

## SEC-04 — P1 — `/api/send` contourne l'admin via un token de test statique

**Statut : confirmé.**

`apps/web/src/app/api/send/route.ts` autorise deux chemins :

- administrateur via `requireAdminAccess()` ;
- ou possession d'un header `x-resend-test-token` correspondant à `RESEND_TEST_TOKEN`.

Avec ce token, le corps peut choisir :

- un ou plusieurs destinataires ;
- le sujet ;
- le HTML.

### Risque

Si `RESEND_TEST_TOKEN` fuite :

- envoi d'emails arbitraires au nom du projet ;
- consommation du quota Resend ;
- abus réputationnel ;
- phishing depuis un domaine légitime ;
- absence visible de rate limiting local à cette route.

### Correction recommandée

Option préférée :

- désactiver totalement le chemin `RESEND_TEST_TOKEN` en production ;
- garder l'auth admin comme seul accès.

Alternative :

- destinataire allowlisté ;
- token rotatif et distinct par environnement ;
- rate limit ;
- audit log ;
- test de sécurité prouvant que le token de développement est refusé en production.

### Fichiers concernés

```txt
apps/web/src/app/api/send/route.ts
apps/web/src/app/api/send/route.test.ts
apps/web/src/lib/env.ts
apps/web/.env.local.example
apps/web/README.md
```

---

## CFG-01 — P1 — Le « fail fast » des variables d'environnement ne fail pas

**Statut : confirmé.**

Dans `apps/web/src/lib/env.ts`, le commentaire dit :

```txt
Fail fast in server contexts
```

Mais lorsqu'une validation Zod échoue :

1. l'erreur est affichée avec `console.error` ;
2. l'application continue ;
3. `process.env` est casté vers le type attendu.

### Risque

Une URL mal formée ou une configuration invalide peut atteindre le runtime tout en donnant l'impression que les variables sont validées.

### Correction recommandée

Séparer clairement :

```txt
env.client.ts
env.server.ts
```

Pour le serveur en production :

- `throw` sur configuration invalide réellement requise ;
- utiliser `server-only` pour les secrets ;
- ne pas caster silencieusement `process.env`.

Pour les services optionnels :

- conserver des champs optionnels ;
- faire échouer uniquement la fonctionnalité concernée.

---

## Point positif — aucun secret évident trouvé par la recherche statique ciblée

La recherche ciblée n'a pas trouvé de chaîne évidente correspondant à :

- clé GitHub `ghp_...` ;
- clé AWS `AKIA...` ;
- clé Stripe live ;
- clé privée PEM ;
- token Slack.

Cela ne remplace pas l'exécution de `npm run security:secrets`, GitHub Secret Scanning ou un historique Git complet.

---

# 5. Tests, CI et validation

## TEST-01 — P0 — `npm run checks` n'est pas une validation globale

**Statut : confirmé.**

Le `README.md` présente :

```bash
npm run checks # Vérification globale du projet
```

Le script pointe vers :

```txt
scripts/run_checks.ps1
```

Ce script exécute principalement :

- normalisation UTF-8 ;
- compilation Python ciblée ;
- diagnostic de nettoyage ;
- garde-fou SQLite ;
- contrôle visuel documentaire ;
- tests Python.

Il n'exécute pas :

```txt
npm run security:secrets
npm run check:root-files
npm run check:doc-governance
npm run typecheck
npm run lint
npm run test
npm run build
```

### Pourquoi c'est critique

Un agent peut annoncer « validation globale réussie » alors que l'application web n'a pas été compilée, lintée ni testée.

### Correction recommandée

Deux options acceptables.

#### Option A — `npm run checks` devient réellement global

Créer un orchestrateur cross-platform, par exemple :

```txt
scripts/run-checks.mjs
```

Il orchestre au minimum :

1. audit de secrets ;
2. hygiène racine ;
3. gouvernance documentaire ;
4. typecheck web ;
5. lint web ;
6. tests Vitest ;
7. tests de sécurité ;
8. tests de régression ;
9. Python si concerné ;
10. build en mode `--full` ou avant livraison importante.

#### Option B — renommer le script existant

```txt
checks:maintenance
checks:web
checks:full
```

Le mot `checks` seul ne doit plus prétendre couvrir tout le dépôt.

---

## TEST-02 — P0 — Le script de sécurité référence un fichier absent

**Statut : confirmé.**

Dans `apps/web/package.json`, `test:security` inclut :

```txt
src/app/api/api-boundary.test.ts
```

Ce fichier n'existe pas au commit audité.

### Risque

- couverture de sécurité annoncée mais absente ;
- script stale ;
- confusion sur l'existence d'un invariant API ;
- possibilité qu'un agent pense que les frontières API sont testées alors qu'elles ne le sont plus.

### Correction recommandée

Avant de supprimer la référence, déterminer l'intention historique du test.

Ordre :

1. rechercher dans l'historique Git si le fichier existait ;
2. identifier ce qu'il protégeait ;
3. vérifier si une couverture équivalente existe ailleurs ;
4. recréer `apps/web/src/app/api/api-boundary.test.ts` si l'invariant reste pertinent ;
5. sinon supprimer la référence et documenter le remplacement.

### Fichier pertinent à créer

```txt
apps/web/src/app/api/api-boundary.test.ts
```

Seulement si l'invariant n'est pas déjà couvert ailleurs.

---

## CI-01 — P1 — Aucun build de production dans la CI

**Statut : confirmé.**

La CI exécute typecheck, lint, tests, tests de sécurité et audits Vercel, mais pas :

```bash
npm run build
```

### Risque

Certaines erreurs apparaissent uniquement pendant le build Next.js :

- génération de routes ;
- imports serveur/client ;
- métadonnées ;
- compilation spécifique ;
- configuration Next ;
- manifestes ;
- problèmes de bundling.

### Correction recommandée

Ajouter un job `production-build` :

- obligatoire sur `main` ;
- obligatoire sur PR touchant `apps/web/src`, `apps/web/package.json`, `next.config.*`, `vercel.json`, lockfile ;
- facultatif pour la documentation seule afin de contrôler les coûts.

---

## CI-02 — P1 — Les garde-fous de racine et de documentation ne sont pas dans la CI

**Statut : confirmé.**

Les scripts existent :

```bash
npm run check:root-files
npm run check:doc-governance
```

Ils sont exécutés par le pre-push local, mais pas par `.github/workflows/ci.yml`.

### Conséquence déjà observable

Le dépôt contient actuellement :

```txt
backlog-codex-permissions-admin-moderation-actions.md
```

à la racine, alors que `check-root-file-hygiene.mjs` ne l'autorise pas.

Le garde-fou existe donc, mais la CI ne garantit pas son application.

---

## E2E-01 — P1 — Pas de vraie suite E2E Playwright

**Statut : confirmé par la structure visible du dépôt.**

Playwright est présent dans les dépendances racine, mais aucune suite standard n'a été trouvée avec :

```txt
playwright.config.*
test.describe(...)
page.goto(...)
```

Le script `run_checks.ps1` indique lui-même :

```txt
No root E2E suite configured; skipping E2E.
```

### Fichiers pertinents à créer

```txt
playwright.config.ts
e2e/smoke-public.spec.ts
e2e/smoke-authenticated.spec.ts
```

### Premier périmètre recommandé

Ne pas tester tout le site.

Commencer par :

- homepage publique ;
- `/sign-in` ;
- `/actions/new` ou sa preview ;
- `/actions/map` ;
- `/reports` ;
- `/api/health` ;
- une route protégée ;
- un test prouvant qu'un non-admin n'accède pas à une surface admin.

L'authentification peut utiliser :

- `storageState` réel sécurisé ;
- ou le bypass local uniquement en développement ;
- jamais une clé sensible commitée.

---

## DOC-05 — P2 — `TESTING.md` référence des commandes inexistantes

**Statut : confirmé.**

`documentation/development/TESTING.md` recommande :

```bash
npm run logs:focus:test
npm run logs:focus:build
npm run logs:focus:checks
```

Ces scripts ne figurent pas dans le `package.json` racine au commit audité.

### Correction

Soit :

- créer réellement les scripts ;

soit :

- supprimer les commandes de la documentation.

La documentation de test doit être exécutable telle quelle.

---

# 6. Application compagnon : défauts fonctionnels et de sécurité

## MOB-01 — P0 — L'app appelle une RPC interdite à son propre rôle

**Statut : confirmé.**

Dans :

```txt
companion-app/lib/tracking-service.ts
```

`stopTracking()` appelle :

```ts
await supabase.rpc('compute_mission_distance', {
  p_mission_id: missionId,
});
```

Mais la migration :

```txt
supabase/migrations/20260506000024_companion_gps_schema.sql
```

contient :

```sql
revoke all on function public.compute_mission_distance(uuid) from public;
grant execute on function public.compute_mission_distance(uuid) to service_role;
```

Une migration corrective ultérieure réaffirme la même restriction.

Un test web l'impose explicitement :

```txt
apps/web/src/lib/supabase/function-permissions.test.ts
```

### Conséquence

Le client mobile utilise une clé publique avec session utilisateur, pas `service_role`.

L'appel doit donc échouer.

De plus, l'erreur de la RPC n'est pas traitée dans `stopTracking()`.

Le code peut terminer la mission et retourner un succès alors que :

- `distance_m` n'est pas recalculé ;
- `duration_s` peut rester incohérent.

### Correction sûre

Ne surtout pas donner simplement accès à la RPC à tous les utilisateurs.

Choisir l'une de ces architectures :

1. route serveur CleanMyMap authentifiée qui vérifie l'identité et appelle la RPC avec le service role ;
2. RPC `authenticated` avec vérification stricte de propriété de la mission dans la fonction ;
3. trigger serveur lors du passage à `completed`, si ce modèle est cohérent avec le métier.

Ajouter un test de contrat entre :

- permissions SQL ;
- appel mobile ;
- propriété de mission ;
- résultat final.

---

## MOB-02 — P0 — Le modèle d'identité mobile paraît incompatible avec Clerk

**Statut : très probable, à confirmer avec une base locale reconstruite.**

Le web utilise Clerk comme identité principale.

La migration mobile définit :

```sql
volunteer_id text references public.profiles(id)
```

et les policies vérifient :

```sql
auth.uid()::text = volunteer_id
```

L'application mobile, elle, propose :

```ts
supabase.auth.signInAnonymously()
```

Le README mobile dit explicitement :

```txt
Web : Clerk
Companion : Supabase Auth directement
```

### Problème

Un UID Supabase anonyme n'est pas automatiquement l'ID Clerk stocké dans `profiles.id`.

Aucun flux visible dans l'app ne crée ou ne relie explicitement l'identité Supabase anonyme à un profil Clerk existant.

### Contradiction supplémentaire

La configuration locale Supabase contient :

```toml
enable_anonymous_sign_ins = false
```

alors que le bouton mobile appelle `signInAnonymously()`.

### Correction recommandée

Créer une décision d'architecture dédiée :

```txt
documentation/architecture/adr/ADR-xxx-companion-identity.md
```

Choix recommandé à évaluer :

- réutiliser Clerk comme identité et transmettre un JWT compatible Supabase ;
- la configuration Supabase contient déjà un bloc `auth.third_party.clerk`.

Ne pas maintenir deux identités indépendantes pour le même bénévole sans table de liaison explicite et règles documentées.

---

## MOB-03 — P1 — L'app compagnon n'a pas de scripts de qualité

**Statut : confirmé.**

`companion-app/package.json` propose uniquement :

```txt
start
android
ios
web
```

Il manque :

```txt
typecheck
lint
test
```

L'app est également hors du workspace racine principal.

### Risque

Une partie sensible manipulant :

- géolocalisation ;
- photos ;
- stockage local ;
- synchronisation offline ;
- session ;
- Supabase ;

n'entre pas dans les contrôles ordinaires du dépôt.

### Minimum recommandé

Dans `companion-app/package.json` :

```txt
typecheck
test
```

Puis créer en priorité des tests pour :

- buffer offline ;
- retry ;
- restauration d'une mission active ;
- arrêt de mission ;
- refus de permission GPS ;
- conflit d'identité ;
- interdiction d'agir sur la mission d'un autre utilisateur ;
- échec de `compute_mission_distance`.

---

## MOB-04 — P2 — Le README mobile recommande un SQL manuel

**Statut : confirmé.**

`companion-app/README.md` montre encore :

```sql
CREATE TABLE public.missions (...);
CREATE TABLE public.gps_points (...);
CREATE FUNCTION ...
```

avec une logique d'exécution via éditeur SQL.

Cela contredit la gouvernance générale du dépôt, qui impose des migrations versionnées.

### Correction

Remplacer la procédure par :

```txt
Migration canonique :
supabase/migrations/20260506000024_companion_gps_schema.sql
```

et documenter la commande locale/preview adaptée.

---

# 7. Supabase et architecture des données

## DB-01 — P0 — Deux arbres de migrations Supabase coexistent

**Statut : confirmé.**

Exemple identique :

```txt
supabase/migrations/20260506000024_companion_gps_schema.sql
apps/web/supabase/migrations/20260506000024_companion_gps_schema.sql
```

Les deux fichiers ont le même contenu au commit audité.

En revanche :

- `apps/web/supabase/config.toml` existe ;
- aucun `supabase/config.toml` racine n'a été trouvé ;
- les scripts du workspace web utilisent Supabase avec `--workdir .` depuis `apps/web` ;
- `AGENTS.md` demande pourtant de créer les migrations dans `supabase/migrations`.

### Risque

Deux sources de vérité possibles :

- une migration modifiée dans un arbre mais pas l'autre ;
- un agent lit le mauvais dossier ;
- un test lit la racine alors que Supabase CLI utilise l'arbre web ;
- la base distante ne correspond pas à la migration considérée comme canonique.

### Correction recommandée

Décider une seule source canonique.

Option préférée :

```txt
apps/web/supabase/
```

si c'est réellement le workdir Supabase exploité.

Ensuite :

- déplacer les tests vers cette source ;
- supprimer le miroir racine ;
- mettre à jour `AGENTS.md` et la documentation.

Si un miroir est réellement nécessaire :

- ne jamais l'éditer manuellement ;
- générer le miroir automatiquement ;
- ajouter un script `check-supabase-migration-mirror.mjs` ;
- faire échouer la CI en cas de divergence.

Le meilleur choix reste une seule source de vérité.

---

# 8. Documentation obsolète ou contradictoire

## DOC-01 — P1 — La stack documentée est obsolète

**Statut : confirmé.**

Le code courant indique notamment :

```txt
Next.js: 16.3.0-canary.79
TypeScript: ^6
React: 19.2.7
```

Mais plusieurs documents ou skills annoncent encore :

```txt
Next.js 15
TypeScript 5
```

Exemples :

```txt
AGENTS.md
.codex/skills/cleanmymap-repo/SKILL.md
.agents/skills/cleanmymap-repo/SKILL.md
documentation/development/AI_DEVELOPER_GUIDE.md
documentation/architecture/methodologie-fonctionnement-site.md
documentation/development/TESTING.md
documentation/project_context.md
```

Le `README.md` lui-même affiche :

```txt
Next.js 16
TypeScript 5
```

### Correction recommandée

Créer un contrôle automatique :

```txt
scripts/check-stack-doc-drift.mjs
```

Source unique :

```txt
package.json
apps/web/package.json
companion-app/package.json
```

Le script ne doit pas réécrire tous les documents automatiquement, mais détecter les anciennes mentions dans les documents actifs.

Les documents historiques doivent être explicitement exclus.

---

## DOC-02 — P1 — Aucune justification de la version Next.js canary

**Statut : confirmé.**

`apps/web/package.json` utilise :

```txt
next: 16.3.0-canary.79
```

Aucun document spécifique trouvé n'explique :

- pourquoi une canary est nécessaire ;
- quelle fonctionnalité l'exige ;
- les risques acceptés ;
- la politique de mise à jour ;
- le plan de retour vers une stable ;
- l'écart avec `eslint-config-next 16.2.4`.

### Fichier pertinent à créer

```txt
documentation/architecture/adr/ADR-xxx-next-canary-policy.md
```

Le document doit répondre à une seule question :

> Pourquoi CleanMyMap dépend-il d'une version canary de Next.js, et à quelle condition revient-il sur stable ?

Si aucune raison concrète n'existe, privilégier une version stable.

---

## DOC-03 — P1 — Le backlog GitHub sécurité est contradictoire

**Statut : confirmé.**

`documentation/security/github-audit-backlog.md` indique d'abord que les dépendances `dompurify` et `vite` ont été corrigées.

Mais sa table « Dependabot à reprendre plus tard » conserve encore les anciennes versions vulnérables comme versions courantes.

### Correction

Choisir une structure claire :

```txt
État courant
Corrigé
Encore ouvert
Historique
```

Ajouter :

```txt
last_verified_commit: <sha>
last_verified_at: <date>
```

Ne pas mélanger snapshot historique et backlog actif dans la même table sans statut.

---

## DOC-04 — P1 — Contradiction sur la licence

**Statut : confirmé.**

Le dépôt public annonce :

```txt
package.json -> ISC
README badge -> ISC
README final -> ISC
```

Mais le même README indique que la licence exacte reste à arbitrer entre :

- AGPLv3 ;
- GPLv3 ;
- MPL 2.0 ;
- Apache 2.0.

Aucun fichier `LICENSE` n'a été trouvé au commit audité.

### Risque

Pour un dépôt public, l'absence de licence explicite crée une ambiguïté juridique sur les droits de réutilisation.

### Correction

Décider l'un des deux états :

#### État A — licence non décidée

- retirer `"license": "ISC"` ;
- retirer le badge ISC ;
- écrire clairement que le code n'est pas encore licencié pour réutilisation.

#### État B — licence ISC active

- ajouter un fichier `LICENSE` ;
- retirer le texte indiquant que la décision n'est pas prise.

Ne pas conserver les deux positions simultanément.

---

## DOC-06 — P2 — `apps/web/README.md` référence un fichier absent

**Statut : confirmé.**

Le README indique :

```txt
Template d'env: .env.example
```

Le fichier `apps/web/.env.example` n'a pas été trouvé.

En revanche :

```txt
apps/web/.env.local.example
```

existe.

### Correction

Supprimer la référence au fichier absent ou créer un vrai `.env.example` uniquement si deux profils distincts sont réellement utiles.

Éviter deux templates presque identiques.

---

# 9. Règles d'agents et duplication

## TREE-02 — P1 — `.codex` et `.agents` contiennent des copies identiques

**Statut : confirmé.**

Ces deux fichiers sont byte-identiques au commit audité :

```txt
.codex/skills/cleanmymap-repo/SKILL.md
.agents/skills/cleanmymap-repo/SKILL.md
```

Ils ont le même SHA de contenu et annoncent tous les deux `Next.js 15`.

D'autres duplications analogues apparaissent pour les skills d'autorisation et de test UI.

### Contradiction

`AGENTS.md` dit :

> Ne pas dupliquer un même contenu dans deux emplacements parallèles.

### Correction

Si les deux emplacements sont nécessaires pour deux outils différents :

1. choisir une source canonique ;
2. générer l'autre automatiquement ;
3. ajouter un header « fichier généré — ne pas éditer » ;
4. ajouter un test de synchronisation.

Ne pas maintenir deux copies manuelles.

---

## GOV-01 — P1 — Les règles agents ne correspondent plus au workflow voulu

**Statut : confirmé.**

`AGENTS.md` impose actuellement :

> Toute livraison doit se terminer par un push GitHub.

Le workflow désormais souhaité est différent :

- GitHub est la source de vérité de lecture ;
- ChatGPT analyse et produit les fichiers complets ;
- aucune PR ni modification GitHub par ChatGPT ;
- les fichiers sont joints dans le chat ;
- Codex relit, teste, intègre localement et propage les règles.

### Correction

Mettre à jour `AGENTS.md` avec une distinction explicite entre rôles :

#### ChatGPT / agent d'audit et de conception

- lecture GitHub ;
- analyse ;
- génération de fichiers ;
- aucun push ;
- aucune PR.

#### Codex / intégrateur local

- relecture ;
- application locale ;
- tests ;
- propagation ;
- push seulement si l'utilisateur le demande ou si le workflow local l'impose explicitement.

Cette distinction évite qu'un agent suive une consigne incompatible avec son environnement.

---

# 10. Arborescence, fichiers mal placés et fichiers obsolètes

## TREE-01 — P1 — Backlog terminé à la racine

**Statut : confirmé.**

Fichier :

```txt
backlog-codex-permissions-admin-moderation-actions.md
```

Il indique lui-même :

```txt
Reste à faire :
- aucun point bloquant identifié à ce stade dans ce backlog.
```

Pourtant il reste à la racine.

Le script :

```txt
scripts/check-root-file-hygiene.mjs
```

ne l'autorise pas.

### Recommandation

Après vérification de l'absorption des règles :

- déplacer dans `documentation/plans/history/` ;
- ou fusionner les règles durables dans la documentation d'authz et supprimer le backlog.

Ne pas laisser un backlog terminé comme source potentiellement concurrente.

---

## TREE-03 — P2 — `.kiro/specs/suppression-charte-dark` paraît historique

**Statut : très probable.**

Le plan contient encore :

- création de nombreux nettoyeurs spécialisés ;
- tests de propriétés hypothétiques ;
- nettoyage de scripts historiques ;
- checkpoints demandant de poser des questions ;
- création d'une copie complète du projet pour tester.

Cette dernière instruction contredit directement la règle actuelle interdisant les copies parallèles du dépôt.

### Recommandation

Vérifier si cette spec est encore utilisée par Kiro.

Si non :

```txt
documentation/history/tool-specs/kiro/
```

ou suppression après archivage Git.

Si oui :

- ajouter un statut `historical` ou `inactive` ;
- supprimer les instructions incompatibles avec `AGENTS.md`.

---

## TREE-04 — P2 — Tous les fichiers `.bat` contournent le garde-fou racine

**Statut : confirmé.**

`check-root-file-hygiene.mjs` autorise tout fichier se terminant par `.bat`, sans allowlist explicite.

### Risque

Un futur agent peut créer n'importe quel script `.bat` à la racine sans faire échouer le garde-fou.

### Correction

Remplacer :

```txt
tous les .bat sont autorisés
```

par une allowlist explicite des fichiers batch réellement voulus.

---

## TREE-05 — P2 — Scripts utilitaires ponctuels allowlistés à la racine

**Statut : très probable.**

Le garde-fou autorise notamment :

```txt
resize_homepage.js
resize_image.ps1
split.js
```

Aucun usage interne n'a été trouvé par la recherche ciblée.

### Recommandation

Vérifier leur usage réel.

Si ponctuels :

```txt
scripts/media/
scripts/maintenance/
```

ou suppression.

La racine devrait contenir uniquement les vrais points d'entrée de gouvernance et de configuration.

---

# 11. Fichiers manquants ou pertinents à créer

## À créer en priorité

### 1. `apps/web/src/app/api/api-boundary.test.ts`

Seulement après récupération de l'intention historique.

Objectif :

- tester les frontières publiques/protégées/admin ;
- détecter les routes sensibles sans garde d'accès ;
- vérifier les méthodes attendues.

---

### 2. `playwright.config.ts`

Configuration E2E minimale.

---

### 3. `e2e/smoke-public.spec.ts`

Tester uniquement les parcours publics critiques.

---

### 4. `e2e/smoke-authenticated.spec.ts`

Tester un nombre réduit de parcours authentifiés critiques.

---

### 5. `documentation/architecture/adr/ADR-xxx-companion-identity.md`

Décider définitivement :

- Clerk ;
- Supabase Auth ;
- JWT tiers ;
- liaison d'identité ;
- ownership des missions.

---

### 6. `documentation/architecture/adr/ADR-xxx-next-canary-policy.md`

Ou revenir sur stable et ne pas créer l'ADR si la canary n'a pas de raison d'être.

---

### 7. `scripts/run-checks.mjs`

Orchestrateur cross-platform de validation réellement globale.

---

### 8. `scripts/check-stack-doc-drift.mjs`

Détecter les mentions obsolètes de versions dans les documents actifs.

---

### 9. Tests pour `companion-app`

Périmètre initial :

```txt
companion-app/lib/storage.test.ts
companion-app/lib/tracking-service.test.ts
```

---

### 10. `LICENSE`

Seulement après décision de licence.

---

## À créer seulement si le besoin existe réellement

### `CONTRIBUTING.md`

Pertinent si des contributions externes sont réellement souhaitées.

### `.github/CODEOWNERS`

Pertinent quand plusieurs mainteneurs ou domaines de responsabilité existent.

Pour un projet solo, ne pas créer des fichiers de gouvernance décoratifs sans utilité.

---

# 12. Fichiers à déplacer, archiver ou supprimer après vérification

| Fichier ou dossier | Action suggérée | Motif |
|---|---|---|
| `backlog-codex-permissions-admin-moderation-actions.md` | Déplacer ou absorber puis supprimer | Terminé et mal placé à la racine |
| `.kiro/specs/suppression-charte-dark/` | Archiver ou supprimer | Plan historique probable, règles obsolètes |
| `.codex/skills/*` + `.agents/skills/*` | Canonicaliser/générer | Duplications manuelles |
| `supabase/migrations/` + `apps/web/supabase/migrations/` | Garder une seule source canonique | Double source de vérité |
| `resize_homepage.js` | Déplacer ou supprimer | Script racine ponctuel probable |
| `resize_image.ps1` | Déplacer ou supprimer | Script racine ponctuel probable |
| `split.js` | Déplacer ou supprimer | Script racine ponctuel probable |
| `documentation/security/github-audit-backlog.md` | Réécrire | Snapshot et backlog courant mélangés |
| anciens plans IA/Kaizen encore présents sur GitHub | Remplacer par versions récentes | État du repo dépassé |

---

# 13. Autres incohérences pertinentes

## RUNTIME-01 — P2 — Deux endpoints de test email

Le dépôt contient au moins :

```txt
/api/send
/api/email/test
```

Le premier accepte un token statique optionnel ; le second impose l'accès admin.

### Recommandation

Choisir une seule surface de test email.

Option préférée :

- garder `/api/email/test` admin-only ;
- supprimer ou restreindre `/api/send` si son rôle est seulement le test.

Ne pas maintenir deux chemins aux politiques de sécurité différentes sans justification.

---

## ENV-01 — P2 — Pas de version Node canonique

La CI utilise Node 20.

`apps/web/README.md` demande Node 20+.

Mais aucun de ces mécanismes n'a été trouvé :

```txt
.nvmrc
.node-version
package.json -> engines.node
```

### Recommandation

Ajouter au minimum :

```json
"engines": {
  "node": ">=20 <21"
}
```

ou une plage volontairement plus large si elle est testée.

Éviter de dire « Node 20+ » si Node 25 n'est pas réellement supporté.

---

## OSS-01 — P2 — Dépôt public sans fichier `LICENSE`

Le dépôt public annonce ISC dans ses métadonnées mais ne contient pas de fichier `LICENSE` au commit audité.

Ce point doit être résolu avec `DOC-04`.

---

# 14. Ce que je ne recommande pas

Cet audit ne recommande pas :

- une réécriture globale du repo ;
- une migration massive de tous les fichiers ;
- la correction de tous les `any` d'un coup ;
- la suppression immédiate de tous les documents anciens ;
- une campagne de renommage globale ;
- l'ajout de tests sur chaque composant UI ;
- l'installation d'une dizaine de nouveaux outils qualité ;
- le remplacement de Supabase, Clerk ou Vercel ;
- la création automatique de PR ;
- le regroupement de toutes les corrections dans un seul lot.

Le repo est déjà grand. La priorité doit être de **réduire les contradictions entre les garde-fous annoncés et les garde-fous réellement exécutés**.

---

# 15. Ordre d'exécution recommandé pour Codex 5.4 mini

Codex ne doit pas refaire cet audit. Il doit utiliser ce fichier comme backlog de vérification et d'intégration.

## Lot 1 — Contrats cassés, sans refonte

Cibles :

```txt
apps/web/package.json
apps/web/src/app/api/api-boundary.test.ts
scripts/run_checks.ps1
README.md
documentation/development/TESTING.md
```

Objectifs :

1. confirmer le test manquant ;
2. corriger le contrat `npm run checks` ;
3. supprimer les commandes documentaires inexistantes ou les créer.

---

## Lot 2 — Sécurité CI

Cibles :

```txt
.github/workflows/ci.yml
scripts/secret-audit.mjs
```

Objectifs :

1. toujours lancer l'audit de secrets ;
2. ajouter `check:root-files` et `check:doc-governance` ;
3. ajouter un build conditionnel rationnel.

---

## Lot 3 — Application compagnon

Cibles :

```txt
companion-app/App.tsx
companion-app/lib/tracking-service.ts
companion-app/lib/supabase.ts
companion-app/package.json
apps/web/supabase/config.toml
supabase/migrations/20260506000024_companion_gps_schema.sql
```

Objectifs :

1. vérifier l'auth anonyme ;
2. tracer précisément l'identité ;
3. corriger la RPC inaccessible ;
4. ajouter typecheck et tests ciblés.

Ne pas modifier les RLS avant d'avoir établi le modèle d'identité.

---

## Lot 4 — Source de vérité Supabase

Objectif unique :

> déterminer quel arbre de migrations est réellement canonique.

Ne supprimer aucun arbre avant :

- comparaison complète ;
- vérification des scripts CLI ;
- vérification des tests ;
- vérification de la base reconstruite.

---

## Lot 5 — Documentation active

Cibles :

```txt
AGENTS.md
README.md
apps/web/README.md
documentation/development/TESTING.md
documentation/security/github-audit-backlog.md
.codex/skills/cleanmymap-repo/SKILL.md
.agents/skills/cleanmymap-repo/SKILL.md
```

Objectifs :

- versions réelles ;
- workflow agents réel ;
- licence cohérente ;
- suppression des références mortes.

---

## Lot 6 — Nettoyage d'arborescence

Cibles :

```txt
backlog-codex-permissions-admin-moderation-actions.md
.kiro/specs/suppression-charte-dark/
resize_homepage.js
resize_image.ps1
split.js
```

Chaque suppression doit être précédée d'une recherche de références.

---

# 16. Les 10 premières actions concrètes

1. **Corriger la CI pour toujours lancer `security:secrets`.**
2. **Vérifier pourquoi `api-boundary.test.ts` est absent et restaurer la couverture attendue.**
3. **Faire de `npm run checks` une vraie validation globale ou le renommer honnêtement.**
4. **Corriger le contrat cassé entre l'app compagnon et `compute_mission_distance`.**
5. **Décider le modèle d'identité de l'app compagnon avant toute nouvelle fonctionnalité mobile.**
6. **Choisir un seul arbre canonique de migrations Supabase.**
7. **Ajouter un build Next.js conditionnel dans la CI.**
8. **Faire entrer `check:root-files` et `check:doc-governance` dans la CI.**
9. **Réconcilier les versions de stack dans les documents actifs.**
10. **Déplacer ou absorber le backlog terminé présent à la racine.**

---

# 17. Critères de fin de l'audit correctif

L'audit peut être considéré comme traité lorsque :

- l'audit de secrets s'exécute même pour un commit documentaire ;
- `npm run checks` correspond exactement à ce que son nom et sa documentation annoncent ;
- `test:security` ne référence aucun fichier absent ;
- l'app compagnon peut authentiquement démarrer et terminer une mission avec un modèle d'identité cohérent ;
- la distance d'une mission est calculée par un chemin autorisé et testé ;
- une seule source canonique de migrations est désignée ;
- aucune copie manuelle de règles critiques n'est maintenue sans mécanisme de synchronisation ;
- les versions de stack actives sont cohérentes avec les manifestes ;
- `main` dispose du niveau de protection décidé ;
- les backlogs terminés ne restent pas à la racine ;
- les tests E2E minimaux couvrent les parcours les plus critiques ;
- l'application compagnon possède au minimum typecheck et tests métier essentiels.

---

# 18. Conclusion

Le dépôt ne souffre pas principalement d'un manque de sophistication. Au contraire, il souffre par endroits d'une **surabondance de couches de gouvernance et de documentation qui ne sont pas toujours synchronisées avec le code réel**.

Les défauts les plus sérieux sont ceux où un fichier affirme qu'une protection existe alors que le mécanisme réel ne l'exécute pas :

- « audit de secrets » mais pas sur les changements documentaires ;
- « validation globale » mais sans valider l'app web ;
- « suite de sécurité » mais avec un test référencé absent ;
- « app compagnon fonctionnelle » mais avec une RPC inaccessible ;
- « une migration versionnée » mais deux arbres de migrations ;
- « ne pas dupliquer les règles » mais des skills identiques dans deux dossiers ;
- « hygiène racine » mais un backlog terminé interdit à la racine.

La meilleure stratégie n'est donc pas d'ajouter beaucoup plus de code. C'est de **rendre les garanties existantes réellement exécutables, uniques et vérifiables**.

---

## Annexe — Fichiers principaux inspectés

```txt
AGENTS.md
README.md
package.json
apps/web/package.json
apps/web/README.md
apps/web/.env.local.example
apps/web/src/lib/env.ts
apps/web/src/lib/auth/dev-auth.ts
apps/web/src/app/api/send/route.ts
apps/web/src/app/api/email/test/route.ts
apps/web/src/lib/supabase/function-permissions.test.ts
.github/workflows/ci.yml
.github/workflows/codeql.yml
.github/dependabot.yml
scripts/secret-audit.mjs
scripts/run_checks.ps1
scripts/pre_push_guard.ps1
scripts/check-root-file-hygiene.mjs
documentation/development/TESTING.md
documentation/security/github-audit-backlog.md
.codex/skills/cleanmymap-repo/SKILL.md
.agents/skills/cleanmymap-repo/SKILL.md
companion-app/package.json
companion-app/README.md
companion-app/App.tsx
companion-app/lib/supabase.ts
companion-app/lib/tracking-service.ts
apps/web/supabase/config.toml
supabase/migrations/20260506000024_companion_gps_schema.sql
apps/web/supabase/migrations/20260506000024_companion_gps_schema.sql
supabase/migrations/20260520200207_apply_remaining_supabase_advisory_hardening.sql
backlog-codex-permissions-admin-moderation-actions.md
.kiro/specs/suppression-charte-dark/tasks.md
```
