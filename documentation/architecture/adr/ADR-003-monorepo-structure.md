# ADR-003 : Structure Monorepo et npm workspaces

*   **Statut** : Accepté — état courant matérialisé
*   **Date** : 20 avril 2026

## Contexte
CleanMyMap est un seul produit et un seul monorepo. Il contient deux
applications déployables distinctes : `apps/web`, l'application web Next.js,
et `apps/mobile`, l'application mobile Expo / React Native issue de l'ancien
`companion-app`. L'application mobile est `CURRENT / ACTIVE DEVELOPMENT` depuis
le lot M0, tout en restant `NOT_PRODUCTION_READY`.

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

### Autonomie des surfaces et frontières UI

Les deux workspaces sont autonomes pour leur runtime, leur UI et leurs modules
de présentation : le web possède sa navigation et ses parcours Next.js ; le
mobile possède son shell natif, sa navigation `Agir` / `Carte` / `Compte`, ses
écrans terrain et son cycle de vie GPS. Le mobile ne cherche pas à reproduire
le chrome ou toutes les pages web. Les deux surfaces réutilisent seulement les
owners communs réellement nécessaires — identité Clerk, data plane Supabase,
routes et services métier serveur — sans transférer la propriété de leur UI ou
de leur lifecycle à l'autre workspace.

Les modules métier mobiles sont regroupés par responsabilité : shell et
navigation, mission/GPS et reprise locale, participation et création d'action,
signalement et média, compte/identité et contact d'urgence. Cette organisation
décrit les frontières actuelles ; elle ne justifie ni un déplacement de runtime
ni une extraction cosmétique.

Les adaptations futures Android et iOS sont engagées séparément selon les
permissions, le background GPS, le cycle de vie, les builds et les contrôles
propres à chaque plateforme. `apps/mobile` reste le workspace Expo / React
Native commun à ces deux cibles. macOS est une cible distincte non engagée :
aucune compatibilité desktop, Catalyst ou runtime macOS ne doit être déduite de
la présence du mobile.

Un workspace ou package partagé ne sera créé que lorsqu'un consommateur réel,
un owner clair et une réduction de duplication ou de divergence seront établis.
Le partage de contrats backend ne suffit pas à justifier un package UI ou un
déplacement de code entre workspaces.

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
`SECURITY INVOKER` sont finalisés et invariants. La V1 mobile couvre le GPS avec
carte et tracé, la reprise/offline, la finalisation serveur et les contacts
d'urgence. Les limites encore ouvertes sont le traitement background headless,
la validation opérationnelle, ainsi que `mission_actions` et la photo native
comme évolutions futures.

## Conséquences

- **Structure** : deux applications déployables distinctes résident sous
  `apps/`, sans copie de l'application mobile ailleurs.
- **Workspaces** : les dépendances et le lockfile sont gérés à la racine ; les
  commandes ciblées peuvent utiliser `-w apps/web` ou `-w apps/mobile`.
- **Partage de code** : un workspace `packages/` ne sera créé que lorsqu'un
  besoin concret de code réellement partagé le justifiera.
