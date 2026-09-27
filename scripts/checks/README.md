# Garde-fous du dépôt

Ce dossier contient les contrôles automatisés qui vérifient les contrats du
monorepo : gouvernance, sécurité statique, documentation, qualité, frontières
d'architecture et sélection des validations.

## Organisation

- `check-*.mjs` porte un garde-fou ciblé et lisible ;
- les fichiers `*.test.mjs` et `*.test.js` caractérisent son comportement ;
- les fichiers `*-baseline.json` sont des références historiques versionnées,
  jamais des sorties à régénérer automatiquement ;
- `validation-policy.mjs` et les scripts CI sélectionnent les contrôles selon
  le périmètre du changement.

Les scripts ne constituent pas du runtime applicatif. Un contrôle read-only,
un dry-run et un rapport ne prouvent jamais qu'une mutation distante a été
appliquée.

## Contrats de validation

Utiliser les commandes npm canoniques depuis la racine :

```text
npm run check:doc-governance
npm run check:stack-doc-drift
npm run test:scripts
npm run checks:fast
npm run checks:full
```

Les validations `WORKTREE`, `STAGED` et `PUSH_CANDIDATE` restent des portées
distinctes. Un nouveau garde-fou doit réutiliser les helpers et la taxonomie de
scope existants, conserver le fail-closed et ajouter sa régression dans le
même périmètre.

Les baselines de qualité ne sont modifiées que par une décision explicitement
justifiée ; un échec ne doit pas être neutralisé par une exception opportuniste.

## Placement

Les scripts d'orchestration vivent sous `scripts/ci/`, les audits sous
`scripts/audits/` et les opérations bornées sous leur sous-dossier dédié. Ce
README oriente vers les contrats ; il ne remplace ni les scripts ni les
`AGENTS.md` applicables.
