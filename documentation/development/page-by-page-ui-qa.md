# QA page par page - capture écran + `.MD this page`

## But

Valider chaque page CleanMyMap sur deux plans en même temps :

- le rendu visuel
- la lisibilité sémantique sans CSS, sans image et sans mise en page

## Workflow recommandé

1. Finaliser ou refondre visuellement la page.
2. Lancer la page en local.
3. Ouvrir la page dans Chrome et exporter le contenu avec `.MD this page` via `Alt+M`.
4. Capturer la page avec le contrôle visuel habituel.
5. Comparer l'extraction Markdown avec la capture écran.
6. Corriger les écarts de structure, d'accessibilité, de SEO et de lisibilité sémantique.
7. Relancer l'export Markdown et la vérification visuelle.
8. Merger uniquement si les deux vues sont propres.

## Ce que l'extraction doit rendre lisible

- le titre principal
- les sections importantes
- les statistiques
- les CTA
- les cartes d'action
- les sources ou statuts affichés
- l'ordre logique de lecture

## Défauts à corriger avec cette méthode

- titres H1/H2/H3 mal hiérarchisés
- textes isolés ou répétés
- statistiques lues dans le mauvais ordre ou incomplètes
- boutons collés dans l'extraction
- libellés techniques
- sections trop vagues
- contenu important visible seulement par le design
- ordre DOM différent de l'ordre visuel
- manque d'`aria-label` ou de texte accessible

## Critère d'acceptation

Une page n'est validée que si :

- la capture écran est propre
- l'extraction Markdown est propre
- la page reste compréhensible sans CSS, image ni mise en page
- le chemin de lecture est cohérent entre DOM, capture et extraction
