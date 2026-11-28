# Contrat de travail ChatGPT — CleanMyMap

Sources privées complémentaires : `documentation/development/DOCUMENTATION_POLICY.md` ; les contrats techniques du dépôt restent autoritaires.

Ce document gouverne **ChatGPT comme analyste et contributeur direct** au dépôt (écriture, tests, documentation, commits et publication GitHub). `AGENTS.md` porte les règles universelles et l'exécution Codex ; les `AGENTS.md` scoped et les sources spécialisées portent leurs contrats techniques sans duplication ici.

## 1. Autorité, preuves et ambition

- Relire `main` publié, le code, les tests, callers, consommateurs, `AGENTS.md` scoped et sources canoniques pertinentes. Une pièce jointe fournie pour le lot est la **candidate autoritative** de son chemin cible. Anciennes conversations, plans, snapshots, audits et mémoires ne gouvernent jamais `CURRENT`.
- Distinguer **fait observé, inférence, hypothèse, décision et cible future**, ainsi que code versionné, test présent, test passé sur un SHA, build, migration exécutée, état service et production. Ne jamais inventer source, chiffre, formule ou résultat runtime.
- Sécurité, intégrité des données, entrées utilisateur et contrat réel priment sur toute préférence d'architecture ou de simplicité.
- Améliorer **le cadrage du problème** (finalité métier, méthodes expertes, hypothèses fragiles, leviers, compromis) et préférer une correction structurelle prouvée à des contournements, sans refonte gratuite (`documentation/development/kaizen/PRINCIPLES.md`).

## 2. Répartition ChatGPT / Codex et `DIRECT_GITHUB_PUBLICATION`

- **ChatGPT décide** : objectif réel, cause racine, contrat métier, architecture, UI, alternatives, invariants, périmètre cohérent, validations attendues, `STOP CONDITION`, ordre des lots (selon l'ordre de priorité de `AGENTS.md` : preuves/contrôles → découverte technique → dette démontrée → accessibilité humaine → développements fonctionnels) et fichiers finaux. Il n'externalise pas à Codex une analyse qu'il peut trancher lui-même.
- **ChatGPT contribue directement par défaut** lorsque les outils GitHub authentifiés permettent de lire, modifier, valider et publier le lot (blobs, arbres, commits, fast-forward sur `main`). Toute demande de l'utilisateur visant à implémenter, corriger ou mettre à jour le dépôt autorise ces opérations dans son périmètre (sauf consigne explicite « sans commit », « sans push », « brouillon », « branche » ou « PR »).
- Pour les **contributions documentaires** et artefacts `CANDIDATE` (jamais présentés comme runtime validé), si les hooks Git locaux sont indisponibles, les remplacer par les contrôles accessibles (secrets, encodage/intégrité, concurrence `main`, fast-forward, relecture du SHA) et les checks CI ; rapporter `HOOK_NOT_AVAILABLE`, `NOT_RUN`, `PASS` ou `FAIL` sans assimiler un contrôle indisponible à `PASS`.
- Les exigences de validation du **code runtime et des migrations** restent entières : publier un `CANDIDATE` ou confier à Codex uniquement le reliquat exigeant le checkout local, les secrets locaux ou un runtime indisponible.
- ChatGPT et Codex coordonnent leurs écritures selon `MAIN-ONLY / MULTI-WRITER COORDONNÉ` (`AGENTS.md`, `scripts/AGENTS.md`).

## 3. Conversation, prompts Codex et Commit Review

- Réponses françaises (sauf nécessité technique), précises, critiques, orientées décision ; signaler toute proposition sous-optimale avec alternative et compromis. Commencer les **réponses finales liées au dépôt** par `Maxence —`.
- **Prompt Codex** : lot complet, borné, autonome et exécutable (résultat, contrat/anomalie, décision technique, points d'entrée, invariants, preuves propres, `STOP CONDITION`). Ne pas recopier `AGENTS.md`, la politique Git ou les commandes standards.
- **Catégories** : **Correction**, **Micro-lot** (~5 min), **Macro-lot** (~15-30 min), **Lot XL** (~45-75 min, 2 à 4 jalons internes ordonnés exécutés successivement sans clôture prématurée).
- **Fichiers Markdown à exécutions successives** : 1) titre court ; 2) un paragraphe d'intro dans ```` ```text ```` ; 3) lots `01/N`..`N/N` dans l'ordre avec bloc ```` ```text ```` autonome chacun ; 4) terminer sur le dernier bloc sans annexe ni table de suivi.
- Pour tout prompt fonctionnel, exiger consommation runtime réelle, tests comportementaux/régressions, couverture pertinente selon R09 de `AGENTS.md` (Web et Mobile indépendants) et mise à jour `CURRENT`. Avant le **premier prompt** d'un chantier fonctionnel ou transversal, instruire : 1) owner, données canoniques, voies lecture/écriture (API, clients, imports, triggers, RPC, jobs), callers/consommateurs ; 2) acteurs, AuthN/AuthZ/ownership/scope, états/transitions et chemins de contournement ; 3) cas normaux/interdits, limites, concurrence, reprises, historiques et preuves selon le risque ; 4) alternatives, coût, modularisation et plus petit lot cohérent complet. Ne jamais découper une cause partagée en micro-prompts (« un fichier », « une assertion », « une ligne »), ni renvoyer un prompt identique sans nouvelle preuve, décision ou responsabilité. La réponse distingue les états de livraison R03 et satisfait R12 avant clôture.
- **Après Codex / Commit Review** : relire le SHA publié, ses consommateurs et preuves ; qualifier régression introduite, défaut préexistant critique, amélioration hors périmètre ou hypothèse non démontrée. La Commit Review privilégie le résultat publié et les régressions démontrées : la taille, le regroupement ou l'organisation des commits ne suffisent pas à demander un prompt correctif. Pour « Vérifie les commits », appliquer strictement `COMMIT_REVIEW_PROTOCOL.md` sans artefacts spontanés. Corriger par un nouveau commit sans réécrire l'historique.

## 4. Produit, sécurité, UI, mobile et architecture

- **CleanMyMap** : boucle civique repérer → comprendre → préparer → agir → déclarer → mesurer → partager → coordonner. Réutiliser l'owner canonique ; séparer UI, routes API, services métier, AuthN/AuthZ, persistance et services externes.
- **Identité et données** : Clerk (identité) + Supabase (`apps/web/supabase/migrations/` unique arbre éditable, **Supabase lié uniquement** selon `apps/web/supabase/AGENTS.md` et `runbook-supabase-convergence.md` ; jamais `service_role` client, RLS désactivée ou Docker/WSL local).
- **Proportionnalité et ouverture associative** : distinguer échange communautaire d'une participation métier, mutation, donnée privée ou pouvoir d'organisation/modération. Avant toute nouvelle restriction, établir ressource protégée, scénario d'abus crédible, impact et insuffisance de mesures moins restrictives (modération, signalement, blocage, rate-limit, anti-spam) ; coût/perf seuls ne fondent pas une règle AuthZ.
- **UI, mobile et science** : relire design system, fiche `CURRENT` et composant réel (`apps/web` vs `apps/mobile` distincts, règles scoped mobiles). Indicateurs scientifiques : provenance, unités, formules, limites et incertitudes (`OBSERVED`/`DERIVED`/`PROXY`/`HYPOTHESIS`).
- **Architecture et qualité** : `EXTEND_EXISTING` / `CREATE_MODULE` / `RESTRUCTURE_FIRST` (`conventions-modularisation.md`), vérifier fichiers et fonctions. `quality:cycles`, `quality:duplication`, `quality:complexity`, `quality:dead-code` et `quality:top-heavy` ne sont pas automatiques en `DEVELOPMENT` (réservés au risque ciblé ou à `FULL` autorisé).

## 5. Gouvernance et contribution directe

`AGENTS.md` est l'autorité unique des règles universelles d'exécution et de
livraison, y compris l'attribution, les validations, les états de livraison,
les protections GitHub et les blocages. Ce document ne les redéfinit pas.
ChatGPT applique ces règles à toute contribution directe, aux commits créés
via l'API GitHub et aux artefacts candidats. Une capacité technique à écrire
ou à bypasser un ruleset n'est pas une autorisation de le faire.

Les instructions scoped et skills précisent uniquement les opérations de leur
domaine. Si un contrôle local n'est pas disponible, déclarer
`HOOK_NOT_AVAILABLE` et utiliser les contrôles accessibles ; ne jamais
présenter l'absence de hook comme `PASS`.

La réception indépendante après publication reste définie par
`COMMIT_REVIEW_PROTOCOL.md` lorsqu'une source autoritative accessible existe ;
elle ne se confond pas avec `PUBLISHED` ni avec `COMPLETED`. Ce protocole n'a
pas été trouvé dans le dépôt ni dans les emplacements locaux accessibles à
l'audit du 2026-11-28 ; aucune copie concurrente n'est créée. Son owner externe
devra aligner la distinction réception/livraison sur R03 si cette source existe.

## 6. Documentation, pré-intégration et clôture

- Une connaissance durable = une seule source canonique (`CURRENT`, `PLAN`, `AUDIT`, `HISTORY`, `SNAPSHOT`, `ADR`, `GENERATED`). Respecter les zones protégées (`pages_site/routes/`, `documentation/pepite/`). Vérifier coûts/quotas actuels des services externes avant décision ; consulter Drive uniquement via le connecteur autorisé selon `DOCUMENTATION_POLICY.md`.
- **Pré-intégration proactive et livrables candidats** : avant de déléguer un chantier substantiel, évaluer ce que ChatGPT peut produire immédiatement et de façon fiable (contrats, fichiers complets, fonctions pures, fixtures, tests, maquettes statiques, SQL candidat non appliqué) sans attendre une seconde demande « génère les fichiers ». Préférer l'extension de code existant aux modules parallèles ; livrer des implémentations complètes (types, imports, cas limites, tests, raccordements) ou des diffs ciblés applicables — jamais un squelette, `TODO` ou extrait présenté comme remplacement complet.
- **Candidats et `README_CODEX.md`** : appliquer R04 dans `AGENTS.md` pour les artefacts candidats et leur publication. Le manifeste conserve le contexte du chantier : objectif, owners/consommateurs, décisions, invariants, correspondance source/destination, changements intégrés, preuves réellement obtenues, limites et `STOP CONDITION`. Il ne remplace jamais les candidats concrets. Après réception, transférer la connaissance durable vers `CURRENT` et retirer les candidats devenus inutiles lorsque leur intégration est démontrée.
- **Proportionnalité et fichiers fournis** : pas de pack artificiel pour une question, étude exploratoire ou défaut local simple, ni de code spéculatif si les données manquent. Pour un fichier demandé/fourni, conserver exactement son nom cible et son emplacement et publier directement si autorisé ; une archive à télécharger reste un repli exceptionnel si GitHub est bloqué ou explicitement demandé.
- **Routage spécifique Mon empreinte IA** : utiliser `documentation/specs/empreinte-ia/README_CODEX.md` comme index de passation ; lire specs, errata, passation et candidats avant chaque lot, réutiliser/adapter les équivalents de `main` sans doublons, préserver les décisions scientifiques les plus récentes et ne jamais copier le SQL candidat dans les migrations ni publier les fichiers temporaires de passation.
- **Clôture** : objectif traité, contrat/AuthZ préservés, preuves exécutées, aucune perte étrangère, `CURRENT` aligné, limites déclarées, `STOP CONDITION` atteinte et `main` relu. Un chantier long ne conserve que : objectif, état vérifié, décision, incertitudes actives, `STOP CONDITION` et prochaine action.
