# Session Standard Runbook (Codex)

## Objectif
Executer une session de travail fiable avec un ordre fixe:
1) contexte et garde-fous,
2) qualite code/documentation,
3) runtime/build,
4) cloture session.

## Partie 1 - Bootstrap & hygiene (a executer en premier)
Depuis la racine du repo:

```bash
npm run session:bootstrap
npm run session:budget
npm run check:doc-visuals
npm run check:lockfile-policy
npm run quality:top-heavy
```

Critere de succes:
- toutes les commandes retournent `OK` (ou succes explicite),
- aucun echec bloquant avant de poursuivre.
- `quality:top-heavy` applique une regle progressive:
  - > `500` lignes (ou > `40KB`) = warning d'audit (cohesion/lisibilite),
  - > `700` lignes (ou > `60KB`) = echec bloquant.

## Partie 2 - Qualite applicative
Depuis la racine:

```bash
npm run typecheck
npm run lint
npm run test:regression-gates
```

Critere de succes:
- zero erreur typecheck/lint/tests de gates.

## Partie 3 - Runtime / build
Depuis la racine:

```bash
npm run build
```

Option verification locale:
```bash
npm run dev
```

Critere de succes:
- build termine sans erreur.

## Partie 4 - Cloture session
Mettre a jour la memoire session:

```bash
npm run session:close -- --done "<resume>" --next "<prochaine etape>" --risk "<risque restant>"
```

Critere de succes:
- `documentation/du/session/latest-session.md` mis a jour proprement.
