# Rubriques UI

Ce dossier regroupe les sections rendues dans les rubriques de l'application
web, ainsi que leurs compositions, hooks d'interface et états visuels.

## Structure

```text
components/sections/rubriques/
├── annuaire/                    données et UI de l'annuaire
├── climate/                     surfaces climat
├── community/                   communauté et événements
├── compost/                     parcours compost
├── feedback/                    retours et discussions
├── gamification/                surfaces de gamification
├── recycling-question-assistant/ aide au tri
├── route/                       parcours route
└── fichiers racine              sections et compositions transverses
```

Les sous-dossiers restent centrés sur une rubrique ou une capacité UI réelle.
Les tests restent auprès des modules qu'ils couvrent.

## Frontières

- Les composants React et la composition visuelle restent ici.
- Les contrats et la logique métier réutilisable restent dans `src/lib/` ou
  dans leur domaine propriétaire.
- Les routes et le chargement de données restent dans `src/app/` et les
  modules serveur adaptés.
- Une rubrique ne doit pas devenir un dépôt de helpers génériques sans
  propriétaire métier identifiable.

Avant de créer un sous-dossier, vérifier qu'il regroupe plusieurs modules
étroitement liés. Ne pas créer de micro-dossier pour un seul fichier et ne pas
déplacer une capacité métier uniquement pour réduire la taille d'un fichier.

## Validation

Les validations ciblées se lancent depuis la racine du monorepo :

```text
npm run test -w apps/web -- <test-file-or-pattern>
npm run typecheck -w apps/web
npm run lint -w apps/web
```
