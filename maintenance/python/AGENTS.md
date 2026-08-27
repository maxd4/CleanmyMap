# Gouvernance locale — `maintenance/python`

Héritage : gouvernance racine → ce périmètre Python. Ce sous-arbre est hors du
runtime web et mobile.

## Frontière et organisation

- ne pas transformer les scripts historiques ou de maintenance en dépendance
  runtime ;
- ne pas déplacer automatiquement leur logique vers `apps/web` ;
- préserver la séparation entre `src/`, `scripts/` et `tests/` ;
- conserver les contrats de maintenance et la provenance des artefacts.

## Environnement et opérations

- utiliser l'environnement Python et les dépendances propres à ce sous-arbre,
  notamment `requirements.txt`, `requirements-dev.txt` et `pytest.ini` ;
- toute opération DB, import ou cleanup doit être explicite, bornée et
  réversible lorsque cela est possible ;
- ne jamais considérer un script historique comme une opération runtime
  supportée sans preuve actuelle.

## Validation et artefacts

Pour un changement Python, lancer au minimum les tests ciblés correspondants
depuis `maintenance/python/` avec son environnement Python. Étendre à la suite
Python lorsque la frontière commune ou un contrat partagé est concerné.

Les artefacts temporaires et caches doivent être écrits dans les emplacements
prévus par les outils ou dans un dossier technique dédié, jamais à la racine du
dépôt.
