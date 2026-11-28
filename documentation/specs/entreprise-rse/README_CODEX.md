# Entreprise et RSE : réception des candidats

Statut : RÉCEPTION PARTIELLE — au 28 novembre 2026. Préparé le 27 novembre 2026 par ChatGPT, suivant CHATGPT.md, AGENTS.md et le protocole hybride. Référence initiale vérifiée : `main`/`origin/main` à `78f7ca05748ada1a7d9cba5453858bd32fdbce2c`; les commits `b4c5907` et `0068fed` sont déjà intégrés et ne doivent pas être rejoués. Les patches runtime candidats correspondent déjà aux sources publiées. La migration `20261127000001` est déjà enregistrée sur le projet Supabase lié; elle n'est pas rejouée. La réception courante ajoute une migration forward-only `20261128000002` et reste incomplète tant que les preuves PostgreSQL, navigateur et couverture ci-dessous ne passent pas.

## Objectif et périmètre

Source de connaissance : [persona entreprise](../../product/persona-entreprise-rse.md). Source des arbitrages : [décisions produit](../../product/decisions-en-attente.md). Le modèle économique reste dans son document canonique. La demande autorise le travail sur les dix lots du parcours entreprise, pas la commercialisation ou la certification d'une offre. Aucun besoin commercial validé n'est inféré de cette autorisation.

Cible : espace web de préparation, rattachement, suivi multisite, campagnes, bilan et accès aux ressources partenaires. Les composants métier Actions, Reports, annuaire, partenaire et Clerk restent propriétaires. Mobile : aucun nouvel écran, vérifier les contrats partagés sans modifier le runtime mobile.

## Inventaire des candidats et ordre de réception

| Artefact | Cible | Lots | État |
|---|---|---|---|
| [01-parcours-entreprise.patch](01-parcours-entreprise.patch) | page /sponsor-portal, navigation, CTA, composant de liens, test et fiche route | 01, 07 | ALREADY_INTEGRATED — verify consumers, do not reapply |
| [organization-foundation.sql](candidates/sql/organization-foundation.sql) | source préparatoire; correctif courant dans `apps/web/supabase/migrations/20261128000002_enterprise_organization_team_projection.sql` | 02, 03, 05, 06 | MIGRATION FORWARD-ONLY CANDIDATE — SQL éphémère non exécuté |
| [organization-foundation.pgtap.sql](candidates/sql/organization-foundation.pgtap.sql) | source préparatoire; fixture Alpha/Beta adaptée dans `enterprise-organization-foundation.pgtap.sql` | 02, 10 | 66 assertions déclarées, plan vérifié, exécution pgTAP en attente |
| [02-03-05-06-organization-api.patch](02-03-05-06-organization-api.patch) | lib/organizations/contracts, service, test, API /organizations et bootstrap admin | 02, 03, 05, 06 | ALREADY_INTEGRATED — verify consumers, do not reapply |
| [04-05-report-scope.patch](04-05-report-scope.patch) | lib/organizations/report, report-summary, test, API /reports/organization | 04, 05 | ALREADY_INTEGRATED — verify consumers, do not reapply |
| [02-03-05-06-workspace-ui.patch](02-03-05-06-workspace-ui.patch) | components/pilotage/enterprise-organization-workspace.tsx | 02, 03, 05, 06 | ALREADY_INTEGRATED — residual UI work remains |
| [03-08-invitation-qr.patch](03-08-invitation-qr.patch) | private-action-access-section, QR existant et avertissement de transmission | 03, 08 | ALREADY_INTEGRATED — lot 08 remains separate |

### Réception du lot 01 — état vérifié

- `b4c5907` et `0068fed` sont déjà dans l'ascendance du checkout courant ; aucun patch n'a été recopié.
- Le scénario pgTAP crée Alpha et Beta réellement, avec identifiants persistés distincts et non nuls; `plan(66)` correspond aux 66 appels d'assertion reconnus par le vérificateur du dépôt. Ce nombre est une preuve de source, pas une exécution PostgreSQL.
- Le candidat ajoute une projection d'équipe minimisée, invitation par adresse email vérifiée côté serveur, départ d'un membre, navigation indépendante du rôle actif et une file/UI admin pour la vérification explicite du mandat. Une correction au service renvoie désormais aux membres un roster minimal sans données d'actions, sites ou bilans.
- Une preuve de concurrence à deux sessions est ajoutée à `e2e/enterprise-organization-concurrency.mjs` et enregistrée au runner SQL; le runner n'a pas encore été exécuté sur son environnement PostgreSQL éphémère.
- Le scénario Playwright deux comptes est enregistré dans le projet authentifié et prépare des fixtures uniquement sur l'URL Supabase locale du runner éphémère. `playwright --list --project="authenticated campaign"` recense 10 tests dans 5 fichiers, dont celui-ci; cette commande prouve la découverte, pas l'exécution. Aucun navigateur n'a été lancé.
- Tests ciblés de l'espace organisation, équipe et administration : 50/50 PASS. Couverture ciblée des cinq modules instrumentés : 94,51/85,27/95,86/98,85 % (statements/branches/fonctions/lignes); ce scope ne représente pas la couverture globale ni tous les modules sensibles.
- La couverture Web complète a été lancée puis interrompue après plusieurs échecs, avant le rapport final : seuils globaux `NOT_MEASURED`, diagnostics à reprendre. `npm run typecheck -w apps/web` échoue actuellement sur `apps/web/src/lib/actions/action-update-notes.ts:88` (valeur `null` non assignable); ce chemin Actions concurrent n'a pas été modifié par le candidat entreprise.
- Contrôle documentaire PASS, gouvernance AGENTS PASS et miroir des skills PASS. Le contrôle `git diff --check` passe.
- Couverture re-mesurée antérieurement sur huit modules effectivement inclus : total 58,50/54,40/50,71/75,48 %. Les seuils du prompt ne sont pas atteints. Les pages `page.tsx` sont exclues par la configuration de couverture existante et restent `NOT_MEASURED`; aucune exclusion ni aucun ratchet n'a été modifié.
- Préflight Supabase lié : dernier état observé `BLOCKED`; la migration candidate `20261128000002` est la seule en attente. Le rapport classe la preuve sensible comme invalide car son empreinte/schema version ne correspond pas encore au candidat courant; `REMOTE_WRITES: NONE`. Aucun déploiement ni écriture en base liée n'a été exécuté.
- Le lien produit direct vers `plans/` a été remplacé par l'index des fonctionnalités, et la fiche entreprise est référencée par `documentation/features/README.md`. L'index interne des chantiers demeure dans `documentation/plans/README.md`.
- Validation navigateur avec comptes Clerk Development distincts et données Supabase éphémères : `NOT_RUN`. Pas encore de preuve exécutée de responsive multi-largeur.
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

## Preuves accessibles à la préparation

- Lecture main et fichiers cibles/consommateurs, gouvernance, contrats d'autorisation, source des actions et reports : effectuée.
- Validation statique des hunks : 17 cibles, comptes de lignes et contexte exact des 5 fichiers existants conformes au SHA de lecture (contrôle textuel, pas git apply exécuté).
- Tests du roster/workspace/admin : 50/50 exécutés; tests Reports ciblés : 7/7 exécutés. La suite pgTAP candidate et les tests CI éphémères restent non exécutés.
- La publication immédiate de cette réception porte uniquement sur les manifestes documentaires et les références de routage. Le code runtime et la migration `20261128000002` restent des changements locaux CANDIDATE et ne sont ni activés ni inclus dans ce commit documentaire. Aucun SQL lié n'a été appliqué.

STOP CONDITION : toujours ouverte. Réception complète du Lot 01 exige pgTAP et concurrence réussis sur le candidat publié, parcours navigateur éphémère à deux comptes Clerk exécuté aux cinq largeurs, seuils de couverture atteints pour les fichiers mesurables, documentation CURRENT cohérente, absence de régression critique et publication sans contournement des hooks. Les PDF, challenges sans besoin distinct, QR indépendant, certification ESG et extensions commerciales restent PLAN.
