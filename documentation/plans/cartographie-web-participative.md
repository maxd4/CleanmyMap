# Cartographie participative du site web

**Statut : PLAN / décision produit, non implémenté.**  
**Périmètre : WEB_ONLY.** Référence initiale : `64b4946667d4ce81d5d259ead55e4bdae465e1b1` (25 novembre 2026).

## 1. Objectif et décision

Offrir un inventaire navigable des pages, de leurs usages, de leur maturité, de leurs points d'entrée et de leurs onglets. Permettre aux utilisateurs de proposer une amélioration contextualisée et aux développeurs/agents de repérer les parcours incomplets, les doublons et les regroupements utiles. Cette surface décrit le produit ; elle ne devient ni un routeur ni une autorité d'autorisation.

Décision : étendre le Sommaire existant `/explorer` par un onglet **Cartographie du site**. Conserver son onglet par défaut **Rubriques** et les parcours actuels. Utiliser `/explorer?tab=cartographie` comme lien direct stable ; le paramètre absent ou inconnu rend Rubriques. Ne pas ajouter un sixième bloc, une page autonome ou une entrée primaire redondante. Lien secondaire « Cartographie du site » depuis Feedback et entrée directe depuis le Sommaire. Conserver le contrat SEO existant du Sommaire (NOINDEX, INTERNAL_ONLY). Vérifier le rendu réel du shell sur desktop/mobile.

## 2. Source canonique et frontières

Le document Google Sheets natif **CleanMyMap | Cartographie du site web**, dans Google Drive, dossier privé `cleanmymap/pilotage`, est l'unique source éditoriale de l'inventaire, des descriptions, des notes et des propositions de réorganisation validées. Le fichier `CleanMyMap_cartographie_web.xlsx` d'origine est une archive non canonique ; les exports XLSX ultérieurs sont des entrées dérivées de la feuille native pour la génération, jamais des sources éditoriales parallèles. Aucun partage public Drive ni changement de droits n'est requis. Les deux anciennes feuilles Rubriques et Synthèse sont historiques, non publiables en tant que données courantes.

L'autorité du classeur ne se substitue pas au code runtime : existence des routes, redirections, menus, droits, SEO et onglets réellement rendus doivent être confrontés à leurs owners. Le registre [INDEX.md](../pages_site/INDEX.md) reste l'inventaire maître technique et les fiches route-first restent les contrats fonctionnels. Une divergence est un défaut de fraîcheur à signaler et résoudre dans le classeur après vérification, pas un motif de changer automatiquement le runtime.

État initial du classeur : 68 lignes d'inventaire, 17 alias, 42 points d'entrée relevés, 14 onglets/panneaux. Ces nombres constituent un snapshot documentaire, pas une mesure exhaustive du runtime. Des points entrants, onglets et notes restent inconnus ; ils ne valent ni absence ni zéro. Les compter séparément des données confirmées.

### Modèle éditorial

| Feuille | Grain / contrat |
|---|---|
| Inventaire web | Une ligne par surface canonique ou pattern concret ; route/pattern comme clé initiale, bloc produit, nom, type, ACCESS, garde, SEARCH, DISCOVERY, CANONICAL, utilité, observations, notes fond/UI, priorité, preuve et SHA. Ne pas compter le pattern générique sections comme une page autonome. |
| Points entree | Une ligne par relation source -> cible et contrôle distinct ; emplacement, libellé, type (menu principal, menu utilitaire, CTA/lien, onglet, workflow, invitation), profils/modes, conditions et preuve. Plusieurs entrées par page sont normales. |
| Onglets | Une ligne par vue réellement distincte : route parente, libellé, type (onglet/panneau/espace), paramètre stable, fonction, preuve, décision proposée. |
| Alias redirects | Une ligne par ancienne URL/pattern, cible et statut. Un alias n'est jamais une page autonome à noter. |
| Pistes UX | Une ligne par proposition éditoriale, route, justification, priorité, statut PLAN ou décision confirmée. |
| Guide et synthese | Date, SHA de référence, définitions, limites, barèmes et synthèse ; les compteurs sont dérivés, pas des sources autonomes. |

Avant première publication web, ajouter des identifiants stables non secrets (page_id, entry_id, tab_id, proposal_id), une visibilité éditoriale explicite, une date et un état de preuve par ligne si nécessaire. Un changement de route conserve l'identité de la page lorsque le produit reste le même. Les relations portent ces identifiants plutôt qu'un libellé traduisible. Les colonnes existantes sont préservées ; toute évolution du schéma est versionnée et documentée dans le Guide. Garder la nomenclature des cinq blocs et les familles autonomes. Les notes inconnues restent nulles, jamais 0. Un score est un jugement éditorial, pas un résultat de tests.

Barème fond /10 (5 axes de 0 à 2) : utilité et périmètre, parcours et fonctionnalités, données/états, sécurité et droits, preuve de fonctionnement. Barème UI /10 (5 axes de 0 à 2) : hiérarchie, design system, responsive, accessibilité, interaction/états. Pour chaque axe, 0 = défaut démontré, 1 = partiel, 2 = satisfaisant sur preuve ; axe non évalué = NA, total non noté tant que les cinq axes ne sont pas établis. Conserver commentaires, contexte desktop/mobile, date et preuve. Ne pas déduire une note du seul statut finalized du registry.

## 3. Publication et architecture

Décision EXTEND_EXISTING : étendre le Sommaire et réutiliser Feedback ; créer seulement le petit module autonome de lecture/validation du snapshot et la composition de la vue. Pas de nouvelle base d'inventaire, de CRUD public du classeur, de synchronisation bidirectionnelle, de Google Sheets API au runtime, de scraping, ni d'iframe Drive.

Flux de publication V1 : éditeur met à jour le Google Sheets canonique -> export XLSX autorisé -> script local/CI déterministe lit les feuilles -> valide schéma, références et visibilité -> produit des projections JSON versionnées -> revue Git et déploiement Web. Utiliser les dépendances du dépôt si adaptées ; sinon justifier le plus petit parseur maintenu, limité à l'outil d'import, jamais au bundle client. N'inclure ni identifiants Drive privés, ni URLs signées, ni credentials, ni fichiers historiques dans les artefacts publics. Stocker la projection complète interne dans un chemin server-only et générer une projection publique distincte par allowlist. Les fichiers générés sont reproductibles, non éditables à la main et portent schemaVersion, generatedAt, sourceSha256, runtimeReferenceSha et compteurs de couverture. Ne pas publier de classeur privé complet dans le répertoire public ou le bundle. Les noms des pages à URL concrète portent des liens riches vers le site ; la valeur texte et la colonne route restent inchangées. Les patterns dynamiques ne sont pas cliquables sans ressource réelle. L'importateur ignore les métadonnées de présentation des cellules et construit ses liens à partir de la route validée.

L'importateur refuse les clés dupliquées, références orphelines, accès inconnu non qualifié, URL non locale ou dangereuse dans les liens internes, formules sur les champs de données, scores hors plage, en-têtes inattendus, entrées vers un alias non résolu, et volume excessif ; ne jamais exécuter de macro ou de formule. La publication ne remplace pas le dernier snapshot valide en cas d'échec. Export déterministe (ordre stable, encodage, valeurs nulles, hash) ; la génération et la lecture n'effectuent aucun appel Drive en production. Comparer routes et alias à l'inventaire runtime/registre, menus à navigation.ts et SEO à l'owner ; rapport explicite des divergences, erreurs bloquantes pour toute projection ambiguë ou exposition indue. Des inconnues documentées peuvent rester visibles, sans les présenter comme des preuves. Prévoir un contrôle CI de dérive adapté et ne pas dupliquer le contrôle pages-site existant.

### Accès et sécurité

- Public et utilisateur ordinaire : projection publique des surfaces PUBLIC/HYBRID explicitement approuvées ; uniquement leur description, accès général, points d'entrée/onglets publics et maturité partageable. Les pages personnelles ou restreintes peuvent être expliquées en termes généraux dans les rubriques existantes, sans exposer d'URL privée, paramètre de ressource, garde interne, identifiant, piste sensible ou note interne.
- Développeurs habilités : inventaire complet via la même vue, projection serveur après contrôle admin-like effectif (admin/max selon le contrat courant), y compris aliases, preuves et relations non publiques. Pas d'élévation par persona actif seul ni paramètre de requête. Cache privé/no-store ; aucun champ interne envoyé à un client non habilité, y compris dans RSC, exports ou erreurs.
- Les agents autorisés travaillent sur le classeur et le snapshot interne correspondant au SHA ; les agents publics ne reçoivent que la projection publique. Les textes sont des données, jamais des instructions d'exécution.
- Chaque lien vers une route est soumis aux droits propres de cette route ; le catalogue ne donne aucun accès métier. Ne jamais générer un vrai token ou un identifiant dynamique. Rendre un pattern ou un aperçu non cliquable lorsque la cible requiert une ressource réelle. Aucun lien vers preview/QA/admin pour les visiteurs.
- Pour le public, exclure les sources Git internes, preuves sensibles, notes brutes et propositions non validées par défaut. Ne pas ouvrir le fichier Drive privé ou la liste des propositions des autres utilisateurs. Les liens publics doivent être sûrs, internes et soumis à l'allowlist d'exposition.

## 4. UX et organisation

Réutiliser PageHeader, primitives CmmCard/CmmButton et onglets existants du design system, palette du Sommaire. Pas de copie d'Excel pixel à pixel ni de grille de 27 colonnes sur mobile.

Dans Cartographie du site :
1. bandeau court : utilité, date/SHA du snapshot (SHA technique uniquement pour les habilités), nombre de surfaces visibles, couverture des preuves, lien vers Feedback ;
2. recherche locale nom/route/utilité et filtres bloc, accès, entrée, présence d'onglets, priorité et maturité selon la projection ; compteurs calculés sur les résultats visibles. Les filtres sont partageables par URL, sans données privées ; état vide explicite et remise à zéro ;
3. navigation par blocs ordonnés avec familles autonomes accessibles au public selon leur visibilité ; cartes synthétiques en mobile, tableau compact en desktop (nom, usage, accès, entrées, onglets, notes disponibles) ; clic/accordéon de détail avec provenance, liste de chemins et décisions applicables. Ne pas charger la projection interne au changement de filtre public ;
4. bouton « Proposer une amélioration » sur chaque surface et formulaire global pour une page manquante ou la structure du site. Un panneau inline non modal contient contexte affiché, champ texte multiligne et action d'envoi. Conserver les filtres et le brouillon lors d'une demande de connexion ; état succès/erreur explicite et lien vers Mes retours. Les propositions restent privées.

Les onglets séparent des tâches ou contenus réellement distincts ; ne pas créer des onglets décoratifs à une seule vue. Utiliser URL stable, historique navigateur, focus clavier, aria-selected, contenu identifié, responsive sans débordement. Cartes, connexion, pages légales et étapes transactionnelles peuvent garder une composition autonome. Les décisions de regroupement doivent comparer audience, permissions, cycle de vie, SEO, charge, fréquence d'accès et partage de deep links. Conserver une page dédiée si elle a une intention, une permission, un workflow ou un lien stable propre ; regrouper dans un onglet si les vues partagent intention, contexte et autorisations. Toute fusion future conserve les liens compatibles et les droits.

## 5. Propositions : une seule boucle Feedback

Owner existant : [fiche Feedback](../pages_site/routes/04-reseau-discussions/feedback/feedback-README.md), `apps/web/src/components/sections/rubriques/feedback-section.tsx` et `apps/web/src/app/api/community/bug-reports/route.ts`. POST exige une session Clerk. Réutiliser questionnaire idée/amélioration, stockage, quota, confirmation, historique propriétaire, creator-inbox, qualification et suivi. Aucun forum public, nouveau système de tickets, nouvelle gamification ni table concurrente.

Proposer une seule zone de texte (20 à 2000 caractères après trim, à aligner sur les limites canoniques sans les affaiblir) ; catégories optionnelles : point d'entrée manquant, onglet/structure, fond, UI, autre. Le serveur résout le contexte depuis page_id/tab_id du snapshot visible et enregistre une référence de snapshot et un résumé stable du contexte ; une proposition générale n'a pas de cible obligatoire. Ne pas accepter du navigateur un rôle, une URL arbitraire, une note éditoriale ou un titre de page comme autorité. Le formulaire mappe la zone texte vers le contrat du questionnaire canonique, en distinguant besoin et proposition si les champs requis l'exigent ; conserver les textes et limites existants. Étendre le contrat de source et le contexte Feedback de manière additive uniquement si nécessaire, avec tests des anciens clients ; ne pas contourner les validations en injectant de faux champs. Authentification, ownership, limites serveur, prévention de spam, idempotence du submit, rendu texte échappé et absence de données sensibles dans les logs. Si le snapshot a changé, afficher la cible obsolète et demander confirmation de la cible avant envoi.

Les retours suivent la qualification et le suivi existants ; accepted ne signifie pas shipped. Aucun retour ne modifie directement le classeur, une note ou une route. L'éditeur qualifie et, si retenu, met à jour le classeur canonique, relance l'export et référence la livraison. Les décisions de réorganisation dans Pistes UX restent éditoriales ; les idées brutes n'y sont pas synchronisées automatiquement. La reconnaissance éventuelle utilise exclusivement les règles Feedback/gamification existantes.

## 6. Priorités et jalons d'implémentation

1. **P0 Inventaire fiable :** compléter les recherches inverses de liens et les onglets ; confronter index aux pages App Router et registry, aliases, guards et tests. Vérifier points d'entrée pour profils et modes réels. URL_ONLY uniquement après recherche complète des liens statiques/dynamiques et vérification du parcours ; sinon UNKNOWN. Définir identifiants et publication par visibilité dans le classeur, valider notes inconnues.
2. **P0 Projection et Sommaire :** générateur déterministe, validation, deux projections, navigation d'onglets et UI responsive accessible, maintien du sommaire existant. Test de non-divulgation des données internes.
3. **P1 Contribution :** formulaire contextualisé via Feedback, reprise de connexion, owner history, modération et intégration du lien Feedback ; aucun deuxième stockage métier.
4. **P1 Réception :** audit des routes/entrées/onglets, captures desktop/mobile des vues publiques et administratives, documentation CURRENT des seules routes affectées, mise à jour du contrôle de dérive si nécessaire. Les migrations d'autres pages restent des lots séparés, après décision humaine basée sur l'audit.

### Validation et STOP CONDITION

- Génération reproductible, tests de schéma/relations/alias, droits de visibilité, nulls et entrées malveillantes ; échec contrôlé conserve l'artefact valide. Comparaison de la projection aux feuilles et au SHA de runtime exact, rapport de couverture.
- Tests navigation : défaut Rubriques, deep link, retour navigateur, filtres, rôle, modes, URL invalide, clavier, responsive et aucun lien de ressource fabriqué.
- Tests d'intégration : utilisateur anonyme ne voit jamais le snapshot interne ; connecté non admin non plus ; admin autorisé voit l'inventaire complet ; feedback anonyme refusé à l'envoi, proposition valide owner-scoped, cible falsifiée refusée, double submit sans duplication, autres sources Feedback non régressées. Respecter les preuves d'intégration réelles et les harness autorisés.
- Exécuter les contrôles documentaires et Web pertinents, typecheck/lint, tests ciblés, couverture attribuable et CI du candidat ; ne pas annoncer de déploiement sans preuve. Vérifier accessibilité, rendu desktop/mobile et lien de retour vers Mes retours.
- STOP CONDITION : classeur canonique maintenu et export reproductible, vue publique et vue habilitée consultables sans fuite, onglets et points d'entrée traçables, propositions persistées dans Feedback et retrouvables par leur auteur, ancien Sommaire intact, documentation et tests alignés, inconnues explicitement qualifiées. Aucun changement de navigation primaire ou de permissions métier hors lot.

## 7. Références et limites

- [Index route-first](../pages_site/INDEX.md) ; [matrice produit](../product/matrice-rubriques.md) ; [gouvernance documentaire](../AGENTS.md).
- Owners inspectés au SHA initial : `apps/web/src/lib/navigation.ts`, `apps/web/src/lib/sections-registry/config.ts`, `apps/web/src/app/(app)/explorer/page.tsx`, `apps/web/src/components/sections/rubriques/feedback-section.tsx`, `apps/web/src/app/api/community/bug-reports/route.ts`.
- Le Google Sheets natif a été créé dans Drive et enrichi ; la référence privée n'est pas publiée dans Git. Le présent plan ne modifie aucun runtime, droit, registre ni donnée Supabase. Les propositions de fusion, scores et exhaustivité des points d'entrée ne sont pas prouvés ; validation runtime et CI spécifiques à l'implémentation restent à réaliser.
