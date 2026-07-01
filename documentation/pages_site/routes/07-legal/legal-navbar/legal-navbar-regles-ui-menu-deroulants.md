# Legal Navbar - Règles UI des menus déroulants

But : garder les dropdowns de la navbar homogènes, lisibles et cohérents entre les blocs.

## Titre

- `Bloc :` reste en noir.
- Le nom du bloc utilise la couleur du bloc.
- Si le nom contient plusieurs mots, le dégradé doit être progressif du premier mot vers le dernier.
- Le titre doit rester centré.
- La flèche décorative de droite du titre n'est pas utile si elle ne porte aucune action.

## Panneau

- Le panneau doit garder une largeur cohérente entre les blocs.
- Le rendu doit rester adapté au contexte de chaque bloc.
- Le contour doit conserver une identité colorée sans virer uniformément au même ton au survol.
- L'effet de hover doit renforcer la saturation et l'épaisseur, pas remplacer tout le style.

## Cartes du menu

- Chaque ligne doit rester lisible et homogène.
- Les cartes utilisent une icône à gauche.
- Le texte reste en noir ou en très sombre pour garder le contraste.
- La flèche de droite change de couleur au survol selon le bloc.
- Le style de la carte active doit rester visuellement distinct de l'état normal.

## Cohérence visuelle

- Le bloc `Cartographie & Impact` conserve ses variations cyan, rouge et rose selon le contexte.
- Le bloc `Réseau & Discussions` conserve sa logique violet vers rose.
- Le bloc `Apprendre` conserve sa logique jaune vers orange.
- Les menus doivent garder la même densité visuelle entre desktop et mobile, avec adaptation des dimensions au contexte.

## Interaction

- Sur desktop, le menu s'ouvre au survol et se ferme en quittant la zone.
- Sur tablette et mobile, le tap sur l'icône du bloc fait un toggle d'ouverture.
- Le menu ne doit pas se refermer pendant la lecture tant que le pointeur ou le focus reste dans sa zone.

## Référence de contrôle

- Vérifier le centrage du titre.
- Vérifier que `Bloc :` reste noir.
- Vérifier la présence des icônes.
- Vérifier la cohérence des largeurs et hauteurs.
- Vérifier la couleur de la flèche au survol.
