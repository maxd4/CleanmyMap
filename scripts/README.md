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

## Propriétaires des contrôles et preuves

| Besoin | Owner |
|---|---|
| Git, staging, guards, multi-writer | [AGENTS.md](./AGENTS.md), `ci/` |
| Qualité, baselines, duplications | [checks/README.md](./checks/README.md), `checks/` |
| Exécution et publication CI | [ci/README.md](./ci/README.md), workflows sous `.github/` |
| Tests et niveaux de preuve | [TESTING.md](../documentation/development/TESTING.md) |
| Rapports techniques | `reports/` et scripts de génération propriétaires |
| GitNexus | `audits/audit-gitnexus.mjs`, `check:gitnexus-hygiene` |

Les entrées GitNexus restent `npm run audit:gitnexus`, `npm run audit:gitnexus:cycles` et `npm run check:gitnexus-hygiene`. `audit:gitnexus:cycles` et `quality:cycles` sont toutefois officiellement `SKIPPED_BY_POLICY` jusqu'à réactivation explicite ; ils ne lancent pas l'analyse des cycles. Les timings, seuils, causes d'échec et mécanismes de reprise sont définis par les scripts et leurs tests : **ne pas figer dans ce README une mesure historique de durée comme performance garantie**. L'index local `.gitnexus` est dérivé et sa validité dépend du commit, de la version et de la configuration.

Toute invocation doit distinguer read-only, génération d'artefacts et écriture distante. Un rapport `PASS` ne prouve que le périmètre couvert par le script réellement exécuté.

Les tests Node des scripts se lancent avec :

```text
npm run test:scripts
```
