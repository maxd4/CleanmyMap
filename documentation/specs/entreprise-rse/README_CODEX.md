# Entreprise et RSE : réception des candidats

Statut : RÉCEPTION PARTIELLE — au 28 novembre 2026. `main` et `origin/main` sont réconciliés à `d69a0757a6574be65b951ecbf91e5aee65f4d1f2`; le runtime entreprise a été publié par `42e202c9`. Les commits Actions/SQL `83c3ced5`, `16669edc`, `86c1752c` et `d0913c1f` et les commits de sauvegarde `49c60aef`, `fa7753a8`, `47be4a93` sont conservés. Les migrations `20261127000001`, `20261128000002` et `20261128000003` sont enregistrées sur Supabase lié. Le préflight read-only observé est `ALIGNED` : 539 locales, 539 appliquées, aucune en attente, `REMOTE_WRITES: NONE`. Cette exécution n'a appliqué aucune migration.

## Objectif et périmètre

Source de connaissance : [persona entreprise](../../product/persona-entreprise-rse.md). Source des arbitrages : [décisions produit](../../product/decisions-en-attente.md). Le modèle économique reste dans son document canonique. La demande autorise le travail sur les dix lots du parcours entreprise, pas la commercialisation ou la certification d'une offre. Aucun besoin commercial validé n'est inféré de cette autorisation.

Cible : espace web de préparation, rattachement, suivi multisite, campagnes, bilan et accès aux ressources partenaires. Les composants métier Actions, Reports, annuaire, partenaire et Clerk restent propriétaires. Mobile : aucun nouvel écran, vérifier les contrats partagés sans modifier le runtime mobile.

## Inventaire des candidats et ordre de réception

| Artefact | Cible | Lots | État |
|---|---|---|---|
| [01-parcours-entreprise.patch](01-parcours-entreprise.patch) | page /sponsor-portal, navigation, CTA, composant de liens, test et fiche route | 01, 07 | ALREADY_INTEGRATED — verify consumers, do not reapply |
| [organization-foundation.sql](candidates/sql/organization-foundation.sql) | source préparatoire; migration canonique `apps/web/supabase/migrations/20261128000002_enterprise_organization_team_projection.sql` | 02, 03, 05, 06 | PUBLIÉE ET PRÉSENTE DANS L'HISTORIQUE LIÉ — aucune écriture distante dans cette exécution |
| [organization-foundation.pgtap.sql](candidates/sql/organization-foundation.pgtap.sql) | source préparatoire; fixture Alpha/Beta adaptée dans `enterprise-organization-foundation.pgtap.sql` | 02, 10 | 66 assertions déclarées; preuve complète non réussie |
| [02-03-05-06-organization-api.patch](02-03-05-06-organization-api.patch) | lib/organizations/contracts, service, test, API /organizations et bootstrap admin | 02, 03, 05, 06 | ALREADY_INTEGRATED — verify consumers, do not reapply |
| [04-05-report-scope.patch](04-05-report-scope.patch) | lib/organizations/report, report-summary, test, API /reports/organization | 04, 05 | ALREADY_INTEGRATED — verify consumers, do not reapply |
| [02-03-05-06-workspace-ui.patch](02-03-05-06-workspace-ui.patch) | components/pilotage/enterprise-organization-workspace.tsx | 02, 03, 05, 06 | ALREADY_INTEGRATED — residual UI work remains |
| [03-08-invitation-qr.patch](03-08-invitation-qr.patch) | private-action-access-section, QR existant et avertissement de transmission | 03, 08 | ALREADY_INTEGRATED — lot 08 remains separate |

### Réception du lot 01 — état vérifié

- Le runtime entreprise est dans l'ascendance publiée de `main` depuis `42e202c9`; aucune migration ou correction déjà intégrée n'a été rejouée. `20261127000001` n'a pas été réappliquée.
- Le scénario pgTAP crée Alpha et Beta réellement, avec identifiants persistés distincts et non nuls; `plan(66)` correspond aux 66 appels d'assertion reconnus par le vérificateur du dépôt. Ce nombre est une preuve de source, pas une exécution PostgreSQL.
- Le candidat ajoute une projection d'équipe minimisée, invitation par adresse email vérifiée côté serveur, départ d'un membre, navigation indépendante du rôle actif et une file/UI admin pour la vérification explicite du mandat. Une correction au service renvoie désormais aux membres un roster minimal sans données d'actions, sites ou bilans.
- La preuve multi-session à deux sessions a été exécutée sur l'environnement éphémère au SHA `42e202c9`, mais échoue avec SQLSTATE `42501` dans `e2e/enterprise-organization-concurrency.mjs` (1 test, 1,45 s). Le cleanup est le point fautif à corriger avant de prétendre au transfert suivi du départ.
- Le scénario Playwright à deux comptes réels est dans le projet authentifié. Le run `46153880092` sur `d0913c1f` est terminé en échec : `authenticate and save official Clerk state` a expiré à `e2e/global.setup.ts:125` après 30 s; le scénario entreprise à deux comptes n'a pas démarré. Le run a signalé 64 tests réussis, 29 en échec et 17 non exécutés, dont des tests de disponibilité publique et de responsive sans lien direct avec le workspace entreprise. Il ne constitue pas une preuve de partage, d'isolation ni de responsive entreprise à 390/768/1440 px.
- Sur les 11 modules UI/API/métier mesurés par V8, la couverture ciblée est de 95,84 % statements, 87,29 % branches, 96,73 % fonctions et 98,87 % lignes. Le run ciblé exécute 86 tests dans 11 fichiers et n'est pas comparable à la couverture globale.
- Contrôle Web complet exécuté sur le candidat `42e202c9` : 1 985 réussites, 1 skip et 7 échecs dans 5 fichiers; aucun résumé de couverture global n'a été produit. Les échecs recouvrent les attentes d'anciens tests Actions et de gamification face au contrat récent de composition partielle. Une relance ciblée sur le HEAD `d0913c1f` reproduit 6 échecs sur 49 tests dans 4 fichiers (`submission-validation`, `action-declaration-form-content`, `payload`, `school-action-recognition`); leur attente et le runtime divergent sur les compositions partielles et colonnes typées. Ces chemins n'appartiennent pas au diff entreprise; ils restent à coordonner avec l'owner Actions/GAME. Le typecheck Web complet passe sur `d0913c1f`.
- Les modules entreprise UI/API/métier instrumentés dépassent leur seuil de famille. Le module Actions canonique partagé sous-testé est signalé séparément dans la matrice ci-dessous. Les pages `page.tsx` restent `NOT_MEASURED` selon l'exclusion canonique; aucun seuil, ratchet ou exclusion n'a été changé.
- Les tests de route `/api/organizations`, `/api/admin/organizations/bootstrap` et `/api/reports/organization` couvrent les erreurs privées, l'identité de session, les limites et les projections. Les contrats Actions récemment publiés ne changent pas la projection du bilan entreprise : `report.ts` continue à normaliser les actions via `toActionContract`, et les tests de projection sont verts. Les scénarios SQL Actions associés ne sont toutefois pas tous verts.
- Préflight lié relancé en lecture seule le 28 novembre : `ALIGNED`, 539/539, 0 en attente, `REMOTE_WRITES: NONE`. Les RPC `bootstrap_organization`, `leave_organization`, `list_organization_bootstrap_queue`, `mutate_organization_membership`, `organization_report_action_ids` et `read_organization_team_members` ont été observées dans le schéma lié avec `SECURITY DEFINER`, `search_path=public, pg_temp`, exécution `service_role` et refus d'exécution directe `authenticated`.

### Matrice de couverture ciblée — PUSH_CANDIDATE `d69a0757` (modules mesurés inchangés depuis `d0913c1f`)

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

La campagne ciblée a passé 99 tests dans 14 fichiers; le candidat `d69a0757` contient les mêmes tests et les mêmes sources pour les 13 modules mesurés. Leur couverture V8 est 96,07 % statements, 89,07 % branches, 96,96 % fonctions et 98,96 % lignes. Chaque module instrumenté dépasse désormais le seuil de sa famille. Les pages `page.test.tsx` admin organisations et `sponsor-portal/page.test.ts` ont aussi passé (12/12), mais les pages restent `NOT_MEASURED` conformément à la configuration canonique : `src/app/admin/organizations/page.tsx`, `src/app/(app)/sponsor-portal/page.tsx` et les autres entrées `page.tsx`. La page dashboard n'a pas été mesurée dans cette campagne. Ce ciblage n'est pas une couverture globale Web.

Les preuves hors V8 restent distinctes : le run FULL SQL `46156991886` sur `d69a0757` a exécuté les 66 assertions pgTAP avec 66 succès, mais la preuve multi-session a échoué en `23503` lors du nettoyage de la fixture, qui violait les clés étrangères de l’organisation. Le script nettoie maintenant audit, campagnes, sites et adhésions avant la ligne organisationnelle; sa revalidation reste `PENDING`. Le run antérieur `46154036758` sur `d0913c1f` s’était arrêté à 41/66, faute du claim `service_role` à l’insertion de la fixture Actions, désormais présent. Le test Actions de composition partielle a passé 9/9 sur `d0913c1f`. Le run E2E `46156824167` sur `d69a0757` est encore en cours; aucune preuve à deux comptes ou responsive n’est revendiquée avant son résultat.

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
