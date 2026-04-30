# Direction UX - Bloc Echanges

## Mission
Le bloc Echanges doit fluidifier les conversations utiles au travail. Il sert a contacter, suivre, relancer et clarifier sans bruit inutile.

## Rubriques existantes
- `Discussions` -> `/sections/messagerie`
- `Messages prives` -> `/sections/dm`

## Theme couleur recommande
- Axe chromatique : rose conversation, magenta doux, framboise sombre
- Role : fil de discussion, signal social, priorisation humaine
- Fond de bloc : `bg-[linear-gradient(180deg,rgba(73,27,56,0.95),rgba(92,32,67,0.98))]`
- Overlay / glow : `from-pink-500/14 via-fuchsia-500/10 to-transparent`
- Bordure : `border-pink-300/22`
- Hover border : `hover:border-pink-300/42`
- Surface secondaire : `bg-[rgba(108,43,84,0.82)]`
- Ombre : `shadow-[0_24px_56px_-32px_rgba(236,72,153,0.28)]`
- Texte secondaire : `text-white/80`
- Chips / badges : `bg-pink-500/14 text-pink-100 border-pink-200/18`
- Regle stricte : aucun blanc ni noir sur les surfaces, bordures, overlays ou ombres. Reserve au texte uniquement.

## Direction UX
- UX conversationnelle orientee efficacite.
- Priorite a la lisibilite des fils, du contexte et des actions en attente.
- Le bloc doit reduire la friction de coordination, pas devenir un espace social distrayant.

## Regles d'interface
- Mettre en avant: conversations recentes, non lus, statut des echanges.
- Toujours rendre visible le contexte d'une discussion: sujet, interlocuteur, canal, derniere action.
- Les actions de reponse, transfert, relance ou resolution doivent etre proches du fil.
- Le mobile doit permettre lecture et reponse d'une main.

## Signaux de reussite
- L'utilisateur sait a quoi repondre en priorite.
- Les conversations actives sont faciles a reprendre.
- Les echanges servent l'execution et la coordination.

## A eviter
- interfaces de chat trop ludiques
- perte de contexte entre liste et detail
- actions critiques cachees
- badges ou animations qui concurrencent le message
