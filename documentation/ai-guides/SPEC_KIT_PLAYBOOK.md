# CleanMyMap - playbook Spec Kit

Ce guide traduit GitHub Spec Kit en workflow concret pour CleanMyMap.
But: passer d'un prompt direct au code a un cycle spec-first plus robuste.

## Ce que j'ai retenu de Spec Kit

- Spec Kit est centre sur le Spec-Driven Development, avec un cycle `Spec -> Plan -> Tasks -> Implement`.
- Chaque phase produit un artefact Markdown qui alimente la suivante.
- L'installation officielle passe par le depot `github/spec-kit` et `specify-cli`.
- Le tooling supporte plusieurs agents IA et variantes shell/PowerShell.
- Le système peut etre adapte via presets, extensions et overrides projet-local.

## Commandes de base

Installation officielle recommandee:

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@vX.Y.Z
```

Initialisation du projet:

```bash
specify init <PROJECT_NAME> --integration <agent>
```

Sur Windows, Spec Kit fournit aussi des scripts PowerShell. L'initialisation choisit l'integration et la variante de script appropriees.

## Cycle a appliquer dans CleanMyMap

### 1. Spec

- Ecrire ce qu'on veut construire avant d'ecrire la moindre implementation.
- Capturer les user stories, criteres d'acceptation et contraintes.
- Conserver le spec dans un dossier de feature identifie.

### 2. Plan

- Traduire le spec en plan technique lisible.
- Lier les decisions d'architecture, les contrats API et les modeles de donnees.
- Ajouter une quickstart de validation.

### 3. Tasks

- Decouper le plan en taches executables.
- Faire ressortir les dependances.
- Marquer les taches parallelisables quand c'est sur.

### 4. Implement

- Implementer en suivant le plan plutot que le prompt initial.
- Revenir au spec si un point devient ambigu.
- Garder les artefacts a jour quand le code evolue.

## Quand l'utiliser dans CleanMyMap

- Nouveau flux fonctionnel important.
- Refactor structurel qui touche plusieurs modules.
- Feature avec contrats API, schema de donnees ou scenario de validation non trivial.
- Travail IA ou humain qui gagnerait a etre decoupe en artefacts stables plutot qu'en prompts isoles.

## Comment l'utiliser ici

1. Commencer par une spec courte dans un dossier de feature ou de plan.
2. Produire ensuite un plan avec les choix techniques et les risques.
3. Decouper en taches actionnables.
4. N'implementer qu'une fois les artefacts de contexte clairs.
5. Ajouter un mini guide de validation pour le parcours critique.

## Adaptations utiles pour CleanMyMap

- Garder une seule source de verite par feature.
- Faire apparaitre les contrats API et les schemas de donnees avant le code.
- Associer une checklist de tests et de smoke checks au plan.
- Conserver les specs pour les features a forte dette ou a forte coordination.

