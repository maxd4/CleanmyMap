# Features — index documentaire

`documentation/features/` regroupe les fiches de fonctionnalités et les
repères métier transverses de CleanMyMap. Ce README est un index : les règles
détaillées restent dans les documents spécialisés, dans le code et dans leurs
tests.

Le code et les tests priment lorsqu'une fiche `CURRENT` diverge de
l'implémentation. Les documents `PLAN`, `AUDIT` et `HISTORY / SNAPSHOT` ne
doivent pas être utilisés comme contrats courants.

## Sources `CURRENT`

### Participation et actions de groupe

- [`group-action.md`](./group-action.md) — flux de participation à un
  formulaire de groupe, validation admin, participants et historique.

### Itinéraires et cartographie

- [Méthodologie de création d'itinéraire](../architecture/methodologie-creation-itineraire.md)
  — contraintes et trace du planner.
- [Fiche fonctionnelle Où agir](../pages_site/routes/02-agir/ou-agir/ou-agir-README.md)
  — entrée produit du parcours.

### Gamification

- [`GAMIFICATION_ENGINE.md`](./GAMIFICATION_ENGINE.md) — point d'entrée
  technique et frontières du moteur.
- [Spécification fonctionnelle canonique](../pages_site/routes/03-cartographie-impact/gamification/gamification-SPEC_CANONIQUE.md)
  — règles métier et comportements fonctionnels.
- [Gamification non compétitive](../product/gamification-non-competitive.md)
  et [inventaire gamification](../product/gamification-inventory.md) —
  orientation produit complémentaire.

### Rapports

- [`master-pack.md`](./master-pack.md) — chapitres et points vérifiés du
  Master Pack ; les formules et données restent dans
  `apps/web/src/lib/reports/master-pack/` et ses tests.

### Quiz et apprentissage

| Document | Rôle courant |
|---|---|
| [`quiz-authoring-guide.md`](./quiz-authoring-guide.md) | règles d'écriture, formats et champs pédagogiques |
| [`quiz-contributor-guide.md`](./quiz-contributor-guide.md) | contribution, sourcing et procédure d'ajout |
| [`quiz-quality-control.md`](./quiz-quality-control.md) | grille de qualité et contrôle des sources |
| [`quiz-srs.md`](./quiz-srs.md) | système de répétition espacée implémenté |
| [`quiz-pedagogical-metrics.md`](./quiz-pedagogical-metrics.md) | métriques pédagogiques agrégées |
| [`quiz-bank-admin.md`](./quiz-bank-admin.md) | interface interne de revue de la banque |

Les sources runtime principales sont `apps/web/data/environmental-quiz-bank.ts`,
`apps/web/src/lib/learning/quiz/`, `apps/web/src/lib/gamification/quiz-srs.ts`
et les composants/tests associés.

## `PLAN`

- [`reports-parameters-and-objectives.md`](./reports-parameters-and-objectives.md)
  — cible pour les paramètres de génération et les objectifs de `/reports`.
  Cette logique cible n'est pas présentée comme implémentée par ce lot ; les
  contrats actuels du rapport restent ceux du runtime et de
  [`master-pack.md`](./master-pack.md).

## `AUDIT`

- [`quiz-system-audit.md`](./quiz-system-audit.md) — audit du système de quiz,
  avec constats, contrôles automatisés et points restant à valider. Ses
  chiffres et recommandations sont une preuve contextualisée, pas le contrat
  courant de la banque ou du moteur.

## `HISTORY / SNAPSHOT`

- [`quiz_competences_map.md`](./quiz_competences_map.md) — cartographie figée
  annoncée pour 85 questions. Elle est conservée comme historique/snapshot et
  ne décrit pas l'état courant : [`quiz-system-audit.md`](./quiz-system-audit.md)
  inspecte plus récemment une banque de 115 questions. Ne pas recalculer ni
  réutiliser cette cartographie comme contrat sans nouvel audit dédié.

## Routage par fonctionnalité

| Besoin | Première source | Sources complémentaires |
|---|---|---|
| Rejoindre ou gérer une action de groupe | [`group-action.md`](./group-action.md) | code des routes/actions et tests concernés |
| Créer un itinéraire | [Méthodologie itinéraire](../architecture/methodologie-creation-itineraire.md) | fiche [Où agir](../pages_site/routes/02-agir/ou-agir/ou-agir-README.md), code et tests du planner |
| Modifier la gamification | [`GAMIFICATION_ENGINE.md`](./GAMIFICATION_ENGINE.md) | spécification gamification, code et tests du moteur |
| Modifier le Master Pack | [`master-pack.md`](./master-pack.md) | `apps/web/src/lib/reports/master-pack/`, modèle de rapport et tests |
| Créer une question | [`quiz-authoring-guide.md`](./quiz-authoring-guide.md) | [`quiz-contributor-guide.md`](./quiz-contributor-guide.md), [`quiz-quality-control.md`](./quiz-quality-control.md) |
| Modifier le SRS | [`quiz-srs.md`](./quiz-srs.md) | `apps/web/src/lib/gamification/quiz-srs.ts`, service et tests |
| Revoir la banque ou ses métriques | [`quiz-bank-admin.md`](./quiz-bank-admin.md) | [`quiz-pedagogical-metrics.md`](./quiz-pedagogical-metrics.md), code admin et tests |
| Évaluer l'état du quiz | [`quiz-system-audit.md`](./quiz-system-audit.md) | runtime et tests ; ne pas utiliser le snapshot des 85 questions comme état courant |
| Étudier une évolution de `/reports` | [`reports-parameters-and-objectives.md`](./reports-parameters-and-objectives.md) | code actuel des rapports ; conserver le statut `PLAN` |

Les règles générales de documentation sont définies par
[`development/DOCUMENTATION_POLICY.md`](../development/DOCUMENTATION_POLICY.md)
et la gouvernance du dépôt, pas par cet index.
