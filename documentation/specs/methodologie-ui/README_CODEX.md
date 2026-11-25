# Méthodologie Web : onglets et fondations documentaires

Statut : PLAN / CANDIDATE. Non intégré au runtime, non validé en navigateur.
Base factuelle inspectée : 2e6bc65150a34dea2a82b4e9aac9c05d069ad1e5. Candidats publiés sur la tête 4a7dd928abc5d2bfe4d8d9e54461a704578a2475 (deux commits documentaires concurrents sans modification des chemins cibles). Ne pas imposer de checkout historique.

## Objectif et décisions

Refondre /methodologie, sans changer ses sources de données, son ISR 86400 s, ses calculs, la navigation globale ni les autorisations. Retenir les cinq familles actuelles de getNavigationSpacesForProfile(profile, "exhaustif", locale) plutôt que créer des catégories redondantes. Conserver l'ordre et les routes propres au profil actif, avec fallback anonyme bénévole. Cartographie & Impact par défaut car la page explique d'abord les calculs d'impact. Une seule famille visible à la fois, état des accordéons conservé lors des changements d'onglet. Réutiliser CmmDisclosure, CmmButton, classes canoniques d'onglets et PageHeader famille. Supprimer l'ancien halo local redondant au profit du canvas global et d'une surface sobre.

Les quatre commandes persistent au bas de l'onglet (sticky, zone mobile 2 × 2, safe-area). Tout ouvrir/fermer agit uniquement sur les accordéons de rubriques du bloc actif, pas sur les divulgations scientifiques internes. Aller en haut revient à la barre d'onglets ; aller en bas vise la fin du contenu actif, sans défiler jusqu'au footer. Les commandes sont localisées FR/EN et le compteur d'ouvertures indique leur périmètre. Les onglets utilisent tablist/tab/tabpanel, flèches gauche/droite, Home/End et focus roving. Les sections restent présentes dans le HTML pour les ancres et ne sont pas dupliquées ; vérifier les graphiques et composants existants après sortie de hidden. Ne pas introduire de nouvelles lectures réseau.

Les liens profonds historiques (#methodologie-carte-actions, #methodologie-itineraire, #indicateurs-impact-terrain, #modes-affichage, #methodologie-collecte, #impact-history et autres ancres réellement présentes) choisissent automatiquement le bloc et ouvrent le disclosure cible. Vérifier chargement direct et navigation interne, changement de hash et historique navigateur. L'empreinte IA interactive était rendue deux fois par LegacyMethodologieContent : la conserver uniquement dans le contenu transversal, sans perdre le bloc technique des Rapports.

## Fondations

Ajouter le fichier candidat complet à son chemin cible :
candidates/apps/web/src/components/sections/rubriques/methodologie-route-foundations.tsx → apps/web/src/components/sections/rubriques/methodologie-route-foundations.tsx.
Il couvre les 12 rubriques vides du profil bénévole, les trois rubriques supplémentaires possibles (pilotage, sponsor, administration) et enrichit Créer une action au-delà de l'itinéraire. Les 16 entrées distinguent données, méthode de lecture et limites, en FR/EN, et pointent vers la fiche canonique réelle. Les quatre rubriques qui avaient du contenu riche le conservent. Aucune duplication des facteurs, formules, sources privées, ni nouveau calcul. Une future route non documentée reçoit un état explicite, pas un texte prétendant à une méthode prouvée. Les sources sont les fiches de routes CURRENT et les contrats runtime déjà identifiés : navigation, action, signalement, gamification, données publiques, rapports, etc. Les bases sont pédagogiques et non des certifications. Aucun nouveau statut d'accès.

## Intégration

1. Copier le nouveau fichier candidat au chemin exact s'il n'existe pas ou intégrer ses deltas compatibles s'il a évolué.
2. Appliquer/adapter 01-methodologie.patch (composition, navigation, styles, déduplication IA).
3. Appliquer/adapter 02-tests-et-contrats.patch (tests de page, scénario E2E, fiche canonique).
4. Vérifier git apply --check et les consommateurs actuels. Préserver les travaux concurrents ; aucun refactoring général de navigation, UI ou moteur scientifique. Pas de FULL ou déploiement implicite.

## Validations restantes et STOP CONDITION

- Exécuter les tests de methodologie-page-client et page.test, lint/typecheck ciblés selon gouvernance, puis le scénario Playwright public de méthodologie. Adapter uniquement les défauts prouvés du candidat. Vérifier les chemins GitHub sources et la cohérence FR/EN.
- En navigateur : les cinq onglets, les profils bénévole et autorisés, anonyme et connecté, accordéons fermés initialement, ouverture/fermeture groupée limitée au bloc courant, conservation de l'état au changement de bloc, navigation clavier et focus, ancres directes et internes, absence de doublons d'id, rendu des graphiques après ouverture, aucune perte de calcul ou source.
- À 390, 768, 1280 et 1920 px, dans les trois modes d'affichage : barre persistante réellement accessible pendant tout le contenu d'un onglet long, sans recouvrir les éléments focusables, le footer ou la bannière cookie ; haut/bas atteignent effectivement la cible. Vérifier dimensions, contrastes, overflow et comportement des ancres malgré le header fixe. Si sticky bloqué par une surface parente, corriger localement sans modifier le shell global.
- Publier les changements runtime et documentaires attribués au lot après validation, selon MAIN-ONLY / MULTI-WRITER COORDONNÉ. Relire le SHA publié. Transférer les invariants durables à la fiche existante et retirer les candidats temporaires devenus inutiles.

STOP CONDITION : cinq onglets issus de la navigation, tous les accordéons actuels documentés, quatre commandes accessibles et fonctionnelles, ancres et contenu scientifique préservés, validation ciblée et navigateur réussies, fiche CURRENT alignée, publication vérifiée. Ne pas prolonger par un audit des autres pages.

## Preuves préparatoires

Code et fiches inspectés au SHA de base. Reconstruction textuelle des diffs lors de leur création : PASS. Relecture des blobs et recherche ciblée de motifs de secrets : aucun motif détecté. Comparaison des deux commits concurrents : aucun chemin cible modifié. HOOK_NOT_AVAILABLE ; git apply réel, tests workspace, lint/typecheck, navigateur, CI : NOT_RUN ; couverture NOT_MEASURED. Aucun changement runtime validé ou déployé. La preuve navigateur est indispensable pour sticky et ancres.