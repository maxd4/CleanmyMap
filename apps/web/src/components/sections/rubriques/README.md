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
├── rejoindre-une-action/        composition, formulaires et continuité des actions
├── recycling-question-assistant/ aide au tri
├── route/                        parcours route
├── weather/                      modèles UI et composition de la météo
└── fichiers racine              sections et compositions transverses
```

`rejoindre-une-action/` est l'owner UI de la rubrique d'actions : il regroupe
les composants `rejoindre-un-formulaire-section*` et `rejoindre-une-action*`.
Son entrée publique consommée par le renderer reste
`rejoindre-un-formulaire-section.tsx`; les contrats métier et les actions
restent dans leurs modules canoniques.

`weather/` regroupe la composition météo, ses modèles, son stockage de
préférence et ses tests. Le hook d'interface partagé reste à la racine pour
conserver sa frontière avec la création d'action ; le domaine météo réutilisable
reste dans `src/lib/weather/`.

Les autres sous-dossiers restent centrés sur une rubrique ou une capacité UI
réelle. Les tests restent auprès des modules qu'ils couvrent.

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
