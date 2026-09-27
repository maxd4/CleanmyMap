# Déclaration d'action

Cette capacité contient le parcours UI de déclaration d'une action, depuis
l'initialisation du formulaire jusqu'à la revue et à la soumission. Elle
compose les étapes React et conserve les comportements d'interface associés
; elle ne remplace pas le domaine Actions canonique.

## Structure

```text
action-declaration/
├── before/      parcours pré-action, avant le formulaire complet
├── hooks/       lifecycle et orchestration d'état du formulaire
├── sections/   sections visibles de collecte et de résultats terrain
├── ui/          présentation, dialogs, picker et champs du formulaire
├── utils/       modèles et helpers purs du parcours
├── steps/       étapes React du parcours de déclaration
├── action-declaration-form.tsx  orchestration principale du formulaire
├── form.ts      façade publique du formulaire
├── model.ts     contrat UI FormState et dérivations partagées
├── payload.ts   construction du payload de déclaration
├── draft-storage.ts
└── types.ts     contrats UI partagés par payload, brouillon et étapes
```

Les tests restent à côté du module vérifié. Les helpers de validation et de
présentation strictement liés au formulaire sont absorbés par les propriétaires
`hooks/`, `sections/`, `ui/`, `utils/` et la racine du parcours. Une règle métier
réutilisable par d'autres surfaces
doit être réévaluée pour un placement dans `apps/web/src/lib/actions/`.
Le dossier `before/` regroupe le modèle déterministe, le hook d'orchestration
et les sections contrôlées du parcours pré-action. Il ne contient ni champ de
récolte finale ni copie des contrats métier canoniques.

## Dépendances

```text
components/actions/action-declaration
        ↓
components/actions/action-declaration/{before,hooks,steps,sections,ui,utils}
        ↓
lib/actions/{contracts,geometry,quality,signalement,...}
```

Les entrées externes importent le formulaire depuis
`@/components/actions/action-declaration/form`. Cette façade fichier stabilise
l'import public sans réintroduire un répertoire `form/`.

## Règles de placement

- Ajouter une étape dans `steps/` lorsqu'elle représente une étape visible du
  parcours.
- Ajouter une section de collecte ou de résultats dans `sections/`.
- Ajouter une brique de présentation sans orchestration dans `ui/`.
- Garder le parcours pré-action dans `before/` :
  `action-declaration-form.tsx` compose le hook,
  les sections et les briques UI ; aucune section ne doit gérer le réseau ou
  la persistance.
- Garder `payload.ts`, `draft-storage.ts` et `types.ts` à la racine lorsqu'ils
  sont partagés par plusieurs parties de la capacité.
- Garder les tests avec leur capacité et ne pas créer un dossier par fichier.
- Ne pas déplacer les contrats métier Actions hors de `lib/actions` pour des
  raisons de proximité UI.
