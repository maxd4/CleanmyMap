# Variantes du ruban de navigation central — contrat canonique

**Statut : `CURRENT`**

Ce contrat décrit uniquement la présentation du ruban central de navigation
desktop. Les espaces, routes, profils, menus, états d'ouverture, tracking et
état actif restent ceux du flux de navigation existant.

## Hiérarchie du ruban global

Le shell global conserve les mêmes composants et destinations, mais expose une
hiérarchie visuelle stable afin de distinguer rapidement les niveaux du
produit :

- `primary` regroupe `Accueil` et `Rechercher` ; la marque conserve son accent
  bleu et la recherche reste une surface sombre bordée de cyan ;
- `product` porte le dock central desktop et le bouton `Sommaire` sur les
  largeurs responsive ; le dock reste compact et centré ;
- `utilities` regroupe `Préférences` et `Feedback` dans une surface discrète ;
- `account` sépare les notifications et l'identité de compte par une bordure
  de rythme, sans changer leurs permissions ni leurs menus.

Les boutons du dock central gardent leur nom accessible, leur cible tactile et
leur état actif. En variante `classic`, le nom court est également disponible
au survol et au focus clavier via une info-bulle locale, avec un attribut
`title` comme repli pour les appareils tactiles. La variante `meniscus` garde
son libellé actif émergent et son libellé au survol. Aucun texte structurel
n'est ajouté au mobile : le bouton `Sommaire` reste l'entrée explicite vers la
navigation produit.

## Tutoriel guidé — `CURRENT`

Le bouton `Découvrir le ruban` est disponible dans le groupe des actions
utilitaires. Il ouvre manuellement une visite courte de six étapes : Accueil,
Recherche, navigation produit, Préférences, Feedback, puis profil/statut et
espace personnel. Le bouton reste relançable à tout moment ; aucun autoplay
n'est activé et aucune préférence de masquage automatique n'est donc requise.

La visite utilise `CmmDialog` pour le nom accessible, le focus initial, le
piège clavier, `Escape`, le clic extérieur, le scroll-lock et la restitution du
focus. Un spotlight viewport entoure la cible visible et recalcule sa position
sur `resize` et `scroll`. Sur les largeurs où la recherche ou le dock desktop
ne sont pas rendus, l'étape conserve son explication et cible le groupe
primaire ou le bouton `Sommaire` visible ; les destinations réelles restent
inchangées.

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
blocs visibles. Son indicateur est un seul ensemble visuel mobile : surface SVG,
cercle émergent, icône et libellé actif. La surface et le cercle se déplacent
donc avec la même valeur `left` et la même transition. Le déclencheur actif
reste le vrai bouton de dropdown, rendu transparent sous cet ensemble pour
conserver sa zone de clic, y compris dans la partie émergente :

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

Le bouton actif est positionné sur la même emprise verticale que le cercle,
mais reste dans le flux des cinq déclencheurs ; ses voisins ne bougent pas.
L'indicateur et ses enfants ont `pointer-events: none` : la zone cliquable du
cercle est portée par le bouton de dropdown lui-même, y compris dans sa partie
émergente. Une nouvelle rubrique remplace simplement la valeur `left`, ce qui
permet à la transition en cours d'être interrompue et redirigée sans
téléportation du cercle.

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

## Extensions futures — `PLAN`

Le mécanisme de visite peut être étendu plus tard à des zones indépendantes du
ruban — cartographie, profil, gamification et outils d'action — à condition de
conserver un déclenchement explicite ou une découverte première visite
facilement dismissable, des cibles stables et un parcours court par contexte.
Cette extension n'est pas implémentée dans le contrat `CURRENT` du ruban.
