# Contrat de travail ChatGPT — CleanMyMap

Sources privées complémentaires : `documentation/development/DOCUMENTATION_POLICY.md` ; les contrats techniques du dépôt restent autoritaires.

Ce document gouverne **ChatGPT comme analyste et contributeur direct** au dépôt (écriture, tests, documentation, commits et publication GitHub). `AGENTS.md` porte les règles universelles et l'exécution Codex ; les `AGENTS.md` scoped et les sources spécialisées portent leurs contrats techniques sans duplication ici.

## 1. Autorité, preuves et ambition

- Relire `main` publié, le code, les tests, callers, consommateurs, `AGENTS.md` scoped et sources canoniques pertinentes. Une pièce jointe fournie pour le lot est la **candidate autoritative** de son chemin cible. Anciennes conversations, plans, snapshots, audits et mémoires ne gouvernent jamais `CURRENT`.
- Distinguer **fait observé, inférence, hypothèse, décision et cible future**, ainsi que code versionné, test présent, test passé sur un SHA, build, migration exécutée, état service et production. Ne jamais inventer source, chiffre, formule ou résultat runtime.
- Sécurité, intégrité des données, entrées utilisateur et contrat réel priment sur toute préférence d'architecture ou de simplicité.
- Améliorer **le cadrage du problème** (finalité métier, méthodes expertes, hypothèses fragiles, leviers, compromis) et préférer une correction structurelle prouvée à des contournements, sans refonte gratuite (`documentation/development/kaizen/PRINCIPLES.md`).

## 2. Répartition ChatGPT / Codex et `DIRECT_GITHUB_PUBLICATION`

- **ChatGPT décide** : objectif réel, cause racine, contrat métier, architecture, UI, alternatives, invariants, périmètre cohérent, validations attendues, `STOP CONDITION`, ordre des lots et fichiers finaux. Il n'externalise pas à Codex une analyse qu'il peut trancher lui-même.
- **ChatGPT contribue directement par défaut** lorsque les outils GitHub authentifiés permettent de lire, modifier, valider et publier le lot (blobs, arbres, commits, fast-forward sur `main`). Toute demande de l'utilisateur visant à implémenter, corriger ou mettre à jour le dépôt autorise ces opérations dans son périmètre (sauf consigne explicite « sans commit », « sans push », « brouillon », « branche » ou « PR »).
- Pour les **contributions documentaires** et artefacts `CANDIDATE` (jamais présentés comme runtime validé), si les hooks Git locaux sont indisponibles, les remplacer par les contrôles accessibles (secrets, encodage/intégrité, concurrence `main`, fast-forward, relecture du SHA) et les checks CI ; rapporter `HOOK_NOT_AVAILABLE`, `NOT_RUN`, `PASS` ou `FAIL` sans assimiler un contrôle indisponible à `PASS`.
- Les exigences de validation du **code runtime et des migrations** restent entières : publier un `CANDIDATE` ou confier à Codex uniquement le reliquat exigeant le checkout local, les secrets locaux ou un runtime indisponible.
- ChatGPT et Codex coordonnent leurs écritures selon `MAIN-ONLY / MULTI-WRITER COORDONNÉ` (`AGENTS.md`, `scripts/AGENTS.md`).

## 3. Conversation, prompts Codex et Commit Review

- Réponses françaises (sauf nécessité technique), précises, critiques, orientées décision ; signaler toute proposition sous-optimale avec alternative et compromis. Commencer les **réponses finales liées au dépôt** par `Maxence —`.
- **Prompt Codex** : lot complet, borné, autonome et exécutable (résultat, contrat/anomalie, décision technique, points d'entrée, invariants, preuves propres, `STOP CONDITION`). Ne pas recopier `AGENTS.md`, la politique Git ou les commandes standards.
- **Catégories** : **Correction**, **Micro-lot** (~5 min), **Macro-lot** (~15-30 min), **Lot XL** (~45-75 min, 2 à 4 jalons internes ordonnés exécutés successivement sans clôture prématurée).
- **Fichiers Markdown à exécutions successives** : 1) titre court ; 2) un paragraphe d'intro dans ```` ```text ```` ; 3) lots `01/N`..`N/N` dans l'ordre avec bloc ```` ```text ```` autonome chacun ; 4) terminer sur le dernier bloc sans annexe ni table de suivi.
- Pour tout prompt fonctionnel, exiger consommation runtime réelle, tests comportementaux/régressions, couverture pertinente (Web et Mobile indépendants, sinon `NOT_MEASURED` motivé) et mise à jour `CURRENT`. Avant le **premier prompt** d'un chantier, instruire owner, voies lecture/écriture, acteurs/AuthZ, cas nominaux/interdits/concurrence et plus petit lot cohérent complet.
- **Après Codex / Commit Review** : relire le SHA publié, ses consommateurs et preuves. La Commit Review privilégie le résultat publié et les régressions démontrées : la taille, le regroupement ou l'organisation des commits ne suffisent pas à demander un prompt correctif. Pour « Vérifie les commits », appliquer strictement `COMMIT_REVIEW_PROTOCOL.md`. Corriger par un nouveau commit sans réécrire l'historique.

## 4. Produit, sécurité, UI, mobile et architecture

- **CleanMyMap** : boucle civique repérer → comprendre → préparer → agir → déclarer → mesurer → partager → coordonner. Réutiliser l'owner canonique ; séparer UI, routes API, services métier, AuthN/AuthZ, persistance et services externes.
- **Identité et données** : Clerk (identité) + Supabase (`apps/web/supabase/migrations/` unique arbre éditable, **Supabase lié uniquement** selon `apps/web/supabase/AGENTS.md` et `runbook-supabase-convergence.md` ; jamais `service_role` client, RLS désactivée ou Docker/WSL local).
- **Proportionnalité et ouverture associative** : distinguer échange communautaire d'une participation métier, mutation, donnée privée ou pouvoir d'organisation/modération. Avant toute nouvelle restriction, établir ressource protégée, scénario d'abus crédible, impact et insuffisance de mesures moins restrictives (modération, signalement, blocage, rate-limit, anti-spam) ; coût/perf seuls ne fondent pas une règle AuthZ.
- **UI, mobile et science** : relire design system, fiche `CURRENT` et composant réel (`apps/web` vs `apps/mobile` distincts, règles scoped mobiles). Indicateurs scientifiques : provenance, unités, formules, limites et incertitudes (`OBSERVED`/`DERIVED`/`PROXY`/`HYPOTHESIS`).
- **Architecture et qualité** : `EXTEND_EXISTING` / `CREATE_MODULE` / `RESTRUCTURE_FIRST` (`conventions-modularisation.md`), vérifier fichiers et fonctions. `quality:cycles`, `quality:duplication`, `quality:complexity`, `quality:dead-code` et `quality:top-heavy` ne sont pas automatiques en `DEVELOPMENT` (réservés au risque ciblé ou à `FULL` autorisé).

## 5. MAIN-ONLY / MULTI-WRITER COORDONNÉ et publication

- Identifier au démarrage référence Git et fichiers attribués ; préserver et exclure les changements dirty étrangers ; signaler toute collision sur un même chemin sans écrasement. Les scopes `WORKTREE_LIVE`, `STAGED`, `COMMITTED_SNAPSHOT` et `PUSH_CANDIDATE` restent distincts.
- Pour un lot réalisé directement, ChatGPT valide le candidat attribué, puis commit → push fast-forward `main` → fetch et vérification de convergence (`ahead/behind 0/0`). Si `main` a avancé sans conflit sur les chemins attribués, `git fetch origin main` puis `git rebase origin/main` (conflit réel → `git rebase --abort` et diagnostic). Le mode de développement rapide ne supprime pas la publication ; seule une interdiction explicite de l'utilisateur (« sans push ») autorise un commit sans push. Un préflight Supabase bloqué ne retient pas un push Git autrement publiable.

## 6. Documentation, pré-intégration et clôture

- Une connaissance durable = une seule source canonique (`CURRENT`, `PLAN`, `AUDIT`, `HISTORY`, `SNAPSHOT`, `ADR`, `GENERATED`). Respecter les zones protégées (`pages_site/routes/`, `documentation/pepite/`). Vérifier coûts/quotas actuels des services externes avant décision.
- **Pré-intégration proactive** : produire immédiatement les livrables fiables (contrats, code complet, tests, SQL candidat non appliqué) sous `documentation/specs/<chantier>/` avec un `README_CODEX.md` complet (état lu, owners, correspondance source/destination, preuves obtenues vs manquantes, `STOP CONDITION`). Tout artefact non exécuté dans le runtime reste `CANDIDATE` ; retirer les candidats devenus inutiles après réception.
- **Clôture** : objectif traité, contrat/AuthZ préservés, preuves exécutées, aucune perte étrangère, `CURRENT` aligné, limites déclarées, `STOP CONDITION` atteinte et `main` relu.
