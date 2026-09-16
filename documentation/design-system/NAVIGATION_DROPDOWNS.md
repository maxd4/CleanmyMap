# Menus déroulants de navigation — contrat UI

Ce document est la source UI canonique des menus déroulants de la navigation
par bloc. Il remplace l'ancien guide placé sous `pages_site/routes/07-legal/`
qui décrivait un composant partagé et non une page légale.

## Capture et comparaison

- Ouvrir un seul menu à la fois et attendre la fin de l'animation.
- Garder le même cadrage pour comparer les blocs entre eux.
- Sur desktop, utiliser une largeur d'au moins 1440 px ; sur mobile, 390 ou
  430 px lorsque la capture mobile est nécessaire.
- Capturer le menu ouvert sans cliquer hors de sa zone.

Les captures historiques conservées lors de la migration sont des
`SNAPSHOT`. Elles vivent hors de `pages_site/routes/`, dans
`navigation-dropdowns-snapshots/desktop/`, et ne constituent pas une source de
vérité supérieure au runtime ou aux contrats UI.

## Règles visuelles

- Le libellé `Bloc :` reste noir ; le nom du bloc porte sa couleur et son
  éventuel dégradé progressif.
- Le titre reste centré et une flèche purement décorative ne doit pas être
  traitée comme une action.
- Le panneau garde une largeur cohérente, un contour propre au contexte et un
  hover qui renforce la saturation sans remplacer toute la surface.
- Les cartes utilisent une icône à gauche, un texte noir ou très sombre et une
  flèche dont la couleur au survol suit le bloc.
- Chaque carte empile le titre et sa description dans la colonne centrale : la
  description utilise au minimum le token `cmm-text-caption` (environ 12 px),
  est affichée en italique, reste alignée à gauche, sans clamp de lignes, et la
  carte grandit selon son contenu. La composition canonique est donc : icône,
  puis titre et description, puis chevron.
- La primitive locale `NavigationItemText` porte cette hiérarchie commune pour
  les dropdowns, la recherche globale, le ruban compact et le menu responsive :
  label en `cmm-text-small` (14 px minimum), description optionnelle en
  `cmm-text-caption` (12 px minimum), retour à la ligne naturel et aucun clamp.
  Les surfaces fournissent leurs propres couleurs et contrastes.
- Les textes de navigation ne doivent pas être réduits à 9 px, masqués par
  `overflow-hidden` ou abrégés par une ellipse ; si nécessaire, le wrapping
  naturel augmente la hauteur de la carte.
- `Cartographie & Impact` conserve ses variations cyan, rouge et rose ;
  `Réseau & Discussions` sa logique violet vers rose ; `Apprendre` sa logique
  jaune vers orange.

## Interaction

- Sur desktop, le menu s'ouvre au survol et se ferme en quittant la zone.
- Sur tablette et mobile, le contrôle du bloc ouvre ou ferme le menu par
  toggle.
- Le menu reste ouvert tant que le pointeur ou le focus reste dans sa zone.
- Cette navigation non modale suit sa sémantique propre et ne devient pas un
  `CmmDialog`.

## Références

- Primitive et placement des dropdowns :
  `apps/web/src/components/ui/use-dropdown-placement.ts` et
  `documentation/design-system/OVERLAYS_DIALOGS.md`.
- Snapshots historiques :
  `documentation/design-system/navigation-dropdowns-snapshots/desktop/`.
