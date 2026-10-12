# Quiz et apprentissage — index documentaire

> Statuts : les guides, contrôles, SRS et métriques décrivent des contrats ou
> surfaces `CURRENT`; l’audit est `AUDIT` et la cartographie de 85 questions
> est `HISTORY / SNAPSHOT`.

Le runtime est détenu par `apps/web/data/environmental-quiz-bank/`,
`apps/web/src/lib/learning/quiz/`, les composants de quiz, le service SRS et
les interfaces administratives. Cette arborescence organise les documents sans
créer de copie de la banque.

| Document | Statut | Responsabilité |
|---|---|---|
| [`quiz-authoring-guide.md`](./quiz-authoring-guide.md) | `CURRENT` | Règles de rédaction, taxonomie et formats pédagogiques |
| [`quiz-contributor-guide.md`](./quiz-contributor-guide.md) | `CURRENT` | Contribution, ajout et sourcing des questions |
| [`quiz-quality-control.md`](./quiz-quality-control.md) | `CURRENT` | Critères de validation et traçabilité des sources |
| [`quiz-bank-admin.md`](./quiz-bank-admin.md) | `CURRENT` | Revue administrative en lecture/audit |
| [`quiz-pedagogical-metrics.md`](./quiz-pedagogical-metrics.md) | `CURRENT` | Agrégats et signaux pédagogiques disponibles |
| [`quiz-srs.md`](./quiz-srs.md) | `CURRENT` | Répétition espacée et progression des révisions |
| [`quiz-system-audit.md`](./quiz-system-audit.md) | `AUDIT` | Mesure datée, limites et actions de revue |
| [`quiz_competences_map.md`](./quiz_competences_map.md) | `HISTORY / SNAPSHOT` | Cartographie figée de 85 questions |

## Contrats runtime à consulter

- Les accès actuels sont `mixte`, `ecole`, `terrain`,
  `donnees-scientifiques`, `sensibilisation`, `habitudes-de-vie`,
  `ordres-de-grandeur` et `tri-securite`.
- Les questions portent un contrat de contenu, de taxonomie, de source et de
  revue ; la sélection combine mode, compétence, format, difficulté, piège et,
  pour l’école, niveau et parcours.
- Le SRS est l’implémentation simplifiée de SM-2 de
  `apps/web/src/lib/gamification/quiz-srs.ts`, persistée par le service dédié.
- Les métriques pédagogiques sont agrégées par question, mode, compétence et
  type d’erreur ; elles ne constituent pas une collecte de réponses brutes.
- `/admin/quiz-bank` reste une interface de revue et d’audit ; aucun éditeur
  persistant n’est documenté comme livré ici.

## Compatibilité publique

Les documents d’authoring et de contrôle qualité sont encore servis par les
URL historiques `/docs/features/quiz-authoring-guide.md` et
`/docs/features/quiz-quality-control.md`. Le registre public conserve ces
`docsPath` et pointe leurs `canonicalPath` vers cette arborescence.
