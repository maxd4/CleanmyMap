# Matrice des runtimes et versions

État audité le 14 octobre 2026 à partir des manifests suivis, du lockfile npm,
des `tsconfig` associés et des fichiers de gouvernance propres à chaque
surface. Cette matrice décrit les contrats actuels ; elle ne constitue pas une
autorisation d'aligner ou d'upgrader les versions.

| Surface | Runtime | TypeScript | Test runner | Build | Raison de la version |
| --- | --- | --- | --- | --- | --- |
| Web (`apps/web`) | Node 24.x ; Next.js 16.4.1 ; React 19.2.3 | Déclaré `^7`, résolution lockfile 7.0.2 | Vitest 4.1.11 | `next build`, puis finalisation du manifeste et upload Sentry | Le workspace Web possède son propre contrat Next/React et sa dépendance TypeScript 7. La résolution est locale à `apps/web/node_modules`. |
| Mobile (`apps/mobile`) | Expo SDK 57 (`~57.0.27`) ; React Native 0.86.3 ; React 19.2.3 | Déclaré et résolu 6.0.3 | Vitest 4.1.11 avec `vitest.config.ts` | Aucun script `build` npm ; `expo run:android`/`expo run:ios` pour le natif local, EAS pour une release | Le contrat mobile actif documente Expo SDK 57, React Native 0.86.3 et TypeScript 6.0.3. Cette combinaison ne doit pas être remplacée par la version Web par principe. |
| Outillage dépôt | Node 24.x (`apps/web/.nvmrc`) | Résolution racine 6.0.3 pour les scripts qui importent `typescript` depuis la racine ; `typescript-eslint` 8.71.1 | `node --test` pour les tests de scripts ; Vitest est appelé par workspace | Pas de build applicatif | `scripts/reports/generate-architecture-import-graph.mjs` consomme le TypeScript racine pour analyser les surfaces. Ce rôle d'outillage ne fixe pas le compilateur Web ou Mobile. |
| Maintenance Python | Python 3.14.x ; hors runtimes Web/Mobile | Sans objet | pytest 9.1.1 dans `requirements-lock.txt` | Aucun build applicatif | `requirements.txt`, `requirements-dev.txt`, `requirements-lock.txt` et `pytest.ini` isolent la maintenance. `pyproject.toml` est absent ; aucune migration de configuration n'apporte actuellement de bénéfice démontré (`NO_CHANGE`). |

## Divergence TypeScript Web/Mobile

La divergence est explicite et volontaire :

- Web : `apps/web/package.json` déclare `typescript: ^7` et npm résout
  `apps/web/node_modules/typescript` en `7.0.2` ;
- Mobile : `apps/mobile/package.json` déclare `typescript: 6.0.3` et npm
  résout le package depuis `node_modules/typescript` en `6.0.3`.

Les deux workspaces ne sont donc pas officiellement décrits ici comme
compatibles avec une version TypeScript commune. Aucun alignement n'a été
tenté, aucun contournement n'a été ajouté et aucune version n'a été montée ou
abaissée.

## Résolution observée

Les commandes d'inspection ont confirmé :

```text
apps/web    -> TypeScript 7.0.2 -> Vitest 4.1.11
apps/mobile -> TypeScript 6.0.3 -> Vitest 4.1.11
```

Les `tsconfig` restent également distincts : Web possède une configuration
Next/App Router complète, tandis que Mobile étend `expo/tsconfig.base`. Le
`tsconfig` de `scripts/cleanup` est encore un contrat Node/CommonJS isolé et ne
change pas la matrice des workspaces.

## Outils supposant une version unique

Le principal consommateur direct hors workspace identifié est
`scripts/reports/generate-architecture-import-graph.mjs`, qui importe
`typescript` depuis la racine. Il sert l'analyse statique et ne remplace pas
les commandes `typecheck` Web/Mobile. Les contrôles utilisant
`typescript-eslint` partagent la version déclarée 8.71.1, mais cela ne justifie
pas l'alignement des compilateurs TypeScript.

Toute future proposition d'alignement doit être un patch isolé, précédé d'une
preuve de compatibilité des contrats Expo/React Native et Web, puis validé par
les deux typechecks et les tests ciblés. En l'absence de cette preuve, le statu
quo est la décision canonique.
