# Entreprise et RSE : réception des candidats

Statut : CANDIDATE / PLAN. Préparé le 27 novembre 2026 par ChatGPT, suivant CHATGPT.md, AGENTS.md et le protocole hybride. Constat de lecture : main `202267461c69ce033ebe44bbfb479d78d378b3f0`. Ce SHA est une preuve historique et non une instruction de checkout. Aucun changement runtime, SQL actif ou déploiement n'est livré par ce dossier.

## Objectif et périmètre

Source de connaissance : [persona entreprise](../../product/persona-entreprise-rse.md). Source des arbitrages : [décisions produit](../../product/decisions-en-attente.md). Le modèle économique reste dans son document canonique. La demande autorise le travail sur les dix lots du parcours entreprise, pas la commercialisation ou la certification d'une offre. Aucun besoin commercial validé n'est inféré de cette autorisation.

Cible : espace web de préparation, rattachement, suivi multisite, campagnes, bilan et accès aux ressources partenaires. Les composants métier Actions, Reports, annuaire, partenaire et Clerk restent propriétaires. Mobile : aucun nouvel écran, vérifier les contrats partagés sans modifier le runtime mobile.

## Inventaire des candidats et ordre de réception

| Artefact | Cible | Lots | État |
|---|---|---|---|
| [01-parcours-entreprise.patch](01-parcours-entreprise.patch) | page /sponsor-portal, navigation, CTA, composant de liens, test et fiche route | 01, 07 | CANDIDATE |
| [organization-foundation.sql](candidates/sql/organization-foundation.sql) | migration nouvelle dans l'arbre canonique, nom/timestamp à allouer au checkout | 02, 03, 05, 06 | CANDIDATE |
| [organization-foundation.pgtap.sql](candidates/sql/organization-foundation.pgtap.sql) | suite pgTAP du dépôt | 02, 10 | CANDIDATE |
| [02-03-05-06-organization-api.patch](02-03-05-06-organization-api.patch) | lib/organizations/contracts, service, test, API /organizations et bootstrap admin | 02, 03, 05, 06 | CANDIDATE |
| [04-05-report-scope.patch](04-05-report-scope.patch) | lib/organizations/report, report-summary, test, API /reports/organization | 04, 05 | CANDIDATE |
| [02-03-05-06-workspace-ui.patch](02-03-05-06-workspace-ui.patch) | components/pilotage/enterprise-organization-workspace.tsx | 02, 03, 05, 06 | CANDIDATE |
| [03-08-invitation-qr.patch](03-08-invitation-qr.patch) | private-action-access-section, QR existant et avertissement de transmission | 03, 08 | CANDIDATE |

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
- Tests candidats : 3 fichiers Vitest (contrats, agrégats, liens) et une suite pgTAP structurelle. Non exécutés.
- Typecheck, lint, Vitest, pgTAP, navigateur, preflight Supabase, CI et production : NOT_RUN / DB_SEMANTICS_NOT_EXECUTED. Couverture NOT_MEASURED. Hooks locaux HOOK_NOT_AVAILABLE.
- Publication de ce lot : documentation et fichiers candidats seulement. Aucun nouveau rôle, endpoint, table, permission ou comportement réellement activé.

STOP CONDITION : réception démontrée du sous-ensemble intégré, tests de sécurité et de non-régression pertinents, documents CURRENT alignés, preuves de publication et limites restantes explicites. Ne pas bloquer le lot indépendant QR sur les preuves SQL ; ne pas activer un espace organisationnel incomplet pour prétendre clôturer les dix lots.
