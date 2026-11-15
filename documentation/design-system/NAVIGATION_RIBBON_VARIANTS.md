# Variantes du ruban de navigation central — contrat canonique

**Statut : `CURRENT`**

Ce contrat décrit uniquement la présentation du ruban central de navigation
desktop. Les espaces, routes, profils, menus, états d'ouverture, tracking et
état actif restent ceux du flux de navigation existant.

## Hiérarchie du ruban global

Le shell global conserve les mêmes composants et destinations, mais expose une
hiérarchie visuelle stable afin de distinguer rapidement les niveaux du
produit :

- `primary` regroupe `Accueil` et `Rechercher`, puis `Préférences` est monté
  comme contrôle autonome dans la zone gauche ; la marque conserve son accent
  bleu et la recherche reste une surface sombre bordée de cyan ;
- `product` porte le dock central à partir de `xl` (1280px) et le bouton
  `Sommaire` sur toutes les largeurs inférieures à `xl` ; une seule de ces
  deux surfaces est donc visible, sans discontinuité entre 1024px et 1279px ;
  le dock est placé sur l'axe du viewport, indépendamment des largeurs
  différentes des groupes latéraux ;
- `Feedback` est monté comme contrôle autonome dans la zone droite, devant les
  notifications, le menu de rôle et l'identité/compte. Préférences et Feedback
  ne partagent plus d'enveloppe visuelle ; une seule coordination d'état garde
  au plus un menu utilitaire ouvert ; sous `xl`, les deux contrôles restent
  accessibles même lorsque la recherche est masquée ;
- `account` sépare les notifications et l'identité de compte par une bordure
  de rythme, sans changer leurs permissions ni leurs menus.

Les boutons du dock central gardent leur nom accessible, leur cible tactile et
leur état actif. En variante `classic`, le nom court est également disponible
au survol et au focus clavier via une info-bulle locale ; le bouton conserve son
`aria-label` et son libellé masqué pour l'accessibilité, sans attribut `title`
natif simultané avec cette info-bulle. La variante `meniscus` garde
son libellé actif émergent et son libellé au survol. Aucun texte structurel
n'est ajouté au mobile : le bouton `Sommaire` reste l'entrée explicite vers la
navigation produit.

À partir de `xl`, la recherche globale est volontairement iconique dans les
largeurs contraintes (libellé visible à partir de `2xl`) afin de préserver la
ligne unique et la largeur utile du compte. Son nom accessible et le raccourci
`Ctrl/Cmd+K` restent disponibles. Le panneau est un dropdown non modal centré
sous la loupe, borné à 24rem et aux marges utilisables du viewport ; il conserve
le focus d'entrée et la navigation clavier.

L'alerte météo est une surface d'information de niveau inférieur (`z-30`) :
elle ne doit pas recouvrir le header, les menus ouverts ou la recherche
(`z-50` et `z-70`). Cette baisse de plan ne change ni son contenu, ni sa
fermeture, ni sa sémantique `role="alert"`.

## Tutoriel guidé — `CURRENT`

Le bouton `Découvrir le ruban` n'est pas rendu dans le header global. Il reste
disponible sur l'accueil comme point d'entrée explicite vers une visite courte
de six étapes : Accueil, Recherche, navigation produit, Préférences, Feedback,
puis profil/statut et espace personnel. Le bouton reste relançable à tout
moment ; aucun autoplay n'est activé et aucune préférence de masquage
automatique n'est donc requise.

La visite utilise `CmmDialog` pour le nom accessible, le focus initial, le
piège clavier, `Escape`, le clic extérieur, le scroll-lock et la restitution du
focus. Un spotlight viewport entoure la cible visible et recalcule sa position
sur `resize` et `scroll`. Sur les largeurs où la recherche ou le dock desktop
ne sont pas rendus, l'étape conserve son explication et cible le groupe
primaire ou le bouton `Sommaire` visible ; les destinations réelles restent
inchangées.

Le tutoriel conserve une hiérarchie d'empilement dédiée : le header (`z-50`)
reste sous le spotlight, le spotlight reste sous le backdrop transparent du
dialogue, et le panneau du tutoriel reste au-dessus du backdrop. Cette couche
modale bloque ainsi les clics vers les contrôles du ruban tout en laissant le
détourage de la cible visible ; la primitive globale `CmmDialog` n'est pas
modifiée.

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
gestion de dropdown inchangés. La variante ne s'applique qu'au dock central à
partir de `xl` ; les surfaces mobile et tablette, ainsi que le `Sommaire` sous
`xl`, conservent leur navigation actuelle.

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
