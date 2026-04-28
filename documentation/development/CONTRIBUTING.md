# Contribuer à CleanMyMap

Tout d'abord, merci de considérer d'apporter votre contribution à CleanMyMap ! C'est grâce ou contributeurs que nous pouvons offrir la meilleure plateforme citoyenne possible.

## 1. Pour Commencer
Avant de démarrer :
- Consultez le [README.md](./README.md) pour les instructions de démarrage rapide.
- Vérifiez d'avoir installé Node.js 20+ et npm 9+.
- Pour bien comprendre notre architecture et nos conventions, veuillez impérativement lire le [Documentation Hub](./documentation/README.md).

## 2. Configuration de l'Environnement
1. **Cloner le dépôt** : `git clone git@github.com:maxd4/CleanmyMap.git`
2. **Installer les dépendances** : `npm install` (Nous utilisons strictement les `workspaces` npm, ne pas utiliser `yarn` ou `pnpm`).
3. **Configurer les variables d'environnement (`.env`)** : La marche à suivre est détaillée dans [`gestion-secrets-et-env.md`](./documentation/technical/gestion-secrets-et-env.md).

## 3. Workflow de Développement
- Le code actif de l'application se trouve exclusivement dans le dossier `apps/web/`.
- **Scripts et Validation** : Toujours exécuter les vérifications de base en local avant de valider votre code (commit).
  ```bash
  npm run lint
  npm run typecheck
  npm run test
  ```
- Assurez-vous que chaque nouvelle logique introduite soit testée.

## 4. Soumettre vos modifications (Pull Requests)
1. **Nommage des branches** : Préfixez vos branches de manière logique (ex: `feat/`, `fix/`, `docs/`, `refactor/`).
2. **Ciblage de la PR** : Gardez vos modifications ("diff") hyper ciblées sur la fonctionnalité ou le bug que vous réglez. Évitez les "mass refactor" globaux dans une seule PR.
3. **Messages de Commit** : Écrivez un historique clair et descriptif pour vos commits (en anglais par convention ou en français selon l'accord de l'équipe).
4. **Vérifications CI** : Assurez-vous que toutes les actions GitHub et les vérifications de non-régression (`npm run test:regression-gates`) passent au vert.

## 5. Règles Documentaires et d'Architecture
- Nous appliquons strictement un paradigme **Visual-First**. Si une explication textuelle architecturale ou métier met plus de 5 lignes, vous devez créer un diagramme au format texte (Mermaid) à la place. Lisez le `[README.md](./documentation/README.md)` de la documentation pour plus détails.
- Vous devez toujours inclure le contexte projet (`project_context.md`) et la mémoire de session historique (`latest-session.md`) si vous altérez des éléments structurels majeurs à l'aide d'IA (voir `AGENTS.md`).
