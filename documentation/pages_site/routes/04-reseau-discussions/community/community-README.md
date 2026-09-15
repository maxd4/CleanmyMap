# Communauté

## Fiche canonique

- **Route** : `/sections/community`
- **Famille** : Réseau & Discussions
- **Accès runtime** : `public-visible`
- **Présentation anonyme** : `visible` dans le registre des sections ; aucune participation métier, mutation, donnée privée ou capacité de modération n'est accordée par cette visibilité.
- **Palette runtime** : pink
- **Source principale** : `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
- **Composant rendu** : `apps/web/src/components/sections/rubriques/community/community-section.tsx`

## Objectif utilisateur

Faire circuler l'information, faciliter les échanges entre acteurs et accéder au réseau de partenaires.

## Accès

Le registre `apps/web/src/lib/sections-registry/config.ts` déclare la
présentation anonyme `visible` et la page dynamique rend directement la
section dans ce cas. Les fonctions d'échange, de création ou de coordination
qui nécessitent un compte sont contrôlées séparément par leurs contrats
respectifs ; la visibilité de la page ne les ouvre pas automatiquement.

## Famille visuelle

Le resolver runtime rattache :

```txt
/sections/community
```

à :

```txt
reseau-discussions
```

avec :

```txt
backdropToneKey = pink
```

L'ancien audit indiquant `slate` est obsolète.

## Onglet partenaires

Le contenu partenaire est intégré à la page Communauté.

Alias associés :

```txt
/community
/partners/network
/partners/network/pepite
```

Cibles :

```txt
/sections/community
/sections/community?tab=partners
```

## États

```txt
anonymous visible
authenticated
loading
empty
error
partner tab
```

## Fichiers associés

- [Présentation détaillée](./community-presentation-detaillee.md)
- [Propositions à traiter](./community-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./community-objectifs-non-pertinents.md)
