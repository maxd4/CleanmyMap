# GEMINI.md — Guide de Développement Antigravity pour CleanMyMap

Ce document synthétise les repères d'exécution essentiels pour le développement de CleanMyMap avec Google Antigravity (Gemini), dans le respect strict des invariants du projet.

---

## 1. Source de Vérité et Priorité

La source de vérité absolue du projet reste **[AGENTS.md](file:///c:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/AGENTS.md)** à la racine et ses déclinaisons scoped :
- `apps/web/AGENTS.md` (Next.js, SSR, client/server boundaries, authz)
- `apps/mobile/AGENTS.md` (Expo, React Native)
- `scripts/AGENTS.md` (outillage de validation, audits)
- `documentation/AGENTS.md` (règles documentaires et contrats CURRENT)

**Ce fichier `GEMINI.md` n'ajoute ni ne modifie aucune règle métier ou architecturale.**

---

## 2. Invariant de Workflow Git : `MAIN-ONLY / MULTI-WRITER`

* **Travail direct sur `main`** dans le checkout canonique : ne jamais créer de branche locale, worktree ou clone alternatif pour des tâches ordinaires.
* **Chaque lot validé doit être commité et poussé immédiatement sur `origin/main`** :
  ```powershell
  # 1. Validation ciblée
  npm run typecheck -w apps/web
  npm run test -w apps/web -- <motif>

  # 2. Staging ciblé (ne jamais faire git add -A par commodité)
  git add <fichiers-du-lot>

  # 3. Commit structuré avec message conventionnel
  git commit -m "type(scope): message court..."

  # 4. Push fast-forward & convergence
  git push origin main
  git fetch origin main
  git status  # doit être clean : ahead 0 / behind 0
  ```
* **Préservation des modifications préexistantes** : les fichiers modifiés hors de votre lot ne doivent jamais être écrasés ou restaurés arbitrairement.

---

## 3. Commandes et Environnement PowerShell (Windows)

Antigravity s'exécute sur l'hôte Windows avec le shell `powershell`.
- Préférer les commandes PowerShell natives ou universelles Node.js :
  - `Select-Object -First N` plutôt que `head -N`
  - `Select-String` plutôt que `grep`
  - `Test-Path` ou `Get-Item` plutôt que des commandes de test Unix

### Validations Rapides
- **Contrôle de types Web** : `npm run typecheck -w apps/web`
- **Tests unitaires Web** : `npm run test -w apps/web -- <motif-ou-fichier>`
- **Garde-fous pre-commit** : `npm run checks:changed` ou `powershell -ExecutionPolicy Bypass -File scripts/ci/pre_commit_guard.ps1`

---

## 4. Compétences (.agents/skills) et Outils MCP Disponibles

Les compétences spécialisées du projet sont chargées depuis `.agents/skills/` :
- `cleanmymap-repo` : socle de travail et navigation
- `cleanmymap-authz-roles` : gestion des rôles Clerk et capacités
- `cleanmymap-supabase` : schémas PostgreSQL, migrations, RLS et conventions
- `cleanmymap-design-system` : règles UI, composants `Cmm*`, `PageHeader`
- `cleanmymap-performance` / `cleanmymap-accessibility` / `cleanmymap-security`

### Plugins et MCP Connectés
- **Supabase MCP** : accès direct au projet distant (`supabase-vercel-codex`) pour inspection de schémas et exécution SQL.
- **Vercel MCP** : supervision des déploiements et des variables d'environnement.
- **GitHub CLI (`gh`)** : déjà authentifié (`maxd4`).

---

## 5. Invariants Métier Transverses

1. **Un seul owner par comportement** : pas de second registre, calcul ou table concurrente.
2. **Fail-closed** : toute indisponibilité serveur/base renvoie un statut d'erreur structuré, jamais un fallback silencieux ou une valeur nulle considérée comme acquise.
3. **Aucune régression d'AuthZ / RLS** : l'accès privilégié est réservé aux gardes serveur stricts (`requireCreatorAccess`, `requireAdminAccess`) ; `service_role` ne remplace jamais l'authentification utilisateur.
