# Direction UX - Bloc Visualiser

## Mission
Le bloc Visualiser doit rendre le terrain lisible. Il sert a comprendre l'etat d'une zone, a reperer, filtrer, comparer et verifier avant d'agir.

## Rubriques existantes
- `Carte des actions` -> `/actions/map`
- `Visualiser la carte` -> `/sections/sandbox`
- `Meteo` -> `/sections/weather`

## Theme couleur recommande
- Axe chromatique : azur, bleu profond, cyan cartographique
- Role : lecture spatiale, profondeur, couches d'information
- Fond de bloc : `bg-[linear-gradient(180deg,rgba(22,46,74,0.95),rgba(18,58,90,0.98))]`
- Overlay / glow : `from-sky-400/15 via-cyan-400/10 to-transparent`
- Bordure : `border-sky-300/20`
- Hover border : `hover:border-sky-300/42`
- Surface secondaire : `bg-[rgba(32,78,115,0.80)]`
- Ombre : `shadow-[0_24px_56px_-32px_rgba(56,189,248,0.28)]`
- Texte secondaire : `text-white/80`
- Chips / badges : `bg-sky-400/14 text-sky-100 border-sky-200/18`
- Regle stricte : aucun blanc ni noir sur les surfaces, bordures, overlays ou ombres. Reserve au texte uniquement.

## Direction UX
- UX d'exploration, pas UX de formulaire.
- La carte et les filtres doivent rester les pieces centrales du bloc.
- La lecture spatiale, les couches d'information et les changements d'etat doivent etre immediatement perceptibles.
- Les controles doivent etre compacts et robustes.

## Regles d'interface
- Barre d'outils courte, stable, sans chevauchement.
- Filtres regroupes par familles compréhensibles.
- Toujours distinguer: vue, filtre, legende, details.
- Les panneaux secondaires ne doivent pas masquer la carte plus que necessaire.

## Signaux de reussite
- L'utilisateur comprend rapidement ce qu'il regarde.
- Les filtres modifient la vue sans ambiguite.
- Le bloc aide a preparer l'action et a verifier l'etat du terrain.

## A eviter
- overlays trop envahissants
- outils caches derriere plusieurs clics
- surcharge d'indicateurs simultanes
- texte long dans des zones de controle
