# GitHub Actions, Dependabot & Security Audit

## Date: 2026-04-26
## Statut: ✅ Audit terminé

---

## 1. GitHub Actions Workflows

### Workflows existants

| Workflow | Fichier | Statut | Notes |
|----------|---------|--------|-------|
| **CI** | `.github/workflows/ci.yml` | ✅ OK | Tests, lint, typecheck, UTF-8 check |
| **CodeQL** | `.github/workflows/codeql.yml` | ✅ OK | Analyse de sécurité automatique |

### Recommandations CI

#### ✅ Déjà en place
- Node.js 20
- Cache npm
- TypeScript typecheck
- ESLint
- Tests vitest
- Vérification UTF-8 (critique pour le FR)
- Vérification lockfile

#### 🔧 Améliorations possibles
1. **Ajouter un timeout** au job CI (éviter les runs bloqués)
2. **Séparer les jobs** pour parallélisation
3. **Ajouter un job de build** pour vérifier le build Next.js

---

## 2. Dependabot Configuration

### Fichier: `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/" # Racine du monorépo
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    groups:
      dependencies:
        patterns:
          - "*"

  - package-ecosystem: "npm"
    directory: "/apps/web" # Dossier spécifique de l'app web
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    groups:
      dependencies:
        patterns:
          - "*"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

### ✅ Points positifs
- Scan npm à la racine et dans apps/web
- Scan GitHub Actions
- Grouping des dépendances (moins de PRs)
- Limite de 10 PRs ouvertes

### 🔧 Améliorations recommandées
1. **Ajouter des reviewers automatiques**
2. **Configurer des labels**
3. **Séparer dev et prod dependencies**
4. **Ajouter des ignore pour certaines majeurs**

---

## 3. Vulnérabilités npm audit

### Résumé: 9 vulnérabilités modérées

| Package | Problème | Sévérité | Fix |
|---------|----------|----------|-----|
| **uuid** | Inefficient Regular Expression Complexity | moderate | Mettre à jour |
| **svix** | Dépend de uuid vulnérable | moderate | Mettre à jour |
| **resend** | Dépend de svix vulnérable | moderate | `npm audit fix --force` (breaking change) |
| **@sentry/nextjs** | Dépendances vulnérables | moderate | Mettre à jour vers 6.3.5+ |
| **@vercel/analytics** | Dépend de next vulnérable | moderate | Mettre à jour vers 1.1.4 |

### Actions recommandées

```bash
# 1. Mettre à jour les dépendances directes
npm update uuid @sentry/nextjs @vercel/analytics

# 2. Pour resend (breaking change - nécessite test)
npm audit fix --force
# OU manuellement:
npm install resend@6.1.3

# 3. Vérifier après correction
npm audit
```

### ⚠️ Breaking changes potentiels
- **resend**: passage de 6.10.0 à 6.1.3 (downgrade) ou upgrade majeur
- **@sentry/nextjs**: passage à 6.3.5+ (semver major)

---

## 4. CodeQL Security Analysis

### Configuration actuelle
- Langage: `javascript-typescript`
- Branches: `main`
- Schedule: Tous les dimanches à 01:30
- Permissions: `security-events: write`

### ✅ Points positifs
- Analyse automatique sur push/PR
- Scan hebdomadaire programmé
- Configuration minimaliste mais fonctionnelle

### 🔧 Améliorations recommandées
1. **Activer les queries étendues** (décommenter ligne 35)
   ```yaml
   queries: security-extended,security-and-quality
   ```
2. **Ajouter une analyse de dépendances**
3. **Configurer des alertes Slack/Teams**

---

## 5. Problèmes ESLint (warnings)

### Warnings détectés
- `@typescript-eslint/no-unused-vars` - Variables non utilisées

### Correction suggérée
```bash
# Lancer le lint avec auto-fix
npm run lint -- --fix
```

---

## 6. Actions prioritaires

### 🔴 Urgent
1. **Corriger les vulnérabilités npm** (9 moderate)
2. **Mettre à jour @sentry/nextjs** (semver major)

### 🟡 Moyen
1. **Améliorer dependabot.yml** (reviewers, labels)
2. **Activer CodeQL extended queries**
3. **Corriger les warnings ESLint**

### 🟢 Faible
1. **Optimiser CI** (parallélisation, timeout)
2. **Ajouter job de build** dans CI

---

## 7. Fichiers à modifier

### `.github/workflows/ci.yml`
```yaml
jobs:
  web-quality:
    runs-on: ubuntu-latest
    timeout-minutes: 15  # Ajouter timeout
    # ... reste inchangé
```

### `.github/dependabot.yml`
```yaml
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "maxd4"  # Ajouter reviewer
    labels:
      - "dependencies"
      - "npm"
    groups:
      dependencies:
        patterns:
          - "*"
        exclude-patterns:  # Exclure les majeurs critiques
          - "next"
          - "react"
          - "react-dom"
```

### `.github/workflows/codeql.yml`
```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    languages: ${{ matrix.language }}
    queries: security-extended,security-and-quality  # Activer
```

---

## 8. Commandes de vérification

```bash
# Vérifier les vulnérabilités
npm audit

# Vérifier les types
npm run typecheck

# Vérifier le lint
npm run lint

# Lancer les tests
npm run test

# Build local
npm run build
```

---

## Résumé

| Catégorie | Statut | Actions |
|-----------|--------|---------|
| GitHub Actions | ✅ OK | 2 workflows fonctionnels |
| Dependabot | ✅ OK | Configuré, améliorations possibles |
| Security (npm audit) | ⚠️ 9 moderate | Mises à jour nécessaires |
| CodeQL | ✅ OK | Fonctionnel, queries étendues recommandées |
| TypeScript | ✅ OK | Aucune erreur |
| ESLint | ⚠️ Warnings | Corrections auto possibles |
