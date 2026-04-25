# Latest Session

Updated: 2026-04-25
Status: CLOSED

## Done
- P0 of Part 4 of "Audit UI/UX & Design System.md" at the repo root. 
- refonte UX et UI de la rubrique explorer et du ruban 
- refonte ordre metier
- début d'ajustement de la densité mobile sur quelques rubriques
- résolution de plusieurs erreur de test et de build directement liés à des fichiers code, les autres plus complexe ont été skip
- alignement des nouveaux titre, slogan et mentra. Il manque l'ajout du logo et du pictogramme qui ne sont pas encore parfait
 - **Migration de "Déclarer une action"** : la rubrique de déclaration a été déplacée du bloc **Accueil** vers le bloc **Agir** dans le registre de navigation (`PARCOURS_SPACE_PAGE_MAP`) pour tous les profils, alignant la structure sur la réalité fonctionnelle du parcours utilisateur.
- **Fusion Météo & Kit Terrain** : unification des ressources préparatoires. La rubrique "Kit terrain" est désormais intégrée directement dans la page **Météo** via un système d'onglets fluides, simplifiant la navigation préparatoire avant sortie.
- **Navigation rapide Admin & Rapports** : implémentation de la logique de "sections cliquables" (`NavigationGrid`) en haut des pages Administration et Rapports pour un accès instantané aux sous-sections critiques (Gouvernance, Modération, Exports, Cockpit).
- **Plan d'amélioration Quizz** : rédaction du document stratégique `quizz-improvement-plan.md` définissant les nouveaux axes pédagogiques (énergies fossiles/renouvelables, fission/fusion nucléaire, civil/militaire, limites planétaires et ODD).
- **Correction visuelle de la Carte** : la légende dynamique d'impact a été déplacée **en dessous** du canevas cartographique dans tous les modes (immersif et par défaut) pour garantir sa visibilité totale et éviter les chevauchements avec les contrôles Leaflet sur mobile.
- **Finalisation du Plan Déclarer** : exécution totale des dernières parties du plan d'amélioration (persistance `localStorage`, boucle de rétention enrichie avec badges et CTA, validation des tests unitaires de payload) et suppression du fichier de suivi `planDeclarer.prompt.md`.
- **Refonte totale de la Homepage** : la page d'accueil a été intégralement restructurée pour un rendu haute-fidélité, professionnel et impactant. Le résultat final est extrêmement satisfaisant sur tous les supports.
- **Hero & Impact visuel optimisés** : passage sur un layout élargi (`max-w-7xl`), typographie fluide (`clamp`) pour le titre évitant tout overflow, et hiérarchie des CTA clarifiée avec des boutons primaires massifs et engageants.
- **Section KPI restructurée** : transition fluidifiée avec le hero, cartes d'impact mieux proportionnées avec des arrondis généreux (`rounded-[2.5rem]`) et lisibilité accrue des métriques.
- **Alignement et centrage des sections** : les sections `Sept Piliers` et `Pourquoi utiliser CleanMyMap ?` utilisent désormais des conteneurs centrés et un layout flexible (flexbox) qui garantit l'équilibre visuel des éléments orphelins (7ème pilier parfaitement centré).
- **Crédibilité et Terrain sublimés** : section `Origine` refondue avec une typographie plus aérée, des cartes d'étapes modernisées et un équilibre tonal renforcé entre le vert émeraude et le sombre.
- **Footer professionnel et équilibré** : footer compacté mais mieux espacé, blocs de contact plus visibles et transition douce avec les sections supérieures via des gradients affinés.
- **Correction technique Next.js** : résolution des erreurs runtime d'event handlers dans les Server Components (not-found.tsx) et suppression des warnings de console sur les composants `Image` (ajout des props `sizes` manquantes).
- **Validation QA Homepage** : passage au peigne fin sur desktop, tablette, mobile et différents niveaux de zoom ; lint OK.
- **Carte immersive refondue** : la rubrique `Carte / Lecture cartographique` passe sur une carte dominante plein cadre avec panneaux secondaires flottants, ruban de légende compact et journal/insights relégués en rail latéral.
- **Chargement carte stabilisé** : le composant Leaflet est chargé côté client après montage, sans casser la page ni la navigation, avec fallback lisible pendant l'initialisation.
- **Validation navigateur confirmée** : la carte est bien rendue sur `http://localhost:3000/actions/map` en desktop et mobile, avec DOM Leaflet présent et layout responsive conservé.
- **Ruban de navigation refactorisé** : la navigation applicative est passée sur un ruban non sticky, plus épuré et plus lisible, avec logo image retiré du bandeau visible, blocs centraux sous forme de tabs et zone d'actions compactée à droite.
- **Hiérarchie de navigation clarifiée** : le menu principal limite désormais les blocs visibles à 4-5 éléments, en promouvant le bloc actif secondaire dans la rangée principale et en regroupant le reste dans `Autres`.
- **Lisibilité et confort améliorés** : les états actif/hover utilisent une accentuation plus nette, les icônes sont uniformisées sur le ruban, les espacements ont été renforcés et la ligne de contexte + rubriques du bloc actif ont été simplifiées.
- **Responsive compact confirmé** : la barre se replie proprement sur mobile avec tabs scrollables et actions réduites, sans casser la navigation existante.
- **Validation ciblée OK** : `typecheck` vert, tests ciblés de navigation verts (`app-navigation-ribbon.utils.test.ts`, `navigation.display-mode.test.ts`) et vérification navigateur sur `/actions/map` en desktop et mobile.
- **Statistiques d'impact restructurées** : la zone de chiffres de la homepage est maintenant regroupée par `Impact environnemental`, `Mobilisation` et `Impact économique`, avec chiffres plus dominants, labels plus discrets, bouton méthodologie mieux relié au bloc et rendu plus crédible pour la décision.
- **Homepage clarifiée et orientée conversion** : le hero affiche désormais `Dépolluer · Cartographier · Impacter`, une promesse plus directe, des CTA hiérarchisés et un bloc statistiques plus visible, avec palette bleu/vert plus riche et moins de surcharge visuelle.
- **Palette accueil renforcée** : le hero, les CTA, la carte de stats et l'icône condensée ont été réaccordés sur des bleus et verts plus riches pour un rendu plus moderne et plus vivant.
- **Accueil limité au changement de langue** : le hero de la page d'accueil ne conserve plus que le bouton de langue, intégré dans l'en-tête du hero, sans les autres contrôles de préférences.
- **Logo central clarifié** : le hero garde uniquement le mot-symbole `CleanMyMap` au centre, avec le pictogramme condensé déplaced à droite comme marque réutilisable séparée via `CondensedMark`, et le sous-titre `Dépolluer · Cartographier · Impacter` sous le logo.
- **Sous-titre de marque rétabli** : la formule `Dépolluer · Cartographier · Impacter` est désormais affichée sous l'accroche `CleanMyMap` dans le hero de la page d'accueil, sans réintroduire les anciens logos image.
- **Hero d'accueil épuré** : la mention `Cleaner Maps, Better Communities` et les éléments logo du haut de la page d'accueil ont été retirés, laissant le titre, le sous-titre et les CTA dans une composition plus nette.
- **Section d'accueil enrichie** : le bloc `Comment ça marche ?` couvre désormais de façon plus exhaustive les fonctionnalités du site avec `Carte commune`, `Bloc apprendre`, `Chemins IA`, `Partenaires`, `Formulaire`, `Espace discussion` et un rappel du parcours global, en plus des trois cas d'usage initiaux.
- **Accueil allégé et CTA méthodologie repositionné** : la mention `Agrégat réel des 12 derniers mois` a été supprimée et le bouton `Voir méthodologie` a été incrusté au centre du bord inférieur du bloc d'indicateurs, en dessous de `Eau préservée`, avec validation desktop et mobile.
- **Blocage de resync levé** : la migration `20260424_000017_persist_derived_geometry.sql` a été appliquée sur la base liée, puis la synchro Google Sheet réelle a été relancée avec succès ; les 5 actions importées portent bien `derived_geometry_kind` et `geometry_source`.
- **Source de vérité ingestion corrigée** : l'import Google Sheet dérive désormais la géométrie dès la génération du payload, et le formulaire de création force la construction d'une géométrie exploitable avant sauvegarde finale dès que les données minimales sont présentes, pour éviter que le runtime ne la découvre trop tard.
- **Badge de rôle interactif** : le badge d'identité permet maintenant de changer de rôle au clic ou au survol, avec mutation serveur réutilisée et garde-fou contre les appels en rafale.
- **Champs métier mieux exploités** : `placeType`, `routeStyle`, `routeAdjustmentMessage`, `durationMinutes` et `volunteersCount` sont maintenant réutilisés dans la popup carte, l'historique, les exports reporting/cockpit et les méthodes KPI de pilotage.
- **Dégradation OSRM sécurisée sur les routes** : quand le routage OSRM échoue, la géométrie reste un tracé exploitable au lieu de tomber au point brut ; le fallback retourne désormais une ligne directe entre départ et arrivée en profil `direct`, ou une polyline interpolée en profil `souple`, avec test ciblé validé.
- **File de rattrapage géométrique branchée** : `resolveBestGeometry()` est centralisé, `geometrySource` et `geometryConfidence` sont persistés, les synchros/backfills n'utilisent plus le point brut avant épuisement des fallback, et le job de rattrapage est raccordé aux écritures historiques.
- **Backfill historique exécuté** : la migration `20260424_000018_persist_geometry_source.sql` a été appliquée sur le projet lié, puis le job `data:geometry:backfill` a recalculé 5 actions réelles vers des `polyline` avec source `routed`; contrôle base confirmé ensuite.
- **Migration géométrie dérivée appliquée avant resync** : le schéma distant a reçu `20260424_000017_persist_derived_geometry.sql` via exécution SQL ciblée sur le projet Supabase lié, puis la synchro Google Sheet a été relancée avec succès.
- **Contrôle base validé sur les 5 actions réelles** : vérification en base des valeurs `cigarette_butts` attendues sur les actions importées (`3750`, `750`, `6250`, `1875`, `1250`) avec `0` spot resynchronisé.
- **Supabase - passe nettoyage test** : audit et suppression ciblee executes sur `actions` et `spots` (marqueurs seed/demo/test explicites), aucun enregistrement test detecte/supprime en base a cette date.
- **Base runtime verrouillée sur Google Sheet** : suppression des dernières actions `legacy_import`, backup JSON avant purge et vérification finale que les actions restantes proviennent uniquement de `system:google_sheet_sync` avec marqueur `[google-sheet-sync]`.
- **Base resynchronisée sur les 5 seules actions réelles** : correction du typo source `06/03/20026` -> `06/03/2026`, snapshots locaux réalignés (`google-sheet-admin-import.json`, `google-sheet-form-like.csv`, `real_records.json`), purge des anciennes actions Google Sheet puis resync Supabase finalisée à `5` actions datées `2026-02-14`, `2026-03-06`, `2026-03-21`, `2026-04-11`, `2026-04-22` et `0` lieu propre / `0` spot.
- **Synchro Google Sheet - conversion mégots** : la synchro Supabase convertit désormais `megotsKg` en `cigarette_butts` quand aucun volume explicite n'est fourni, via la règle métier centralisée (`2500` mégots/kg ajustés par qualité), ce qui évite d'importer `0` malgré des kilogrammes renseignés.
- **Purge des actions de test (runtime repo)** : suppression du dataset `apps/web/data/local-db/test_records.json`, retrait du store `test` du loader local et filtrage défensif des contrats "test-like" dans la source unifiée pour éviter tout affichage parasite à côté des données Google Sheet.
- **PostHog vérifié de bout en bout** : correction de la lecture des variables côté client (`process.env.NEXT_PUBLIC_*`), initialisation stable du provider, déploiement Vercel production relancé, interaction navigateur automatisée sur `https://cleanmymap.fr` et envoi d'un event de validation `cmm_posthog_installation_check` vers l'instance EU.
- **PostHog stabilisé (local + Vercel)** : suppression des doublons serveur, configuration unifiée clé/hôte/région, compatibilité temporaire `NEXT_PUBLIC_POSTHOG_TOKEN` (déprécié), check `/api/services` aligné, test dédié de capture d'event serveur ajouté et validé.








  57 - - **Priorité 1 - fiabilité du socle et sécurité**
       58 -   - **Vérification complète exécutée** : `typecheck`, `test:regression-gates`, `test` complet et `build` production relancés avec succès après corrections.
       59 -   - **Régressions de tests corrigées** : alignement des routes protégées, libellés KPI communautaires, garde accents FR et test `POST /api/actions` rendu déterministe (sans dépendance réseau).
       60 -   - **Auth fallback build-safe** : suppression du bruit `DYNAMIC_SERVER_USAGE` dans le fallback auth pour éviter les faux positifs en build.
       61 -   - **Supabase fallback fail-fast** : suppression des clients placeholder silencieux au profit d'un fallback explicite qui échoue immédiatement avec message clair.
       62 -   - **Sentry vérifié côté code** : chaînage client / serveur / edge confirmé, activation conditionnelle au DSN et build plugin piloté par `SENTRY_BUILD_PLUGIN`.
       63 -   - **Supervision services web enrichie** : `GET /api/services` étendu avec un registre central `src/lib/services/registry.ts`, métadonnées de service (`label`, `description`, `category`) et affichage amélioré dans `SystemStatusPanel`.
       64 -   - **SheetJS corrigé** : remplacement de `xlsx` par la tarball corrigée `0.20.3` via dépendance directe et `overrides`.
       65 -   - **Export Excel rendu build-safe** : le bouton d'export rubrique bascule sur un CSV compatible Excel pour supprimer la dépendance `xlsx` côté build Vercel.
       66 -   - **CI/CD Fixes** : correction des erreurs GitHub Actions, des soucis TypeScript, de la migration middleware/proxy et des vulnérabilités npm.
       67 -   - **Purge Vercel étendue** : suppression du dernier preview non-production encore présent.
       68 -   - **Nettoyage historique Vercel** : suppression de 22 déploiements `ERROR`.
       69 -   - **Nettoyage historique GitHub Actions** : suppression de tous les runs en échec visibles via l'API.
       70 -   - **Mode d'affichage persistant** : lecture serveur depuis Clerk et persistance via `/api/account/display-mode`.
       71 -   - **Mutation de rôle Clerk verrouillée** : mutation serveur limitée aux profils self-service, synchro Supabase et refus des rôles admin/elu.
       72 -   - **Blocages harmonisés** : formulation commune des écrans de connexion, floutés ou désactivés.
       73 -   - **Clôture de la matrice d'accès Clerk** : harmonisation des états de blocage et garde générique renforcé.
       74 -   - **Matrice d'accès Clerk appliquée** : classification page par page en visible, désactivé ou flou + accès Clerk requis.
       55
      
       76 - - **Priorité 2 - navigation et premier écran**
       77 -   - **Ruban app unifié pleine largeur** : refonte du header applicatif en ruban global plein écran.
       78 -   - **Navigation plus claire** : breadcrumb plus explicite et bouton `Explorer` vers le plan du site.
       79 -   - **Bandeau compact** : titre du site harmonisé en `Dépolluer · Cartographier · Impacter`.
       80 -   - **Navigation mobile** : ruban fixe du bas pour blocs et rubriques du bloc actif.
       81 -   - **Ruban mobile compacté** : réduction des hauteurs et paddings pour petits écrans.
       82 -   - **Ruban masqué par défaut** : ouverture uniquement au survol du haut de page sur desktop, avec bouton explicite d'affichage/masquage sur mobile.
       83 -   - **Navigation plus lisible sur desktop** : emoji par défaut, nom du bloc au survol ou sur le bloc actif.
       84 -   - **Zoom desktop réduit** : taille globale abaissée d'environ 10% sur ordinateur via la base typographique.
       85 -   - **Accueil public et navigation ouverte** : page d'accueil centrée sur l'accès libre, avec compte seulement quand nécessaire.
       86 -   - **Accueil - hero mobile compact** : hero raccourci sur petits écrans.
       87 -   - **Accueil - simplification du hero** : suppression du formulaire bénévole et du header global sur `/`, avec contrôles de langue, thème et mode d'affichage intégrés directement dans la page.
       88 -   - **Accueil - identité visuelle renforcée** : logo officiel injecté dans le hero avec variantes clair/sombre, fond coloré bleu/vert, sous-titre restauré et mini-blocs d'identité autour du logo.
       89 -   - **Accueil - CTA clarifiés** : les boutons du hero ont été recentrés sur `Se connecter`, `Consulter la carte`, `Déclarer une action` et `Générer un rapport d'impact`.
       90 -   - **Carte publique depuis l'accueil** : `/actions/map` et `/api/actions/map` sont accessibles sans connexion, avec gestion non bloquante des visiteurs non authentifiés.
       91 -   - **Ruban et layouts desktop élargis** : suppression des wrappers trop étroits (`max-w-7xl` et variantes locales) pour rendre l'app réellement pleine largeur sur desktop tout en conservant le responsive mobile/tablette.
       92 -
       93 - - **Priorité 3 - déclaration, carte et parcours**
       94 -   - **Carte / Lecture cartographique** : la rubrique devient la surface principale avec une vue immersive, des overlays flottants secondaires et une lecture géographique prioritaire.
       95 -   - **Déclarer - parcours simplifié** : progression en 3 étapes explicites (`1. Localiser / 2. Tracer / 3. Valider`) avec assistance intelligente (Smart Assist) et tracé automatique.
       96 -   - **Déclarer - fiabilité et impact** : ajout de "Détails pour l'équipe" (notes de parcours) et renforcement de la section Mégots avec calcul d'impact direct (💧 litres d'eau préservés).
       97 -   - **Déclarer - rétention et feedback** : nouveau "Retention Loop" après soumission avec badge, résumé d'impact et suggestions d'actions suivantes (Historique/Carte).
       98 -   - **Déclarer - expérience mobile** : formulaire réordonné mobile-first, bloc poids central et photos optionnelles.
       99 -   - **Déclarer - base + lieu/tracé** : bloc `Lieu / tracé` unifié dans le formulaire principal et largeur remise en flux plein écran.
      100 -   - **Formulaire bénévole** : saisie `départ` / `arrivée` avec route dérivée.
      101 -   - **Cas d'apprentissage clarifié** : photos limitées aux sacs collectés et masse utilisée comme label d'entraînement.
      102 -   - **Vision de terrain** : variables intermédiaires éditables et préremplissage du poids quand le signal est suffisant.
      103 -   - **Boucle d'apprentissage** : `training_examples`, persistance best-effort et métriques de dataset.
      104 -   - **Aperçu trajet live** : tracé calculé dès la saisie et message d'ajustement transmis à l'action.
      105 -   - **Vision sans auto-remplissage** : valeurs conseillées affichées sans remplissage automatique.
      106 -   - **Précisions d'entraînement simplifiées** : masse, sacs, remplissage et densité seulement.
      107 -   - **Photos facultatives** : soumission possible sans photo.
      108 -   - **Écart suspect** : signal visuel sans blocage.
      109 -   - **Tracé auto** : géométrie automatique depuis départ/arrivée ou fallback zone.
      110 -   - **Sandbox de visualisation** : rubrique dédiée du bloc `Visualiser`.
      111 -   - **Carte interactive - bilan d'action enrichi** : les popups affichent désormais le récapitulatif complet de l'action (lieu, date, type, statut, source, déchets, mégots, bénévoles, durée, association, parcours, qualité, impact, notes) et pas seulement le score de pollution.
      112 -   - **Carte interactive - rendu géométrique prioritaire** : la carte exploite désormais la géométrie normalisée (`contract.geometry`) avant tout fallback legacy, affiche le point uniquement si aucun tracé/polygone exploitable n'existe, et conserve le popup complet directement sur la forme rendue.
      113 -   - **Carte interactive - besoins d'infrastructure visibles** : ajout d'emoji de recommandation directement sur la carte avec seuil métier à 75% par composante normalisée (`🗑️` pour déchets, `🚬` pour mégots, `💰` si les deux dépassent le seuil), plus explicitation complète dans la légende.
      114 -   - **Journal des actions progressif** : le tableau est désormais masqué par défaut, s'ouvre via `Afficher des actions`, charge les 4 actions les plus récentes, puis s'étend par paquets de 4 avec `Afficher plus`.
      115 -   - **Géométrie dérivée persistée** : ajout des champs `derived_geometry_kind`, `derived_geometry_geojson` et `geometry_confidence` dans le schéma Supabase, calcul centralisé côté runtime/import, lecture unifiée dans les contrats, et alignement des exports/analytics pour éviter toute divergence entre carte, rapports et KPI.
      116 -   - **Fallback géométrique sans point brut** : si `départ + arrivée` existent, une `polyline` synthétique est désormais générée au minimum ; si un lieu unique précis existe, un petit `polygon` local est dérivé ; si seules les coordonnées existent, une zone d'intervention elliptique est produite ; le `point` n'est conservé qu'en dernier recours quand aucune géométrie exploitable ne peut être reconstruite.
      117 -   - **Backfill historique prêt** : ajout d'un script dédié `data:geometry:backfill` pour recalculer `derived_geometry_kind`, `derived_geometry_geojson`, `geometry_confidence` et `geometry_source` sur les lignes déjà en base, avec `dry-run` par défaut, option `--recompute-all`, et arrêt explicite tant que les migrations `20260424_000017_persist_derived_geometry.sql` et `20260424_000018_persist_geometry_source.sql` ne sont pas appliquées sur Supabase.
      118 -
      119 - - **Priorité 4 - rapports, méthode et pilotage**
      120 -   - **Next exécuté - QA visuelle ruban mobile (320/375/390)** : captures headless et validation du premier écran sur les 3 largeurs.
      121 -   - **Next exécuté - export PDF A4 court/long** : exports contrôlés avec pagination lisible.
      122 -   - **Next exécuté - quantification `created_by_clerk_id`** : métrique de couverture publiée avec cas `n/a` géré.
      123 -   - **Risks - pagination PDF sécurisée** : classes print dédiées pour les blocs denses.
      124 -   - **Risks - périmètre compte mesuré** : couverture `created_by_clerk_id` exposée dans le modèle et l'UI.
      125 -   - **Risks - portail sponsors contextualisé** : fenêtre d'observation et comparabilité temporelle explicites.
      126 -   - **Dashboard Admin - vues gouvernance reliées aux états métier** : compteurs `pending / accepted / rejected` et journal des opérations.
      127 -   - **Mode Science - formules exposées en tooltips** : formules, sources, fréquence et limites visibles sur les KPI.
      128 -   - **Rapport d'impact PDF renforcé** : couverture institutionnelle et narration budgétaire.
      129 -   - **Exports livrables par périmètre** : scopes `global`, `compte`, `association`, `arrondissement`.
      130 -   - **Rubriques bilingues** : `DecisionPageHeader` et `PageReadingTemplate` gèrent l'anglais.
      131 -
      132 - - **Priorité 5 - réseau, annuaire et collaboration**
      133 -   - **Godmode admin nettoyé** : suppression des lignes utilisateurs factices (`example.com`) et remplacement des boutons non branchés par des accès opérationnels réels (`/admin`, `/reports`, `/api/health`).
      134 -   - **Académie du Climat - ateliers structurés** : espace dédié classé par type et relié aux sources officielles.
      135 -   - **Académie du Climat - social renforcé** : ajouts ciblés sur la catégorie `social`.
      136 -   - **Annuaire partenaires - tests de contenu et crédibilité locale** : liens placeholders interdits, partenaires engagés exigés.
      137 -   - **Annuaire partenaires - UX resserrée** : moins d'actions, moins de redondance.
      138 -   - **Annuaire partenaires - crédibilité renforcée** : canaux, zones et fraîcheur minimale vérifiés.
      139 -   - **Sync réel carte aligné** : import structuré et store local compatibles carte.
      140 -   - **Onboarding partenaire structuré** : `coverage` et `availability` normalisés.
      141 -   - **Réseau séparé en 3 usages** : découverte, pilotage et onboarding isolés.
      142 -   - **Import Google Sheet - nouvelle structure** : colonnes `Départ / Arrivée / Type de Lieu / Qualité Mégots`.
      143 -   - **Onboarding partenaire → fiche publiée** : fiche "à revalider" publiée via store dédié.
      144 -   - **Annuaire partenaires - fiche Green Flex** : remplacement du lien placeholder.
      145 -   - **Annuaire partenaires** : ajout de Klin d'oeil dans les partenaires engagés.
      146 -   - **Annuaire partenaires** : ajout du DU Engagement de Sorbonne Université comme partenaire institutionnel et point de référence pédagogique.
      147 -   - **Annuaire partenaires - second balayage** : suppression du faux canal public Facebook.
      148 -   - **Annuaire partenaires - revue admin** : cycle `pending_admin_review / accepted / rejected`.
      149 -   - **Partenaires - séparation vitrine / décision** : `network` pour la découverte, `dashboard` pour la supervision.
      150 -   - **Bloc Piloter** : fallback visuel pour éviter un bloc vide.
      151 -   - **Parcours Mobilisation + chat - nominal / dégradé / vide** : `ChatShell` durci avec états explicites et tests.
      152 -   - **Notifications In-App** : `NotificationBell` et suppression des emails automatiques.
      153 -   - **Retour Haptique** : vibrations standards et succès majeurs.
      154 -   - **Gamification** : détection de `Level Up` et notifications d'engagement.
      155 -   - **Profils** : synchronisation des `@handle` Clerk vers Supabase.
      156 -
      157 - - **Priorité 6 - documentation et audit produit**
      158 -   - **Audit rubriques bénévoles** : vérification de la visibilité des sections `guide`, `kit`, `route`, `trash-spotter`, `messagerie` dans le ruban de navigation et confirmation de leur accessibilité via les routes `/sections/[sectionId]`.
      159 -   - **Audit utilité-impact rubriques** : comparaison du fichier `documentation/product/rubriques_utilite_impact_.txt` avec l'état actuel du site, identification des fonctionnalités manquantes (heatmap/radar visuel) et mise à jour de la documentation pour refléter les changements récents.
      160 -   - **Infobulles rubriques ruban** : ajout d'infobulles explicatives sur chaque rubrique du ruban de navigation justifiant leur utilité et impact pour les utilisateurs, avec séparation maintenue entre `sandbox` et `carte`, ainsi que pour les trois autres rubriques distinctes.
      161 -   - **Mise à jour résumé rubriques** : restructuration du fichier `documentation/product/rubriques_utilite_impact_.txt` par blocs et rubriques selon l'état actuel du dépôt, ajout de la page d'accueil et précisions sur la visibilité par rôle (ex: `Météo` réservée aux profils `coordinateur`, `scientifique`, `elu`, `admin`).
      162 -   - **Complétion infobulles navigation** : ajout d'infobulles descriptives pour les blocs de navigation (indiquant le nombre de rubriques par bloc) et amélioration des infobulles rubriques avec label + description, validation sans erreurs TypeScript.
      163 -   - **Inventaire produit priorisé** : ajout en tête de `documentation/product/rubriques_utilite_impact_.txt` de la liste des rubriques et pages disponibles, classées par importance.
      164 -








## In Progress
- Intégration API Cleanwalk.org (Message type envoyé, en attente de réponse).

## Next
- Stabiliser ou isoler le test global `src/app/api/actions/route.submit.test.ts` qui timeout encore dans le run complet, sans lien avec le ruban.
- Migrer définitivement les environnements restants vers `NEXT_PUBLIC_POSTHOG_KEY` (retirer `NEXT_PUBLIC_POSTHOG_TOKEN` après validation Preview + Production).
- Validation des infobulles en production : tester l'affichage des tooltips sur différents navigateurs et appareils pour confirmer l'accessibilité et la lisibilité.
- Audit UX des infobulles : recueillir feedback utilisateur sur la pertinence et la clarté des descriptions d'utilité/impact.
- Extension des infobulles : envisager l'ajout d'infobulles sur d'autres éléments de navigation ou d'interface pour améliorer la découvrabilité globale.
- Vérifier visuellement en production la nouvelle hiérarchie du hero d'accueil (logo officiel, contraste clair/sombre, placement des contrôles et CTA) avant nouvelle itération branding.

## Risks
- **Historique Supabase à réconcilier** : `supabase db push` a bloqué sur un conflit de `schema_migrations` lié aux migrations datées `20260420`; la migration `20260424_000017_persist_derived_geometry.sql` a bien été appliquée manuellement et la synchro a réussi, mais un push automatique ultérieur peut nécessiter une réparation d'historique.
- **Migration PostHog incomplète** : si certains environnements utilisent encore `NEXT_PUBLIC_POSTHOG_TOKEN`, l'intégration reste fonctionnelle mais en mode compatibilité déprécié (à retirer après bascule complète).
- **Suite de tests globale encore fragile** : le run complet remonte encore un timeout non lié à cette passe dans `src/app/api/actions/route.submit.test.ts`; les tests ciblés du ruban sont verts, mais la suite complète n'est pas totalement saine.
- **Dette lint historique** : `npm run lint` global reste en échec avec des erreurs antérieures hors périmètre de cette passe (principalement `react/no-unescaped-entities`, `no-explicit-any` et règles hooks). Runtime, tests et build sont verts, mais la conformité lint complète nécessite une passe dédiée.
- **Hero d'accueil encore itératif** : la structure est stabilisée, mais l'habillage final (fond logo, micro-blocs latéraux, placement exact des contrôles) reste un point sensible à valider visuellement sur desktop clair/sombre avant gel.
