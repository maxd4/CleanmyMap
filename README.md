# CleanMyMap Monorepo

Plateforme citoyenne pour déclarer, visualiser et exporter des actions de dépollution.

## Périmètre (Scope)
- Code actif (runtime) : Application Next.js dans `apps/web`.
- Le code historique en Python est archivé dans `legacy/` et ne fait plus partie du runtime actif.

## Prérequis
- Node.js 20+
- npm 9+

## Démarrage rapide
```bash
npm install
npm run dev
```

## Commandes principales
- `npm run dev` : Démarrer l'application web (workspace `apps/web`)
- `npm run build` : Build de production
- `npm run lint` : Vérifications ESLint
- `npm run test` : Tests vitest
- `npm run test:regression-gates` : Tests de non-régression critiques
- `npm run checks` : Script global de validation du projet

## Structure du projet
- `apps/web/` : Application Next.js (frontend + routes API)
- `documentation/` : Architecture, produit, historique des sessions IA ([voir le README documentaire](./documentation/README.md))
- `scripts/` : Scripts de maintenance à la racine
- `legacy/` : Historique du code Python archivé

## Backend et Ops
Pour l'initialisation du backend, la synchronisation des variables d'environnement et les opérations Supabase, voir :
- `apps/web/README.md`

## Workflow Agent / Mémoire de Session
- Règles globales persistantes : `AGENTS.md`
- Contexte du projet : `project_context.md`
- Mémoire de session en cours : `documentation/sessions/history/latest-session.md`
- Gouvernance mémoire IA : `documentation/technical/agent-memory-governance.md`

Commandes IA :
- `npm run session:bootstrap`
- `npm run session:close -- --done "..." --next "..." --risk "..."`
- `npm run session:budget`

## Contribuer
Consultez le fichier [CONTRIBUTING.md](./CONTRIBUTING.md) pour lire les guides complets d'installation, de contribution et de tests.
