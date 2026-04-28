# ADR-003 : Structure Monorepo et npm workspaces

*   **Statut** : Accepté
*   **Date** : 20 avril 2026

## Contexte
Le projet CleanMyMap se compose d'une application web principale (Next.js) et potentiellement de futurs modules (outils de scraping, scripts de données, mobile app).

## Décision
Utiliser une structure Monorepo simple basée sur les **npm workspaces**.

**Raisonnement :**
1.  **Simplicité** : Pas besoin de Turborepo ou Nx pour un projet de cette taille au démarrage. Les workspaces natifs de npm suffisent pour partager des configurations.
2.  **Partage de code** : Facilite la gestion des dépendances partagées (ex: types, constantes) entre `apps/web` et d'éventuels futurs dossiers `packages/`.
3.  **Cohérence** : Permet de gérer les versions de Node et les scripts de build de manière centralisée à la racine.

## Conséquences
- **Structure** : L'application réside dans `apps/web/`. Les types partagés devraient à terme être extraits dans un workspace dédié si le projet grandit.
- **Scripts** : Nécessité de naviguer vers `apps/web` pour les commandes spécifiques ou d'utiliser le flag `-w web`.
