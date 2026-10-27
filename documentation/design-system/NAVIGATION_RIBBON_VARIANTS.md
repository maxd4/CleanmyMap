# Variantes du ruban de navigation central — contrat canonique

**Statut : `CURRENT`**

Ce contrat décrit uniquement la présentation du ruban central de navigation
desktop. Les espaces, routes, profils, menus, états d'ouverture, tracking et
état actif restent ceux du flux de navigation existant.

## Sélecteur et responsabilité

Le sélecteur unique est
`apps/web/src/components/navigation/app-navigation-ribbon-variant.ts` :

```ts
export type AppNavigationRibbonVariant = "classic" | "meniscus";
export const APP_NAVIGATION_RIBBON_VARIANT = "classic";
```

Le modifier à cet endroit est le seul moyen de choisir la présentation. La
valeur `classic` est la valeur publiée par défaut et son rendu ne doit pas
changer lorsque `meniscus` est sélectionné. Pour une validation visuelle
locale, le build peut sélectionner la variante avec
`NEXT_PUBLIC_CMM_NAVIGATION_RIBBON_VARIANT=meniscus` ; toute autre valeur ou
absence de valeur revient à `classic`.

Le shell conserve un seul flux :

- `getNavigationSpacesForProfile` fournit les blocs visibles ;
- `getActiveSpaceForPath` détermine le bloc actif depuis la route ;
- `AppNavigationBlockDropdown` conserve les déclencheurs, menus, états de
  focus, ouverture et tracking ;
- `CmmDropdown` et `NavigationDropdownContent` restent les primitives de
  présentation et de contenu.

Le survol ou l'ouverture d'un menu ne déplace donc jamais l'indicateur de
rubrique ; il peut seulement révéler le libellé du déclencheur survolé. Une
route sans bloc actif n'affiche aucun indicateur.

## Géométrie de `meniscus`

`meniscus` conserve le ruban desktop de 15rem, son axe central et l'ordre des
blocs visibles. Son indicateur visuel est une surface SVG non interactive, mais
le déclencheur actif devient le cercle émergent réellement cliquable :

- dock sombre arrondi, avec bordure et ombre discrètes ;
- cercle ambre de 44px visiblement surélevé au-dessus du bloc actif, avec une
  icône sombre centrée dans le cercle ;
- libellé localisé du bloc actif visible sous le cercle, et du bloc survolé ou
  focusé dans l'espace du dock laissé par l'icône, sans modifier la taille ou
  la zone de clic du bouton ;
- tracé SVG de surface de 88px avec deux épaules concaves raccordées au bord
  supérieur du dock ; le bord supérieur droit du dock est supprimé sous ce
  tracé afin d'éviter une ligne droite qui traverserait le ménisque ;
- déplacement horizontal de l'indicateur entre 200 et 300ms selon le mode ;
- présentation de l’icône active limitée à une légère échelle ;
- `pointer-events: none` sur l'indicateur et aucun changement de dimension du
  ruban pendant la transition.

Les marges négatives compensent la taille du déclencheur actif afin de
préserver la largeur de chaque bloc et la hauteur du ruban. La zone cliquable
du cercle est donc portée par le bouton de dropdown lui-même, y compris dans
sa partie émergente.

La géométrie calculée par
`apps/web/src/components/navigation/app-navigation-ribbon-geometry.ts` reste
bornée par le nombre de blocs réellement visibles. Le cas canonique est celui
des cinq blocs desktop ; l'absence d'une sélection retourne `null`.

## Modes et accessibilité

- `exhaustif` conserve la transition complète et l'éclairage discret ;
- `minimaliste` raccourcit la transition et supprime l'ombre du cercle ;
- `sobre` neutralise ombres, éclairage et mouvement ;
- `prefers-reduced-motion: reduce` neutralise les transitions de l'indicateur
  et de l'icône, quel que soit le mode.

Les SVG décoratifs sont masqués aux technologies d'assistance. Les vrais
déclencheurs restent des boutons avec leur nom accessible, leur focus et leur
gestion de dropdown inchangés. La variante ne s'applique qu'au ruban desktop ;
les surfaces mobile et tablette conservent leur navigation actuelle.

## Vérifications associées

Les invariants de géométrie et de sélection sont couverts par les tests du
dossier `apps/web/src/components/navigation/`. Le comportement intégré des
deux variantes, des dropdowns, des routes, du clavier, des modes d'affichage,
de `prefers-reduced-motion` et des largeurs responsive est vérifié par
`e2e/navigation-ribbon-variants.test.ts` sur localhost. Ce test est exécuté
avec le build par défaut pour `classic`, puis avec
`NEXT_PUBLIC_CMM_NAVIGATION_RIBBON_VARIANT=meniscus` pour `meniscus` ; il ne
modifie pas artificiellement l'attribut HTML de la variante.
