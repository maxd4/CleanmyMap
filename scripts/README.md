# Scripts de maintenance et de gouvernance

Ce dossier contient les scripts ponctuels d'audit, de contrôle, de CI, de
maintenance, de données, de développement, de médias et de rapports du
monorepo. Ils ne font pas partie du runtime applicatif web ou mobile.

## Sous-dossiers

```text
scripts/
├── audits/    inspections et rapports read-only ou explicitement bornés
├── checks/    garde-fous et validations automatisées
├── ci/        orchestration des validations CI/locales
├── cleanup/   nettoyages explicitement bornés
├── data/      opérations de données et exports
├── design/    génération d'artefacts design
├── dev/       aides de développement local
├── media/     opérations médias
└── reports/   génération de rapports techniques
```

## Frontières et règles

- Un script ne doit pas devenir une dépendance runtime de `apps/web` ou
  `apps/mobile`.
- Distinguer les audits read-only des scripts qui mutent des données ou des
  artefacts.
- Toute suppression, migration ou écriture doit avoir une cible explicite,
  une provenance claire et un périmètre vérifiable.
- Les nouveaux scripts rejoignent le sous-dossier correspondant à leur
  responsabilité ; ne pas empiler des scripts génériques à la racine.
- Les artefacts temporaires vont dans les emplacements prévus par l'outil,
  notamment `artifacts/`, et non à la racine par commodité.

Les audits GitNexus utilisent exclusivement les scripts npm canoniques :

```text
npm run audit:gitnexus
npm run audit:gitnexus:cycles
npm run check:gitnexus-hygiene
```

Les tests Node des scripts se lancent avec :

```text
npm run test:scripts
```
