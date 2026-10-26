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
changer lorsque `meniscus` est sélectionné.

Le shell conserve un seul flux :

- `getNavigationSpacesForProfile` fournit les blocs visibles ;
- `getActiveSpaceForPath` détermine le bloc actif depuis la route ;
- `AppNavigationBlockDropdown` conserve les déclencheurs, menus, états de
  focus, ouverture et tracking ;
- `CmmDropdown` et `NavigationDropdownContent` restent les primitives de
  présentation et de contenu.

Le survol ou l'ouverture d'un menu ne déplace donc jamais l'indicateur de
rubrique. Une route sans bloc actif n'affiche aucun indicateur.

## Géométrie de `meniscus`

`meniscus` conserve le ruban desktop de 15rem, son axe central et l'ordre des
blocs visibles. Son indicateur est un élément décoratif non interactif :

- dock sombre arrondi, avec bordure et ombre discrètes ;
- cercle de 44px légèrement surélevé au-dessus du bloc actif ;
- pont SVG de 76px avec deux courbes concaves raccordées au dock ;
- déplacement horizontal de l'indicateur entre 200 et 300ms selon le mode ;
- présentation de l'icône active limitée à une légère translation et échelle ;
- `pointer-events: none` sur l'indicateur et aucun changement de dimension du
  ruban pendant la transition.

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
`e2e/navigation-ribbon-variants.test.ts` sur localhost.
