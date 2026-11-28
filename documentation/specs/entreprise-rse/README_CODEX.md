# Entreprise et RSE : réception des candidats

Statut : RÉCEPTION PARTIELLE — au 28 novembre 2026. `main` et `origin/main` convergent à `e99b2a955804217b7dabba67704c3169f2777ad5`. Le runtime entreprise est publié depuis `42e202c9`, les contrats Actions harmonisés depuis `477e85ed7`, et la preuve SQL FULL antérieure est réussie sur le SHA exact `e0de306`. Les migrations déjà appliquées comprennent `20261127000001`, `20261128000002` et `20261128000003`. Le nouveau fichier `20261128000004_enterprise_member_collections_read.sql` est un candidat local non publié : préflight lié `BLOCKED`, 540 migrations locales / 539 appliquées, une en attente, preuve SQL du candidat requise, `REMOTE_WRITES: NONE`. La preuve antérieure 72/72 ne couvre pas ce fichier.

## Objectif et périmètre

Source de connaissance : [persona entreprise](../../product/persona-entreprise-rse.md). Source des arbitrages : [décisions produit](../../product/decisions-en-attente.md). Le modèle économique reste dans son document canonique. La demande autorise le travail sur les dix lots du parcours entreprise, pas la commercialisation ou la certification d'une offre. Aucun besoin commercial validé n'est inféré de cette autorisation.

Cible : espace web de préparation, rattachement, suivi multisite, campagnes, bilan et accès aux ressources partenaires. Les composants métier Actions, Reports, annuaire, partenaire et Clerk restent propriétaires. Mobile : aucun nouvel écran, vérifier les contrats partagés sans modifier le runtime mobile.

## Inventaire des candidats et ordre de réception

| Artefact | Cible | Lots | État |
|---|---|---|---|
| [01-parcours-entreprise.patch](01-parcours-entreprise.patch) | page /sponsor-portal, navigation, CTA, composant de liens, test et fiche route | 01, 07 | ALREADY_INTEGRATED — verify consumers, do not reapply |
| [organization-foundation.sql](candidates/sql/organization-foundation.sql) | source préparatoire; migration canonique `apps/web/supabase/migrations/20261128000002_enterprise_organization_team_projection.sql` | 02, 03, 05, 06 | PUBLIÉE ET PRÉSENTE DANS L'HISTORIQUE LIÉ — aucune écriture distante dans cette exécution |
| [organization-foundation.pgtap.sql](candidates/sql/organization-foundation.pgtap.sql) | source préparatoire; fixture Alpha/Beta adaptée dans `enterprise-organization-foundation.pgtap.sql` | 02, 10 | 72 assertions; 72/72 exécutées sur PostgreSQL éphémère au SHA `e0de306` |
| [02-03-05-06-organization-api.patch](02-03-05-06-organization-api.patch) | lib/organizations/contracts, service, test, API /organizations et bootstrap admin | 02, 03, 05, 06 | ALREADY_INTEGRATED — verify consumers, do not reapply |
| [04-05-report-scope.patch](04-05-report-scope.patch) | lib/organizations/report, report-summary, test, API /reports/organization | 04, 05 | ALREADY_INTEGRATED — verify consumers, do not reapply |
| [02-03-05-06-workspace-ui.patch](02-03-05-06-workspace-ui.patch) | components/pilotage/enterprise-organization-workspace.tsx | 02, 03, 05, 06 | ALREADY_INTEGRATED — residual UI work remains |
| [03-08-invitation-qr.patch](03-08-invitation-qr.patch) | private-action-access-section, QR existant et avertissement de transmission | 03, 08 | ALREADY_INTEGRATED — lot 08 remains separate |
| [enterprise_member_collections_read](../../../apps/web/supabase/migrations/20261128000004_enterprise_member_collections_read.sql) | nouvelle migration forward-only, projection membre et réception UI | 01, 03, 04, 05, 06 | CANDIDATE LOCAL — syntaxe vérifiée; 80 assertions pgTAP attendent la lane SQL éphémère DEVELOPMENT au SHA publié |

### Réception du lot 01 — état vérifié

- Le runtime entreprise est dans l'ascendance publiée de `main` depuis `42e202c9`; aucune migration ou correction déjà intégrée n'a été rejouée. `20261127000001` n'a pas été réappliquée.
- Le scénario pgTAP crée Alpha et Beta réellement, avec identifiants persistés distincts et non nuls; `plan(72)` correspond aux 72 appels d'assertion reconnus par le vérificateur du dépôt. Le run FULL `46161005458`, commit `e0de306`, a exécuté 72/72 assertions, 0 échec.
- Le candidat publié ajoute une projection d'équipe minimisée, invitation par adresse email vérifiée côté serveur, départ d'un membre, navigation indépendante du rôle actif et une file/UI admin pour la vérification explicite du mandat. Le nouveau candidat local ajoute aux membres actifs la lecture bornée des collectes visibles, sites autorisés et campagnes actives/terminées; il ne donne pas les contrôles de mutation, exclut les actions privées et refuse leur export CSV détaillé. Tant que la migration additive n'est pas appliquée, l'API conserve le roster et signale l'indisponibilité des collectes partagées.
- La preuve multi-session à deux sessions `e2e/enterprise-organization-concurrency.mjs` réussit dans le run FULL `46161005458` au SHA `e0de306` (2,89 s) : transfert de responsabilité puis départ, sérialisés sans owner orphelin.
- Le scénario Playwright à deux comptes réels est dans le projet authentifié. Les runs `46156824167` et `46159672565` ont échoué avant le scénario entreprise; ce dernier, FULL sur `f15eb7ff`, termine avec 30 tests échoués et un setup Clerk en `socket hang up`, suivi de l’absence de `<main>`. La campagne ne prouve donc ni partage, ni isolation dans le navigateur, ni responsive entreprise.
- Sur les 11 modules UI/API/métier mesurés par V8, la couverture ciblée est de 95,84 % statements, 87,29 % branches, 96,73 % fonctions et 98,87 % lignes. Le run ciblé exécute 86 tests dans 11 fichiers et n'est pas comparable à la couverture globale.
- Contrôle Web complet exécuté sur le candidat `42e202c9` : 1 985 réussites, 1 skip et 7 échecs dans 5 fichiers; aucun résumé de couverture global n'a été produit. Les échecs recouvrent les attentes d'anciens tests Actions et de gamification face au contrat récent de composition partielle. Une relance ciblée sur le HEAD `d0913c1f` reproduit 6 échecs sur 49 tests dans 4 fichiers (`submission-validation`, `action-declaration-form-content`, `payload`, `school-action-recognition`); leur attente et le runtime divergent sur les compositions partielles et colonnes typées. Ces chemins n'appartiennent pas au diff entreprise; ils restent à coordonner avec l'owner Actions/GAME. Le typecheck Web complet passe sur `d0913c1f`.
- Les modules entreprise UI/API/métier instrumentés et les neuf modules ciblés du contrat Actions dépassent leurs seuils de famille dans leurs campagnes respectives. Les pages `page.tsx` restent `NOT_MEASURED` selon l'exclusion canonique; aucun seuil, ratchet ou exclusion n'a été changé. Ces campagnes ciblées ne représentent pas la couverture Web globale.
- Les tests de route `/api/organizations`, `/api/admin/organizations/bootstrap` et `/api/reports/organization` couvrent les erreurs privées, l'identité de session, les limites et les projections. Les contrats Actions récemment publiés ne changent pas la projection du bilan entreprise : `report.ts` continue à normaliser les actions via `toActionContract`, et les tests de projection sont verts. Les scénarios SQL Actions associés ne sont toutefois pas tous verts.
- Préflight lié relancé en lecture seule le 28 novembre : `ALIGNED`, 539/539, 0 en attente, `REMOTE_WRITES: NONE`. L'artefact CI `46161005458` (commit `e0de306`) atteste 84/84 entrées SQL, l'empreinte de migration et des tests. Les RPC `bootstrap_organization`, `leave_organization`, `list_organization_bootstrap_queue`, `mutate_organization_membership`, `organization_report_action_ids` et `read_organization_team_members` sont présentes dans le schéma lié avec `SECURITY DEFINER`, `search_path=public, pg_temp`, exécution `service_role` et refus d'exécution directe `authenticated`. Aucune application distante n'a été nécessaire : aucune migration n'était en attente.

### Matrice de couverture ciblée — PUSH_CANDIDATE `f15eb7ff` (modules mesurés inchangés depuis `d0913c1f`)

Seuils appliqués sans changement : UI 80/80/80/80; API/métier/persistance 85 statements, 80 branches, 85 fonctions, 85 lignes; modules sécurité 90 statements, 85 branches, 90 fonctions, 90 lignes. Ordre des valeurs : statements/branches/fonctions/lignes. La couverture globale Web n'est pas mesurée par cette campagne ciblée.

| Fichier | Famille / risque | Couverture % | Seuil | Résultat |
|---|---|---:|---|---|
| `src/app/admin/organizations/organization-bootstrap-review-panel.tsx` | UI, vérification du mandat | 90,16 / 83,92 / 88,23 / 95,91 | UI 80 partout | PASS |
| `src/components/pilotage/enterprise-action-links.tsx` | UI, navigation | 100 / 100 / 100 / 100 | UI 80 partout | PASS |
| `src/components/pilotage/enterprise-organization-workspace.tsx` | UI, cloisonnement et réponses asynchrones | 95,62 / 84,50 / 95,77 / 100 | UI 80 partout | PASS |
| `src/components/pilotage/organization-team-panel.tsx` | UI, adhésions et invitations | 100 / 87,50 / 100 / 100 | UI 80 partout | PASS |
| `src/app/api/admin/organizations/bootstrap/route.ts` | Sécurité/API, bootstrap et mandat | 95 / 88,88 / 100 / 100 | Sécurité 90/85/90/90 | PASS |
| `src/app/api/organizations/route.ts` | Sécurité/API, identité session et scope | 97,05 / 95,23 / 100 / 100 | Sécurité 90/85/90/90 | PASS |
| `src/app/api/reports/organization/route.ts` | Sécurité/API, scope privé et CSV | 100 / 90,47 / 100 / 100 | Sécurité 90/85/90/90 | PASS |
| `src/lib/organizations/contracts.ts` | Métier, commandes et validation | 90,90 / 82,35 / 100 / 90,90 | Métier 85/80/85/85 | PASS |
| `src/lib/organizations/report-summary.ts` | Métier, agrégats et données manquantes | 100 / 100 / 100 / 100 | Métier 85/80/85/85 | PASS |
| `src/lib/organizations/report.ts` | Persistance/API, lecture et projection privée | 96,87 / 85,71 / 100 / 100 | Métier 85/80/85/85 | PASS |
| `src/lib/organizations/service.ts` | Métier/persistance, adhésions et mutations | 98,50 / 93,02 / 100 / 100 | Métier 85/80/85/85 | PASS |
| `src/lib/actions/unified-source/contracts.ts` | Contrat Actions canonique partagé par le bilan | 100 / 96 / 100 / 100 | Métier 85/80/85/85 | PASS — projection action, import, statuts, spot et lieu propre |
| `src/lib/reports/page-data-export.ts` | Export, format CSV partagé | 100 / 100 / 100 / 100 | Métier 85/80/85/85 | PASS |

La campagne ciblée a passé 99 tests dans 14 fichiers; le candidat `f15eb7ff` contient les mêmes tests et les mêmes sources pour les 13 modules mesurés. Leur couverture V8 est 96,07 % statements, 89,07 % branches, 96,96 % fonctions et 98,96 % lignes. Chaque module instrumenté dépasse désormais le seuil de sa famille. Les pages `page.test.tsx` admin organisations et `sponsor-portal/page.test.ts` ont aussi passé (12/12), mais les pages restent `NOT_MEASURED` conformément à la configuration canonique : `src/app/admin/organizations/page.tsx`, `src/app/(app)/sponsor-portal/page.tsx` et les autres entrées `page.tsx`. La page dashboard n'a pas été mesurée dans cette campagne. Ce ciblage n'est pas une couverture globale Web.

### Matrice Actions liée aux bilans — WORKTREE_LIVE sur `e0de306`

La campagne V8 ci-dessous a exécuté 286 tests dans 17 fichiers pour compléter les tests des contrats Actions consommés par les projections de bilans. Neuf modules ont été importés/instrumentés. L’agrégat ciblé est 94,44 % statements, 90,94 % branches, 99,32 % fonctions et 95,20 % lignes. Les seuils canoniques restent UI 80/80/80/80, métier/API/persistance 85 statements, 80 branches, 85 fonctions et 85 lignes, et sécurité 90/85/90/90. Les colonnes sont statements/branches/fonctions/lignes. Ces mesures incluent les tests locaux de cette campagne; elles ne valent pas couverture globale.

| Fichier | Famille / risque | Couverture % | Seuil | Résultat |
|---|---|---:|---|---|
| `src/components/actions/action-declaration/draft-storage.ts` | UI, persistance des brouillons et récupération | 93,61 / 86,45 / 95,83 / 96,12 | UI 80 partout | PASS |
| `src/components/actions/action-declaration/payload-measurements.ts` | UI, composition et mesures de collecte | 97,14 / 90,00 / 100 / 96,66 | UI 80 partout | PASS |
| `src/components/actions/action-declaration/steps/action-step-identity.participants.tsx` | UI, comptes participants, rôles et état lecture seule | 93,42 / 84,66 / 100 / 93,15 | UI 80 partout | PASS |
| `src/lib/actions/action-update-persistence.ts` | Métier/persistance, révision optimiste, validation et transitions | 90,09 / 85,43 / 100 / 90,29 | Métier 85/80/85/85 | PASS |
| `src/lib/actions/metadata.ts` | Métier, identité et compatibilité des métadonnées | 91,81 / 87,60 / 100 / 91,66 | Métier 85/80/85/85 | PASS |
| `src/lib/actions/submission-validation.ts` | Métier/sécurité, validation et mapping des mesures | 96,66 / 93,24 / 100 / 96,55 | Métier 85/80/85/85 | PASS |
| `src/lib/actions/volunteer-participation.ts` | Métier, calcul de composition et provenance | 97,26 / 97,67 / 100 / 97,84 | Métier 85/80/85/85 | PASS |
| `src/lib/actions/contracts/contract-builders.ts` | API/métier, conversion et normalisation du contrat Actions | 100 / 99,28 / 100 / 100 | Métier 85/80/85/85 | PASS |
| `src/lib/validation/action-schemas.ts` | API/sécurité, schéma d'entrée et intégrité des payloads | 96 / 94 / 100 / 98,63 | Sécurité 90/85/90/90 | PASS |

#### Périmètre hors couverture V8

| Fichier / surface | Famille de risque | Mesure V8 | Preuve comportementale / état |
|---|---|---|---|
| `src/app/admin/organizations/page.tsx` | UI admin, revue et activation du mandat | `NOT_MEASURED` — page exclue par la configuration canonique | Tests de page admin exécutés; responsive intégré `NOT_PROVEN`, le setup Clerk du run `46159672565` a échoué avant les parcours |
| `src/app/(app)/sponsor-portal/page.tsx` | navigation depuis le portail Sponsor, cloisonnement des onglets | `NOT_MEASURED` — page exclue par la configuration canonique | Tests de page Sponsor exécutés; Clerk/réactive intégré `NOT_PROVEN` après échec du setup |
| `src/app/(app)/dashboard/page.tsx` | entrée depuis Mon espace, indépendance du rôle actif | `NOT_MEASURED` — page exclue par la configuration canonique | Run FULL `46159672565` échoué sur la session Clerk et l’absence de `<main>`; aucune preuve intégrée du parcours |
| `apps/web/supabase/migrations/20261127000001_enterprise_organization_foundation.sql` | RLS, grants, audit, transfert et protection du dernier owner | V8 `NOT_APPLICABLE` pour du SQL | PgTAP 72/72 au SHA `e0de306`, run `46161005458`; empreinte liée à l’artefact |
| `apps/web/supabase/migrations/20261128000002_enterprise_organization_team_projection.sql` | RPC de roster, invitations et projection d’équipe | V8 `NOT_APPLICABLE` pour du SQL | PgTAP 72/72 au SHA `e0de306`, run `46161005458`; l’historique lié est déjà aligné |
| `apps/web/supabase/migrations/20261128000004_enterprise_member_collections_read.sql` | projection lecture seule pour membres | V8 `NOT_APPLICABLE` pour du SQL | Parseur SQL `PASS`; pgTAP candidat `80` planifié; preuve éphémère exacte `PENDING` |
| `e2e/enterprise-organization-concurrency.mjs` | atomicité et concurrence transfert/départ | V8 `NOT_APPLICABLE`; preuve multi-session | `PASS` au SHA `e0de306`, run `46161005458`, empreinte du script attestée |
| `e2e/authenticated-enterprise-organization.test.ts` | identité réelle, invitation/acceptation, permissions et responsive 320/390/768/1024/1440 | V8 `NOT_MEASURED` | `46156824167` et `46159672565` ont échoué avant le scénario; parcours Clerk à deux comptes et responsive intégré `NOT_PROVEN` |

Les pages `page.tsx` restent exclues et documentées `NOT_MEASURED`; ni exclusion, ni seuil, ni ratchet n’a été modifié.

Les preuves hors V8 restent distinctes. Le run FULL SQL `46161005458` sur `e0de306` a exécuté 72/72 assertions pgTAP, 0 échec, et 84/84 enregistrements SQL `PASS`; l’empreinte de migration et des tests est vérifiée dans l’artefact. La preuve multi-session du même run réussit le transfert suivi du départ sans owner orphelin. Les projections de bilans passent 63/63 tests ciblés et le candidat Actions `477e85ed7` passe le typecheck Web. Le run FULL Clerk `46159672565` sur `f15eb7ff` est terminé en échec : 30 tests échoués, dont l’authentification persistante et des routes proxy en `socket hang up`; l’absence de `<main>` empêche le démarrage des scénarios. Le run CI `46161005537` sur `e0de306` est également rouge : `secret-audit` signale des courriels publics préexistants dans la persona entreprise et un digest documentaire GAME, et `node-coverage` échoue sur deux assertions du garde d’artefacts qui attendent un audit secret sans signalement. Ces fichiers, ce garde et les tests Web bloqués par cette dépendance n’ont pas été modifiés par le candidat entreprise. Aucun parcours Clerk à deux comptes ni responsive intégré n’est revendiqué.

### Blocages étrangers à coordonner

- `npm run security:secrets -- --ref=83c3ced5` et le même contrôle sur `16669edc` échouent sur `documentation/specs/gamification-engine-refactor/README_CODEX.md:39`, où un digest hexadécimal de 40 caractères décrit comme référence factuelle déclenche le détecteur `[low] Hash digest`. Le fichier et les règles de détection n'ont pas été modifiés. La correction doit être coordonnée avec l'owner GAME avant de pouvoir valider le garde de publication.
- Les échecs du run Web complet concernent les attentes d'anciens tests Actions face au contrat récent de composition partielle, et ne proviennent pas du diff entreprise. Les fichiers concurrents Actions/GAME restent sous leur owner et n'ont pas été édités par ce lot.
- Le lien produit direct vers `plans/` a été remplacé par l'index des fonctionnalités, et la fiche entreprise est référencée par `documentation/features/README.md`. L'index interne des chantiers demeure dans `documentation/plans/README.md`.
- Authentification Clerk a réellement été tentée en navigateur éphémère mais a expiré avant les scénarios; le parcours à deux comptes reste `FAIL/NOT_PROVEN`. Responsive 390/768/1440 reste `NOT_RUN`.
- Lots PDF et commercial, QR indépendant et Challenges demeurent `PLAN` ; Challenges restent conditionnels à une démonstration distincte du besoin.

Les chemins exacts des fichiers cibles sont les en-têtes diff. Ne pas recopier les patches dans les sources ou publier le SQL dans les migrations actives sans vérification. Réception atomique du bloc organisation SQL/API/report/UI/portail : le patch 01 importe le composant workspace ; il n'est pas indépendant dans sa forme actuelle. Le patch QR reste indépendant. En cas de conflit avec un chantier concurrent, adapter uniquement les hunks concernés et conserver le reste.

## Contrats de sécurité cibles

- ACTIVE_ROLE=entreprise reste une préférence UX. Autorisation serveur sur identité Clerk et adhésion active explicite ; ni domaine email, ni nom de structure, ni référence d'organisateur ne constituent un mandat.
- Bootstrap distinct de la publication dans l'annuaire : un administrateur vérifie humainement le mandat et la correspondance de l'organisateur avant l'appel. L'identité et la déduplication de l'organisation réutilisent les entrées partenaires et références existantes.
- Tables RLS, sans accès direct navigateur. RPC à exécution service_role seulement, fonctions auxiliaires non exposées. L'identifiant acteur vient exclusivement de la session vérifiée. Vérifier les grants réels, signatures, contraintes, search_path et propriétaires de fonctions après intégration.
- Rôles owner, manager, site_manager, member ; l'invitation ciblée ne vaut pas acceptation, expire après 14 jours ; révocation auditée. L'organisation centrale gère ses sites, le gestionnaire local ne voit que le sien. Aucun rôle organisationnel ne donne des droits administrateur plateforme ou des droits sur les actions d'un tiers.
- Rattachement explicite et audité d'une action déjà gérée par son créateur/organisateur, sur référence vérifiée exacte. Aucune attribution rétroactive par nom, aucune modification des relations action_organizers. Action rattachée une fois à une organisation. Une action privée reste privée.
- Campagnes sur relations, pas copies d'actions ; objectif facultatif en nombre d'actions. Distinguer brouillon, actif, terminé et archivé. Comptabiliser seulement les actions terminées admissibles dans la période et dédupliquer.
- Bilan : date inclusive, scope organisation/site/campagne résolu serveur, refus des données test, non approuvées, annulées, masquées ; aucun repli global. Pour la première version, limite 500 actions (501 détecte un dépassement), réduction de période exigée. Export CSV à liste de champs minimale ; aucune identité, note, photo, géolocalisation ou adresse. Agrégats de données déclarées avec couverture, zéro distinct de l'inconnu, somme des participations différente des personnes uniques. Réutilisation de toActionContract et toReportsExportRow. Pas de certification, équivalence carbone prouvée ou reporting CSRD automatique. Pas de conservation de fichiers privés dans l'historique tant que l'ensemble du cycle de vie n'est pas sécurisé.
- Lien d'invitation existant : le QR n'ajoute aucun droit, un détenteur peut transmettre le lien. Ne pas journaliser le jeton. Pas d'annuaire des salariés, d'indicateurs individuels de performance ou de surveillance employeur.

## Couverture des dix lots et reliquat concret

| Lot | Préparé | Restant avant clôture |
|---|---|---|
| 01 Parcours | Onglets, CTA, liens et espace organisation | Vérifier navigation tous personas, libellés, responsive, chargement et absence de régression |
| 02 Organisations | Schéma, adhésions, rôles, invitations ciblées, RPC, API, bootstrap admin et vue de gestion | Interface admin de vérification du mandat, recherche de compte autorisée et ergonomique, transfert de responsabilité, correction d'identité, transitions et tests concurrents, validation RLS |
| 03 Collectes | Rattachement explicite à action existante, lien/QR, accès au formulaire, historique | Préremplissage de référence vérifiée via le formulaire existant, rattachement à la création, correction/détachement audité, duplication et invitation de groupe sans recopier présences, vérifier parcours Jour J et finalisation existants |
| 04 Rapports | Sélection privée serveur, agrégats, CSV, couverture et test de données manquantes | PDF via moteur officiel, catégories/destination des déchets si renseignées, métadonnées et historique privé, téléchargement/partage/révocation sur tous les chemins Reports ; ne jamais contourner le quota canonique |
| 05 Multisite | Sites, rôle local, projection cloisonnée, périodes, agrégats | Édition/archivage UI, filtres par site dédiés au bilan, calendrier/graphes, performances et cohérence des chiffres |
| 06 Campagnes | Tables, contraintes relationnelles, transitions RPC, brouillon UI, progression | UI de modification/statut/liaison des actions, calendrier, tests de déduplication et dates |
| 07 Opportunités | CTA vers carte, actions, annuaire et onboarding existants | Vérifier recherche/filtrage et suivi d'une demande réelle ; étendre le propriétaire partenaire seulement si manque prouvé |
| 08 Communication | QR, précautions et accès aux bonnes pratiques | Kit factuel avant/après à partir des champs publics/consentis, réutiliser le moteur d'export et les parcours Apprendre, pas de métriques individuelles |
| 09 Challenges | Décision : PLAN conditionnel, non implémenté | Ne commencer qu'après preuve d'un besoin distinct des campagnes et décision produit ; pas de second ledger XP |
| 10 Réception | Tests unitaires candidats, contrôle textuel, test structurel SQL candidat | Tests comportementaux du dépôt, SQL réels, concurrence et parcours navigateur de bout en bout, doc CURRENT et CI |

Le PDF privé et son historique restent délibérément non activés : les contrats de scope/persistance actuels ne distinguent pas encore de façon exhaustive cette source d'autorité. Ne pas utiliser un scope global ou une génération publique pour simuler le bilan entreprise. De même, le simple accès aux ressources partenaires ne constitue pas un nouveau workflow de partenariat. Aucun de ces éléments n'est marqué implémenté.

## Plan de validation et documentation canonique

1. Vérifier l'état actuel des fichiers et consommateurs des patches. Contrôler les conflits et la compatibilité avec les autres candidats déjà réceptionnés ; aucune restauration de l'ancien SHA.
2. Contrôler le schéma réel (types des références, contraintes de l'annuaire et des demandes, colonnes actions, rôles SQL). Allouer une migration forward-only avec l'outillage autorisé et exécuter le preflight lié selon apps/web/supabase/AGENTS.md. Ne pas appliquer le fichier candidat directement à une base distante. Valider les RPC et fonctions en environnement de test approprié, sans données réelles.
3. Ajouter les fixtures métier transactionnelles : deux organisations et plusieurs établissements, demande acceptée et révoquée, membre pending, mauvais acteur, doublon d'idempotence, dernier owner, action publique/privée/non admissible, rôle local, campagne et déduplication. Le test pgTAP fourni est principalement structurel : il ne suffit pas à la preuve comportementale.
4. Appliquer/adapter les patches, exécuter le typecheck, lint et suites unitaires ciblées selon les scripts du dépôt. Vérifier en particulier les réponses RPC sérialisées, la conversion de la projection canonique, la cohérence des scopes et de la période, le plafonnement effectif PostgREST et l'invalidation après révocation. Vérifier les limites des listes, les erreurs et l'état du workspace lors d'une bascule. Contrôler que la récupération des actions ne bénéficie d'aucun fallback permissif legacy en cas de schéma incomplet.
5. Exécuter les scénarios navigateur (anonyme, entreprise sans adhésion, membre, owner, manager local, élus) : vérification du mandat, invitation/réponse, rattachement, action privée, partage QR, campagne, bilan et révocation. Vérifier AuthZ sur les API même si l'interface masque un bouton. Vérifier le profil, les autres parcours et les consommateurs mobiles. Contrôler l'accès par identifiant arbitraire, anciennes URLs et caches ; tester les mutations concurrentes. Toute sortie de données déjà téléchargée ne peut être révoquée rétroactivement.
6. Après preuve seulement, mettre à jour la fiche route sponsor (hunk fourni, à compléter avec l'onglet organisation), parcours utilisateurs, matrice des rubriques, règles AuthZ, gouvernance des données, documentation du domaine Actions et du domaine Reports. Ne pas présenter les capacités privées comme CURRENT avant leur intégration réelle. Les chantiers non achevés restent PLAN. Actualiser le registre et supprimer les artefacts consommés selon la gouvernance existante.

## Provenance de la préparation

La préparation initiale date du 27 novembre et décrivait un candidat local avant sa publication. Elle n'est plus une preuve de l'état actuel. Les validations, statuts de migration, résultats CI et limites ci-dessus ont été actualisés depuis le runtime publié; les comptes de tests et résultats de préparation antérieurs ne sont pas réutilisés comme preuve de réception.

STOP CONDITION : toujours ouverte. Réception complète du Lot 01 exige pgTAP et concurrence réussis sur le candidat publié, parcours navigateur éphémère à deux comptes Clerk exécuté aux cinq largeurs, seuils de couverture atteints pour les fichiers mesurables, documentation CURRENT cohérente, absence de régression critique et publication sans contournement des hooks. Les PDF, challenges sans besoin distinct, QR indépendant, certification ESG et extensions commerciales restent PLAN.
