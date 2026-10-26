# Plan de macro-lots Codex : extensions UI/UX CleanMyMap

> **Statut : `PLAN / EXECUTION`, non normatif.** Document de travail pour des lots successifs sur `main`, pas un nouveau contrat de design system.
>
> **Base fonctionnelle :** `MATRICE_ASTUCES_UI_UX_CLEANMYMAP.md` V2 fournie dans la conversation, 48 techniques, colonne **« Où l’étendre éventuellement »** et colonne des contre-indications.
>
> **Contrôle initial du dépôt :** `maxd4/CleanmyMap`, `main` à `95981f8735048bccd8650df93c3e8e1567c96533` (27 octobre 2026). Ce SHA est un point de départ, **pas** une version à imposer aux lots suivants : relire `main` avant chaque exécution.
>
> **Emplacement conseillé du présent plan :** `documentation/plans/PLAN_MACRO_LOTS_UI_UX_CODEX.md` si ce plan doit être versionné ; le document reste `PLAN`, les contrats `CURRENT` demeurent dans leurs domaines propriétaires.

## Principes de réalisation

1. **Traiter les 48 propositions, pas implémenter 48 gadgets.** « Éventuellement » est une hypothèse de pertinence, pas une obligation technique. Chaque proposition reçoit en fin de lot une décision traçable : `IMPLEMENTED_AND_TESTED`, `EXISTING_VERIFIED`, `NOT_APPLICABLE` (raison technique/produit démontrée), ou `BLOCKED` (preuve/dépendance indispensable manquante). `NOT_APPLICABLE` ne doit jamais masquer une amélioration utile déjà démontrée. Aucun résultat de production, comportement navigateur ou état de données n'est inventé.
2. **Un owner par comportement.** Chercher l'implémentation existante, ses callers et consommateurs. Étendre les primitives (`CmmSkeleton`, `CmmToast`, `CmmFeedback`, `SystemState`, `CmmButton`, `CmmField`, `CmmDialog`, `CmmDropdown`, `CmmPopover`, `SiteTooltips`), les hooks et services canoniques. Aucun registry, calcul, état ni source de vérité concurrente. Décider `EXTEND_EXISTING`, `CREATE_MODULE` ou `RESTRUCTURE_FIRST` seulement selon les frontières de responsabilités et les conventions du dépôt.
3. **Périmètre garanti.** Ne pas changer silencieusement AuthN/AuthZ, RLS, ownership, privilèges, données personnelles, formule métier, score scientifique, routes publiques, consentement ou sémantique SEO pour une amélioration de rendu. Les modifications de contrats métier réellement nécessaires doivent rester bornées, testées et documentées dans leur domaine.
4. **Tests de couverture substantiels à chaque macro-lot.** Avant d'écrire, dresser la matrice `objectif/invariant → owner → preuve existante → lacune → niveau de risque → scénario/test`. Ajouter de nombreux **tests complémentaires utiles**, pas des assertions textuelles redondantes : normal, refus/erreur, vide, limites, cas intermittents, changement de contexte, concurrence/retry, clavier/focus, responsive et accessibilité selon le domaine. Couvrir les branches et effets réels des fichiers modifiés et leurs consommateurs. Exécuter suites ciblées + contrôles pertinents et produire une **mesure avant/après comparable** (statements, branches, functions, lines, `covered/total`, même périmètre, même méthode, SHA de preuve). Conserver les objectifs de couverture **par risque** déjà établis dans `documentation/development/testing-quality-coverage.md` ; ne pas fabriquer un seuil global arbitraire ni modifier baselines, exclusions ou règles uniquement pour faire monter un pourcentage.
5. **Preuves distinctes.** Une assertion statique ou un mock ne prouve pas une intégration HTTP, Clerk, mobile native ou PostgreSQL. Pour une transaction, RLS ou une concurrence persistante, ajouter/exécuter la preuve dans la lane Supabase éphémère autorisée ; si indisponible, `DB_SEMANTICS_NOT_EXECUTED` et verdict `PARTIEL`/`BLOQUÉ` si le contrat l'exige. Pour les tests navigateur protégés, employer le protocole Clerk/Playwright du dépôt, jamais une permission simulée présentée comme preuve de production.
6. **Documentation simultanée.** À chaque macro-lot, mettre à jour les documents **canoniques spécialisés** et les fiches `CURRENT` de `documentation/pages_site/routes/` réellement affectées, sans déplacer ni remplacer les assets protégés, ni modifier les fiches non concernées. **Ne jamais toucher à `documentation/design-system/MATRICE_ASTUCES_UI_UX_CLEANMYMAP.md` ni à ses copies pendant les lots 01 à 11**. La matrice V2 sert de référence de planification ; sa mise à jour et son éventuelle intégration dans `main` ont lieu **uniquement au lot 12**.
7. **Livrer par lot.** Un lot = une responsabilité cohérente, tests et docs du domaine compris, validation/commit/push par Codex selon `AGENTS.md`, puis vérification de convergence. Après chaque lot, transmettre une synthèse concise : IDs traités, décisions, fichiers, preuves réelles, couverture avant/après, erreurs/blocages, SHA publié, `STOP CONDITION`. Ne pas entamer le lot suivant si un invariant critique demeure `BLOCKED`.
8. **Finitude.** Une opportunité non pertinente ou déjà correctement implémentée se clôt par preuve, pas par un refactoring de façade. Pour les ajouts optionnels P3, construire seulement lorsque le gain est concret, l'interaction reste utile et le coût est maîtrisé. Ne pas forcer une expérimentation visuelle sur des données ou des personnes réelles.

## Ordre d'exécution et responsabilités

| Ordre | Macro-lot | IDs principalement responsables | Résultat central |
|---:|---|---|---|
| 01 | États, feedback et accessibilité transverse | 1, 21, 22, 23, 38 | Socle cohérent de chargement, attente, erreurs et annonces |
| 02 | Navigation, menus et mouvement | 3, 4, 11, 13, 20, 24, 25, 26, 27, 28, 29, 34, 39 | Ruban `classic`/`meniscus` fiable, sans seconde navigation |
| 03 | Requêtes, cache et filtres | 6, 32, 33 | Fraîcheur et concurrence cohérentes, sans fuite inter-compte |
| 04 | Listes longues et vues carte/liste | 37, 47 | Pagination réellement complète et sélection synchronisée |
| 05 | Mutations sensibles et idempotence | 19 | Replays sûrs et conflits explicites aux frontières de persistance |
| 06 | Formulaires, brouillons et progression | 5, 40, 41, 42, 48 | Aides, erreurs, étapes et annulations locales fiables |
| 07 | Messagerie et interactions réversibles | 2 | Optimisme limité aux opérations réconciliables |
| 08 | Accès, authentification et consentement | 15, 43, 44, 46 | UI d'accès et décisions conformes aux contrats de sécurité |
| 09 | Préparation des vues et coût JS | 7, 30, 31 | Rendu rapide, ciblé et visible par défaut |
| 10 | Images, typographie et continuité visuelle | 8, 9, 16, 17, 18, 35, 36 | Chargement médias et confort visuel sans animations gratuites |
| 11 | Ergonomie et reprise mobile native | 10, 12, 14, 45 | Parcours mobile exploitable au tactile, hors-ligne et zone sûre |
| 12 | Clôture croisée et mise à jour **finale** de la matrice | 1 à 48 | Matrice reflétant le runtime final et l'état réel des preuves |

Les IDs ne désignent pas des fichiers propriétaires exclusifs. Par exemple #13 s'applique au desktop au lot 02 et à l'écran natif au lot 11 ; #41 est porté par le lot 06 mais les lots 01, 05 et 08 doivent aussi respecter `CmmField`. Les tests et docs transverses de ces usages restent dans le lot de leur vrai domaine.

## Traçabilité exhaustive des 48 propositions

Ce tableau est une **indexation des responsabilités**, pas une déclaration de fonctionnalité présente. Les cibles détaillées et leurs contre-indications restent celles de la matrice V2 ; le lot final sera seul autorisé à actualiser la matrice.

| # | Technique | Lot responsable | Cible à examiner (non acquise) |
|---:|---|:---:|---|
| 1 | Skeleton loaders | 01 | Listes volumineuses de /sections/annuaire, /sections/messagerie, /actions/history, /pilotage, /reports seulement là où le chargement provoque actuellement une… |
| 2 | Optimistic updates | 07 | Réactions, accusés de lecture, préférences légères ou interactions de messagerie si le backend garantit réconciliation et anti-doublons. |
| 3 | Command menu | 02 | Ajouter éventuellement des actions non destructives à la recherche globale : « ouvrir la carte », « consulter mes actions », « accéder aux rapports », uniquement… |
| 4 | Shortcut hints | 02 | Raccourcis réels, documentés et contextuels dans éditeur de géométrie /actions/new, navigation des tableaux admin, galerie photo et panneaux cartographiques ; |
| 5 | Undo toasts | 06 | Annulation d'un retrait local non définitif (filtre, retrait d'un élément de brouillon, ajustement de carte, archivage réversible) ; |
| 6 | Stale-while-revalidate | 03 | Rapports agrégés, annuaire, flux de carte et tableaux KPI, sous réserve de fraîcheur explicite, séparation publique/privée, invalidation après mutation, et… |
| 7 | Pre-rendering | 09 | Guides /learn/*, contenus d'information et fiches publiques stables si la sensibilité des données et le comportement de cache le permettent ; |
| 8 | BlurHash placeholders | 10 | Galerie de preuves photo d'action, médias de signalements, /sections/annuaire et galerie SPOGOMI, si une chaîne de génération fiable fournit la miniature ; |
| 9 | View transitions | 10 | Navigation carte ↔ fiche d'action ; |
| 10 | Swipe-to-dismiss sheets | 11 | Fiches basses des marqueurs carte sur téléphone, filtres cartographiques mobiles et fiches détaillées de mission mobile. |
| 11 | Interruptible animations | 02 | Navigation centrale meniscus, changements d'onglets et transitions de panneaux. |
| 12 | Predictive back | 11 | Évaluer sur apps/mobile lorsque la pile de navigation native et la plateforme le permettent ; |
| 13 | Hit slop | 02 | Icônes denses du ruban, actions sur marqueurs Leaflet, galerie, boutons de petites cartes, app mobile ; |
| 14 | Safe area insets | 11 | Autres feuilles et panneaux fixes de mission/finalisation sur mobile, ainsi que les overlays web sur iOS Safari si nécessaire ; |
| 15 | One-time code autofill | 08 | Vérifier les écrans d'authentification et de vérification Clerk lorsque personnalisés, uniquement pour de vrais OTP et sans contourner le fournisseur d'identité. |
| 16 | Tabular numbers | 10 | Colonnes d'indicateurs /reports, /pilotage, classements, horaires, progression GPS et montants alignés, uniquement si l'existant ne les couvre pas déjà par les… |
| 17 | Balanced headlines | 10 | Titres longs d'aides, guides /learn/*, modales de validation et encarts éditoriaux ; |
| 18 | Continuous corners | 10 | Dock meniscus, panneaux flottants et cartes mises en avant si l'effet s'intègre au design system ; |
| 19 | Idempotency keys | 05 | Examiner seulement les autres mutations à risque de duplication : inscriptions, créations événementielles, demandes partenaires, import ou finalisation mobile. |
| 20 | Amazon safe triangle | 02 | Ruban central et dropdowns des blocs si des fermetures accidentelles sont reproduites. |
| 21 | Toasts contextualisés et récupération d'erreur | 01 | Soumissions de formulaire non critiques, actions réseau de messagerie, annuaire et outils de carte en cas d'échec ; |
| 22 | États async explicites | 01 | Chaque surface de liste ou consultation métier encore dépourvue d'un état dédié, notamment /pilotage, /reports, /sections/annuaire et /actions/history ; |
| 23 | Boutons avec état pending | 01 | Mutations actions, ajout de preuves, demandes partenaires, envoi de message et formulaires admin là où la primitive n'est pas encore utilisée ; |
| 24 | Dropdown accessible au clavier et à l'extérieur | 02 | Nouveau dock meniscus, menus de filtres et menus de contexte supplémentaires ; |
| 25 | Placement adaptatif des overlays | 02 | Menus proches du bord des cartes, suggestions d'adresse, menus des tableaux et listes sur écrans étroits ; |
| 26 | Navigation responsive par parcours | 02 | Assurer la même structure et les mêmes droits lorsque meniscus est activé ; |
| 27 | Indicateur de route active et sémantique ARIA | 02 | Icônes actives du dock meniscus, onglets mobiles, fil d'Ariane et parcours longs ; |
| 28 | Préférences d'affichage accessibles | 02 | Tous les nouveaux composants animés, cartographiques ou riches, surtout meniscus, panneaux mobiles et visualisations, sans changer le contenu ni les permissions… |
| 29 | Respect de la réduction du mouvement | 02 | Toutes les animations nouvelles, notamment dock, bascule de panneaux, cartes et gamification ; |
| 30 | Chargement différé / code splitting | 09 | Modules lourds de rapports, cartes secondaires, galeries, configurateurs et fonctionnalités rares ; |
| 31 | Lazy mounting à l'entrée dans le viewport | 09 | Graphiques secondaires, prévisualisations lourdes et sections sous la ligne de flottaison ; |
| 32 | Debounce des saisies | 03 | Filtres d'annuaire, recherche dans historiques, auto-complétions adresse/organisateur si appels réseau répétés ; |
| 33 | Annulation des requêtes obsolètes | 03 | Recherche cartographique, annuaire, météo, géocodage et rapports filtrables, après vérification de leur gestion actuelle de concurrence. |
| 34 | Info-bulles contextuelles adaptatives | 02 | Icônes du ruban, définitions d'indicateurs environnementaux, filtres de cartes et actions admin ambiguës ; |
| 35 | Images chargées à la demande | 10 | Autres flux photo, annuaire et vignettes communautaires ; |
| 36 | Galeries navigables au clavier | 10 | Galeries de preuves de dépollution et photos de signalements, si leur viewer actuel n'a pas les mêmes raccourcis, avec contrôle du focus et alternative tactile. |
| 37 | Pagination et chargement progressif | 04 | Historiques d'actions, annuaire de partenaires, flux de signalements, tables admin et listes d'événements volumineuses ; |
| 38 | Annonces accessibles des états dynamiques | 01 | Opérations asynchrones de carte, validation de formulaires et messages de résultat, sans annonces répétées ou trop fréquentes aux lecteurs d'écran. |
| 39 | Rendu du ruban sensible au fond environnant | 02 | Nouveau dock meniscus, popovers ancrés au ruban et variantes de thème. |
| 40 | Feedback d'annulation locale à la source | 06 | Brouillons de géométrie, déplacements de sommets, champs multiétapes, opérations locales sur une prévisualisation ; |
| 41 | Erreurs de formulaire accessibles | 06 | Formulaires de création d’action, signalement, inscription, demande partenaire et administration, seulement si des champs échappent encore à CmmField. |
| 42 | Étapes et progression de workflow | 06 | Formulaires longs d’inscription ou de rapports multiétapes, si le parcours a de vraies étapes et des validations distinctes. |
| 43 | Dialogues modaux avec focus maîtrisé | 08 | Confirmations nécessitant décision, changement de paramètres sensibles, exports ou détails bloquants, en réutilisant CmmDialog. |
| 44 | Aperçu avec contrôle d’accès contextualisé (soft gate) | 08 | Pages hybrides cartographie, signalement, rapports ou participation seulement si les données publiques restent légitimes et les mutations sont protégées. |
| 45 | Reprise hors ligne et état réseau explicite | 11 | Parcours GPS mobile, finalisation après perte réseau, brouillons locaux non sensibles avec identité stable et preuve de resynchronisation. |
| 46 | Consentement optionnel explicite et révisable | 08 | Nouveaux traceurs ou traitements optionnels, seulement si ajoutés, avec preuve des préférences et du défaut protecteur. |
| 47 | Sélection synchronisée carte et tableau | 04 | Annuaire carte/liste et autres vues duales uniquement lorsqu’elles partagent un identifiant canonique et un parcours de sélection clair. |
| 48 | Divulgation progressive de l’aide | 06 | Aides aux coefficients, descriptions longues de formulaires et filtres experts, si une info secondaire surcharge réellement l’écran. |

## Prompts Codex à exécuter dans cet ordre

### Macro-lot 01 : états, feedback et accessibilité transverse

```text
Renforcer les états UI asynchrones dans CleanMyMap sur les listes et consultations réellement concernées : annuaire, messagerie, historique, pilotage, rapports, carte (#1, #21, #22, #23, #38).

Réutiliser CmmSkeleton, CmmFeedback, SystemState, CmmToast, CmmButton et leurs owners ; supprimer seulement les incohérences observées. Ajouter un skeleton là où un chargement crée une rupture mesurable, un état pending qui empêche les doubles soumissions locales, et des annonces accessibles sans répétition. Garder retry et feedback inline contextualisés ; ne jamais afficher succès serveur prématuré, écran vide trompeur ou clignotement de skeleton.

Ajouter une batterie de tests de composants et d'intégration sur loading/refresh/success/empty/error/timeout/retry, invalidation, pending répété, aria-live/aria-busy et absence de régression de layout. Mesurer la couverture avant/après des composants et flux réellement touchés, avec branches d'erreur. Mettre à jour STATES_FEEDBACK.md, ACTIONS_BUTTONS.md et fiches CURRENT touchées, sans modifier la matrice.

STOP : chaque surface retenue expose des états exacts et accessibles, les scénarios normaux/erreurs passent et les mesures de couverture sont rapportées ; les exclusions sont justifiées. Publier selon AGENTS.md.
```

### Macro-lot 02 : navigation, menus, raccourcis et mouvement

```text
Améliorer le ruban et les interactions de navigation CleanMyMap pour #3, #4, #11, #13, #20, #24 à #29, #34 et #39. Le main dispose déjà de `app-navigation-ribbon-variant.ts` (`classic | meniscus`) : conserver ce sélecteur, ses dropdowns et le registre unique `lib/navigation.ts`, sans recréer de variante.

Étendre GlobalSearch uniquement avec des actions de navigation non destructives déjà autorisées ; afficher les raccourcis réellement disponibles. Fiabiliser les deux docks : indicateur dérivé de la route, menu ouvert distinct, animation interrompable, cibles cliquables sans chevauchement, info-bulles accessibles, placement adaptatif au bord/zoom. Tester le parcours pointeur vers dropdown ; n'ajouter un safe triangle qu'en présence d'une fermeture reproductible non corrigée par le pont/délai existants. Préserver les menus mobiles et les préférences exhaustif/minimaliste/sobre, reduced motion, SSR, capture et chrome adaptatif.

Étendre massivement les tests navigation/keyboard/focus/pointer, changement rapide d'URL et de profil, route inconnue, zoom, petits écrans, contrastes/modes d'affichage, menu ouvert puis navigation, absence de doublons d'événements ; couvrir les branches de sélection et de fermeture. Comparer visuellement `classic` et `meniscus` au navigateur. Mettre à jour NAVIGATION_DROPDOWNS.md, MOTION_TRANSITIONS.md et autres contrats/fiches réellement changés ; matrice intacte.

STOP : les deux variantes fonctionnent sans divergence ni recul accessibilité, les tests comportementaux et la couverture du domaine sont documentés. Publier selon AGENTS.md.
```

### Macro-lot 03 : fraîcheur, debounce et annulation des requêtes

```text
Fiabiliser #6, #32, #33 sur les consommateurs réels de données : annuaire, actions/historique, flux cartographique, météo, géocodage, recherches messagerie et rapports filtrés. Réutiliser SWR et hooks/cache/cancellation déjà en place, sans nouveau cache parallèle.

Appliquer debounce seulement aux saisies déclenchant des recherches coûteuses ; annuler ou ignorer la réponse d'une requête obsolète ; rendre explicites loading/refresh/stale/error et les invalidations après mutations. Protéger les clés de cache par compte, profil, scope et filtres pertinents ; aucune conservation de données privées après changement d'identité, ni stale présenté comme état confirmé.

Ajouter des tests unitaires/hooks/API et intégrations avec timers contrôlés, deux recherches inversées, fetch rejeté ou aborté, filtre changé, données manquantes, rafraîchissement concurrent, changement de compte, reconnexion et mutation/invalidation. Vérifier qu'aucune réponse ancienne n'écrase la plus récente. Comparer le coverage par owner avant/après ; documenter les contrats de cache/fraîcheur dans leurs sources spécialisées et les fiches de pages impactées, sans toucher la matrice.

STOP : les domaines où le problème est réel ont cache et concurrence sûrs, sans fuite ni requête redondante démontrée. Publier selon AGENTS.md.
```

### Macro-lot 04 : listes longues, pagination et coordination cartographique

```text
Traiter #37 et #47 dans les surfaces longues ou duales effectivement concernées : historique d'actions, annuaire, signalements, listes admin, événements et couples carte/liste. Inspecter les API existantes, les cursors, filtres, tris et sources autorisées avant de changer un consommateur.

Implémenter pagination serveur stable seulement là où le volume ou le coût le justifie. Préserver compteurs, filtres, tri déterministe, sélection après pagination et exports complets sans confondre fenêtre affichée et ensemble métier. Pour les vues carte/liste disposant d'identifiants communs, synchroniser sélection, deselection, focus et scroll sans boucle ni exposition d'élément filtré. Ne pas créer de carte ou double vue artificielle.

Ajouter tests substantiels API/clients : première/dernière page, curseur invalide, déduplication entre pages, suppression ou ajout entre requêtes, changement de filtre, données publiques/privées, absence de doublons, 0/1/N éléments, erreurs, retry, synchronisation depuis carte puis liste et clavier. Mesurer la couverture des services/pagers/projections. Exécuter preuve PostgreSQL en lane autorisée si persistance/RLS/concurrence modifiées. Actualiser contracts de pagination, DATA_DISPLAY_TABLES_KPI.md et fiches CURRENT, matrice intacte.

STOP : aucun élément autorisé n'est perdu/dupliqué par pagination, aucune sélection fantôme ou fuite de scope, preuve d'intégration suffisante. Publier selon AGENTS.md.
```

### Macro-lot 05 : idempotence et sécurité des mutations

```text
Étendre #19 uniquement aux autres mutations où un double envoi produit un doublon métier démontrable : demandes partenaires, inscription/participation, création d'événement, imports ou finalisation mobile. Lire les contrats déjà utilisés par `/api/actions`, SPOGOMI, partners et mobile ; ne pas superposer un mécanisme générique qui contourne leurs owners.

Pour chaque mutation retenue, garantir une clé stable pour le retry d'une même intention, une nouvelle clé pour une intention distincte, une autorisation serveur inchangée, le refus d'une même clé avec payload/acteur/scope contradictoires et une réponse déterministe. Ajouter garanties persistées seulement si le schéma actuel ne suffit pas. Les échecs partiels et la concurrence ne doivent pas doubler une action ni transformer un refus en succès.

Ajouter tests massifs par frontière : première soumission, relecture du même résultat, retry après timeout, payload différent, acteur étranger, session expirée, double clic, concurrence inter-requêtes, échec SQL/RPC, rollback et nettoyage. Exécuter la preuve PostgreSQL/HTTP/RLS sur lane éphémère autorisée si contrat DB touché ; sinon qualifier explicitement `DB_SEMANTICS_NOT_EXECUTED`. Mesurer couverture réelle des handlers/services et actualiser la documentation métier/API/sécurité et fiches CURRENT, sans toucher la matrice.

STOP : aucune mutation critique ajoutée sans garantie prouvée, aucune duplication ni élévation de privilège sur les scénarios retenus ; conserver blocages de preuve visibles. Publier selon AGENTS.md.
```

### Macro-lot 06 : formulaires, brouillons, aide et annulation réversible

```text
Étendre #5, #40, #41, #42 et #48 aux formulaires d'action, signalement, demande partenaire, inscription et exports multiétapes seulement lorsqu'une difficulté réelle est identifiée. Réutiliser CmmField, CmmDialog, CmmToast, `WorkflowStepper` et les modèles de brouillons existants.

Compléter labels/required, aria-invalid/describedby, résumé d'erreurs, validation et retour focus ; maintenir étapes courantes/terminées accessibles et cohérentes avec les données persistées. Ajouter l'aide progressive aux seules notions secondaires complexes. Permettre Undo ou toast Annuler uniquement pour opérations locales réellement réversibles (dessin, filtres, brouillon non envoyé), avec restauration exacte et sans tromper l'utilisateur sur un rollback serveur. Ne jamais cacher une instruction nécessaire ou inventer une étape.

Ajouter tests massifs champs invalides, erreurs multiples, focus/screen-reader, navigation arrière/avant, état sauvegardé, formulaire interrompu, dessin undo/redo limite, abandon/refresh, clic répété, lecture et modification après échec réseau. Tester le parcours multiétapes desktop/mobile, et les contraintes d'ownership si mutation impliquée. Mesurer couverture des state machines et validateurs avant/après ; mettre à jour FORMS_CONTROLS.md, DISCLOSURE_ACCORDIONS.md et fiches CURRENT affectées, sans matrice.

STOP : formulaires concernés accessibles, reprises fiables, Undo authentique, aucune mutation sensible anticipée. Publier selon AGENTS.md.
```

### Macro-lot 07 : messagerie, réactions et optimisme ciblé

```text
Traiter #2 dans la messagerie/communauté : étendre l'optimisme seulement aux réactions, votes, marqueurs de lecture ou préférences légères dont le backend fournit une réconciliation fiable. Garder la logique de message optimiste et de rollback déjà présente comme owner ; ne pas inventer d'accusé de lecture si le domaine ne l'expose pas.

Avant toute mutation, vérifier source serveur, droits, anti-doublons et versions/conflits ; afficher pending, erreur et retry sans message fantôme, perte ou double envoi. Consolider les éventuelles duplications de logique optimistic, mais ne pas réécrire les services chat non concernés. Respecter les caches séparés par canal, participant et identité.

Ajouter tests très complets : succès, refus/403, 409, timeout, rollback, retry, réponse hors ordre, navigation entre canaux, session changée, vote concurrent, double clic, suppression ou édition pendant pending, connexion interrompue et accessibilité des annonces. Mesurer couverture des hooks, reducers et services modifiés avec branchements async. Prouver la frontière serveur si elle change ; actualiser docs chat et fiches CURRENT, jamais la matrice.

STOP : toute mutation optimiste retenue converge avec l'état autorisé du serveur sans fuite, doublon ni faux succès. Publier selon AGENTS.md.
```

### Macro-lot 08 : identité, overlays sensibles et consentement

```text
Consolider #15, #43, #44, #46 sur les parcours Clerk, pages hybrides publiques/privées, dialogues bloquants, exports et consentement optionnel. Préserver Clerk comme identité canonique, les AuthZ/RLS côté serveur et les comportements de `CmmDialog` ; ne pas introduire d'OTP personnalisé ni de nouveau traceur pour satisfaire la matrice.

Vérifier les OTP réellement présents : renseigner `one-time-code` seulement sur un champ de code compatible et propriétaire, sans modification des composants hébergés Clerk. Étendre `CmmDialog` aux confirmations réellement modales qui ne l'utilisent pas encore (focus trap, restauration, Escape selon dismissibility). Sur pages hybrides, garder les lectures publiques séparées des actions/données privées ; ne jamais utiliser un blur comme preuve d'AuthZ. Pour tout traitement optionnel nouveau effectivement introduit, réutiliser le consentement révocable avec refus protecteur ; sinon vérifier le contrat sans créer un besoin fictif.

Ajouter tests négatifs massifs non-connecté, rôle insuffisant, ownership étranger, état de session inconnu, refus de consentement, changement de choix, focus/Escape/backdrop/tab, OTP validé par fournisseur, erreurs et retry. Couvrir les guards/handlers et UI concernés ; exécuter E2E Clerk et intégrations de sécurité requises sur leur harness, sans passer les mocks pour des preuves RLS. Maintenir docs sécurité, juridique, overlays et fiches CURRENT, matrice inchangée.

STOP : aucune lecture ou mutation non autorisée introduite, consentement fidèle, interactions modales accessibles, preuves explicites. Publier selon AGENTS.md.
```

### Macro-lot 09 : pré-rendu, chargement différé et économie de ressources

```text
Traiter #7, #30, #31 sur les guides publics `/learn/*`, composants lourds de rapports, galeries, cartes secondaires, prévisualisations et sections sous la ligne de flottaison. Lire les mécanismes Next.js existants et mesurer le besoin avant mutation.

Étendre pré-rendu/ISR uniquement à contenus publics stables, sans donner un cache partagé à une donnée personnelle ou contextuelle. Réutiliser `next/dynamic`, `use-in-view-once` et fallbacks actuels pour limiter le JS et les montages lourds, sans cacher du contenu essentiel avant hydratation, ni casser SEO, navigation clavier ou mode sobre. Éviter un préfetch automatique coûteux ou un changement de stratégie sans bénéfice mesuré.

Ajouter tests significatifs de rendering SSR/JS désactivé, hydratation, erreurs d'import, viewport/IntersectionObserver absent, remount/unmount, changement de route, auth, SEO et fallback. Comparer JS transféré, nombre de requêtes, LCP/CLS ou métrique appropriée sur conditions identiques ; aucune valeur inventée. Mesurer couverture hooks/adapters, mettre à jour contrats de performance/SEO et fiches CURRENT réellement modifiées, matrice intacte.

STOP : bénéfices mesurés ou statu quo justifié, contenu essentiel toujours accessible et aucune régression fonctionnelle. Publier selon AGENTS.md.
```

### Macro-lot 10 : médias, lisibilité et transitions discrètes

```text
Améliorer #8, #9, #16, #17, #18, #35, #36 sur preuves photo des actions, signalements, annuaire, galerie SPOGOMI, rapports, pilotage et aides longues. Réutiliser les composants images, `CmmDialog`, typography/motion tokens et viewers existants ; aucune seconde galerie générique sans besoin partagé réel.

Optimiser chargement lazy des images hors écran, priorité correcte des visuels critiques et placeholders seulement si source fiable (miniature ou blurDataURL). Un pipeline BlurHash n'est ajouté que s'il existe une génération/stockage maintenable et un bénéfice mesuré. Harmoniser tabular numbers pour valeurs qui changent, balanced headlines pour titres longs lisibles et continuous corners seulement via tokens communs appropriés. Ajouter des transitions de vue seulement lorsque la continuité entre deux états observés s'améliore, avec fallback statique. Rendre les viewers photos pilotables au clavier, avec focus restitué, alternatives tactiles, crédits et descriptions préservés.

Ajouter tests nombreux d'images manquantes/erreur/chargement, ordre de priorité, galerie 0/1/N, clavier et focus, densités, responsive, motion réduit/sobre, absence de CLS et visibilité sans animation. Mesurer coût image/JS et couverture des viewers/controllers touchés, actualiser TYPOGRAPHY_SYSTEM.md, MOTION_TRANSITIONS.md et docs/fiches des surfaces concernées, sans matrice.

STOP : médias et valeurs lisibles/accessibles, aucun pipeline inutile, animations facultatives sans régression. Publier selon AGENTS.md.
```

### Macro-lot 11 : ergonomie mobile native et reprise sans réseau

```text
Consolider #10, #12, #14, #45 dans `apps/mobile` : shell V1, écrans mission/GPS, finalisation, sous-vues Agir, fiches détaillées et panneaux de carte. Le mobile possède déjà une bottom navigation native `Agir / Carte / Compte` et des SafeAreaViews : ne pas reproduire le ruban web ni créer de seconde navigation.

Garantir safe areas sur tous panneaux fixes nécessaires et zones interactives adaptées au tactile. Étudier swipe-to-dismiss seulement pour vraies sheets tactiles, en maintenant bouton Fermer, scroll, focus et états brouillon. Ne gérer le retour prédictif que si une API native supportée et un flux de navigation réel le rendent sûr ; sinon préserver un retour standard cohérent. Fiabiliser reprise GPS/finalisation après déconnexion, statut local vs synchronisé, buffers owner-scoped par identité Clerk et idempotence des retries ; jamais un succès avant accusé serveur ni des données d'un autre compte.

Ajouter masse de tests mobile hooks/écrans/services : zones sûres et clavier, geste annulé/complété, Android retour, permissions GPS refusées/révokées, offline, relance, remount, session expirée/changée, points rejoués, doublons, conflit, finalisation et erreurs API. Mesurer couverture mobile avant/après, exécuter typecheck/test/coverage/contrôles sécurité et vérification sur simulateur/appareil quand accessible ; ne pas déclarer test natif réel sans l'avoir fait. Mettre à jour documentation mobile, GPS et parcours concernés, pas la matrice.

STOP : V1 stable, état sync honnête, aucune fuite de données ni double finalisation, preuves natives et limites identifiées. Publier selon AGENTS.md.
```

### Macro-lot 12 : clôture transversale et mise à jour de la matrice

```text
Clore le plan UI/UX après publication des lots 01 à 11. Relire intégralement le `main` publié, le plan et la V2 fournie de `MATRICE_ASTUCES_UI_UX_CLEANMYMAP.md`. C'est le seul lot autorisé à créer ou modifier `documentation/design-system/MATRICE_ASTUCES_UI_UX_CLEANMYMAP.md`.

Pour les 48 IDs, confronter la recommandation d'extension, les contre-indications, les consommations réelles et les preuves finales. Actualiser « Où utilisé », « Où l'étendre éventuellement », « Où ne pas implémenter », statuts, priorités, date et SHA ; distinguer IMPLEMENTED_AND_TESTED, EXISTING_VERIFIED, NOT_APPLICABLE, PARTIEL et BLOCKED avec liens vers owners/documents canoniques. Ne pas requalifier une amélioration abandonnée comme livrée, ni effacer les éléments d'origine sans raison.

Vérifier l'absence de duplication entre nouvelles primitives et anciennes, les routes/fiches CURRENT, accès public/privé, modes d'affichage et comportements desktop/mobile. Rejouer les contrôles transverses pertinents et les suites de régression/couverture par domaine ; produire un bilan comparatif par périmètre avec `covered/total`, méthode, SHA, tests et limites. Ne pas contourner un échec, ni inventer des validations PostgreSQL/natives/production. Mettre à jour seulement les documents canoniques devenus incohérents et les références du README documentaire si la matrice est nouvelle.

STOP : 48 IDs rapprochés de l'état publié avec preuves, contre-indications cohérentes, intégrité documentaire et statut de chaque opportunité explicite ; ce lot n'ajoute aucune nouvelle fonctionnalité. Publier selon AGENTS.md.
```

## Contrôle de sortie pour chaque macro-lot

- `IDS`: propositions couvertes + preuve `IMPLEMENTED_AND_TESTED`, `EXISTING_VERIFIED`, `NOT_APPLICABLE` ou `BLOCKED`.
- `OWNERS`: propriétaires modifiés, consommateurs et appels pris en compte, duplications évitées.
- `TESTS`: nouveaux scénarios importants, nombre et catégories, commandes effectivement exécutées, distinction `STATIC_CONTRACT` / `EXECUTED_BEHAVIOR` / `INTEGRATION_PROOF`.
- `COVERAGE`: fichiers/familles mesurés, `covered/total` sur statements/branches/functions/lines avant/après à périmètre identique ; sinon `NOT_MEASURED` motivé.
- `DOCS`: contrats et fiches `CURRENT` mis à jour ; confirmation explicite **« matrice non modifiée »** pour 01 à 11.
- `FINAL`: incidents, échecs, limites, SHA publié, convergence et verdict `TERMINÉ` / `PARTIEL` / `BLOQUÉ`.

Ce plan **n'autorise pas** à déclarer tous les points implémentés si certains étaient seulement possibles « éventuellement ». Le résultat attendu est la couverture exhaustive des **décisions documentées**, et la réalisation prouvée des améliorations réellement pertinentes et sûres.
