# ADR-003 : Structure Monorepo et npm workspaces

*   **Statut** : Accepté — état courant matérialisé
*   **Date** : 20 avril 2026

## Contexte
CleanMyMap est un seul produit et un seul monorepo. Il contient deux
applications déployables distinctes : `apps/web`, l'application web Next.js,
et `apps/mobile`, l'application mobile Expo / React Native issue de l'ancien
`companion-app`. L'application mobile est actuellement gelée
fonctionnellement et sert de base à la future application mobile complète.

Les deux applications partagent notamment Clerk, Supabase et les contrats
métier nécessaires. Aucune des deux n'est une copie ou un sous-projet
indépendant.

## Décision
Utiliser une structure monorepo simple basée sur les **npm workspaces**, avec
un unique `package-lock.json` à la racine et les deux workspaces suivants :

```txt
apps/web
apps/mobile
```

`packages/` reste une possibilité future pour du code réellement partagé ; ce
dossier n'est pas une partie existante de l'architecture.

**Raisonnement :**
1.  **Simplicité** : Pas besoin de Turborepo ou Nx pour un projet de cette taille au démarrage. Les workspaces natifs de npm suffisent pour partager des configurations.
2.  **Partage de code** : Facilite la gestion des dépendances partagées entre
    `apps/web` et `apps/mobile`, sans imposer prématurément un dossier
    `packages/`.
3.  **Cohérence** : Permet de gérer les versions de Node et les scripts de build de manière centralisée à la racine.

## État courant

La décision historique est maintenant matérialisée par l'arbre suivant :

```txt
apps/
├── web/       application web Next.js
└── mobile/    application mobile Expo / React Native
```

`apps/web/supabase/` reste la source actuelle des migrations conformément à
ADR-006 ; sa relocalisation éventuelle relève d'un autre chantier.

L'identité Clerk et le contrat de finalisation des métriques par trigger
`SECURITY INVOKER` sont finalisés puis gelés. Les limites encore ouvertes sont le traitement
background headless, `mission_actions`, la validation opérationnelle et la
future évolution produit de l'application mobile.

## Conséquences

- **Structure** : deux applications déployables distinctes résident sous
  `apps/`, sans copie de l'application mobile ailleurs.
- **Workspaces** : les dépendances et le lockfile sont gérés à la racine ; les
  commandes ciblées peuvent utiliser `-w apps/web` ou `-w apps/mobile`.
- **Partage de code** : un workspace `packages/` ne sera créé que lorsqu'un
  besoin concret de code réellement partagé le justifiera.
