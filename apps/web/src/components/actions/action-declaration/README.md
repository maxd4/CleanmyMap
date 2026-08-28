# Déclaration d'action

Cette capacité contient le parcours UI de déclaration d'une action, depuis
l'initialisation du formulaire jusqu'à la revue et à la soumission. Elle
compose les étapes React et conserve les comportements d'interface associés
; elle ne remplace pas le domaine Actions canonique.

## Structure

```text
action-declaration/
├── before/      parcours pré-action, avant le formulaire complet
├── form/       orchestration du formulaire, champs, revue et aides
├── steps/      étapes React du parcours de déclaration
├── hooks/      hooks d'interface partagés par le parcours
├── sections/   sections de collecte et de résultats terrain
├── ui/         briques visuelles réutilisables du formulaire
├── payload.ts  construction du payload de déclaration
├── draft-storage.ts
└── types.ts    contrats UI partagés par payload, brouillon et étapes
```

Les tests restent à côté du module vérifié. Le dossier `form/` peut contenir
les helpers de validation et de présentation strictement liés au formulaire ;
une règle métier réutilisable par d'autres surfaces doit être réévaluée pour
un placement dans `apps/web/src/lib/actions/`.
Le dossier `before/` regroupe le modèle déterministe, le hook d'orchestration
et les sections contrôlées du parcours pré-action. Il ne contient ni champ de
récolte finale ni copie des contrats métier canoniques.

## Dépendances

```text
components/actions/action-declaration
        ↓
components/actions/action-declaration/{before,steps,sections,ui}
        ↓
lib/actions/{contracts,geometry,quality,signalement,...}
```

Les entrées externes importent le formulaire depuis
`@/components/actions/action-declaration/form` ou son fichier d'implémentation
dans ce dossier. L'ancien répertoire dédié au formulaire n'existe plus et ne
doit pas être recréé.

## Règles de placement

- Ajouter une étape dans `steps/` lorsqu'elle représente une étape visible du
  parcours.
- Ajouter une section de collecte ou de résultats dans `sections/`.
- Ajouter une brique de présentation sans orchestration dans `ui/`.
- Garder le parcours pré-action dans `before/` : `form.tsx` compose le hook,
  les sections et les briques UI ; aucune section ne doit gérer le réseau ou
  la persistance.
- Garder `payload.ts`, `draft-storage.ts` et `types.ts` à la racine lorsqu'ils
  sont partagés par plusieurs parties de la capacité.
- Garder les tests avec leur capacité et ne pas créer un dossier par fichier.
- Ne pas déplacer les contrats métier Actions hors de `lib/actions` pour des
  raisons de proximité UI.
