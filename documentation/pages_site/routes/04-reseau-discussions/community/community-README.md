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

La page affiche un `PageHeader` unique avec les deux destinations URL
`Communauté` et `Partenaires`. Dans `Communauté`, la liste est organisée par
les onglets légers `À venir`, `Mes inscriptions` et `Passées`. Les missions
restent compactes : `Participer` est l'action principale et les actions de
relais, de création de l'action terrain et de partage sont repliées dans le
détail. Les seules passerelles générales en bas de page sont l'annuaire et la
messagerie.

## Périmètre fonctionnel actuel

L'onglet `Communauté` expose uniquement :

- les missions à venir et passées publiées par le contrat `community_events` ;
- le RSVP (`yes`, `maybe`, `no`) avec authentification demandée par la
  mutation ;
- `Mes inscriptions`, dérivé du statut RSVP retourné pour le compte courant ;
- l'organisation d'une mission dans un parcours replié, sans modification du
  payload ou des permissions de création. Pour un visiteur anonyme, l'onglet
  explique qu'une connexion est nécessaire et le formulaire de création reste
  fermé jusqu'à l'authentification ; aucun brouillon n'est saisi avant la
  redirection.

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

## Nettoyage des anciens contenus de solutions

La page ne rend aucun `CommunitySolutionsView` et ne monte aucun shell de chat,
bloc légal, FAQ générale, campagne, kit d'organisation ou promesse « Mission
Zéro Déchet ». Un lien vers `/sections/messagerie` peut orienter vers la
conversation canonique, mais la messagerie n'est pas embarquée dans cette
surface.

Les autorités juridiques restent leurs pages dédiées :
`/mentions-legales`, `/conditions-generales-utilisation`,
`/politique-confidentialite` et `/politique-cookies`. Les anciennes réponses FAQ
qui promettaient un délai de modération, un certificat d'impact, une formule
fixe, un export collectivité ou une capacité partenaire non démontrée n'ont pas
été recopiées. Les parcours exacts restent portés par leurs surfaces runtime :
`/signalement`, `/actions/new`, `/methodologie`, `/profil/impact`,
`/sections/elus`, `/reports`, `/sections/open-data` et
`/sections/annuaire`.

Les ressources de sensibilisation valides existent déjà dans
`/learn/bonnes-pratiques`, notamment la campagne Gestes Propres avec sa source
et sa date. Les chiffres et slogans non sourcés de l'ancien kit campagnes ne
sont pas conservés. Les éléments territoriaux de l'ancien bloc Mission Zéro
Déchet relèvent de `/sections/elus` uniquement lorsqu'un contrat les prouve ;
aucune promesse de labellisation, d'audit gratuit ou de standard d'excellence
n'est actuelle.

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
