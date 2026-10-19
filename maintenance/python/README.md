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

Les fichiers de dépendances (`requirements.txt`, `requirements-dev.txt`,
`requirements-lock.txt`) et `pytest.ini` définissent l'environnement de ce
sous-arbre. Le fichier de contraintes est une résolution testée, pas une
nouvelle application ou un second gestionnaire de paquets.

## État de compatibilité Python

| Statut | Version | Preuve |
|---|---|---|
| `SUPPORTED` | Python 3.14.x | Installation et suite Python vérifiées sur Python 3.14.3 |
| `COMPATIBILITY_TESTED` | Python 3.14.3 | `pip check`, imports, compilation et `45 passed` |
| `NOT_TESTED` | Python 3.15 | Aucun interpréteur 3.15 disponible dans l'environnement de validation |
| `BLOCKED_ENVIRONMENT` | Python 3.15 | À revalider dès qu'un interpréteur et les wheels nécessaires sont disponibles |

Python 3.10 n'est plus supporté par le cycle courant. Python 3.15 n'est pas
déclaré supporté tant que son installation et les tests nécessaires n'ont pas
réussi.

## Installation reproductible

Depuis `maintenance/python/` :

```powershell
py -3.14 -m venv .venv
.venv/Scripts/python -m pip install --upgrade pip
.venv/Scripts/python -m pip install -r requirements-dev.txt -c requirements-lock.txt
```

`requirements-lock.txt` est régénéré après une mise à jour volontaire des
versions testées, dans un environnement Python 3.14 propre :

```powershell
.venv/Scripts/python -m pip install --upgrade pip
.venv/Scripts/python -m pip install -r requirements-dev.txt
.venv/Scripts/python -m pip freeze --all | Select-String -NotMatch '^pip==' | Set-Content requirements-lock.txt
```

La résolution doit ensuite être vérifiée par `pip check`, les imports, la
compilation et la suite pytest. Le lockfile contient des versions de paquets,
pas des chemins locaux ni des secrets.

La lane de couverture SonarQube conserve l'installation source explicite de
`fpdf==1.7.2`, car le contrat `fpdf` 1.x de `report_generator.py` ne dispose
pas d'une wheel compatible dans cette lane. Elle n'utilise pas le lockfile
général pour cette exception :
`requirements-sonarqube-source.txt` impose la version exacte et le hash SHA-256
de la distribution source, avec `--no-deps` dans l'environnement CI isolé.
Les autres dépendances de cette lane restent installées avec
`--only-binary=:all:` et les contraintes testées.

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
prévus par l'outil ou dans un dossier technique dédié. Les candidates locales
de validation sous `.artifacts/` ne sont pas des preuves versionnées ; les
preuves durables relèvent de `documentation/`.

Pour un changement Python, lancer les tests ciblés depuis ce dossier avec son
environnement Python et son fichier `pytest.ini`.
