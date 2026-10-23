# Import de données — point d'entrée

Ce dossier oriente vers le parcours historique d'import et ses contrats
runtime. Il ne remplace pas la gouvernance des données.

## Sources canoniques

- [Gouvernance des données](../../architecture/data-governance.md) : tables,
  provenance, responsabilités et séparation runtime/legacy.
- [Pipeline d'import et normalisation](./pipeline-import.md) : origines,
  mapping historique (non normatif), qualité, stockage et restitution.
- [Import administrateur Google Sheet](./google-sheet-admin-import.md) :
  parcours d'exploitation et limites de synchronisation.
- [Pré-cutover dry-run](./pre-cutover-dry-run.md) : compte rendu historique
  daté ; ne prouve pas un déploiement ni une validation actuelle.

## Parcours de lecture

1. [Origines et statuts](./pipeline-import.md#origines-et-statuts-des-sources).
2. [Mapping historique](./pipeline-import.md#mapping-historique-des-colonnes-illustratif).
3. [Normalisation et qualité](./pipeline-import.md#normalisation-et-controle-qualite-avant-ecriture).
4. [Exécution, commandes et dépannage](./pipeline-import.md#sequence-dexecution-recommandee).
5. [Parcours d'import administrateur](./google-sheet-admin-import.md).

Les écritures `public.actions` et `public.trash_spotter_spots` passent exclusivement par les
contrats applicatifs autorisés. `public.spots` reste une archive legacy
**read-only** ; aucune nouvelle écriture, modération ou restitution runtime ne
la cible. Voir la [gouvernance des données](../../architecture/data-governance.md)
pour la définition complète de cette frontière.

## Références historiques

- [Mode d'emploi Trash Spotter — PDF](./references/trash_spotter_mode_emploi.pdf).
- [Mode d'emploi Trash Spotter — texte](./references/trash_spotter_mode_emploi.txt).

Ces références n'établissent aucun accès en écriture dans le runtime.
