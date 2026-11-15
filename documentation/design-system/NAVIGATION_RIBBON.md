# Ruban de navigation global — contrat canonique

**Statut : `CURRENT`**

CleanMyMap possède une seule présentation publiée du ruban : le ruban
`classic`. Aucun sélecteur runtime, fallback, variable d'environnement ou
géométrie parallèle ne permet de choisir une autre présentation.

## Hiérarchie et responsive

- À gauche, `Accueil`, `Rechercher` et `Préférences` restent dans des groupes
  fonctionnellement autonomes.
- Au centre, le dock des blocs de navigation est rendu à partir de `xl`
  (1280 px) et se centre dans l'espace réellement disponible entre le bord
  droit de `Préférences` et le bord gauche de `Feedback`. La grille `auto /
  espace flexible / auto` conserve cet équilibre lorsque le groupe de compte
  connecté ou déconnecté change de largeur. Sous `xl`, `Sommaire` conserve
  l'entrée mobile/tablette.
- À droite, `Feedback`, notifications, rôle et identité/compte restent
  montés une seule fois. Les libellés secondaires se compactent avant les
  contrôles essentiels ; le groupe reste borné au viewport.
- Les dropdowns réutilisent `CmmDropdown`, conservent leur focus, leur
  fermeture par `Escape`, leurs destinations et leurs permissions.

## Dock des blocs

Le dock conserve les cinq déclencheurs desktop, leur ordre, leurs destinations,
leur tracking et leur zone de clic. Il possède un contour doré discret qui
rehausse la surface sans transformer le dock en bouton.

Le bloc correspondant à la route courante est immédiatement identifiable par
un fond et une icône accentués. Le survol ou le focus clavier d'un bloc inactif
reprend localement le même accent, sans déplacer les voisins ni modifier la
géométrie. L'état de focus reste visible et les info-bulles custom ne sont pas
doublées par un attribut `title` natif.

Les accents des blocs proviennent de `navigation-dropdown-accent-theme.ts`.
Le mode `minimaliste` raccourcit les transitions ; le mode `sobre` les
neutralise. `prefers-reduced-motion` désactive également les transitions de
l'icône.

## Utilitaires et identité

La recherche globale affiche une pastille sombre compacte avec loupe et libellé
`RECHERCHER` dès `xl` lorsque l'espace desktop le permet ; son indication
visuelle `Ctrl K / ⌘ K` n'est pas rendue. Le raccourci Ctrl/Cmd+K, le nom
accessible, le focus et le panneau `CmmDropdown` restent inchangés. Sous
`xl`, la variante loupe seule est conservée.

`Préférences` et `Feedback` sont deux contrôles autonomes. La coordination du
shell garantit qu'un seul menu utilitaire est ouvert à la fois. Feedback utilise
le traitement secondaire neutre noir et blanc, aligné sur Préférences ; son menu
conserve ses quatre destinations, ses noms accessibles, son clavier et son
callout.

La bulle compacte du compte réserve une largeur intrinsèque suffisante à
l'avatar, au statut, aux espacements, au padding et à la bordure. Le groupe
d'identité expose un nom accessible comprenant handle, niveau et nom complet,
même lorsque les détails sont masqués visuellement sous 1440 px. Clerk,
notifications, badges, changement de rôle, permissions et destinations ne sont
pas modifiés.

## Tutoriel guidé

Le tutoriel ne possède aucun déclencheur dans le header global. Il est accessible
depuis l'accueil et `/onboarding`, conserve ses six étapes FR/EN dans l'ordre
d'apparition du ruban — Accueil, Recherche, Préférences, navigation produit,
Feedback, puis profil/statut et espace personnel — et reste une interaction
non modale contrôlée. Son panneau est placé sous le ruban, les cibles gardent
leurs vrais hover/clic/dropdowns, et les zones hors cible sont bloquées et
floutées.

Les actions du panneau placent `Quitter` à gauche et `Précédent`/`Suivant` côte
à côte à droite. Le compteur d'étape n'est pas rendu. Escape, fermeture,
focus, réouverture et fermeture avant navigation restent pris en charge.

## Vérifications

Les contrats unitaires vivent dans
`apps/web/src/components/navigation/`. La suite Playwright publique
`e2e/navigation-ribbon-variants.test.ts` conserve son nom historique pour ne
pas casser les lanceurs existants, mais vérifie exclusivement le ruban classic
aux largeurs 390, 768, 1024, 1280 et 1440 px : centrage, absence de
débordement, états actif/hover/focus, contour doré, Feedback vert, dropdowns,
responsive et captures finales.
