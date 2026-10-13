# CI et validation des candidats

Ce sous-dossier orchestre les modes de validation locale et CI, les guards
Git, la préparation des candidats et les contrôles de release. Il ne contient
pas la source des règles métier : les contrats de preuve sont dans
[`documentation/development/TESTING.md`](../../documentation/development/TESTING.md)
et les invariants Git dans [`AGENTS.md`](../AGENTS.md).

## Commandes d'entrée

Depuis la racine :

```bash
npm run checks:fast
npm run checks:full
npm run precommit:guard
npm run prepush:guard
npm run pre-release:check
npm run release:check
```

`checks:full` et les vérifications de release sont proportionnées au candidat
et ne doivent pas être remplacées par une affirmation de succès statique. Les
hooks utilisent le scope exact (`WORKTREE`, `STAGED`, `PUSH_CANDIDATE` ou
`DYNAMIC_CANDIDATE`) ; vérifier le candidat avant commit et avant push.

## Frontière opérationnelle

Les scripts peuvent lire l'état Git, produire des preuves ou orchestrer des
contrôles. Ils ne publient pas une migration Supabase, un déploiement ou une
donnée métier par eux-mêmes. Toute mutation distante reste explicitement
autorisée par le script ou le workflow propriétaire, avec les règles de
sécurité et d'accès de son domaine.

Les fichiers de preuve et artefacts générés restent dans les emplacements
prévus par les scripts ; ne pas déposer de secrets, tokens, cookies,
`storageState` ou données privées dans ce dossier.
