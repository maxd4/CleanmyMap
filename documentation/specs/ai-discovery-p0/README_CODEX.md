# Découverte technique IA : lots P0

**Statut : PLAN / CANDIDATE.** Référence source vérifiée : 6dc8b1a52ffd1de7e27bc42555e52ac80ffab867.
Chantier indépendant du programme UI/fonctionnel. Aucun changement runtime
Web/Mobile ou Supabase. Deux enrichissements CURRENT déjà publiables dans
les index existants : `documentation/development/AI_DEVELOPER_GUIDE.md` et `documentation/database/README.md`.
Ne pas reproduire ces ajouts.

## DOC-01 : contexte obligatoire et mesure

Constat statique : AGENTS.md 738 lignes, CHATGPT.md 561 lignes,
project_context.md 100 lignes (trimEnd, convention du garde).
scripts/dev/context-budget-check.mjs limite AGENTS.md à 240 lignes.
Ne pas simplement relever le seuil. Les règles actuelles restent applicables.
Conserver au niveau racine autorité, sécurité, lecture scoped, multi-writer,
interdictions, publication et distinctions de preuve. Déplacer seulement les
procédures spécialisées et répétées vers les owners existants :
scripts/AGENTS.md et host-environment.md (Git/hooks), TESTING.md et sources
spécialisées (validation/ratchets), documentation/AGENTS.md (documentation),
runbook-supabase-convergence.md et apps/web/supabase/AGENTS.md (SQL).
Une règle déplacée reste obligatoire pour les cas concernés ; conserver une
référence explicite et vérifier les tests, loaders et références littérales.
Si 240 lignes sont incompatibles avec la conservation des protections,
signaler le conflit au lieu d'affaiblir la gouvernance.
Mesurer la baseline avant réorganisation sans modifier le checkout pour
reconstruire un ancien état. Ne pas convertir les lignes en tokens fictifs.

## DOC-02 : requête du graphe

Réutiliser scripts/reports/generate-architecture-import-graph.mjs et son
schéma v1. Les deux candidats complets sous candidates/scripts/reports/
ciblent les mêmes chemins relatifs à la racine. Aucune dépendance nouvelle.
Le CLI lit un JSON existant, exige SHA complet et provenance Git vérifiée,
distingue appelants runtime/type, tests et dépendances directes, borne
les listes et indique les omissions. Pour un dossier, les arêtes internes
sont exclues des dépendances/appelants. Un graphe worktree ne prouve pas un SHA.
Exécuter les tests Node, le CLI sur un graphe réel produit par l'owner
(fichier Actions, dossier, chemin absent, mauvais SHA, limite) ; ajouter
le point d'entrée npm et compléter le guide après validation.
Ne pas changer le schéma v1 ni le CLI actuel par défaut. Comparer GitNexus
sur les mêmes tâches sans créer d'indexation concurrente ou automatique.

## DOC-03 : owners

Le guide CURRENT contient une carte de 30 dossiers Web avec leurs README
locaux lorsqu'ils existent. Compléter seulement les responsabilités encore
ambiguës dans les README propriétaires : capacité, entrée publique, owner,
consommateurs représentatifs, tests, source CURRENT. Générer les listes
mécaniquement dérivables ; ne pas recopier toutes les fonctions.
Priorité Actions, Gamification, Supabase, SPOGOMI, itinéraires, Rapports,
empreinte IA, Apprendre, Communauté, Auth, géographie, partenaires,
messagerie, puis autres domaines et consommateurs Mobile pertinents.
Un nom de dossier ne démontre pas l'ownership.

## DOC-04 : catalogue SQL

candidates/schema-catalog.READ_ONLY.sql est un SELECT de métadonnées, non
une migration. Couvre relations, colonnes, contraintes, index, policies, ACL
relation/fonction, signatures et triggers utilisateur pour public/private.
Compléter après vérification des schémas applicatifs réels, types/enums,
ACL de colonnes/schémas, héritage, vues et dépendances pertinentes. Les ACL
déclarées ne prouvent pas les droits effectifs. Valider sur la lane
éphémère autorisée ; une introspection distante en lecture seule est documentée ci-dessous. Réutiliser les mécanismes
existants de collecte de preuve et historique. Catalogue Git rejoué et
catalogue lié observé restent distincts. Ne pas démarrer Docker/WSL local,
ne pas modifier Supabase. Ne publier ni données, corps de fonctions,
expressions sensibles. Sorties sous artifacts/ avec SHA, cible, date et
historique. L'index de provenance par objet distingue occurrences textuelles
et DDL effectivement établi (renames, suppressions, surcharges, SQL dynamique).

## DOC-05 : cycles métier

Points d'entrée et observations de source, non preuve d'intégration :

- Actions : action-workflow.ts distingue itineraire, paris, preparation,
  preformulaire et statuts UI todo/in_progress/done/review ; localStorage
  n'est qu'une aide d'orchestration, la persistance serveur fait autorité.
  publication.ts vérifie pre_action sans publishedAt, pas l'autorisation.
  Lire publish-pre-action.ts, association-action-review.ts, permissions.ts,
  cancellation.ts, cancellation-contract.ts, participation/, persistence/,
  formalities/ et external-sync/ avec API/RPC/tests associés.
  Le contrat d'annulation expose cancelled, alreadyCancelled, cancelledAt,
  cancelledBy et previousStatus pending/approved ; il ne prouve pas seul
  l'atomicité.
- SPOGOMI : lifecycle.ts sépare calendrier, inscription et résultat ; une
  date écoulée ne certifie pas un événement. registration-lifecycle.ts
  autorise pending vers approved/rejected/cancelled et le même état ;
  spogomi_admission_transition_allowed est l'owner SQL déclaré.
  Quiz pour une nouvelle admission registration sans demande active ni
  participant inscrit ; réouverture withdrawn seulement en direct_registration
  de même division. Tests : lifecycle.test.ts, registration-lifecycle.test.ts,
  registration-lifecycle-migration.contract.test.ts. Confronter acteurs,
  RPC, RLS et mutations aux sources réelles.

Documenter dans les owners CURRENT : Actions, SPOGOMI, gamification,
messagerie, rapports, annuaire, signalements, mission GPS mobile.
Pour chaque transition : état source/cible, acteur, préconditions, mutations,
atomicité, effets, refus, reprise et tests. Séparer projections UI et statuts
persistés. Aucun nouveau contrat métier décidé ici.

## DOC-11 : fraîcheur et mesure

Artefacts hors Git, identifiés par SHA et entrées. Le candidat rejette
provenance non vérifiée et SHA différent. Étendre les gardes documentaires
existants pour vérifier liens/chemins des index ; tester suppression/rename,
troncature et catalogue périmé. Éviter la régénération globale à chaque lot.
Comparer avant/après à modèle, effort, contexte initial, accès et tâche
constants, sessions indépendantes : A) retrouver publication/annulation
Actions ; B) retrouver une transition d'admission SPOGOMI et tests SQL ;
C) retrouver consommateurs d'une RPC et migrations. Au moins trois répétitions
par scénario si possible, relever SHA, exactitude (owners, frontières,
tests, limites), appels, fichiers ouverts, volume de texte injecté,
tokens entrée/sortie si télémétrie disponible, durée et validation.
Comparer médianes et écarts. NOT_MEASURED en l'absence de télémétrie ;
ne pas assimiler tokens à quota commercial ni revendiquer un gain si
l'exactitude diminue. Preuves sous artifacts/. Contrôles de fraîcheur
intégrés à chaque catalogue.

## Réception

1. Baseline et gouvernance.
2. Graphe + catalogue SQL et gardes.
3. Owners et cycles CURRENT, mesure finale.

STOP CONDITION : règles préservées et budget réconcilié, découverte bornée
testée sur graphe réel, catalogue SQL reproductible avec provenance et
limites, domaines/cycles prioritaires couverts sans duplication, fraîcheur,
mesures comparables ou absence motivée, commit et publication vérifiés.
Retirer les candidats temporaires seulement après réception.
Aucun FULL, déploiement ou db push demandé.

Preuves ChatGPT : arborescence non tronquée, chemins vérifiés, lecture des
modules cités, 7 assertions JS isolées sur le sélecteur.
Tests Node/CLI complet, replay SQL Git, gardes documentaires, hooks locaux et benchmark :
NOT_RUN. Les candidats ne sont pas intégrés ; gains de quotas non prouvés.

## Preuve complémentaire du 26 novembre 2026 (AUDIT)

Exécution de `candidates/schema-catalog.READ_ONLY.sql` sur le PostgreSQL 17
du projet lié, avec une enveloppe SELECT groupant par catégorie et
calculant count(*) et sum(octet_length(metadata::text)). Aucune ligne métier,
valeur de séquence, définition de fonction ni métadonnée individuelle
n'a été exportée. Aucune écriture ni modification de privilèges.

| Catégorie | Enregistrements |
|---|---:|
| Colonnes | 2257 |
| Contraintes | 1346 |
| Fonctions | 437 |
| ACL fonctions | 1017 |
| Index | 701 |
| Policies | 186 |
| Relations | 202 |
| ACL relations | 3555 |
| Triggers | 181 |
| Total | 9882 |

Comparaison des versions de migrations à 9f18eb3ac3d8209202f0bf520435980f37cb5e52 :
528 fichiers SQL Git et 528 versions distantes, aucun écart d'ensemble.
L'égalité des versions ne prouve pas l'identité effective du schéma ni
l'exécution de pgTAP. Le catalogue couvre public/private et reste candidat ;
le replay Git, la provenance par objet, les ACL complémentaires et les
policies de Storage restent à traiter. Les autres schémas de plateforme
ne doivent pas être importés aveuglément.

Enrichissements CURRENT supplémentaires : README Actions et SPOGOMI
(points d'entrée, transitions, consommateurs HTTP et tests repères).
Le README Gamification contient déjà une description de ses propriétaires
et de ses contrats ; ne pas dupliquer ce contenu. Les autres cycles et
owners restent à compléter. Aucun changement fonctionnel.

La gouvernance renforcée par f4f426b1385628e7e7b22d9a6fa6768b7896882c reste intégralement applicable :
la réduction de contexte ne peut réduire ni la portée d'analyse des causes,
ni les preuves d'intégration, ni l'auto-revue contradictoire.

## Réception du 26 novembre 2026 (AUDIT)

Statut : lots P0 intégrés ; les candidats `candidates/` ont été retirés après intégration.

- **DOC-01** : `AGENTS.md` 758 → 80 lignes (47 141 → 12 364 octets), `CHATGPT.md` 561 → 48, `project_context.md` 100 → 84 ; budget `session:budget` inchangé (240) et conforme. Procédures déplacées vers leurs owners existants par renvoi ; garde `check-agent-governance` et ses 12 tests verts.
- **DOC-02** : `npm run query:architecture-import-graph` (`scripts/reports/query-architecture-import-graph.mjs`, 3 tests Node). Exécuté sur le graphe réel du SHA `8b212cc6a` (fichier Actions, dossier avec limite, chemin absent, mauvais SHA). Arêtes statiques directes uniquement. Comparaison GitNexus : `NOT_RUN` (index local du 2026-10-23, commit différent).
- **DOC-04/11** : `apps/web/supabase/schema-catalog.READ_ONLY.sql` (schémas, ACL schéma/colonne, séquences, types, héritage, policies Storage) ; `npm run audit:sql-catalog` lit l'arbre Git immuable via `createRepositoryView` (`--ref`), calcule provenance par objet (création, recréation, renommage, surcharges de signatures), consommateurs Web/Mobile et fraîcheur (`migrationsHash` + `consumersHash`), et distingue explicitement analyse DDL statique (`DB_SEMANTICS_NOT_EXECUTED`), catalogue distant observé (`supabase-linked-read-only`, 10 407 enregistrements, 528/528 migrations alignées) et véritable replay PostgreSQL.
- **Gardes documentaires** : `check:doc-governance` vérifie les liens des index (guide IA, database) et la référence interne corrigée dans `documentation/operations/audits/github-repository-audit-2026-11-26.md` ; cas lien cassé testé.
- **DOC-03/05** : README Chat, Rapports, Partenaires (annuaire), Signalements, Missions, Empreinte environnementale ; la carte du guide pointe désormais ces owners.
- **Mesure** (`artifacts/ai-discovery-p0/`) : résultats locaux indicatifs uniquement (non vérifiés indépendamment, pas de télémétrie tokens/durée, A-2 post-optimisation en quota 429, n ≤ 3, sous-agents flash ; B sans gain 29 → 31 appels). Aucun gain de quota n'est revendiqué comme démontré.
- **Écarts relevés (non corrigés, hors périmètre)** : `/publish` admin vs RPC `submit_association_action_review` (Forbidden si ni créateur ni organisateur) ; `suppress_external_action_sync_action` pose `status='cancelled'` sans métadonnées tombstone (contrainte `actions_cancellation_state_check`) ; transitions d'admission SPOGOMI sans preuve SQL exécutée dans `apps/web/supabase/tests/` ; `registration-lifecycle.ts` non branché au runtime.

## Audit de conservation DOC-01 (référence historique `4074f835`)

| Zone / Obligation | Statut | Owner courant |
|---|---|---|
| Portée, priorité, ambition, cause racine, catégories de lots, conduite avant écriture | `PRESERVED` | `AGENTS.md` (sections 1–2) |
| Garde-fous de construction Codex (`EXTEND_EXISTING`/`CREATE_MODULE`/`RESTRUCTURE_FIRST`, flux, `quality:complexity`) | `REINTEGRATED` | `AGENTS.md` (section 2) + `conventions-modularisation.md` |
| Invariants 1–7 (`f4f426b`), preuves typées, matrice UI/UX gelée 01–11, dead code/duplication | `PRESERVED` / `MIGRATED` | `AGENTS.md` (section 3) + `TESTING.md` + `scripts/AGENTS.md` |
| `MAIN-ONLY / MULTI-WRITER COORDONNÉ`, scopes, commits, publication, exceptions | `PRESERVED` / `ALREADY_COVERED` | `AGENTS.md` (section 4) + `scripts/AGENTS.md` |
| Protection et vérification exacte des fichiers fournis | `REINTEGRATED` | `AGENTS.md` (section 4) + `documentation/AGENTS.md` |
| Sécurité, Supabase lié uniquement, `artifacts/`, contexte Web, validation proportionnée | `PRESERVED` / `MIGRATED` | `AGENTS.md` (section 5) + `apps/web/supabase/AGENTS.md` + `runbook-supabase-convergence.md` + `TESTING.md` |
| Préparation/séquencement des prompts, Commit Review (`COMMIT_REVIEW_PROTOCOL.md`) | `REINTEGRATED` | `CHATGPT.md` (section 3) |
| Pré-intégration proactive, livrables complets, publication candidats, manifestes `README_CODEX.md`, proportionnalité, routage `empreinte-ia` | `REINTEGRATED` | `CHATGPT.md` (section 6) |
| Contexte projet, exclusions, doctrine de lecture progressive, protocole de session | `PRESERVED` | `documentation/sessions/project_context.md` |
