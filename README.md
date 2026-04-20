# CleanMyMap Monorepo

Plateforme citoyenne pour déclarer, visualiser et exporter des actions de dépollution.

## Scope
- Active runtime: Next.js app in `apps/web`.
- Legacy Python code is archived under `legacy/` and is not part of the active runtime path.

## Prerequisites
- Node.js 20+
- npm 9+

## Quick start
```bash
npm install
npm run dev
```

## Main commands
- `npm run dev` : start web app (workspace `apps/web`)
- `npm run build` : production build
- `npm run lint` : eslint checks
- `npm run test` : vitest suite
- `npm run test:regression-gates` : critical regression gates
- `npm run checks` : project checks script

## Project layout
- `apps/web/` : Next.js application (frontend + API routes)
- `documentation/` : Architecture, produit, historique sessions IA ([voir le README de doc](./documentation/README.md))
- `scripts/` : root maintenance scripts
- `legacy/` : archived historical Python code

## Backend and ops
For backend bootstrap, env sync and Supabase operations, see:
- `apps/web/README.md`

## Codex Session Memory Workflow
- Persistent rules: `AGENTS.md`
- Project context: `project_context.md`
- Session memory: `documentation/sessions/history/latest-session.md`
- Governance: `documentation/technical/codex-memory-governance.md`

Commands:
- `npm run session:bootstrap`
- `npm run session:close -- --done "..." --next "..." --risk "..."`
- `npm run session:budget`

## Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for full setup, branching, and testing guides.
