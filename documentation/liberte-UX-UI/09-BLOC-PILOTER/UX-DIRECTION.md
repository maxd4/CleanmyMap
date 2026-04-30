# Direction UX - Bloc Piloter

## Mission
Le bloc Piloter doit servir la supervision, la coordination et la decision. Il s'adresse aux profils qui ont besoin d'une vue transverse, d'arbitrages et d'actions de gouvernance.

## Rubriques existantes
- `God Mode` -> `/admin/godmode`
- `Administration` -> `/admin`
- `Portail Decideur` -> `/sponsor-portal`
- `Gouvernance` -> `/sections/elus`

## Theme couleur recommande
- Axe chromatique : petrol, bleu nuit, cyan acier
- Role : supervision, arbitrage, lecture froide et fiable
- Fond de bloc : `bg-[linear-gradient(180deg,rgba(20,40,52,0.96),rgba(24,52,66,0.99))]`
- Overlay / glow : `from-teal-400/10 via-cyan-400/08 to-transparent`
- Bordure : `border-teal-200/18`
- Hover border : `hover:border-cyan-300/34`
- Surface secondaire : `bg-[rgba(34,69,83,0.84)]`
- Ombre : `shadow-[0_24px_56px_-32px_rgba(45,212,191,0.18)]`
- Texte secondaire : `text-white/78`
- Chips / badges : `bg-cyan-400/12 text-cyan-100 border-cyan-200/16`
- Regle stricte : aucun blanc ni noir sur les surfaces, bordures, overlays ou ombres. Reserve au texte uniquement.

## Direction UX
- UX de controle operationnel.
- Les vues doivent etre stables, denses et fiables.
- Le bloc doit permettre de prioriser, arbitrer et agir sur le systeme sans confusion.
- Les informations sensibles ou structurantes doivent etre explicites et contextualisees.

## Regles d'interface
- Favoriser les tableaux, syntheses, files d'attente, statuts et alertes actionnables.
- Toujours distinguer observation, decision et execution.
- Les permissions et niveaux de criticite doivent etre visibles.
- Les actions irreversibles ou sensibles doivent etre clairement confirmees.

## Signaux de reussite
- Le pilote comprend rapidement ou intervenir.
- Les workflows de supervision sont lisibles.
- Les decisions peuvent etre prises sans reconstituer le contexte ailleurs.

## A eviter
- presentation trop grand public
- sur-decoration visuelle
- actions d'administration melangees avec du contenu secondaire
- interfaces ambiguës sur les permissions ou les consequences
