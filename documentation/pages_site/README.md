# Pages Site

Point d'entrée du registre documentaire route-first.

- [Index maître](./INDEX.md)
- [Charte des pages hors blocs](./charte-pages-hors-blocs.md)
- L'arborescence canonique vit dans `./routes/`

Ce dossier sert de source de vérité documentaire pour les pages du site. Le détail de chaque route vit dans son `README.md` canonique.

## Choix de sobriété

Les pages doivent privilégier la légèreté.

- charger seulement ce qui sert à l'état courant ;
- reporter les calculs lourds à l'ouverture d'un détail ;
- éviter les requêtes et recalculs inutiles sur les vues de lecture ;
- garder une interface stable, rapide et lisible avant tout.

Ce choix est important pour les pages de carte et de supervision. La carte reste fluide. Le détail vient à la demande.

## Structure des sous-dossiers de pages

Chaque page du site possède son propre sous-dossier dans `./routes/`.

Ces sous-dossiers regroupent les éléments de référence suivants :

- des captures plein écran de la page complète ;
- un markdown dédié aux exceptions UI de la page ;
- un markdown de présentation qui explique le fonctionnement de la page et son rôle dans le parcours utilisateur.
- un markdown mémoire des idées écartées, nommé `IDEES_NON_PERTINENTES.md`, qui liste les améliorations jugées hors périmètre pour la page.

L'objectif est de centraliser, pour chaque page, à la fois la preuve visuelle, les écarts UI connus et la documentation fonctionnelle.

## Mémoire des idées écartées

Chaque sous-dossier de page doit conserver un fichier `IDEES_NON_PERTINENTES.md`.

Le fichier sert de mémoire locale de rejet.

Format attendu :

- `# Idées non pertinentes`
- `But:`
- `## Liste des idées écartées`
- `## Règle de mémoire`
- `## Liens utiles`

La structure doit rester courte, directe, et alignée sur la logique de `documentation/product/objectifs-non-pertinents.md`.

## Style de rédaction

Les futurs markdown de `./routes/` doivent garder le même style de lecture.

- Phrases courtes et directes.
- Détail précis, sans verbiage.
- Chiffres exacts, jamais approximatifs.
- Unités abrégées, par exemple `kg`, `pts`, `px`.
- Listes sans article en tête quand c'est possible.
- Une idée par phrase.

Ce style s'applique aux présentations, aux légendes et aux notes métier de chaque sous-dossier.
