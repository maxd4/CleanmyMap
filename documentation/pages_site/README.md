# Pages Site

Point d'entrée du registre documentaire route-first.

- [Index maître](./INDEX.md)
- [Charte des pages hors blocs](./charte-pages-hors-blocs.md)
- [Mémoire de non-régression `page-families`](./PAGE_FAMILIES_NON_REGRESSION.md)
- L'arborescence canonique vit dans `./routes/`

Ce dossier sert de source de vérité documentaire pour les pages du site. Le détail de chaque route vit dans sa présentation détaillée canonique.

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
- un `README.md` préfixé par le nom de la page ou de la rubrique et titré avec ce même nom ;
- un `presentation-detaillee.md` préfixé par le nom de la page ou de la rubrique ;
- un `liste-propositions-a-traiter.md` préfixé par le nom de la page ou de la rubrique ;
- un `objectifs-non-pertinents.md` préfixé par le nom de la page ou de la rubrique ;
- un markdown dédié aux exceptions UI de la page, préfixé par le nom de la page ou de la rubrique, quand cela sert à documenter un écart visuel réel.

Les fichiers optionnels ne doivent être créés que quand ils deviennent pertinents pour la page ou la rubrique. Si la page n a pas d exceptions UI, de cas particulier ou de mémoire locale utile, on ne force pas la création d un fichier vide.

Les captures de référence de toutes les pages d'un bloc vivent dans un dossier photo centralisé au niveau d'entrée du bloc. Ce dossier contient des captures `.webp` nommées avec la route, le nom lisible de la page et la date de capture.

Règle de structure photo:

- un seul dossier photo centralisé par bloc ou famille documentaire ;
- aucune page fille ne possède son propre dossier photo ;
- les noms de capture doivent rendre visible la route, le nom de la page et la date ;
- les captures restent en `.webp`.

L'objectif est de centraliser, pour chaque page, à la fois la preuve visuelle, les écarts UI connus et la documentation fonctionnelle.

## Règles spécifiques aux rubriques

Quand un sous-dossier représente une rubrique fonctionnelle du site, il doit aussi contenir un petit noyau documentaire stable:

- un `README.md` préfixé par le nom de la rubrique, par exemple `gamification-README.md` : point d entrée de la rubrique, avec le nom de la rubrique dans le titre H1;
- un `presentation-detaillee.md` préfixé par le nom de la rubrique, par exemple `gamification-presentation-detaillee.md` : rôle, périmètre, états, composants concernés, notes d audit;
- un `liste-propositions-a-traiter.md` préfixé par le nom de la rubrique, par exemple `gamification-liste-propositions-a-traiter.md` : propositions retenues mais pas encore exécutées;
- un `objectifs-non-pertinents.md` préfixé par le nom de la rubrique, par exemple `gamification-objectifs-non-pertinents.md` : mémoire locale des idées écartées pour cette rubrique;
- un dossier photo centralisé au niveau d'entrée du bloc de la rubrique, contenant les captures `webp` de toutes les pages du bloc, nommées avec la route, le nom de la page et la date de capture.

Ces fichiers doivent rester synchronisés avec la spec canonique de la rubrique concernée.
Si une proposition change d état, elle doit être déplacée dans le bon fichier sans duplication.
Si aucune proposition n est active, le fichier `liste-propositions-a-traiter.md` peut rester vide en affichant clairement `Aucune proposition active à ce jour`.
Le titre H1 de chacun de ces fichiers doit commencer par le nom de la rubrique pour éviter les ambiguïtés, par exemple `Gamification - ...`.
Le titre H1 du `README.md` doit aussi commencer par le nom de la page ou de la rubrique.
Les fichiers optionnels ne doivent être créés que quand ils deviennent pertinents pour la rubrique. On évite les fichiers vides créés par anticipation sans besoin réel.

## Mémoire des idées écartées

Chaque sous-dossier de page doit conserver un `README.md`, un `presentation-detaillee.md`, un `liste-propositions-a-traiter.md` et un `objectifs-non-pertinents.md`, tous préfixés par le nom de la page ou de la rubrique.

Le fichier `objectifs-non-pertinents.md` sert de mémoire locale de rejet.

Format attendu :

- `# <Nom de la page ou rubrique> - Objectifs non pertinents`
- `But:`
- `## Liste des objectifs écartés`
- `## Règle de mémoire`
- `## Liens utiles`

La structure doit rester courte, directe, et alignée sur la logique des mémoires locales de rubrique, comme dans `documentation/pages_site/routes/03-cartographie-impact/gamification/gamification-objectifs-non-pertinents.md`.

## Convention de nommage

La règle de nommage est la suivante.

- Le dossier canonique d'une page doit porter le nom de la page ou de la rubrique.
- Les fichiers qu'il contient doivent aussi porter ce même nom en préfixe.
- Le `README.md` n'échappe pas à cette règle.
- Les dossiers photo ne vivent pas dans chaque page : ils sont centralisés au niveau d'entrée du bloc.
- Les captures de référence restent en `.webp`.
- Les noms de capture doivent inclure la route, le nom lisible de la page et la date.

Exemple pour la rubrique `gamification` :

- `gamification-README.md`
- `gamification-presentation-detaillee.md`
- `gamification-liste-propositions-a-traiter.md`
- `gamification-objectifs-non-pertinents.md`
- `03-cartographie-impact-photo/` ou équivalent au niveau du bloc
- captures nommées par exemple `03-cartographie-impact__gamification__2026-06-03.webp`

## Mémoire de non-régression

Les corrections déjà apportées doivent rester vraies.

- Une route canonique doit garder un seul nom.
- Une seule source de vérité doit alimenter à la fois le runtime et les générateurs.
- Les anciens fichiers de compatibilité supprimés ne doivent pas être recréés sans besoin réel.
- Le registre des familles de pages doit rester aligné avec le manifeste partagé.
- Toute nouvelle exception doit être déclarée, testée et documentée en même temps.
- Une modification de famille doit toujours traverser le runtime, la doc et le test de cohérence.

## Style de rédaction

Les futurs markdown de `./routes/` doivent garder le même style de lecture.

- Phrases courtes et directes.
- Détail précis, sans verbiage.
- Chiffres exacts, jamais approximatifs.
- Unités abrégées, par exemple `kg`, `pts`, `px`.
- Listes sans article en tête quand c'est possible.
- Une idée par phrase.

Ce style s'applique aux présentations, aux légendes et aux notes métier de chaque sous-dossier.
