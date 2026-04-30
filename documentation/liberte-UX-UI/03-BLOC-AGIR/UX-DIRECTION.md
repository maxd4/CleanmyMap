# Direction UX - Bloc Agir

## Mission
Le bloc Agir doit permettre de passer a l'action vite et sans friction. Il sert l'execution terrain: declarer, localiser, prioriser, valider.

## Rubriques existantes
- `Declarer une action` -> `/actions/new`
- `Itineraire IA` -> `/sections/route`
- `Signalement Dechets` -> `/sections/trash-spotter`

## Theme couleur recommande
- Axe chromatique : cyan terrain, bleu action, turquoise technique
- Role : execution, vitesse, precision, orientation immediate
- Fond de bloc : `bg-[linear-gradient(180deg,rgba(17,52,68,0.95),rgba(19,63,78,0.98))]`
- Overlay / glow : `from-cyan-400/16 via-sky-400/10 to-transparent`
- Bordure : `border-cyan-300/20`
- Hover border : `hover:border-cyan-300/40`
- Surface secondaire : `bg-[rgba(33,84,101,0.82)]`
- Ombre : `shadow-[0_24px_56px_-32px_rgba(39,195,217,0.28)]`
- Texte secondaire : `text-white/80`
- Chips / badges : `bg-cyan-400/14 text-cyan-100 border-cyan-200/18`
- Regle stricte : aucun blanc ni noir sur les surfaces, bordures, overlays ou ombres. Reserve au texte uniquement.

## Direction UX
- Logique orientee terrain, mobile-first et tactile.
- Chaque ecran doit reduire l'effort de decision.
- Les interfaces doivent privilegier la saisie guidee, le contexte local et la confirmation claire.
- Le bloc doit inspirer l'action concrete, pas l'analyse.

## Regles d'interface
- CTA dominants et explicites.
- Etapes courtes, progressives, avec retour visible apres action.
- Priorite aux composants de saisie, cartes utiles, statuts et confirmations.
- Tolerance forte aux interruptions et reprises sur mobile.

## Signaux de reussite
- L'utilisateur sait quoi faire maintenant.
- La declaration ou le signalement peut etre termine rapidement.
- Les erreurs sont comprehensibles et recuperables.

## A eviter
- ecrans trop analytiques
- densite visuelle inutile
- vocabulaire abstrait
- actions principales noyees dans des blocs secondaires
