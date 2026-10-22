# Sessions — index de mémoire pour Codex

**Statut : CONTEXT / HISTORY, jamais CURRENT pour le comportement applicatif.** Les trois sources au démarrage sont [AGENTS.md](../../AGENTS.md), [project_context.md](./project_context.md) et [history/latest-session.md](./history/latest-session.md), en complément des `AGENTS.md` scoped nécessaires.

Les scripts `scripts/dev/session_bootstrap.mjs`, `scripts/dev/context-budget-check.mjs` et `scripts/dev/update_session_memory.mjs` possèdent les contrôles de format, budget, stale et clôture. `npm run session:bootstrap` et `npm run session:budget` signalent une mémoire périmée ; ils ne prouvent pas que son contenu reste vrai. `npm run session:close` met à jour les entrées après une vraie session, sous réserve de préserver le travail des autres writers.

## Ressources disponibles

| Chemin | Type | Usage |
|---|---|---|
| `history/` | HISTORY/SNAPSHOT | Décisions et historiques de sessions, lecture ciblée |
| `context/` | CONTEXT | [modèle de prompts](./context/economie_token_prompt_template.md) et autres ressources réellement présentes |
| `assets/` | REFERENCE | Diagrammes, [légendes](./assets/LEGENDES.md) et [schémas sources](./assets/SOURCE_SCHEMAS.md) |
| `templates/` | REFERENCE | Templates existants et [schéma de rubrique](./templates/schema-rubrique.md) |
| [handover-explorer-search-2026.md](./handover-explorer-search-2026.md) | HISTORY | Passation datée, non preuve du runtime actuel |

Ne pas recréer les anciens fichiers de contexte, supports de soutenance ou assets absents simplement parce qu'un index historique les cite. Les pages de session ne remplacent ni les contrats métier ni les résultats des tests. À la clôture, utiliser le générateur de mémoire avec un résumé court, sans réécrire les historiques par lot.
