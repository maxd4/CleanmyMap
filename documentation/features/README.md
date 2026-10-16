# Features — index documentaire

`documentation/features/` est l’index des fonctionnalités et des contrats
métier transverses de CleanMyMap. Les règles détaillées restent dans les fiches
spécialisées, le runtime et leurs tests. Le code et les tests priment toujours
sur une fiche `CURRENT` divergente.

## Actions et participation — `CURRENT`

- [`group-action.md`](./group-action.md) — participation à une action de
  groupe, validation administrative, participants et historique.
- [Méthodologie de création d’itinéraire](../architecture/methodologie-creation-itineraire.md)
  — contraintes et trace du planner.
- [Fiche fonctionnelle Où agir](../pages_site/routes/02-agir/agir-README.md)
  — entrée produit du parcours cartographique.

## Gamification — `CURRENT`

- [`gamification/README.md`](./gamification/README.md) — index des contrats et
  propriétaires de la progression.
- [`gamification/GAMIFICATION_ENGINE.md`](./gamification/GAMIFICATION_ENGINE.md) —
  point d’entrée technique, réconciliation et compatibilités.
- [Spécification fonctionnelle canonique](../pages_site/routes/03-cartographie-impact/gamification/gamification-SPEC_CANONIQUE.md)
  — règles fonctionnelles et comportements exposés.
- [Gamification non compétitive](../product/gamification-non-competitive.md)
  et [inventaire gamification](../product/gamification-inventory.md) —
  orientation produit complémentaire.

## Quiz et apprentissage

### `CURRENT`

- [`quiz/README.md`](./quiz/README.md) — entrée générale et cartographie des
  documents du quiz.
- [`quiz/quiz-authoring-guide.md`](./quiz/quiz-authoring-guide.md) — règles
  éditoriales, formats et taxonomie pédagogique.
- [`quiz/quiz-contributor-guide.md`](./quiz/quiz-contributor-guide.md) —
  contribution, sourcing et procédure d’ajout.
- [`quiz/quiz-quality-control.md`](./quiz/quiz-quality-control.md) — grille de
  qualité et contrôle des sources.
- [`quiz/quiz-bank-admin.md`](./quiz/quiz-bank-admin.md) — revue administrative
  de la banque.
- [`quiz/quiz-pedagogical-metrics.md`](./quiz/quiz-pedagogical-metrics.md) —
  métriques pédagogiques agrégées.
- [`quiz/quiz-srs.md`](./quiz/quiz-srs.md) — répétition espacée et progression
  des révisions.

Les propriétaires runtime sont la banque `apps/web/data/environmental-quiz-bank/`,
les contrats et moteurs de `apps/web/src/lib/learning/quiz/`, le SRS de
`apps/web/src/lib/gamification/quiz-srs.ts` et les composants/tests associés.

### `AUDIT`

- [`quiz/quiz-system-audit.md`](./quiz/quiz-system-audit.md) — constats
  contextualisés et points restant à vérifier ; ses chiffres ne sont pas un
  inventaire CURRENT.

### `HISTORY / SNAPSHOT`

- [`quiz/quiz_competences_map.md`](./quiz/quiz_competences_map.md) —
  cartographie figée de 85 questions, conservée comme historique.

Les URL publiques historiques `/docs/features/quiz-authoring-guide.md` et
`/docs/features/quiz-quality-control.md` restent servies par le registre public;
elles ne justifient pas une seconde copie physique des documents.

## Rapports d’impact

### `CURRENT`

- [`reports/README.md`](./reports/README.md) — index, frontières des moteurs,
  contrats de page et plans spécialisés.
- [`reports/master-pack.md`](./reports/master-pack.md) — chapitres déclarés du
  Master Pack et distinction d'avec le PDF réellement servi par `/reports`.

### `PLAN`

- [`reports/reports-generation-parameters.md`](./reports/reports-generation-parameters.md)
  — paramètres et filtres, hors promesse de disponibilité non vérifiée.
- [`reports/impact-goals-and-progression.md`](./reports/impact-goals-and-progression.md)
  — futurs objectifs configurables, distincts du moteur de génération.

### `COMPATIBILITY`

- [`reports/reports-parameters-and-objectives.md`](./reports/reports-parameters-and-objectives.md)
  — ancien chemin, renvoyant aux deux plans spécialisés.

Les formules et données restent dans `apps/web/src/lib/reports/` et ses tests.

## SPOGOMI

### `CURRENT`

- [`spogomi.md`](./spogomi.md) — contrat métier canonique pour les événements,
  inscriptions, équipes, mesures, classements indépendants, consolidation et
  export actuellement livrés.

### `REFERENCE / SNAPSHOT`

- [`spogomi-references/README.md`](./spogomi-references/README.md) — kit de
  références, fixtures synthétiques, schémas et modèles non runtime.

Le kit SPOGOMI ne devient pas une source de vérité concurrente : le contrat
durable reste `spogomi.md` et les règles de gamification restent dans le
moteur canonique.

## Routage par besoin

| Besoin | Première source | Sources complémentaires |
|---|---|---|
| Rejoindre ou gérer une action de groupe | [`group-action.md`](./group-action.md) | routes/actions et tests concernés |
| Modifier la gamification | [`gamification/GAMIFICATION_ENGINE.md`](./gamification/GAMIFICATION_ENGINE.md) | spec gamification, code et tests |
| Créer ou relire une question | [`quiz/quiz-authoring-guide.md`](./quiz/quiz-authoring-guide.md) | guide de contribution et contrôle qualité |
| Modifier le SRS | [`quiz/quiz-srs.md`](./quiz/quiz-srs.md) | `apps/web/src/lib/gamification/quiz-srs.ts` et tests |
| Revoir la banque ou ses métriques | [`quiz/quiz-bank-admin.md`](./quiz/quiz-bank-admin.md) | métriques, code admin et tests |
| Évaluer l’état du quiz | [`quiz/quiz-system-audit.md`](./quiz/quiz-system-audit.md) | runtime et audits, jamais le snapshot seul |
| Modifier le Master Pack | [`reports/master-pack.md`](./reports/master-pack.md) | `apps/web/src/lib/reports/master-pack/`, modèle et tests |
| Étudier les paramètres de génération | [`reports/reports-generation-parameters.md`](./reports/reports-generation-parameters.md) | code courant, contrat d'accès et statut `PLAN` |
| Étudier les objectifs configurables | [`reports/impact-goals-and-progression.md`](./reports/impact-goals-and-progression.md) | métriques canoniques et décision produit requise |
| Intégrer une référence SPOGOMI | [`spogomi-references/README.md`](./spogomi-references/README.md) | contrat [`spogomi.md`](./spogomi.md), code et tests |

Les règles générales de documentation sont définies par
[`development/DOCUMENTATION_POLICY.md`](../development/DOCUMENTATION_POLICY.md)
et la gouvernance du dépôt, pas par cet index.
