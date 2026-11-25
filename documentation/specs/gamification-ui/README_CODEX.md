# Gamification Web : progression et récompenses

Statut : PLAN / CANDIDATE. Fichiers complets préparés à partir du main inspecté 709121f970d1beee386229339d5cb6a942f09788. Aucune intégration runtime, compilation, validation navigateur ou publication en production revendiquée. Ne pas imposer de checkout historique.

## Intention produit

La page /sections/gamification devient un centre de progression personnel, inspiré des jeux mobiles par ses panneaux de niveau, médaillons, états visuels, barres de progression et récompenses. Le registre métier, les permissions et les données restent inchangés. Aucune monnaie, quête, récompense, animation de gain ou métrique nouvelle ne doit simuler une réalisation.

## Composition

- En-tête court, panneau compact de niveau réel, niveau potentiel, XP validée/pending, prochain seuil, prérequis et objectif mensuel existant.
- Mes acquis : paliers acquis et jalons terminés. Une progression infinie peut avoir des paliers acquis tout en restant active. Impact personnel et parcours d'engagement distincts.
- En cours : progressions et jalons in_progress, valeurs et prochains seuils fournis par summary, barres uniquement quand la donnée existe.
- À débloquer : progressions et jalons not_started. Les nouveautés restent des marqueurs, jamais un état supplémentaire. Liens utiles vers Agir et Apprendre.
- Communauté : reconnaissance personnelle et annuelle, lien vers le classement public existant (pas de panneau monté, ni prefetch), Légendes territoriales, Brigade Verte. Respect des consentements et des scopes.
- Badges : album des paliers CURRENT acquis et prochain palier fourni, jalons XP et reconnaissance séparés, spécialisations terrain et collection SPOGOMI. Les médaillons sont une représentation visuelle, non de nouveaux badges. Ne pas afficher le catalogue global comme s'il était applicable au compte. Les collections ne changent ni badgeTotal ni XP.
- Historique et avis de réconciliation préservés, historique monté hors onglets pour ne pas réinitialiser les reçus ; liens profonds vers progression/jalon sélectionnent le bon onglet. La migration de règles reste visible et acquittable.
- Ne plus monter le héros abstrait, les explications générales répétées, le faux statut opérationnel hors ligne, le panneau statique de quiz et le panneau de préférences redondant. Les préférences restent accessibles via /reglages et les commandes globales. Préserver l'aperçu de célébration en divulgation secondaire.

Les onglets sont accessibles au clavier (tablist/tab/tabpanel, flèches, Home/End), avec montage du seul contenu actif. Les lectures spécifiques aux collections sont différées jusqu'à leur onglet. Les cartes restent en palette Impact, avec une densité responsive. Les critères détaillés et leurs CTA existants sont accessibles dans des accordéons. Les données inconnues ne deviennent pas des zéros. L'impact physique ne constitue jamais de l'XP.

## Intégration

Consulter BASE_FILES.json. Chaque fichier sous candidates/ porte son chemin cible complet. Copier les nouveaux fichiers ou intégrer les deltas des fichiers existants en tenant compte des modifications concurrentes. Les SHA de base servent de preuve d'inspection, jamais de checkout imposé. Aucun nouveau calculateur, endpoint, stockage, dépendance ou changement de contrat partagé Web/mobile.

Les trois fiches documentaires candidates sont à intégrer seulement avec les modifications runtime. Vérifier la cohérence des règles CURRENT sans changer le moteur métier.

## Validations indispensables

- Tests ciblés gamification-catalog-panel, gamification-tabs, gamification-section.integration, gamification-level-progress-panel, gamification-engagement, reconnaissance, terrain specializations, réconciliation, migration, SPOGOMI, Légendes territoriales et Brigade Verte selon les consommateurs effectivement touchés. Vérifier les cas de progression infinie déjà acquise et encore active, nouvel objectif, XP pending, jalons sans XP, absence de métrique et accès au feedback.
- Compiler/typecheck/lint et contrôles requis par la gouvernance. Vérifier également les assertions statiques de contrat qui référencent les anciens panneaux ou libellés ; ne pas affaiblir les invariants.
- Vérifier en navigateur connecté et anonyme les cinq onglets, les trois modes d'affichage, desktop/tablette/mobile (390, 768, 1280, 1920 px), le focus, clavier, contraste, réduction de mouvement, absence de débordement, fonctionnement des liens et des CTA.
- Tester des données réellement acquises, des comptes sans contribution, une progression bloquée, les erreurs API et les comptes autorisés/non autorisés à modérer. Ne pas inventer de données en production. Vérifier qu'aucune projection privée ne fuit et que les requêtes collectives ne partent pas avant l'ouverture de leur onglet.
- Vérifier les liens de réconciliation depuis les notifications, l'acquittement, le ciblage d'un reçu hors fenêtre, l'historique, les changements de hash et le passage entre onglets ; préserver l'état des reçus. Vérifier les collections spécialisées et leurs filtres. Les filtres locaux des panneaux montés à la demande peuvent se réinitialiser au changement d'onglet ; conserver si nécessaire selon le contrat de ces composants.
- Vérifier que l'album ne présente pas les paliers non atteints comme acquis et qu'un badge ou médaillon n'accorde aucune permission. Le niveau et l'XP doivent correspondre exactement à l'API. Ne pas modifier les règles de calcul ou les scopes.

STOP CONDITION : cinq onglets réellement fonctionnels, rendu compact et visuel sur les trois modes et mobile/desktop, toutes les données et capacités métier préservées, séparation XP/impact et reconnaissance, liens profonds et acquittements fonctionnels, tests et validations ciblés passés, documentation canonique alignée, commit publié sur main et relu. Ne pas lancer de refonte hors périmètre.

## Preuves disponibles

Lecture des composants réels, modèles de progression et contrats documentaires au SHA indiqué. Fichiers candidats préparés par ChatGPT, tests de rendu statique et sélection de catalogue écrits. HOOK_NOT_AVAILABLE ; application locale, tests, typecheck, lint, navigateur et CI NOT_RUN ; couverture NOT_MEASURED. La mise en page effective et les interactions ne sont pas prouvées.