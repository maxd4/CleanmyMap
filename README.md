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
- `npm run analyze:heavy-files` : Analyser les fichiers volumineux (modularisation)

## Structure du projet
- `apps/web/` : Application Next.js (frontend + routes API)
- `documentation/` : Architecture, design system, règles de développement, opérations et sécurité
- `scripts/` : Scripts de maintenance à la racine
- `legacy/` : Historique du code Python archivé

## Backend et Ops
Pour l'initialisation du backend, la synchronisation des variables d'environnement et les opérations Supabase, voir :
- `apps/web/README.md`

## Workflow Agent / Mémoire de Session
- Règles globales persistantes : `AGENTS.md`
- Contexte du projet : `project_context.md`
- Mémoire de session en cours : `documentation/sessions/history/latest-session.md`
- Gouvernance mémoire IA : `documentation/operations/agent-memory-governance.md`

Commandes IA :
- `npm run session:bootstrap`
- `npm run session:close -- --done "..." --next "..." --risk "..."`
- `npm run session:budget`

## Contribuer
Consultez le fichier [CONTRIBUTING.md](./documentation/development/CONTRIBUTING.md) pour lire les guides complets d'installation, de contribution et de tests.

## 🔧 Modularisation
Le projet suit un plan de modularisation pour améliorer la maintenabilité.

**📊 Progression : 6.7% (1/15 fichiers)**

**Documentation pour Agents IA** :
- 🤖 [Guide Complet IA](./documentation/ai-guides/AI_MODULARIZATION_GUIDE.md) - Instructions complètes et réutilisables
- 📝 [Aide-Mémoire IA](./documentation/ai-guides/AI_MODULARIZATION_CHEATSHEET.md) - Référence ultra-rapide
- 📈 [Suivi Progression](./documentation/ai-guides/MODULARIZATION_PROGRESS.md) - Tableau de bord

**Commandes** :
```bash
npm run analyze:heavy-files    # Analyser les fichiers volumineux
npm run modularize:report <f>  # Générer un rapport
```

## 🔐 Sécurité
Consultez [SECURITY_GUIDE.md](./documentation/security/SECURITY_GUIDE.md) pour les bonnes pratiques de sécurité et éviter les erreurs courantes (validation d'URL, injection HTML).
