# Import de données — point d'entrée

Ce dossier regroupe la documentation spécialisée du parcours d'import et de
normalisation des données CleanMyMap. Ce README est son point d'entrée local ;
il ne remplace pas les contrats canoniques d'architecture ou de données.

## Sources canoniques

- [Gouvernance des données](../../architecture/data-governance.md) — entités,
  tables canoniques, provenance et frontières runtime/legacy ;
- [Pipeline d'import](./pipeline-import.md) — parcours source → normalisation
  → validation → stockage → restitution ;
- [Sources](./sources.md) — origine et statut des données importées.

## Parcours d'import

1. [Sources](./sources.md) pour identifier l'origine et le statut du jeu de
   données ;
2. [Mapping des colonnes](./mapping-colonnes.md) pour appliquer la
   correspondance source ;
3. [Schéma de normalisation](./schema-normalisation.md) pour produire un
   payload conforme ;
4. [Règles de nettoyage et cas limites](./regles-nettoyage-et-cas-limites.md)
   pour contrôler les valeurs et les cas ambigus ;
5. [Pipeline d'import](./pipeline-import.md) pour exécuter et vérifier le flux ;
6. [Pré-cutover dry-run](./pre-cutover-dry-run.md) avant une bascule contrôlée ;
7. [Import administrateur depuis Google Sheet](./google-sheet-admin-import.md)
   pour le parcours opérateur concerné.

## Tables et frontière runtime

- `public.actions` est la table canonique des actions.
- `public.trash_spotter_spots` est la cible unique de tout nouveau
  `spot` / `clean_place`.
- `public.spots` est une archive legacy read-only. Elle n'est jamais une voie
  d'import runtime ; ses lectures éventuelles sont réservées aux opérations
  historiques de maintenance ou d'export.

Le détail des contrats et de la migration legacy reste dans la gouvernance des
données ; ne pas recopier ces règles dans les documents de parcours.

## Références

Les supports opérationnels historiques sont conservés séparément du parcours
actif :

- [Mode d'emploi Trash Spotter — PDF](./references/trash_spotter_mode_emploi.pdf) ;
- [Mode d'emploi Trash Spotter — texte](./references/trash_spotter_mode_emploi.txt).

Ces fichiers sont des références documentaires et ne constituent pas une
source d'écriture runtime.
