# Pages Site

Point d'entrée du registre documentaire route-first.

- `INDEX.md` — inventaire maître ;
- `charte-pages-hors-blocs.md` — familles autonomes ;
- `PAGE_FAMILIES_NON_REGRESSION.md` — invariants des familles ;
- `routes/` — arborescence canonique.

## Périmètre

`documentation/pages_site/` décrit chaque page du point de vue utilisateur :

- rôle ;
- contenu ;
- parcours ;
- états ;
- UX/UI ;
- captures ;
- améliorations propres à la page.

Les sujets techniques transversaux restent dans :

```txt
documentation/architecture/
documentation/development/
documentation/security/
documentation/database/
documentation/operations/
```

Pour un sujet mixte :

- résumé fonctionnel ici ;
- détail technique dans le dossier adapté ;
- lien entre les deux ;
- aucune duplication.

## Une route, une fiche canonique

Règle :

```txt
une route canonique
→ un dossier canonique
→ un nom stable
→ une documentation fonctionnelle unique
```

Les alias et redirections restent inventoriés mais ne deviennent pas des pages autonomes artificielles.

## Noyau documentaire d'une page canonique

Chaque page ou rubrique canonique conserve quatre fichiers de base :

```txt
nom-de-page-README.md
nom-de-page-presentation-detaillee.md
nom-de-page-liste-propositions-a-traiter.md
nom-de-page-objectifs-non-pertinents.md
```

Ces quatre fichiers sont le noyau stable.

Les fichiers supplémentaires restent optionnels :

- exception UI ;
- étude spécifique ;
- sources ;
- protocole ;
- backlog temporaire local ;
- document partenaire.

Ne pas créer un fichier optionnel vide uniquement par anticipation.

## Propositions et idées écartées

### `liste-propositions-a-traiter`

Contient uniquement les propositions :

- retenues ;
- pas encore exécutées ;
- spécifiques à la page.

Quand une proposition est terminée :

- la retirer de la liste active ;
- documenter son résultat dans la fiche canonique si nécessaire.

### `objectifs-non-pertinents`

Mémoire locale des idées explicitement écartées.

But :

- éviter de reproposer les mêmes idées ;
- conserver la raison du rejet ;
- rester court.

## Captures

Les captures officielles sont centralisées au niveau du bloc ou de la famille.

Règles :

- un dossier photo centralisé par bloc ou famille ;
- format `.webp` ;
- nom contenant bloc, page ou route et date ;
- pas de dossier photo dupliqué dans chaque page enfant ;
- desktop par défaut ;
- mobile seulement sur instruction explicite.

Exemple :

```txt
03-cartographie-impact__gamification__2026-07-11.webp
```

## Vérification UI

Lorsqu'une vérification visuelle est explicitement demandée :

1. capture desktop ;
2. export `.MD this page` ;
3. comparaison visuelle et sémantique ;
4. vérification des titres, CTA, statistiques, sources, états et accessibilité.

Une capture seule ne suffit pas.

## Sobriété

Les pages doivent privilégier :

- chargement utile seulement ;
- détails à la demande ;
- calculs lourds différés ;
- absence de polling inutile ;
- stabilité du layout ;
- interface lisible.

Cette règle est particulièrement importante pour :

- carte ;
- supervision ;
- rapports ;
- admin ;
- données externes.

## Convention de nommage

Le dossier et les fichiers doivent reprendre le nom de la page ou rubrique.

Exemple :

```txt
gamification/
├── gamification-README.md
├── gamification-presentation-detaillee.md
├── gamification-liste-propositions-a-traiter.md
└── gamification-objectifs-non-pertinents.md
```

## Mémoire de non-régression

- une route canonique garde un nom unique ;
- runtime et générateurs partagent une source ;
- les anciens fichiers de compatibilité supprimés ne sont pas recréés sans besoin ;
- le registre des familles reste aligné avec le code ;
- une exception nouvelle est déclarée, testée et documentée ;
- une modification de famille traverse runtime, documentation et test de cohérence.

## Style

Les fichiers de `routes/` utilisent :

- phrases courtes ;
- une idée par phrase ;
- chiffres exacts ;
- unités abrégées ;
- listes directes ;
- pas de verbiage ;
- pas de source inventée.
