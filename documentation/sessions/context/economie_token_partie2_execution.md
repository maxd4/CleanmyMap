# Audit Anti-Token — Execution PARTIE 2

## 1) Sources de gaspillage (preuves concrètes)
| Priorite | Preuve | Type de gaspillage | Impact | Correctif concret |
|---|---|---|---|---|
| P0 | `documentation/du/archive/prompt_codex.txt` (444 lignes) | Prompt library lourde dans `documentation/du/` | Risque de lecture inutile et inflation contexte | Garder hors bootstrap; ne charger que sur demande ciblée |
| P0 | `documentation/du/session/latest-session.md` (128 lignes) + ancien plafond `200` lignes | Memoire volatile qui grossit session apres session | Plus de tokens relus a chaque demarrage | Abaisser plafond et items/section (fait) |
| P1 | `DU` contient 20 fichiers | Surface documentaire large | Bruit de recherche/retrieval | Mettre un budget de contexte et une gouvernance stricte (fait) |
| P1 | `README.md:44-46`, `documentation/repo-docs/ops/codex-memory-governance.md:26-31`, `package.json:21-23` | Multiples points d'entree session | Derive d'usage si non verifie | Ajouter un check automatique unique `session:budget` (fait) |
| P2 | `scripts/update_session_memory.mjs:7-8` (anciennement permissif) | Historique trop verbeux en continu | Iterations longues et repetitives | Limiter `DEFAULT_MAX_LINES` et `MAX_ITEMS_PER_SECTION` (fait) |

## 2) Optimisations a plus fort impact
- **Ajout d'un garde-fou automatique**: `npm run session:budget` pour verifier budgets de contexte.
- **Compression memoire session**: `scripts/update_session_memory.mjs` limite a `140` lignes et `8` items/section.
- **Alignement gouvernance**: `documentation/repo-docs/ops/codex-memory-governance.md` inclut `session:budget` en ouverture de session.
- **Documentation d'usage**: `README.md` expose la commande `session:budget`.

## 3) Refactors de structure (anti-gaspillage)
- Deja applique:
  - bootstrap minimal 3 lignes (`documentation/du/session/session_bootstrap.txt`).
  - bootstrap script sans lecture de gros fichiers DU.
- Recommande (prochain lot):
  - deplacer les prompts historiques volumineux vers `documentation/archive-prompts/`.
  - conserver dans `documentation/du/` uniquement les artefacts actifs de session (`latest-session`, template, bootstrap).

## 4) Workflow Codex strict (recuperation ciblee)
1. Lancer `npm run session:bootstrap`.
2. Lancer `npm run session:budget` (bloquant si echec).
3. Lire uniquement `AGENTS.md`, `project_context.md`, `documentation/du/session/latest-session.md`.
4. Ne jamais charger `documentation/du/archive/prompt_codex.txt` sans besoin explicite.
5. Explorer le code par fichier/fonction cible (`rg` d'abord).
6. Sorties assistant: courtes, diff-first, sans recapitulatif redondant.
7. Valider uniquement les zones modifiees.
8. Cloturer avec `npm run session:close -- --done ... --next ... --risk ...`.

## 5) Automatisations utiles
- **Nouvelle automation**: `session:budget`
  - Script: `scripts/context-budget-check.mjs`
  - Verifie budgets de lignes + bootstrap scope.
- **Automation existante renforcee**: `session:close`
  - Script: `scripts/update_session_memory.mjs`
  - Troncature automatique et deduplication.
- **Automation qualite code**: `quality:top-heavy`
  - Evite les monolithes qui augmentent le cout de lecture.

## 6) Gains estimes (hypotheses explicites)
- Hypothese A: session moyenne relit 3 fichiers memoire.
- Hypothese B: reduction moyenne `latest-session` de 200 -> 140 lignes.
- Hypothese C: elimination des lectures opportunistes de gros prompts.

Estimations:
- Reduction tokens contexte session: **-25% a -45%**
- Reduction allers-retours dus au contexte bruité: **-15% a -30%**
- Reduction temps de cadrage avant implementation: **-20% a -35%**

## Livrable obligatoire — Protocole anti-token step by step
1. Verifier contexte minimal: `npm run session:bootstrap`.
2. Verifier budget: `npm run session:budget`.
3. Formuler la tache avec `documentation/du/economie/economie_token_prompt_template.md`.
4. Rechercher cible avec `rg` (pas de lecture repo complete).
5. Lire seulement les blocs/fonctions necessaires.
6. Modifier le minimum de fichiers possible.
7. Executer validations ciblees.
8. Repondre en sortie courte et actionnable.
9. Mettre a jour `documentation/du/session/latest-session.md` via `session:close`.
10. Relancer `session:budget` avant de finir la session.
