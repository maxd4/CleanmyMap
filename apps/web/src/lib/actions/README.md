# Domaine Actions

Ce dossier porte le domaine Actions côté application web : contrats de
données, validation, calculs d'impact et de qualité, géométrie, participation,
signalement, stockage et adaptateurs d'export.

## Structure

```text
lib/actions/
├── contracts/       contrats spécialisés
├── geometry/        calculs et normalisation de géométrie
├── participation/   parcours de participation et groupes
├── pollution/       lecture et calibration pollution
├── quality/         qualité et contrôles associés
├── signalement/     contrats et flux de signalement
├── unified-source/  source unifiée et adaptateurs associés
├── exports/         formats d'export Actions
└── fichiers racine  types, validation, store et contrats transverses
```

Les sous-dossiers portent une responsabilité métier identifiable. Un nouveau
module doit rejoindre le sous-domaine qui en possède l'invariant plutôt que
d'être placé dans un dossier générique.

## Frontières

```text
components/actions/
→ composition React, états visuels et interactions utilisateur

lib/actions/
→ contrats, invariants, calculs, validation et accès domaine

app/api/actions/
→ transport HTTP et contrôles d'accès de la route
```

Le domaine ne doit pas importer les composants React Actions. Les contrats
partagés avec d'autres domaines restent dans leur propriétaire canonique ; un
type ne doit pas être déplacé dans `components/actions` parce qu'il est
consommé par le formulaire.

## Règles de placement

- Placer ici une règle ou un contrat réutilisable indépendamment du rendu.
- Garder les mutations et la persistance dans leurs modules Actions dédiés.
- Préserver les contrôles d'authentification, d'autorisation et d'audit des
  flux sensibles.
- Ajouter les tests auprès du module ou du sous-domaine vérifié.
- Préférer les imports directs vers le module propriétaire ; ne pas ajouter de
  barrel uniquement pour raccourcir un chemin.

Les validations web ciblées utilisent notamment :

```text
npm run test -w apps/web -- <test-file-or-pattern>
npm run typecheck -w apps/web
npm run lint -w apps/web
```
