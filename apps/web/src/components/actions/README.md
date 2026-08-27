# Actions UI

Ce dossier regroupe la composition React et les interactions visuelles du
domaine Actions : déclaration, historique, carte, participation et médias.

## Frontière avec le domaine

```text
UI Actions
→ apps/web/src/components/actions/

domaine, contrats, validation et persistance Actions
→ apps/web/src/lib/actions/
```

Les modules de ce dossier peuvent consommer les contrats et services du
domaine Actions. La logique métier durable, les invariants de payload, les
calculs et les accès aux données restent dans `lib/actions` ou dans le module
domaine propriétaire correspondant.

## Sous-domaines

```text
actions/
├── action-declaration/   parcours de déclaration et formulaire associé
├── map/                   composition cartographique Actions
├── map-feed/              alimentation et layouts du flux cartographique
└── signalement-media/     présentation des preuves média
```

Les fichiers UI Actions transverses peuvent rester à la racine lorsque leur
responsabilité ne forme pas une capacité plus cohérente. Ne pas déplacer ici
les contrats canoniques de `lib/actions` pour rapprocher artificiellement un
type de son consommateur visuel.

## Règles de placement

- Placer ici les composants React, hooks d'interface et helpers de composition
  visuelle propres aux surfaces Actions.
- Placer les contrats et la logique métier dans `apps/web/src/lib/actions/`.
- Conserver les tests avec la capacité qu'ils vérifient.
- Ne pas recréer dans l'UI une règle déjà portée par `lib/actions`.
- Ne pas introduire de façade pour conserver un ancien chemin interne.

Les commandes de validation ciblées sont exécutées depuis la racine, avec les
scripts du workspace web :

```text
npm run typecheck -w apps/web
npm run test -w apps/web -- <test-file-or-pattern>
npm run lint -w apps/web
```
