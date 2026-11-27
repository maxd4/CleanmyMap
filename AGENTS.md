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
3. **Preuves typées et substance.** Distinguer `STATIC_CONTRACT` ≠ `EXECUTED_BEHAVIOR` ≠ `INTEGRATION_PROOF` (`documentation/development/TESTING.md`). Tout lot modifiant un comportement ou contrat exige : consommation réellement exécutée du runtime, tests comportementaux et régressions (nominaux, limites, invalides, adversariaux, erreurs, transitions, concurrence selon le risque), couverture pertinente (Web et Mobile restent indépendants ; sinon `NOT_MEASURED` motivé ; aucun seuil/baseline/exclusion modifié) et mise à jour des documents `CURRENT`. Sans exécution PostgreSQL autorisée, déclarer `DB_SEMANTICS_NOT_EXECUTED`.
4. **Matrice UI/UX gelée (lots 01 à 11)** : dans `PLAN_MACRO_LOTS_UI_UX_CODEX.md`, ne pas modifier `documentation/design-system/MATRICE_ASTUCES_UI_UX_CLEANMYMAP.md` ni créer de copie avant le lot 12 (`STOP` sinon).
5. **Documentation canonique dans le même lot** : mettre à jour les sources spécialisées et fiches `CURRENT` concernées ; signaler `DOCUMENTATION_DRIFT` pour une fiche protégée devenue fausse (`documentation/AGENTS.md`).
6. **Auto-revue contradictoire, STOP CONDITION et publication** : rechercher chemins de contournement, incompatibilités et effets de bord avant clôture. Une possibilité (« pourrait », « éventuellement ») n'est pas une implémentation (`EXISTING_VERIFIED`, `NOT_APPLICABLE`, `PARTIEL` ou `BLOCKED`).
7. **Modularité, dead code et duplication** : exports privés par défaut ; ne pas déplacer intact un monolithe ni contourner `quality:complexity`, `quality:top-heavy`, Knip ou jscpd par baseline/exclusion/raccourcissement cosmétique. Procédures et registres : `conventions-modularisation.md`, `TESTING.md`, `scripts/AGENTS.md`. Un lot non mobile ne modifie pas `apps/mobile/**` ni ses baselines/justifications.

## 4. Modèle d'exécution : MAIN-ONLY / MULTI-WRITER COORDONNÉ

Plusieurs writers ChatGPT et Codex peuvent contribuer au dépôt et travailler sur des chemins distincts ; aucun ne doit jamais écraser silencieusement les changements d'un autre writer. Les modifications sur des fichiers distincts peuvent progresser en parallèle ; un même fichier, l'index, `HEAD` et les opérations Git mutantes sont coordonnés explicitement (`CHATGPT.md`, `scripts/AGENTS.md`).

- `main publié = référence versionnée ;` `une candidate locale explicitement fournie ou produite pour le lot courant est autoritative pour ce lot jusqu’à intégration ;` `tout changement local préexistant doit être préservé et ne doit jamais être écrasé par une synchronisation avec Git.`
- Travail normal sur `main` dans le checkout canonique : **ne jamais créer** branche de chantier, clone, worktree, coordinateur ou claim persistant. Un checkout dirty, des untracked ou `HEAD != origin/main` ne bloquent pas l'analyse ni le travail indépendant.
- Capturer au démarrage référence (`HEAD`, `origin/main`, index, dirty/untracked) et allowlist du lot. L'allowlist initiale sert à l'attribution et au cadrage : les changements étrangers sont préservés et exclus (ne jamais restaurer, stasher, supprimer ou fusionner). Une écriture concurrente sur un chemin attribué est une collision : préserver les deux états, arrêter la mutation/publication de ce chemin et rapporter le diagnostic.
- Aucune évolution ultérieure de `HEAD`, `origin/main`, de l'index ou du worktree n'étend le périmètre ni ne relance une validation globale. Corriger uniquement les défauts du lot ; signaler séparément les défauts étrangers.
- **Scopes et candidats** : distinguer `WORKTREE_LIVE`, `STAGED`, `COMMITTED_SNAPSHOT`, `PUSH_CANDIDATE` et `DYNAMIC_CANDIDATE` (`scripts/AGENTS.md`, `TESTING.md`). Staging explicite obligatoire (jamais `git add -A`) ; vérifier `git diff --cached --name-only` et le diff staged avant commit. Plusieurs chantiers ou writers peuvent être regroupés dans un commit lorsque chacun figure dans l'allowlist attribuée.
- **Synchronisation distante à la demande de fraîcheur** : dès qu'une décision dépend de l'état courant de `origin/main` — comparaison, réconciliation, push, doute de divergence, ou signalement d'un commit concurrent — exécuter immédiatement `git fetch origin main` avant de décider ou modifier l'historique. Ne pas attendre la dernière étape de publication pour rafraîchir la référence. Comparer ensuite `HEAD`, `main` et `origin/main`; si `origin/main` est en avance et que les chemins attribués ne collisionnent pas, réconcilier par fast-forward/rebase selon la procédure ci-dessous et revalider les surfaces affectées. Préserver les fichiers dirty et changements concurrents; ne jamais utiliser `reset`, `clean`, `stash`, force-push ou checkout destructif pour synchroniser. Si la fraîcheur distante n'affecte aucune décision et aucune publication n'est prévue, ne pas fetch par routine.
- **Clôture Git obligatoire à chaque exécution qui modifie le checkout** : après validation du candidat exact, créer un commit puis pousser `main` tous les fichiers tracked staged/unstaged et untracked du snapshot initial, y compris les changements préexistants ou d'autres lots. Cette règle s'applique par défaut sans demande de publication répétée. Inventorier, relire et auditer chaque fichier, stage explicitement la liste complète (jamais `git add -A`), puis relire intégralement `STAGED` avant commit. Exclure les fichiers ignorés et secrets. Ne jamais inclure silencieusement un changement apparu après le snapshot ; préserver et signaler toute collision concurrente sur le même chemin. Si tests, secrets, hooks, protections, permissions ou fast-forward bloquent, ne rien contourner : corriger le défaut attribuable au lot ou rapporter le blocage exact sans publier le candidat invalide. Après push, `fetch` et vérifier `HEAD = origin/main`, ahead/behind `0/0`. Aucun force-push.
- **Publication et exceptions gouvernées** : lorsqu'un push est explicitement demandé, tous les commits locaux en avance sur la branche distante sont poussés dans leur ordre d'historique. En l'absence d'interdiction explicite de l'utilisateur (« sans push »), la clôture obligatoire de chaque lot reste commit, push puis vérification de convergence. Lorsqu'un push est explicitement demandé, tous les commits locaux en avance sur la branche distante sont publiés dans leur ordre d'historique. Les hooks `pre-commit` et `pre-push` et leurs protections ne sont jamais contournés. Si `origin/main` a avancé sans conflit sur les chemins attribués : `git fetch origin main` → `git rebase origin/main` → laisser `pre-push` valider `PUSH_CANDIDATE` → push fast-forward (`git rebase --abort` si conflit). `DIRECT_GITHUB_PUBLICATION` de ChatGPT suit `CHATGPT.md` (`HOOK_NOT_AVAILABLE` n'est jamais assimilé à `PASS`). Le mode de développement rapide ne supprime pas cette clôture, sauf consigne explicite « sans push ». Un préflight Supabase `BLOCKED`/`DIVERGED` ne retient pas un push Git autrement publiable, mais les hooks SQL pertinents restent obligatoires.
- **Fichiers fournis et protection préexistante** : un fichier fourni par l'utilisateur pour créer, remplacer ou adapter un chemin est **la candidate autoritative de ce chemin pour le lot** (conserver sa source et sa correspondance nom → cible ; ne jamais l'écraser par `HEAD`, une ancienne version, `restore`, `checkout`, `reset`, `clean`, `stash` ou une régénération ; préserver les parties non concernées ; vérifier l'identité exacte avant staging ; sa seule présence ne justifie pas un commit hors lot). En cas d'attribution incertaine d'un chemin préexistant, arrêter sa mutation et en cas de doute, `STOP`.
- **Message de commit** : sujet `type(scope): résultat` compréhensible dans GitHub ; pour un changement fonctionnel, corps structuré (`POURQUOI`, `CHANGEMENTS ET CONTRATS`, `TESTS ET PREUVES` avec couverture par workspace ou `NOT_MEASURED`, `DOCUMENTATION`, `LIMITES OU SUITE`).

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
