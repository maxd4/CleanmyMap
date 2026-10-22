# Features — routage des contrats métier

**État : `CURRENT` pour l'index.** Une fonctionnalité a un propriétaire code, un contrat spécialisé et une fiche route-first lorsque visible. La documentation ne peut ni créer des permissions ni rendre disponible un élément `PLAN`. Les fiches `documentation/pages_site/routes/` restent protégées contre les restructurations.

## Sélection du propriétaire

| Domaine / tâche Codex | Source spécialisée | Owners et validation |
|---|---|---|
| Actions de groupe, participant, historique | [`group-action.md`](./group-action.md) (`CURRENT`) | `apps/web/src/lib/actions/`, handlers API et tests ; lire la [fiche carte](../pages_site/routes/02-agir/agir-README.md) si UI concernée |
| Itinéraire | [`../architecture/methodologie-creation-itineraire.md`](../architecture/methodologie-creation-itineraire.md) | Planner, géométrie et tests ; ne pas recréer une source produit |
| Recyclage | [`recycling.md`](./recycling.md) (`CURRENT`) | Projection publique et lecture privée bornées |
| Gamification / XP | [`gamification/README.md`](./gamification/README.md), [`gamification/GAMIFICATION_ENGINE.md`](./gamification/GAMIFICATION_ENGINE.md) (`CURRENT`) | `apps/web/src/lib/gamification/`, ledger et tests ; spec fonctionnelle [gamification](../pages_site/routes/03-cartographie-impact/gamification/gamification-SPEC_CANONIQUE.md) |
| Quiz / SRS / banque | [`quiz/README.md`](./quiz/README.md) (`CURRENT` pour routage) | `apps/web/data/environmental-quiz-bank/`, `apps/web/src/lib/learning/quiz/`, SRS et tests |
| Rapports existants | [`reports/README.md`](./reports/README.md) (`CURRENT`) | `apps/web/src/lib/reports/`, modèles, générations, APIs et tests |
| SPOGOMI | [`spogomi.md`](./spogomi.md) (`CURRENT`) | Code et tests SPOGOMI ; kit [références](./spogomi-references/README.md) non runtime |

## Quiz : contrat / historique

- [`quiz/quiz-authoring-guide.md`](./quiz/quiz-authoring-guide.md) : règles de contenu et taxonomie `CURRENT`.
- [`quiz/quiz-contributor-guide.md`](./quiz/quiz-contributor-guide.md), [`quiz/quiz-quality-control.md`](./quiz/quiz-quality-control.md) : contribution, sources et contrôle qualité `CURRENT`.
- [`quiz/quiz-bank-admin.md`](./quiz/quiz-bank-admin.md), [`quiz/quiz-pedagogical-metrics.md`](./quiz/quiz-pedagogical-metrics.md), [`quiz/quiz-srs.md`](./quiz/quiz-srs.md) : revue, agrégats et SRS `CURRENT`.
- [`quiz/quiz-system-audit.md`](./quiz/quiz-system-audit.md) : `AUDIT`, données datées. [`quiz/quiz_competences_map.md`](./quiz/quiz_competences_map.md) : `HISTORY / SNAPSHOT`, ancienne banque de 85 questions, pas inventaire actuel.
- Les URLs publiques historiques `/docs/features/quiz-authoring-guide.md` et `/docs/features/quiz-quality-control.md` passent par le registre public ; ne pas créer de doubles fichiers pour ces aliases.

## Reports : séparer l'existant des extensions

| Contrat | Source | État |
|---|---|---|
| Générateur, snapshots, historique, partage et publications | [`reports/README.md`](./reports/README.md) et [fiche `/reports`](../pages_site/routes/03-cartographie-impact/reports/reports-README.md) | `CURRENT` selon code et tests |
| Master Pack / chapitres réellement livrés | [`reports/master-pack.md`](./reports/master-pack.md) | `CURRENT` borné au contenu vérifié ; pas synonyme du PDF `/reports` |
| Paramètres de génération et filtres avancés livrés | [`reports/reports-generation-parameters.md`](./reports/reports-generation-parameters.md) | `CURRENT` pour les paramètres acceptés, `PLAN` pour les extensions explicitement marquées |
| Thèmes PDF Impact / Scientifique, réemploi et exports historiques | [`reports/report-pdf-themes-and-reuse.md`](./reports/report-pdf-themes-and-reuse.md) | `CURRENT` pour les fonctions livrées, `PLAN` pour accessibilité Tagged PDF et conformité non validées |
| Objectifs mesurables / campagnes collectives | [`reports/impact-goals-and-progression.md`](./reports/impact-goals-and-progression.md) | `PLAN` ; pas de nouvelle table implicite |
| Ancienne entrée commune | [`reports/reports-parameters-and-objectives.md`](./reports/reports-parameters-and-objectives.md) | `COMPATIBILITY`, conserver le lien, pas une deuxième source |

Les KPI, formules, unités, disponibilités et données ne sont pas recopiés ici. Les sources code (`report-model/`, `master-pack/`, API et renderer) restent propriétaires. Un PDF déjà généré, son snapshot métier et un export re-rendu ne sont pas des objets interchangeables.

## Gamification et SPOGOMI

La décision produit [gamification non compétitive](../product/gamification-non-competitive.md) et son [inventaire](../product/gamification-inventory.md) n'ajoutent pas de règles runtime au registre `GAMIFICATION_REGISTRY`. Le kit [`spogomi-references/`](./spogomi-references/README.md) contient fixtures et formats de référence, pas de résultats réels ni de nouvelles tables. Les mesures environnementales, résultats sportifs et XP conservent leurs owners distincts.

## Règle de changement

Pour tout changement : `owner runtime` → `contrat CURRENT` → `consommateurs / fiches de pages concernées` → `tests de comportement` → `documents PLAN ou AUDIT uniquement si nécessaires`. Confronter l'état du repo au document : ne pas transformer un objectif, une preuve datée, une compatibilité ou un prototype en comportement livré.

Politique documentaire transversale : [`../development/DOCUMENTATION_POLICY.md`](../development/DOCUMENTATION_POLICY.md).
