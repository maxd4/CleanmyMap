# Testing — qualité et audits

> **Statut documentaire : `CURRENT`.**

Ce module porte la couverture, les ratchets de qualité, les audits structurels et leurs artefacts.

[Retour au guide canonique](./TESTING.md).

## Index des modules

- [Couverture runtime et SonarQube](./testing-quality-coverage.md)
- [Croissance du dépôt](./testing-quality-growth.md)
- [Complexité, dead-code et mutation](./testing-quality-ratchets.md)
- [Duplication, cycles et GitNexus](./testing-quality-structure.md)
- [Audits et preuves CI](./testing-quality-audits.md)

Les modes et niveaux de preuve restent définis dans TESTING.md.

## Scopes Web, Mobile et monorepo

Les quality checks qui analysent du code applicatif acceptent le même
sélecteur :

```bash
node scripts/checks/check-top-heavy-files.mjs --scope=web --enforce
node scripts/checks/check-complexity-policy.mjs --scope=mobile
node scripts/checks/check-maintainability.mjs --scope=web
node scripts/checks/check-type-safety.mjs --scope=mobile
npm run audit:quality -- all --scope=mobile
```

`web` lit `apps/web/src`, `mobile` lit `apps/mobile` et `all` conserve le
contrôle monorepo historique. Les scripts, E2E, documentation, dépendances
vendored, configurations et workflows restent des fichiers `shared` ou des
catégories comptables transversales ; ils ne sont pas attribués à une
application par proximité. Lorsqu'un contrôle conserve une baseline ou une
politique monorepo (notamment la duplication et les contrôles de dépendances),
le rapport expose la projection applicative et la portée transversale au lieu
de recalculer une baseline ou de créer un second ratchet.

La couverture conserve ses deux producteurs Vitest indépendants et ses preuves
par SHA : `quality:coverage` pour Web et `quality:mobile-coverage` pour Mobile.
Les agrégateurs, SonarQube et la CI doivent consommer le rapport du scope
correspondant ; une preuve absente, stale ou d'un autre SHA reste
`NOT_MEASURED`/bloquante selon le gate, jamais une couverture monorepo déduite.

## Nommage et intégrité des chemins

`npm run check:file-naming -- --json` conserve la classification et la
baseline historiques. Ses violations de convention absentes de la baseline
restent des `FAIL` déterministes ; son champ `reviewCandidates` est
explicitement non bloquant et sert seulement à qualifier des basenames
génériques, des noms réutilisés entre domaines ou des conventions mixtes.

`npm run check:path-integrity -- --dry-run` réutilise le même inventaire
`git ls-files` et vérifie les collisions de casse et Unicode, les noms ou
caractères interdits Windows, les suffixes de chemin ambigus et les séparateurs
non portables. Une violation objective nouvelle est un `FAIL`, sauf exception
historique chemin/règle explicitement documentée dans la baseline ; le dry-run
ne produit aucun artefact. `checks:fast` exécute ces deux contrôles sans
transformer les suggestions heuristiques en gate.
