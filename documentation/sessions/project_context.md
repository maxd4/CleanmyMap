# Project Context

Index semi-stable du contexte nécessaire pour travailler sur CleanMyMap. Les
états de chantier, résultats de tests, métriques et décisions temporaires
restent dans les sources de session ou les documents d'audit appropriés.

## Applications et stack

- Monorepo CleanMyMap : `apps/web` (Next.js App Router, React, TypeScript) et
  `apps/mobile` (Expo/React Native).
- `maintenance/python/` reste hors du runtime applicatif.
- Données et backend : Supabase/PostgreSQL (mode lié uniquement ; Docker/WSL
  local en pause).
- Identité : Clerk pour Web et Mobile, intégré à Supabase via le jeton Clerk.
- Dépendances : npm workspaces ; le lockfile racine est canonique.

## Sources canoniques à relire

- Gouvernance et exécution : `AGENTS.md` et le `AGENTS.md` scoped concerné.
- Découverte technique Web/Mobile :
  `documentation/development/AI_DEVELOPER_GUIDE.md`, `apps/web/src/lib/README.md`,
  `apps/mobile/README.md`.
- Architecture et frontières : `documentation/architecture/README.md`,
  `documentation/architecture/master-architecture.md` et ADR applicables.
- Données, SQL et Supabase : `documentation/database/README.md`,
  `documentation/architecture/data-governance.md`, `apps/web/supabase/AGENTS.md`,
  `documentation/operations/runbook-supabase-convergence.md`.
- Sécurité et accès : `documentation/security/README.md`.
- Design system : `documentation/design-system/README.md`.
- Validation, preuves et qualité : `documentation/development/TESTING.md`.
- Session et budget : `documentation/sessions/history/latest-session.md` et
  `documentation/operations/agent-memory-governance.md`.

## Exclusions de contexte

- `.codexignore` exclut les sorties générées (`artifacts/`, `**/artifacts/`,
  `.quarto/`, `**/.quarto/`).
- `artifacts/` reçoit les sorties locales générées (audits, preuves,
  catalogues SQL, graphes) sans être versionné.
- Ne pas scanner par défaut : `node_modules/`, `.next/`, `.vercel/`,
  `.playwright-mcp/`, `.gitnexus/`, `artifacts/`, `backups/` et caches Quarto.

## Doctrine de lecture progressive et outillage de découverte

Pour une tâche ordinaire, lire dans cet ordre :

1. `AGENTS.md` + `AGENTS.md` scoped applicable ;
2. `AI_DEVELOPER_GUIDE.md` / `documentation/database/README.md` et le README du
   domaine concerné ;
3. le sous-graphe statique ciblé via `npm run query:architecture-import-graph`
   (sur un graphe produit par `npm run audit:architecture-import-graph` avec SHA
   et provenance vérifiés) ;
4. le fichier cible, ses dépendances directes, callers, routes/RPC littérales et
   tests directement liés ;
5. la documentation canonique du domaine et les contrats `CURRENT` ;
6. le contexte complémentaire seulement si un doute réel subsiste.

## Frontières et zones sensibles

- `apps/web` : frontières Server/Client et AuthN/AuthZ côté serveur préservées.
- `apps/mobile` : contrats d'identité Clerk, missions/GPS, RLS et finalisation
  serveur protégés.
- Migrations Supabase : unique arbre éditable sous `apps/web/supabase/migrations/`.
- Zones sensibles : AuthN/AuthZ, rôles, permissions, proxy, ingestion, RPC,
  migrations, administration, modération, messagerie, PII, secrets et RLS.

## Points d'entrée de session et validation

- Démarrage : `npm run session:bootstrap` et `npm run session:budget`.
- Validation ciblée : `npm run checks:fast` (budget 180 s).
- Gates applicatives : `npm run test:regression-gates` et tests ciblés du
  workspace concerné (`npm run test -w apps/web -- ...`).
- Validation globale (`FULL`) : uniquement sur demande explicite ou préparation
  de déploiement Vercel (`documentation/development/TESTING.md`).
- Clôture : `npm run session:close -- --done "..." --next "..." --risk "..."`.

## Protocole de session

1. Lire `AGENTS.md`, le `AGENTS.md` scoped applicable, `project_context.md` et
   `latest-session.md`.
2. Identifier owners, contrats, callers, consommateurs et invariants concernés.
3. Modifier le périmètre minimal et valider proportionnellement au risque.
4. Mettre à jour `latest-session.md` à la clôture ; ne pas transformer ce
   fichier semi-stable en journal de chantier.
