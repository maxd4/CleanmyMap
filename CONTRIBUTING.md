# Contributing to CleanMyMap

First off, thank you for considering contributing to CleanMyMap! It's people like you that make CleanMyMap such a great tool for the community.

## 1. Getting Started
Before you begin:
- Check the [README.md](./README.md) for quick start instructions.
- Ensure you have Node.js 20+ and npm 9+ installed.
- To understand the architecture and conventions, please read the [Documentation Hub](./documentation/README.md).

## 2. Setting Up Your Environment
1. **Clone the repository**: `git clone git@github.com:maxd4/CleanmyMap.git`
2. **Install dependencies**: `npm install` (We strictly use `npm workspaces`, do not use `yarn` or `pnpm`).
3. **Set up `.env` files**: Configuration is detailed in [`gestion-secrets-et-env.md`](./documentation/technical/gestion-secrets-et-env.md).

## 3. Development Workflow
- The active application code lives in `apps/web/`.
- **Scripts and Validation**: Always run checks locally before committing.
  ```bash
  npm run lint
  npm run typecheck
  npm run test
  ```
- Make sure that new logic is tested.

## 4. Submitting Changes (Pull Requests)
1. **Branch naming**: Prefix your branch logically (`feat/`, `fix/`, `docs/`, `refactor/`).
2. **Focus your PR**: Keep your Diff focused on the specific feature or bug you are addressing. Avoid massive rewrites in a single PR.
3. **Commit Messages**: Write clear and descriptive commit messages.
4. **CI Checks**: Ensure all GitHub CI actions and regression gates (`npm run test:regression-gates`) pass cleanly.

## 5. Documentation Guidelines
- We use a **Visual-First** paradigm. If an explanation takes more than 5 lines, create a Mermaid diagram instead. See the `[README.md](./documentation/README.md)` in the `documentation/` folder for details.
- Always include the relevant contexts (`project_context.md`) and session history (`latest-session.md`) when making major code structural changes (see `AGENTS.md`).
