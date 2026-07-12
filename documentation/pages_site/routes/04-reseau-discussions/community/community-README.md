# Communauté

## Fiche canonique

- **Route** : `/sections/community`
- **Famille** : Réseau & Discussions
- **Accès runtime** : `auth-disabled-gate`
- **Palette runtime** : pink
- **Source principale** : `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`

## Objectif utilisateur

Faire circuler l'information, faciliter les échanges entre acteurs et accéder au réseau de partenaires.

## Accès

`apps/web/src/lib/clerk-access.ts` définit :

```txt
community = disabled
```

Pour un visiteur non connecté, la route passe donc par `ClerkRequiredGate` en mode `disabled`.

Ne pas résumer cet état par :

```txt
page publique
```

ou par le terme trop vague :

```txt
protégé
```

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
anonymous disabled gate
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
