# AGENTS.md — CleanMyMap

> **Lecture complète obligatoire** : tout agent ou sous-agent doit lire **intégralement** ce fichier `AGENTS.md` et les fichiers scoped applicables avant toute modification, sans supposer un chargement automatique complet. Les procédures détaillées vivent dans leurs owners spécialisés (tableau de routage ci-dessous) et restent obligatoires pour leur périmètre.

Sources privées complémentaires : `documentation/development/DOCUMENTATION_POLICY.md` ; les contrats techniques du dépôt restent autoritaires.

## 1. Portée, autorité et ambition

- **Source versionnée** : `maxd4/CleanmyMap`, branche `main` (identifiée par racine Git et remote, jamais par le nom du dossier). Distinguer le `main` publié, le checkout local et toute candidate fournie.
- **Priorité** : demande explicite de l'utilisateur ; sécurité, données et intégrité ; candidate fournie pour le lot ; checkout et contrats réellement consommés ; `AGENTS.md` racine et fichiers scoped ; documentation canonique ; simplicité, maintenabilité, performance et coûts.
- **Ambition et cause racine** : viser le meilleur résultat démontrable et sa fiabilité réelle, jamais une exécution minimale. Pour un changement substantiel, vérifier objectif, hypothèses, méthodes du domaine, coûts, risques et critères mesurables ; corriger la cause racine et ses conséquences directes dans **un lot cohérent complet**, proportionnellement au risque. Si l'objectif est irréalisable ou contredit par le checkout, signaler et proposer une alternative étayée sans abaisser l'acceptation.
- **Ordre de priorité des chantiers** (lorsque plusieurs objectifs ou lots sont en concurrence) :
  1. **Fiabiliser les preuves et les contrôles de publication** : éviter qu'un agent puisse déclarer à tort un chantier terminé.
  2. **Simplifier la découverte technique pour les agents** : achever et maintenir les lots documentaires et index engagés.
  3. **Réduire la dette technique réellement démontrée** : traiter les causes racines, duplications métier et dépendances inutiles.
  4. **Améliorer l'accessibilité du projet aux humains** : documentation d'entrée, contribution et compréhension de l'architecture.
  5. **Poursuivre les développements fonctionnels** : sur des fondations dont la fiabilité est démontrée.

## 2. Catégories de lots et conduite avant écriture

Repères indicatifs (jamais des quotas ni des conditions d'arrêt) : **Correction** (cause racine bornée), **Micro-lot** (~5 min), **Macro-lot** (~15-30 min), **Lot XL** (~45-75 min, 2 à 4 jalons internes ordonnés exécutés successivement sans clôture prématurée). La `STOP CONDITION` est définie par les critères fonctionnels, invariants, preuves et validations du lot.

Avant d'écrire :
1. Lire l'état courant de la zone, le `AGENTS.md` scoped, les contrats, callers, consommateurs et tests pertinents ; cartographier voies de mutation (API, jobs, imports, RPC, triggers), acteurs/droits, transitions, persistance, cas normaux/interdits et effets de bord.
2. Décider entre **`EXTEND_EXISTING`**, **`CREATE_MODULE`** et **`RESTRUCTURE_FIRST`** (`documentation/development/conventions-modularisation.md`) ; décrire responsabilité unique, owner, entrées, sorties, effets et frontières avant de coder. Garder les fonctions d'orchestration lisibles (étapes nommées, garde-fous précoces) sans mélanger validation/AuthN/AuthZ, métier, persistance et formatage. Si l'implémentation crée une violation `quality:complexity`, une dérive au-delà d'un ratchet ou un mélange de responsabilités, arrêter et revoir le découpage avant d'ajouter du comportement ; après écriture, vérifier le flux complet et les frontières.
3. Définir invariants, `STOP CONDITION` et preuves selon les risques réels (et non selon la facilité).
4. Pour une tâche ciblée sur un workspace (`apps/web` ou `apps/mobile`), commencer par son `AGENTS.md` scoped, son README et ses contrats ; n'étendre aux autres zones que pour une dépendance, un consommateur ou un impact démontré.

## 3. Invariants de développement et qualité

1. **Un seul owner par comportement.** Identifier l'owner canonique avant toute écriture ; réutiliser/étendre plutôt que créer une seconde vérité. Si aucun owner sûr n'existe, `STOP`.
2. **Aucun changement silencieux de contrat sensible.** AuthN/AuthZ, RLS, ownership, scope, privilèges, PII, SEO, consentement et logique métier exigent une évolution explicitement bornée, testée (positif + négatif) et documentée `CURRENT`.
3. **Preuves typées et substance.** Distinguer `STATIC_CONTRACT` ≠ `EXECUTED_BEHAVIOR` ≠ `INTEGRATION_PROOF` (`documentation/development/TESTING.md`). Un changement de comportement exige des tests comportementaux et régressions proportionnés au risque et une mise à jour des documents `CURRENT`. Pour chaque fichier runtime Web instrumentable créé ou modifié, boucler obligatoirement : implémentation → tests comportementaux → mesure ciblée → analyse des éléments non couverts → ajout de tests manquants → nouvelle mesure, jusqu'à tous les seuils par fichier. Sécurité : 90 % statements/lignes/fonctions et 80 % branches ; métier/API/persistance : 80 % statements/lignes/fonctions et 70 % branches ; UI/autres : 70 % sur les quatre métriques. Le périmètre vient du diff Git exact du candidat, jamais d'une sélection manuelle ; une moyenne n'efface aucun fichier insuffisant. `NOT_MEASURED` exige une impossibilité réelle d'instrumentation et des preuves comportementales compensatoires, et ne vaut jamais `PASS`. La couverture TS, PostgreSQL/RLS, concurrence et E2E sont des preuves distinctes ; Web et Mobile restent indépendants, le contrôle mobile global existant reste séparé. Aucun seuil/baseline/exclusion ne peut être modifié pour publier. Sans exécution PostgreSQL autorisée, déclarer `DB_SEMANTICS_NOT_EXECUTED`.
4. **Matrice UI/UX gelée (lots 01 à 11)** : dans `PLAN_MACRO_LOTS_UI_UX_CODEX.md`, ne pas modifier `documentation/design-system/MATRICE_ASTUCES_UI_UX_CLEANMYMAP.md` ni créer de copie avant le lot 12 (`STOP` sinon).
5. **Documentation canonique dans le même lot** : mettre à jour les sources spécialisées et fiches `CURRENT` concernées ; signaler `DOCUMENTATION_DRIFT` pour une fiche protégée devenue fausse (`documentation/AGENTS.md`).
6. **Auto-revue contradictoire, STOP CONDITION et publication** : rechercher chemins de contournement, incompatibilités et effets de bord avant clôture. Une possibilité (« pourrait », « éventuellement ») n'est pas une implémentation (`EXISTING_VERIFIED`, `NOT_APPLICABLE`, `PARTIEL` ou `BLOCKED`).
7. **Modularité, dead code et duplication** : exports privés par défaut ; ne pas déplacer intact un monolithe ni contourner `quality:complexity`, `quality:top-heavy`, Knip ou jscpd par baseline/exclusion/raccourcissement cosmétique. Procédures et registres : `conventions-modularisation.md`, `TESTING.md`, `scripts/AGENTS.md`. Un lot non mobile ne modifie pas `apps/mobile/**` ni ses baselines/justifications.

## 4. Règles universelles d'exécution et de livraison

`AGENTS.md` est l'unique owner des règles universelles ci-dessous. Les documents scoped, skills et procédures les précisent pour leur domaine sans les redéfinir. `CHATGPT.md` précise la contribution ChatGPT et la réception indépendante. Le travail courant reste sur `main` dans le checkout canonique ; ne pas créer de branche, clone ou worktree.

### R01 — CONTINUITÉ
Poursuivre toutes les actions réalisables jusqu'à la `STOP CONDITION`. Un jalon, un budget indicatif, un test réussi ou une validation restante ne justifie pas une clôture prématurée.

### R02 — PUBLICATION INCRÉMENTALE
Publier chaque sous-ensemble cohérent, sécurisé et validé sans attendre l'achèvement global du chantier. Le mode rapide ne dispense jamais du commit et du push, sauf interdiction explicite de l'utilisateur ou blocage démontré.

### R03 — ÉTATS DE LIVRAISON
Distinguer `COMMIT_READY`, `PUSH_READY`, `PUBLISHED`, `INTEGRATION_VALIDATED`, `RELEASE_READY` et `COMPLETED`. `COMMIT_READY` exige un diff attribué relu et prêt au commit ; `PUSH_READY`, une candidate exacte et les hooks/protections satisfaits ; `PUBLISHED`, un push accepté sans violation bypassée sauf l'update explicitement autorisé par un ruleset pour l'identité courante, puis un fetch prouvant `HEAD = origin/main` et ahead/behind `0/0` ; `INTEGRATION_VALIDATED`, les preuves runtime/CI et consommateurs concernés ; `RELEASE_READY`, les contrôles release canoniques ; `COMPLETED`, toute la `STOP CONDITION`. Aucun état n'implique automatiquement le suivant.

### R04 — SAUVEGARDE DES CANDIDATS
Si le runtime ne peut pas être publié en sécurité, publier les véritables artefacts `CANDIDATE` dans `documentation/specs/<chantier>/` : fichiers complets ou patches applicables, SQL, tests pertinents et manifeste avec correspondance exacte source/cible. Un manifeste seul ne sauvegarde pas les candidats. Chaque artefact déclaré doit exister, être hashé et avoir une correspondance sûre. Ne pas dupliquer les candidats déjà intégrés ni activer prématurément une migration. Ces candidats durables sont distincts des sorties éphémères `artifacts/validation/prepush-candidate/`.

### R05 — BLOCAGE DÉMONTRÉ
Tout statut `BLOCKED` identifie le contrôle exécuté, son résultat exact, la cause établie ou inconnue, les fichiers concernés, le périmètre bloqué et l'action nécessaire. Un refus anticipé, une hypothèse ou une validation non lancée ne prouve pas un blocage. Ne pas tenter une opération dont l'insécurité est déjà établie uniquement pour provoquer un échec.

### R06 — DÉBLOCAGE AUTONOME
Rechercher et exécuter les solutions autorisées avant de s'arrêter. Continuer les travaux indépendants du blocage. Ne pas demander confirmation pour une décision technique déjà couverte par les instructions ou autorisations existantes.

### R07 — ATTRIBUTION MULTI-WRITER
Chaque writer peut travailler simultanément sur `main` dans le checkout canonique ; un worktree dirty ne bloque jamais les opérations indépendantes. Chaque commit contient uniquement les changements explicitement attribués et validés pour son lot. Les changements étrangers, staged, unstaged ou untracked, sont préservés et exclus de ce commit. Plusieurs lots ne partagent un commit que si attribution et validation de chacun sont explicites. Une collision bloque uniquement les opérations dépendant du chemin concerné. Coordonner staging, commits, réconciliation et push. Aucun écrasement, stash, nettoyage destructif, branche, clone, worktree supplémentaire ou force-push.

### R08 — TRANSFERT DE RESPONSABILITÉ
Si un défaut étranger bloque le lot et que son owner n'est plus disponible, organiser une réattribution explicite limitée au défaut démontré. Ne pas absorber silencieusement un chantier étranger.

### R09 — VALIDATIONS PROPORTIONNÉES
Distinguer contrôles obligatoires de publication, tests ciblés, couverture du périmètre, couverture globale, intégration et release. Une mesure ciblée sous le seuil entraîne obligatoirement l'ajout de tests utiles et une nouvelle mesure ; le gate de publication refuse le runtime concerné tant que chaque fichier n'est pas conforme. Diagnostiquer les échecs observés sans répéter indéfiniment les mêmes suites. N'imposer une validation globale que si une procédure canonique l'exige ou si un risque démontré le justifie. Ne jamais affaiblir seuil, exclusion, ratchet ou test pour publier.

### R10 — ABSENCE DE DÉPENDANCE CIRCULAIRE
Une preuve exigeant un SHA déjà publié ne peut pas conditionner cette même publication. Un préflight Supabase `BLOCKED`/`DIVERGED` ne bloque pas un push Git par ailleurs sûr. L'application distante des migrations sensibles reste soumise au runbook et aux preuves PostgreSQL requises ; publier du code n'atteste pas l'application DB.

### R11 — PROTECTIONS DISTANTES
Avant une publication concernée, vérifier en lecture seule les règles GitHub actives, les acteurs de bypass, leurs conditions et l'identité courante. Un bypass est autorisé uniquement lorsqu'un ruleset actif l'accorde explicitement à cette identité pour la règle `update` de la branche cible ; un message `Bypassed rule violations` est alors acceptable uniquement si ses violations listées se limitent à cette règle d'update. Cette autorisation ne dispense jamais des hooks, contrôles obligatoires, protections de sécurité ni des gardes de suppression et non-fast-forward. Tout autre bypass, règle violée, acteur non confirmé ou état distant incertain bloque la publication. Ne jamais modifier une protection ni neutraliser un contrôle pour obtenir un push accepté.

### R12 — CLÔTURE CONTRÔLÉE
Ne pas clore `PARTIEL` par convenance. Toute clôture partielle prouve qu'aucune autre action utile n'est réalisable, nomme les acquis effectivement publiés et les preuves restantes. Une liste de travaux restants ne remplace pas leur exécution. `COMPLETED` requiert toute la `STOP CONDITION`.

### MAIN-ONLY / MULTI-WRITER COORDONNÉ : modalités
Au démarrage, capturer `HEAD`, l'état distant utile, l'index, les chemins dirty/untracked et l'allowlist attribuée. Le worktree dirty n'arrête pas les opérations indépendantes. Préserver les changements étrangers et les exclure des commits du lot ; aucun changement ultérieur n'étend cette attribution. Avant commit, relire les chemins attribués et le staged exact. Distinguer les scopes `WORKTREE_LIVE`, `STAGED`, `COMMITTED_SNAPSHOT`, `PUSH_CANDIDATE` et `DYNAMIC_CANDIDATE` selon les guides scoped.

Un push porte sur l'ensemble des commits locaux validés en avance sur `origin/main`, quel que soit leur writer ; son périmètre n'élargit pas celui du commit courant. Avant chaque décision de publication, exécuter `git fetch origin main` et vérifier la divergence. S'il n'y a aucun commit à pousser, constater la convergence et ne pas lancer de push. Si la référence distante a avancé, réconcilier sans écraser les changements et revalider les surfaces affectées ; une collision ne bloque que les opérations dépendant de son chemin. Clôture obligatoire : valider le candidat exact, commiter uniquement le lot attribué, pousser les commits locaux validés en avance, puis refetcher et vérifier `HEAD = origin/main` et ahead/behind `0/0`. Aucun hook `pre-commit`/`pre-push`, contrôle obligatoire, protection GitHub ni garde fast-forward ne peut être contourné. Les fichiers fournis par l'utilisateur restent autoritatifs pour leurs chemins.

Le message de commit suit `type(scope): résultat` et, pour un changement fonctionnel, contient `POURQUOI`, `CHANGEMENTS ET CONTRATS`, `TESTS ET PREUVES`, couverture par workspace ou `NOT_MEASURED`, `DOCUMENTATION` et `LIMITES OU SUITE`.
## 5. Sécurité, Supabase et environnement d'exécution

- **Secrets et frontières** : jamais de secret, token, cookie, session, PII ou stack trace exposé ; `service_role` uniquement côté serveur ; valider entrées, AuthN/AuthZ, ownership, scope et RLS côté serveur. Ne jamais contourner une sécurité pour réparer un test ni transformer un proxy en mesure. Security deception : `documentation/security/SECURITY.md`.
- **Supabase lié uniquement — Docker local en pause** : ni Docker, ni WSL, ni conteneur, ni `supabase start`/`status`/`db reset`. Unique arbre éditable : `apps/web/supabase/migrations/` (forward-only). Préflight obligatoire `npm run supabase:migration:preflight -- --dry-run` et application exclusive par CLI liée selon `apps/web/supabase/AGENTS.md` et `documentation/operations/runbook-supabase-convergence.md`. `.github/workflows/supabase-convergence.yml` reste strictement read-only.
- **Artefacts et commandes Web** : `work/` interdit à la racine ; sorties temporaires/audits sous `artifacts/` (`scripts/AGENTS.md`, `host-environment.md`). Exécuter Vitest/Vite/ESLint Web dans `apps/web` (`npm run test -w apps/web -- ...`, etc.), jamais depuis la racine.
- **Déploiement Vercel et diagnostic CLI** : suivre `documentation/operations/runbook-deploiement.md` (`checks:deploy`, `release:check`, puis `vercel deploy --prod --yes --scope maxdperso` depuis la racine après `RELEASE_READY: YES` lorsque l'auto-déploiement Git est désactivé). Avant de classer un échec CLI en `HOST_ENVIRONMENT`, exécuter le diagnostic réseau/CLI borné de `documentation/development/host-environment.md`.
- **Validation proportionnée** : `DEVELOPMENT` (`npm run checks:fast`, budget 180 s) selon le risque réel sans dupliquer les hooks ; documentation pure = contrôles documentaires, diff, secrets, intégrité Git. `FULL` **uniquement** sur demande explicite ou préparation immédiate d'un déploiement Vercel (`NOT_RUN_POLICY` sinon ; un seul `FULL` sur candidat exact ; `RELEASE` exige `FULL` vert). Détails : `TESTING.md` et `scripts/AGENTS.md`.
- **Découverte facultative** : QMD max 1 refresh / 24 h (`qmd update -c CleanMyMap`), GitNexus facultatif (`TESTING.md`).

## 6. Routage scoped (lecture obligatoire selon périmètre)

| Domaine | Source |
|---|---|
| Web, Next.js, UI | `apps/web/AGENTS.md` |
| Concision textes UI Web/Mobile | `documentation/design-system/UI_COPY_CONCISION.md` |
| API | `apps/web/src/app/api/AGENTS.md` |
| Supabase, migrations, SQL | `apps/web/supabase/AGENTS.md`, `documentation/operations/runbook-supabase-convergence.md` |
| Scripts web | `apps/web/scripts/AGENTS.md` |
| Scripts, Git, hooks, ratchets | `scripts/AGENTS.md` |
| GitHub Actions | `.github/AGENTS.md` |
| Mobile | `apps/mobile/AGENTS.md` |
| Python | `maintenance/python/AGENTS.md` |
| Documentation | `documentation/AGENTS.md` |
| E2E | `e2e/AGENTS.md` |
| Tests, preuves, couverture | `documentation/development/TESTING.md`, `documentation/development/testing-quality-coverage.md` |
| Architecture modulaire | `documentation/development/conventions-modularisation.md` |
| Qualité, prévention, host | `documentation/development/repo-quality-rules.md`, `documentation/development/host-environment.md` |
| Sécurité | `documentation/security/` |

## 7. Clôture et réponse

Clôturer lorsque objectif, invariants et preuves suffisantes sont démontrés et qu'aucun changement étranger n'a été écrasé. Réponse finale en français, concise, avec résultat, commit éventuel, statut exact des preuves (`PASS`, `FAIL`, `PENDING`, `BLOCKED`, `NOT_RUN`, `DB_SEMANTICS_NOT_EXECUTED`) et limites matérielles.

### LEGACY / COMPATIBILITY

Les anciens noms, coordinateurs et métadonnées de migration décrivent uniquement l'historique ; ils ne gouvernent aucun nouveau lot.
