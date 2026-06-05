# Legal Navbar - Guide de capture

But : capturer les menus déroulants de la navbar sans perdre l'état ouvert ni le rendu des transitions.

## Principes

- Ouvrir un seul menu à la fois.
- Laisser l'animation se stabiliser avant la capture.
- Ne pas cliquer hors du menu pendant la capture.
- Garder le même cadrage pour comparer les blocs entre eux.

## Ordre recommandé

1. Ouvrir la page cible.
2. Vérifier que la navbar est visible en haut de page.
3. Ouvrir le dropdown du bloc voulu.
4. Attendre la fin de l'animation.
5. Capturer le menu ouvert.
6. Recommencer pour le bloc suivant.

## Réglages de capture

- Desktop : largeur 1440 px minimum.
- Mobile : largeur 390 px ou 430 px.
- Hauteur suffisante pour voir le menu entier.
- Zoom navigateur à 100 %.

## Référence UI

- [Règles UI des menus déroulants](./legal-navbar-regles-ui-menu-deroulants.md)

## Liens utiles

- [Photo desktop](./photo-desktop/)
- [Photo mobile](./photo-mobile/)
