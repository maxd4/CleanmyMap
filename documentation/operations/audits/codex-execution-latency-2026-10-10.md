# Audit — performances d’exécution Codex

> **Statut documentaire : `AUDIT`** — preuve contextualisée, non `CURRENT`.

## Périmètre et référence

Cet audit conserve les observations disponibles au `2026-10-10` sur les
performances locales de Codex pour CleanMyMap. Il ne constitue pas une mesure
du produit, une garantie de performance, ni une recommandation de modifier la
configuration globale de Codex.

Référence Git observée au moment de la documentation :

| Champ | Valeur |
|---|---|
| Dépôt | `maxd4/CleanmyMap` |
| Branche | `main` |
| SHA | `3caf07e8cd980703e17e0d69ea907e856dc482b1` |
| Date de mesure/documentation | `2026-10-10` |
| Codex CLI observé | `0.162.0-alpha.17.2` |
| Modèle visé | `gpt-5.6-luna` |
| Réglage utilisateur par défaut | `high` |
| Réglage expérimental | `medium`, lecture seule uniquement |

Les règles du dépôt imposent de distinguer une mesure exécutée, une inférence
et une donnée non observable. Les valeurs ci-dessous utilisent donc les
qualificatifs `MEASURED`, `INFERRED` et `NOT_OBSERVABLE`.

## Méthodologie

Le benchmark contrôlé prévu compare quatre exécutions indépendantes, dans cet
ordre :

| Exécution | Tâche | Raisonnement |
|---:|---|---|
| 1 | A — parcours de création/reprise | `medium` |
| 2 | B — persistance d’une mise à jour | `high` |
| 3 | A — parcours de création/reprise | `high` |
| 4 | B — persistance d’une mise à jour | `medium` |

Chaque paire doit conserver le même prompt, le même SHA, le même périmètre de
fichiers et le même environnement. Les essais doivent rester indépendants,
éphémères et en sandbox `read-only`. Aucun test, build, lint, typecheck,
réindexation QMD/GitNexus, commit, push ou déploiement ne fait partie du
benchmark.

La tâche A porte sur `action-creation-routes.ts` et son usage dans la page de
création d’action. La tâche B porte sur `action-update-persistence.ts` et son
consommateur direct. La qualité est évaluée par exactitude, exhaustivité,
respect du périmètre et preuves citées, et non par la longueur de la réponse.

## Diagnostic initial et baseline historique

Le diagnostic initial a identifié un workspace CleanMyMap d’environ 4 590
fichiers versionnés, dont environ 3 128 fichiers TypeScript/TSX. `.codexignore`
et `.gitignore` étaient présents. QMD et GitNexus étaient régis par une
politique de fraîcheur et d’usage ciblé ; le benchmark GitNexus avait conclu
`AUDIT_ONLY`. Ces éléments sont une baseline de diagnostic, pas une mesure
réexécutée dans le présent lot.

Deux sessions lentes avaient déjà été rapportées. Elles constituent une
**baseline historique**, non un benchmark contrôlé du modèle :

| Session | Durée totale | Appels d’outils | Temps non attribué |
|---|---:|---:|---:|
| Longue A | 42 min 22 s | 272 | 28 min 24 s |
| Longue B | 35 min 57 s | 236 | 24 min 11 s |

Pour ces deux sessions historiques, les éléments suivants ne sont pas présents
dans la preuve conservée avec une résolution suffisante :

| Mesure | Longue A | Longue B | Statut |
|---|---|---|---|
| Temps shell | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | Aucun horodatage exploitable conservé |
| Temps Git | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | Aucun découpage exploitable conservé |
| Tests/validation | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | Aucun découpage exploitable conservé |
| Appels MCP | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | Aucun journal exploitable conservé |
| Indexation | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | Aucune preuve d’indexation attribuable |
| Première réponse utile | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | Horodatage absent |
| Compactifications | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | Non observables dans la preuve retenue |
| Niveau de raisonnement | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | Non associé de façon vérifiable aux sessions |

Les durées non attribuées ne doivent pas être interprétées comme du temps de
raisonnement du modèle. Elles sont seulement le reliquat déjà rapporté de la
baseline historique.

## Grille descriptive expérimentale

Les bandes suivantes servent uniquement à classer les futures observations.
Elles ne sont ni des seuils produit ni des objectifs de performance.

### Type de tâche

| Catégorie | Exemple de périmètre |
|---|---|
| Recherche et lecture simples | Un fichier ciblé, un symbole, une relation locale |
| Analyse métier ou fonctionnelle | Contrat, parcours, consommateurs et invariants |
| Correction de bug ciblée | Reproduction, correction locale, validation directe |
| Développement/refactoring transversal | Plusieurs modules, frontières ou consommateurs |
| Tests et validations | Suite ciblée, typecheck, lint ou contrôle contractuel |
| Audit/maintenance du dépôt | Gouvernance, qualité, sécurité ou exploitation |

### Durée totale

| Bande | Intervalle descriptif |
|---|---:|
| Très courte | `0 à 2 min` |
| Courte | `> 2 à 10 min` |
| Intermédiaire | `> 10 à 30 min` |
| Longue | `> 30 à 60 min` |
| Exceptionnellement longue | `> 60 min` |

Les deux sessions historiques disponibles appartiennent à la bande `Longue`.
Aucune observation conservée ne permet de quantifier les quatre autres bandes.
Une tâche d’une bande ne doit pas être comparée directement à une tâche d’une
autre bande comme si elles avaient la même difficulté.

## Décomposition temporelle attendue

Pour toute future mesure, le journal doit permettre, lorsque possible, de
distinguer :

- durée totale et délai avant la première réponse utile ;
- recherches/lectures, Git, tests/validations, MCP et indexation ;
- temps non attribuable ;
- nombre et type d’appels d’outils ;
- compactifications, reprises, erreurs et timeouts ;
- modèle, niveau de raisonnement et qualité de la réponse.

Une donnée absente reste `NOT_OBSERVABLE`. Aucun temps non attribué ne doit
être reclassé comme temps de raisonnement par approximation.

## Résultats du benchmark Medium vs High

### Première tentative historique invalidée

Une première exécution a été tentée avant le prévol corrigé, puis invalidée
avant l’analyse métier :

| Exécution | Tâche | Effort | Résultat | Durée | Outils tâche | Exactitude |
|---:|---|---|---|---:|---:|---|
| 1 | A | `medium` | `INVALID_ENVIRONMENT` | `NOT_OBSERVABLE` | 0 | Non évaluable |

Le CLI utilisé était `0.162.0-alpha.17.2`, avec `gpt-5.6-luna`, un override
ponctuel `model_reasoning_effort=medium`, `--ephemeral` et sandbox
`read-only`. Le dépôt n’a pas été modifié.

L’exécution n’a pas atteint la tâche métier :

- le contexte des skills a dépassé le budget (`Exceeded skills context budget`) ;
- les descriptions des skills ont été retirées et 133 skills supplémentaires
  n’ont pas été exposés au modèle ;
- les règles de gouvernance du dépôt ont été tronquées par le CLI ;
- le démarrage automatique a tenté d’initialiser le serveur MCP `coros`, puis a
  échoué faute d’autorisation OAuth disponible.

Le processus Codex lancé pour cet essai a été arrêté proprement après l’échec
d’initialisation. Le journal temporaire a été supprimé. Deux lancements
préparatoires supplémentaires ont aussi échoué au niveau du wrapper (prompt
passé comme argument positionnel, puis avec `--`) ; ils ont renvoyé le code 2
en moins de 0,1 s et ne sont pas comptés comme des essais du protocole.

## Prévol de fiabilité du contexte — 2026-10-10

Ce prévol est distinct du benchmark `medium`/`high` et ne produit aucun
résultat de comparaison de modèle. Il a été exécuté avec `codex-cli
0.162.0-alpha.17.2`, `gpt-5.6-luna`, `model_reasoning_effort=low`,
`--ephemeral`, sandbox `read-only` et `approval_policy=never`. Les surcharges
étaient limitées à cet essai :

| Paramètre | Valeur observée | Statut |
|---|---|---|
| `project_doc_max_bytes` | `65536` | `MEASURED` — surcharge acceptée |
| budget de métadonnées skills | `skills.max_context_tokens=16384` | `MEASURED` — surcharge acceptée, aucun dépassement signalé |
| `mcp_servers.coros.enabled` | `false` | `MEASURED` — désactivation éphémère |
| configuration persistante | inchangée | `MEASURED` — aucun fichier utilisateur ou projet modifié |

La première tentative de réglage `skills.context_budget` a été ignorée au
niveau de l’exécution comme paramètre non reconnu et n’est pas retenue comme
prévol valide. Le réglage reconnu pour cette version est
`skills.max_context_tokens`; `4096` restait insuffisant, tandis que `16384`
a permis le démarrage sans message de dépassement ni suppression globale des
descriptions de skills.

Résultats du prévol corrigé :

| Vérification | Résultat | Statut |
|---|---|---|
| durée murale | `12,476 s` | `MEASURED` |
| sortie Codex | code de sortie `0` | `MEASURED` |
| instructions racine | règles racine du dépôt accessibles et lues | `VERIFIED` |
| instructions scoped | règles scoped documentation et mobile accessibles et lues | `VERIFIED` |
| skills nécessaires | `cleanmymap-repo` et `cleanmymap-performance` accessibles depuis `.codex/skills` | `VERIFIED` |
| analyse simple | symbole `startTracking` retrouvé dans `apps/mobile/lib/tracking-service.ts` | `VERIFIED` |
| MCP pendant le prévol | `MCP_USED=NONE`, aucune mention de COROS dans les événements | `VERIFIED` |

La configuration persistante examinée séparément reste la suivante, sans
reproduire de secret : le CLI utilise `gpt-5.6-luna`, un effort par défaut
`high`, une politique d’approbation `never` et un sandbox local
`danger-full-access`; le projet CleanMyMap est marqué trusted. La configuration
projet `.codex/config.toml` ne contient que le réglage de résumé de raisonnement.
`codex mcp get coros` confirme un serveur HTTP COROS configuré mais non
authentifié (`Not logged in`). `gitnexus` et `node_repl` sont configurés côté
CLI. Les surfaces Desktop exposent des namespaces MCP différés, mais leur état
de démarrage complet n’est pas exporté par le CLI et aucun de ces MCP n’a été
appelé pendant ce prévol.

Les skills CleanMyMap existent dans les deux emplacements locaux `.codex/skills`
et `.agents/skills`; cette duplication de provenance est observable, mais le
prévol n’a pas établi un nombre total d’entrées du catalogue ni un nombre
d’entrées volontairement omises. Ces valeurs restent `NOT_OBSERVABLE`. De
même, le prévol vérifie l’accessibilité et l’analyse ciblée ; il ne constitue
pas une preuve d’exhaustivité de tout le contexte Desktop.

**Verdict du prévol : `ENVIRONMENT_READY`.** Le contexte nécessaire démarre
normalement avec un plafond documentaire de 64 KiB, un budget de skills adapté
et COROS isolé. Au moment de ce prévol, le benchmark `medium`/`high` restait
`NOT_RUN` ; la séquence finale décrite ci-dessous a été exécutée ensuite avec
les mêmes surcharges éphémères.

### État historique avant la séquence finale

| Exécution | Tâche | Effort | Statut |
|---:|---|---|---|
| 2 | B | `high` | `NOT_RUN` — arrêt après échec d’environnement |
| 3 | A | `high` | `NOT_RUN` — arrêt après échec d’environnement |
| 4 | B | `medium` | `NOT_RUN` — arrêt après échec d’environnement |

### Comparaison historique avant la séquence finale

`NOT_COMPARABLE` à ce stade historique. Aucune analyse A ou B exploitable
n’avait été produite ; il n’y avait donc aucune base honnête pour comparer
durée, appels, tokens, exactitude, exhaustivité ou différences de raisonnement
entre `medium` et `high`.

Les tokens d’entrée, de sortie et de raisonnement, les compactifications, la
durée totale fiable et le temps cumulé des outils sont `NOT_OBSERVABLE` pour
cet essai invalide.

### Séquence finale exécutée — 2026-10-10

Les quatre essais demandés ont ensuite été lancés séquentiellement dans l’ordre
canonique, sur le même SHA et avec les prompts identiques à l’intérieur de
chaque paire. Chaque processus utilisait `--ephemeral`, le modèle
`gpt-5.6-luna`, `model_reasoning_effort` explicite, sandbox `read-only`,
`project_doc_max_bytes=65536`, `skills.max_context_tokens=16384` et
`mcp_servers.coros.enabled=false`.

| Essai | Tâche | Effort | Durée murale | Commandes shell | Appels MCP observés | Erreurs événementielles | Timeout | Verdict tâche |
|---:|---|---|---:|---:|---:|---:|---|---|
| 1 | A | `medium` | 120,255 s | 18 | 0 | 0 | Oui | `INVALID_TIMEOUT` |
| 2 | B | `high` | 120,142 s | 36 | 0 | 0 | Oui | `INVALID_TIMEOUT` |
| 3 | A | `high` | 120,135 s | 44 | 0 | 0 | Oui | `INVALID_TIMEOUT` |
| 4 | B | `medium` | 98,307 s | 26 | 0 | 0 | Non | `EVALUABLE_PARTIAL` |

Les appels MCP sont comptés à partir des événements structurés ; aucun
événement `function_call` ou appel MCP n’a été observé. Les avertissements
non bloquants du CLI concernaient les icônes de skills et l’absence de support
du shell snapshot PowerShell. Aucun test, build, lint, typecheck,
réindexation QMD/GitNexus ou écriture dans le dépôt n’a été déclenché.

Les essais 1 à 3 ont exécuté des lectures shell mais n’ont pas produit le
rapport final demandé avant l’expiration de la limite. Ils sont donc invalides
pour une évaluation de qualité et pour une comparaison de latence utile. Leur
temps avant première réponse utile, leur temps de raisonnement, leur usage de
tokens et leurs compactifications sont `NOT_OBSERVABLE`.

L’essai 4 a produit les cinq sections demandées et 46 références de preuve
détectées dans le rapport. La lecture du code confirme globalement les
constats sur la préparation, `ActionUpdateValidationError`, la persistance,
l’ordre des effets et les tests associés. Une affirmation incidente sur la
présence de modifications locales non liées n’était pas établie par l’état Git
du candidat et ne doit pas être retenue. La qualité de cet essai est donc
`EVALUABLE_PARTIAL`, non une preuve d’exhaustivité.

### Tokens et comparabilité

| Essai | Input tokens | Cached input | Output tokens | Reasoning output | Statut |
|---:|---:|---:|---:|---:|---|
| A-medium | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | timeout |
| B-high | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | timeout |
| A-high | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | `NOT_OBSERVABLE` | timeout |
| B-medium | 1 015 965 | 938 496 | 6 992 | 1 530 | rapport structuré produit |

Verdict de comparabilité : `NOT_COMPARABLE`. Les quatre processus ont été
lancés dans l’ordre et avec les contraintes demandées, mais une seule analyse
est exploitable et aucune paire medium/high n’est complète. Les durées et les
appels shell observés décrivent ce prévol borné ; ils ne permettent pas de
conclure que `medium` ou `high` est intrinsèquement plus rapide ou meilleur.
Le réglage utilisateur par défaut `high` est conservé.

## Recommandations retenues et rejetées

### Retenues

- conserver `high` comme réglage utilisateur par défaut ;
- réserver `medium` aux essais de lecture seule explicitement contrôlés ;
- ne pas utiliser cette tentative invalide pour choisir un réglage ;
- réutiliser ce rapport pour les mesures comparatives ultérieures ;
- exiger une réponse complète et un contexte de gouvernance non tronqué avant
  de qualifier une exécution de benchmark valide.

### Rejetées ou différées

- passer globalement à `medium` sur la seule base de ce résultat ;
- attribuer les 28 min 24 s ou 24 min 11 s non attribuées au modèle ;
- désactiver durablement les skills ou les MCP sans protocole séparé ;
- conclure à un gain de performance sans quatre exécutions comparables ;
- lancer une optimisation de Codex dans ce lot documentaire.

## Protocole reproductible avant/après

Lorsqu’un lot d’optimisation sera explicitement autorisé :

1. Relever le SHA exact, l’état Git, la version du CLI, le modèle, le niveau de
   raisonnement, le sandbox et la liste effective des MCP/skills chargés.
2. Préparer un environnement de benchmark qui ne tronque pas les règles
   applicables et qui ne démarre pas de MCP non requis par les tâches.
3. Vérifier que cette préparation est identique pour `medium` et `high`, sans
   modifier la configuration globale utilisateur.
4. Lancer les quatre exécutions indépendantes dans l’ordre A-medium,
   B-high, A-high, B-medium, avec les prompts inchangés par paire.
5. Limiter chaque exécution à deux minutes et arrêter proprement uniquement le
   processus du benchmark en cas de dépassement.
6. Conserver temporairement un journal JSONL minimal, sans secrets ni contenu
   privé, puis extraire seulement les métriques utiles.
7. Compter les appels d’outils par événement observé et distinguer `rg`, Git,
   lectures, MCP et autres appels ; ne pas inférer les tokens ou temps internes
   lorsqu’ils ne sont pas exposés.
8. Comparer chaque tâche à elle-même entre les deux niveaux et qualifier les
   écarts `MEASURED`, `INFERRED` ou `NOT_OBSERVABLE`.
9. Répéter le protocole après toute optimisation, au même SHA fonctionnel ou
   sur une tâche strictement comparable, avant de calculer un gain.

## POST_OPTIMIZATION

Aucune optimisation n’a été exécutée dans le présent lot. Les champs
`Avant`, `Après`, gains et verdicts restent volontairement non renseignés.

| Optimisation | Cause initiale | Avant | Après | Gain absolu | Gain relatif | Qualité | Limites | Verdict |
|---|---|---|---|---|---|---|---|---|
| Aucune | — | `NOT_MEASURED` | `NOT_MEASURED` | `NOT_MEASURED` | `NOT_MEASURED` | `NOT_MEASURED` | Aucune optimisation appliquée | `NOT_EXECUTED` |

## Validations et publication

Le lot autorise uniquement cette documentation. Les validations à exécuter sur
le candidat documentaire sont :

- gouvernance documentaire ;
- cohérence des chiffres et unités, contrôlée par relecture ;
- absence de secrets, tokens, identifiants personnels ou journaux bruts ;
- `git diff --check` ;
- `precommit:guard` ;
- garde pre-push.

Aucun test, build, lint, typecheck, `checks:full`, réindexation QMD/GitNexus,
déploiement, commit ou push n’est inclus dans le benchmark lui-même.
