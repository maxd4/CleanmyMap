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

Consulter les missions communautaires, participer par RSVP, retrouver ses
inscriptions authentifiées, organiser une mission via un parcours compact et
accéder au réseau de partenaires.

La page ne duplique pas les capacités canoniques des surfaces Actions,
Messagerie, Annuaire ou Gouvernance des partenariats. Les suivis opérationnels,
KPI, exports, guides et ressources génériques restent sur leurs surfaces
canoniques ; une donnée ou une promesse non sourcée n'est pas affichée ici.

## Accès

La consultation de la page, de ses informations publiques et de l'onglet
`Partenaires` est accessible sans compte : le registre
`apps/web/src/lib/sections-registry/config.ts` déclare la présentation
anonyme `visible` et la page dynamique rend directement la section dans ce
cas. Les actions d'échange, de création ou de coordination qui nécessitent
une identité sont contrôlées séparément par leurs contrats respectifs ; la
visibilité publique ne les ouvre pas automatiquement et ne vaut pas
participation métier, mutation, accès privé ou modération.

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

L'onglet `Partenaires` reste la surface intégrée pour consulter le réseau et
conserver les alias historiques. Les parcours protégés de création ou de
gouvernance partenaire restent `/partners/onboarding` et
`/partners/dashboard`.

## Périmètre fonctionnel actuel

L'onglet `Communauté` expose uniquement :

- les missions à venir et passées publiées par le contrat `community_events` ;
- le RSVP (`yes`, `maybe`, `no`) avec authentification demandée par la
  mutation ;
- `Mes inscriptions`, dérivé du statut RSVP retourné pour le compte courant ;
- l'organisation d'une mission dans un parcours replié, sans modification du
  payload ou des permissions de création.

La surface canonique `/sections/rejoindre-une-action` reste responsable des
inscriptions aux actions de groupe et de leur suivi ; `/missions/[id]` reste
responsable de la lecture protégée d'une mission terrain et de ses données
enregistrées. Communauté ne transforme pas un RSVP en participation terrain et
ne déplace aucun résultat ou KPI vers cette page.

## Destinations canoniques des suivis

Communauté fournit uniquement les liens de sortie vers les surfaces qui
portent déjà ces responsabilités :

- `/actions/history` porte l'historique terrain, sa supervision, ses preuves et
  ses exports ;
- `/reports` porte les lectures d'impact et les conversions calculées à partir
  des événements communautaires et des actions liées ;
- `/pilotage` porte les vues agrégées de staffing, relances, boucles
  post-événement et l'export funnel lorsqu'il est autorisé par son contrat.

L'organisateur ordinaire conserve uniquement, dans le détail de sa propre
mission, les commandes événementielles autorisées par l'API : présence et
post-mortem notamment. Ces commandes personnelles ne sont pas placées derrière
`/pilotage` et ne donnent pas accès à ses agrégats.

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
