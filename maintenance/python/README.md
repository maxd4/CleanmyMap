# Maintenance Python

Ce sous-arbre regroupe les scripts historiques et outils de maintenance Python
hors runtime web et mobile. Il conserve la séparation entre code source,
scripts opérationnels et tests.

## Structure

```text
maintenance/python/
├── src/       modules de maintenance réutilisables par ces outils
├── scripts/   points d'entrée ponctuels
└── tests/     tests Python associés
```

Les fichiers de dépendances (`requirements.txt`,
`requirements-dev.txt`) et `pytest.ini` définissent l'environnement de ce
sous-arbre.

## Frontières et règles

- Ne pas importer la logique de maintenance dans `apps/web` ou `apps/mobile`.
- Ne pas traiter un script historique comme une opération runtime supportée
  sans preuve actuelle.
- Toute opération de base de données, d'import ou de nettoyage doit être
  explicite, bornée et réversible lorsque c'est possible.
- Préserver la provenance des données et des artefacts produits.
- Éviter les nouveaux fichiers à la racine ; placer chaque module dans `src/`,
  `scripts/` ou `tests/` selon sa responsabilité.

Les artefacts temporaires et caches doivent rester dans les emplacements
prévus par l'outil ou dans un dossier technique dédié. Ils ne doivent pas être
confondus avec les preuves versionnées de `.artifacts/`.

Pour un changement Python, lancer les tests ciblés depuis ce dossier avec son
environnement Python et son fichier `pytest.ini`.
