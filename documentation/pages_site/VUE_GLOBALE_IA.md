# Vue globale du site Web pour les agents IA

**Statut : CURRENT (contrat de lecture et d'analyse).** Les constats datés ci-dessous sont des éléments d'audit, pas des fonctionnalités nouvelles.  
**Owner :** documentation fonctionnelle transverse des pages Web, racine de pages_site.  
**Périmètre :** apps/web ; mobile, API, jobs et services ne sont pas des pages du site. Les contrats partagés restent dans leurs domaines propriétaires.  
**Consommateurs :** ChatGPT, Codex, développeurs, agents de documentation et de revue produit.  
**Référence de l'audit initial :** main `a9a6a14466004359cdeb7ff9f07254a22772095c`, 25 novembre 2026. Code statique et documents relus ; navigateur, tests et audit exhaustif non exécutés.

## 1. Finalité et autorité

Comprendre le produit et ses parcours avant de toucher au code : quelles surfaces existent, à qui elles s'adressent, comment on y arrive, ce qu'elles rendent, comment elles se relient, et où sont les décisions d'évolution. Cette vue est un guide canonique de lecture transverse, pas un deuxième registre manuel des routes, une matrice d'autorisation ou une nouvelle navigation runtime.

| Question | Owner et lecture |
|---|---|
| Quelles routes et compatibilités existent ? | [INDEX.md](./INDEX.md), puis App Router et registry ; inventaire maître, une fiche par surface canonique, exceptions explicites. |
| Que fait réellement une page ? | Fiche route-first liée dans INDEX, puis code et tests ciblés si nécessaire. |
| Quels liens sont dans le ruban, pour qui et quand ? | `apps/web/src/lib/navigation.ts` et consommateurs ; [matrice produit](../product/matrice-rubriques.md), documentation canonique des modes d'affichage. |
| Quelle famille visuelle ? | [PAGE_FAMILIES.md](./PAGE_FAMILIES.md), resolver, manifeste et exceptions ; ne pas déduire de la couleur d'un tableur. |
| Qui a réellement accès ? | Contrats AuthN/AuthZ spécialisés, proxy, page et API ; un persona ou un lien ne donne jamais de droits. |
| Quelle exposition SEO ? | INDEX, `apps/web/src/lib/seo/indexability.ts`, sitemap, métadonnées et proxy. |
| Quels retours ou décisions éditoriales ? | Google Sheets natif **CleanMyMap \| Cartographie du site web**, dossier privé cleanmymap/pilotage et planification interne de cartographie participative. Ne pas publier de lien Drive privé. |
| Quelle couverture des liens entrants ? | `npm run audit:product-surface -- --ref=HEAD` ; rapport généré [audit de surface](../architecture/product-surface-accessibility-audit.md), uniquement valable au SHA indiqué. |
| Quels changements sont futurs ? | Plans et specs concernés, avec statut PLAN/CANDIDATE ; aucune déduction de livraison. |

Le code courant prime pour les faits runtime. La feuille native est l'owner éditorial des descriptions synthétiques, notes de direction et décisions validées ; elle ne remplace pas les contrats techniques du dépôt. Les avis individuels futurs appartiendront au backend. Ce fichier ne doit pas recopier ni figer tous les champs du registre ou du tableur. Pour une extraction exhaustive, joindre les owners par route et page_id puis régénérer une projection, sans créer de troisième inventaire manuel. Respecter la [gouvernance documentaire](../development/DOCUMENTATION_POLICY.md).

## 2. Modèle de lecture : graphe de surfaces

Ne pas réduire le site à un arbre de menus. Le graphe contient :
- **Surface** : page_id stable, route/pattern, titre, objectif, famille documentaire, bloc produit, type PAGE/PATTERN/COMPATIBILITY_RENDER/SYSTEM/QA, statut, contrats d'accès et de découverte.
- **Entrée** : relation orientée source -> cible, type MENU_PRIMARY, MENU_UTILITY, SEARCH, SUMMARY, CTA, WORKFLOW, PRIVATE_LINK, SYSTEM, EXTERNAL ou UNKNOWN ; emplacement, libellé, contexte, profils/modes, preuve. Un menu, une recherche et le Sommaire peuvent consommer la même navigation et restent trois points d'interaction distincts, pas trois owners.
- **Sous-vue** : page_id, tab_id, type onglet/espace/panneau/étape/calque/section, libellé, paramètre ou état local, valeur par défaut, préconditions et lien direct réellement supporté.
- **Compatibilité** : ancienne route, cible, query/fragment, type de redirection ou rendu partagé, consommateurs et preuve. Une redirection n'est pas une page autonome ; un alias de rendu partagé n'est pas une redirection HTTP.
- **Évolution** : proposition, décision, état PLAN ou livraison prouvée, dépendances, raison et priorité. Une proposition ne change ni la navigation ni les droits.

Les routes dynamiques identifient un pattern, jamais un exemple de token, slug privé ou identifiant inventé. Résoudre les liens contextuels par les builders et données autorisées. Pour les sections, `/sections/[sectionId]` est un renderer partagé : les sections concrètes sont les surfaces, pas ce pattern générique en plus.

Axes indépendants :
1. ACCESS PUBLIC/HYBRID/PRIVATE ; garde réelle et capacité protégée.
2. SEARCH INDEX/NOINDEX ; DISCOVERY selon owner SEO, CANONICAL SELF/TARGET/NONE ; distinguer PARTNER_SESSION lorsqu'il est documenté, sans inventer une nouvelle valeur runtime.
3. Découvrabilité UX : menu, bouton/lien, workflow/deep-link, système/QA, URL_ONLY démontré, UNKNOWN.
4. Visibilité éditoriale de publication : autorisée, à revoir, interne. Le masquage d'une feuille n'est pas un contrôle d'accès.
5. Maturité fonctionnelle et UI, direction, avis communauté, usage observé : dimensions différentes.

Une route privée peut figurer dans un menu autorisé ; NOINDEX ne signifie pas inaccessible ; absence du ruban ne signifie ni orpheline, ni obsolète. Un composant ou une route référencée dans un test n'est pas une preuve de clic en production.

## 3. Carte fonctionnelle transversale

Les cinq blocs visibles dépendent des profils et modes. Les IDs historiques impact et connect existent dans le type NavigationBlockId mais leurs tableaux communs sont vides ; ne pas créer de nouveaux blocs visuels pour ces IDs. La matrice runtime est l'owner exact.

| Domaine | Surfaces structurantes et parcours à comprendre | Relations secondaires / limites |
|---|---|---|
| Homepage | `/` : découverte, orientation, accès aux actions et aux données publiques | Logo, CTA et footer ; ne pas confondre homepage et dashboard personnel. |
| Accueil & Pilotage | Dashboard, Sommaire, Pilotage, portail décideur, profil | `/profil` rend DashboardPage ; profil détaillé, évolution du compte, parcours par profil, gouvernance et administration ont leurs contrats. Pilotage et Sponsor dépendent des scopes métier. |
| Agir | Rejoindre, créer une action, signalement (les trois entrées primaires) | Historique, invitation et mission = workflows ; SPOGOMI = famille d'événements avec découverte, fiche publiée, catalogue personnel, création et espaces autorisés. |
| Cartographie & Impact | Carte, méthodologie, rapports, progression | Classement public distinct ; impact personnel et dossier d'engagement relèvent de la sémantique impact mais restent documentés dans Accueil & Pilotage. Export imprimable séparé. |
| Réseau & Discussions | Messagerie, annuaire, open data, soutien (quatre entrées primaires) | Feedback via menu utilitaire, Réseau engagé, monitoring Trash Spotter, parcours partenaire. Ne pas recréer Communauté comme rubrique primaire. |
| Apprendre | Ordres de grandeur, quiz, bonnes pratiques | Mode École via sélecteurs quiz ; empreinte IA via lien contextuel ; tri/compost/climat non classés définitivement. |
| Auth & Onboarding | Connexion, inscription, onboarding | Retour de connexion sûr, préférences et complétion ; aucun droit métier accordé par un simple parcours. |
| Institutionnel & Légal | CGU, confidentialité, cookies, mentions, contact, notification illicite | Footer et liens inter-pages ; conserver l'accès public des contrats légaux. |
| Système & Utilitaires | Réglages, erreur 429, preview QA | Réglages personnels ; erreur déclenchée par état ; QA hors navigation publique. |
| Admin & Super-admin | Cockpit admin, formulaires, services, banque quiz, audit XP, godmode | Capabilities effectives, séparation admin/max, pas de liens publics vers ces outils. |
| Print & Export | Rapport imprimable | Surface de restitution, pas une rubrique primaire ni une page de saisie. |
| Sections non classées | `/sections/recycling`, `/sections/compost`, `/sections/climate` | CURRENT côté runtime ; décision de famille/fusion non livrée, voir PAGE_FAMILIES. |

### 3.1 Parcours d'entrée et dépendances

Pour préparer un changement, lire les chaînes suivantes et les owners des étapes ; les flèches indiquent des relations fonctionnelles, pas toutes des liens universellement visibles.

- Découverte publique : homepage -> carte / rejoindre / créer / signalement -> préparation publique ou connexion pour la mutation -> activité personnelle.
- Compte : connexion/inscription -> onboarding si nécessaire -> dashboard/profil -> réglages, parcours, impact personnel, progression. Retour au contexte initial selon redirect-url ; ne pas créer un second espace personnel.
- Action terrain : rejoindre -> actions futures/passées/besoins ; créer -> préparation, jour J, bilan, outils itinéraire/météo ; invitation/mission/historique ont des droits contextuels. Carte -> déclarer et méthodologie ; signalement -> consultation Trash Spotter. Aucune nouvelle voie de création Trash Spotter.
- Impact : profil impact -> dossier engagement ; rapports -> dossier engagement et exports selon droits ; progression -> classement public. Ne pas confondre rapport collectif, contribution personnelle et moteur XP. Méthodologie -> empreinte IA (preuve statique ciblée).
- Partenaires : annuaire -> onboarding partenaire ; catalogue public des acteurs et espaces privés ne partagent pas nécessairement leur projection ni leurs droits. Réseau engagé agrège des activités issues des actions, l'annuaire structure les acteurs et organisations.
- SPOGOMI : catalogue public -> carte d'événement publiée ; catalogue public -> démonstration Cachan et création si habilitée ; catalogue personnel -> espace événement autorisé, fiche publique et création selon conditions. Les intents bénévoles/arbitres/organisateurs et les sessions d'équipe ne sont pas des rôles globaux ni des pages publiques interchangeables.
- Pédagogie : quiz -> Mode École -> démo quiz ou Bonnes pratiques ; Bonnes pratiques -> ressources tri/compost et CTA terrain. Empreinte IA combine calcul public et gestion owner-scoped ; une nouvelle entrée ne change pas ses permissions.
- Exploitation : admin -> banque quiz, services et contrôle système selon capacités ; ne pas rendre godmode accessible par simple role actif. Feedback -> créateur/admin pour traitement, qualification et suivi ; réponse privée via messagerie ; historique du propriétaire.

### 3.2 Sous-vues : exemples de contrats observés

Table de lecture qualitative, pas un registre exhaustif d'onglets. Les noms/paramètres sont à relire chez l'owner avant modification.

| Surface | Organisation relevée | Lecture / contrainte |
|---|---|---|
| /actions/new | Préparer, Jour J, Bilan ; panneaux itinéraire/météo | Espaces de workflow, `space=prepare/day/bilan` ; panneaux `panel=itineraire/meteo` ; conserver paramètres utiles et compatibilités. |
| /sections/rejoindre-une-action | Actions futures, passées, besoins | `tab=future/past/needs` documentés. |
| /sections/messagerie | Discussions, messages privés | `tab=dm` ; même page, droits de chaque vue. |
| /reports | Analyse, Mes fichiers | `tab=analysis` documenté ; historique owner-scoped, autre paramètre à confirmer. |
| /learn/bonnes-pratiques | Bien trier, Composter, Éviter les déchets abandonnés, Sobriété numérique | Config `learn-practice-theme-tabs.data.ts` ; ne pas inventer query. |
| /sections/annuaire | Services publics, Annuaire, Carte & réseau | IDs organization/directory/map ; état local initial organization dans annuaire-section ; aucun deep-link URL démontré par cette lecture. |
| /spogomi/[eventSlug] | overview, teams, rankings, balance, information | `tab` et focus/division validés par navigation-intent ; ne pas fabriquer de slug réel. |
| /explorer | Sommaire de rubriques CURRENT ; Rubriques + Cartographie du site PLAN | `tab=cartographie` uniquement prévu, non livré. |
| /sections/gamification | Centre de progression CURRENT ; candidat cinq onglets PLAN | Ne pas traiter les fichiers candidats comme code intégré. |

Pour une nouvelle sous-vue : comparer intention, audience, droits, cycle de vie, chargement, partage d'URL, SEO et fréquence. Regrouper uniquement si ces contrats convergent. Conserver une page autonome si intention/permission/workflow/SEO distinct ; carte, connexion, impression, juridique et transaction peuvent rester sans onglets. Préserver les deep-links et les redirects pertinents. Employer primitives d'onglets existantes, navigation clavier, historique navigateur et URL stable quand utile ; pas d'onglets artificiels sur une page mono-vue.

## 4. Lecture du Google Sheets et de la future vue web

| Feuille | Rôle pour l'agent |
|---|---|
| Vue projet | Lecture humaine, blocs et accès colorés, champs bruts direction G:J associés au page_id P ; formules de présentation, séparateurs non importables. |
| Inventaire web | Routes/patterns, identifiants, métadonnées éditoriales, preuves, axes de l'audit, sources. |
| Points entree | Relations orientées et conditions ; une ligne par interaction ; PLAN et UNKNOWN distincts. |
| Onglets | Sous-vues et paramètres, preuve et état. |
| Alias redirects | Compatibilités techniques ; rapprocher alias de rendu du code avant reclassement. |
| Pistes UX | Propositions éditoriales ; une décision n'est pas une livraison. |
| Plan web et validation / Guide et synthese | Règles d'interprétation et provenance, renvoi vers plan Git canonique. |
| Rubriques / Synthèse | HISTORY, anciennes données, ne pas les traiter comme état actuel. |

Ne jamais interpréter une couleur seule. Vert = menu, orange = lien/bouton, rose = workflow identifié, rouge = URL seule confirmée, gris = inconnu/système. Relire la valeur et la preuve. Notes vides = non évaluées. Le directeur saisit ses propres notes/priorités ; ne pas les remplir à sa place. Avis communautaires futurs : moyenne, effectif, priorité demandée, usage déclaré, synthèse validée. Usage observé distinct, aucun chiffre sans mesure. Se référer au plan pour seuil public, unicité et modération ; ne pas dupliquer les règles métier dans ce fichier.

Le Sommaire CURRENT utilise le même getter de navigation que le ruban/recherche et ne constitue pas l'inventaire complet. Le futur onglet Cartographie devra lire une projection publique allowlistée et une projection interne autorisée, sans appels Drive au runtime. Feedback porte les propositions textuelles ; les évaluations structurées restent PLAN. Le fichier Drive intégral, ses champs cachés et ses liens internes ne sont pas une projection publique.

## 5. Protocole de travail pour l'IA

1. Lire le SHA courant de main, gouvernance et périmètre. Pour une modification, relever les règles scoped et owners avant d'écrire.
2. Lire INDEX et la fiche cible ; identifier bloc produit, famille visuelle, type de route et contrat ACCESS/SEARCH/DISCOVERY/CANONICAL.
3. Pour les liens entrants, suivre route statique, constantes et builders, registry, navigation, CTA, redirects, notifications et workflows. Relever les conditions de rôle/mode/auth/ressource ; chercher les consommateurs de l'ancienne URL. Comparer au rapport généré au même SHA. Ne pas prendre un simple grep pour une preuve d'absence.
4. Pour les sous-vues, lire composants, état, searchParams et tests. Distinguer onglet, filtre, panneau et workflow. Si une valeur ne figure pas dans le code, UNKNOWN.
5. Pour une fusion/extraction de page, produire comparaison intention/données/owner/droits/SEO/état/consommateurs, alternative simple et compatibilité des URL. Ne pas déplacer un formulaire vers une page publique si son accès doit rester privé.
6. Classer les constats : DEFECT (contradiction démontrée), GAP (preuve ou documentation manquante), OVERLAP (recouvrement constaté mais fusion non décidée), PLAN (évolution voulue). Prioriser le risque d'accès/intégrité, puis découvrabilité et cohérence, puis confort UI. Une absence de note n'est pas un défaut métier.
7. Mettre à jour seulement l'owner concerné et ses tests/fiches si le runtime change ; actualiser la projection éditoriale et les preuves au SHA. Ne pas corriger une décision produit sans autorisation. Vérifier les protections et la conservation des liens.
8. Exécuter selon le lot : `npm run audit:product-surface -- --ref=HEAD`, `npm run audit:pages-site-drift`, `npm run check:pages-site-drift` et tests ciblés ; inspection navigateur pour les conclusions UI. Ne pas présenter un audit structurel comme preuve de qualité ou permission runtime.

Format minimal d'un constat : ID, SHA, route/source/cible, type, preuve exacte, impact, décision/recommandation, owner, validation manquante. Utiliser STATIC_CODE, DOCUMENTED, TEST_SOURCE, TEST_EXECUTED, BROWSER_OBSERVED ou UNKNOWN pour la provenance ; ne pas fusionner ces niveaux.

## 6. Audit initial : constats datés, à requalifier sur main

Ces constats ne sont pas un backlog autorisé d'implémentation ; ils orientent les prochaines lectures. Les entrées privées du classeur ne sont pas reproduites ici.

| ID | Nature | Constat démontré ou limite | Action recommandée |
|---|---|---|---|
| A01 | DEFECT documentaire | Feedback : sa fiche annonce carte du bloc dans le Sommaire et menu du bloc ; navigation.ts le met category-only, hors COMMON_PROFILE_SPACE_PAGES, et explorer consomme les espaces sans ajout Feedback. Menu utilitaire confirmé. | Aligner fiche et commentaire navigation ; ne pas réintroduire dans le bloc sans décision. |
| A02 | DEFECT de représentation | /profil est un alias de rendu du dashboard : profil/page.tsx importe et rend DashboardPage ; sa fiche le dit, mais l'inventaire le présente comme page personnelle indépendante. | Identifier COMPATIBILITY_RENDER, distinguer URLs et expériences distinctes ; conserver compatibilité. |
| A03 | GAP documentaire | /sections/community est redirect vers Rejoindre ; audit produit généré du 25/09/2026 le décrit encore PRIMARY_NAV, et classe Feedback primaire. | Régénérer audit à HEAD ; ne pas suivre ses anciennes recommandations d'alias sans preuve fraîche. |
| A04 | GAP inventaire | SPOGOMI : index public -> fiche, démonstration Cachan, création conditionnelle ; catalogue personnel -> espace, fiche et création ; inventaire omet ces entrées. | Renseigner relations et leurs conditions depuis spogomi-index-sections et spogomi-personal-events-list, puis tester les parcours. |
| A05 | GAP inventaire | /admin -> /admin/quiz-bank, /admin/services, ADMIN_GODMODE_ROUTE dans admin-page-content ; inventaire les classe encore sans point relevé. | Documenter liens conditionnels et droits ; ne pas exposer au public. |
| A06 | GAP inventaire | /sections/annuaire -> /partners/onboarding via Référencer ma structure ; /mentions-legales -> /signaler-contenu-illicite. | Compléter les relations, ne pas créer de CTA supplémentaire déjà existant. |
| A07 | GAP sous-vues | Annuaire : 3 onglets exacts et état initial documentables ; SPOGOMI événement : 5 tabs définis dans navigation-intent ; absents/détaillés insuffisamment dans le tableur. | Ajouter les sous-vues ; vérifier URL/états, pas d'invention de paramètre. |
| A08 | OVERLAP | /sections/recycling et /sections/compost sont déjà accessibles depuis les thèmes Bien trier/Composter de Bonnes pratiques ; /sections/climate recoupe par intention Ordres de grandeur. | Comparer contenu, SEO et usage avant regroupement ; les trois familles non arbitrées restent explicites. |
| A09 | OVERLAP | Réseau engagé et Annuaire : activités dérivées des actions vs annuaire structuré et carte réseau. Recouvrement de sujet, duplication de données non prouvée. | Examiner une intégration en sous-vue uniquement si connaissance distinctive préservée ; maintenir droits. |
| A10 | GAP d'exposition | Trash Spotter : PUBLICATION_RIGHTS_DECISION_REQUIRED dans INDEX ; monitoring secondaire, signalement unique pour création. | Décision de publication préalable à toute ouverture SEO ou nouveau lien exposant des données. |
| A11 | GAP de couverture | /docs/* est mentionné dans le contrat SEO ; routes concrètes non inventoriées ici. Audit des routes et backlinks non exhaustif, aucun URL_ONLY prouvé. | Inspecter l'arbre et l'owner docs, exécuter audit généré ; ne pas inventer de page ou supprimer un lien. |
| A12 | GAP de contrat | Matrice INDEX annonce DISCOVERY=SITEMAP/INTERNAL_ONLY/REDIRECT mais ligne équipe SPOGOMI indique PARTNER_SESSION. Le tableau SEO global n'énumère pas tous les chemins SPOGOMI présents dans le registre fonctionnel. | Rapprocher la taxonomie du code SEO et du contrat partenaire ; ne pas déduire une exposition publique. |
| A13 | PLAN | Sommaire cartographique, notation communautaire et cinq onglets gamification non intégrés dans le runtime constaté. | Suivre les spécifications dédiées, aucune annonce de livraison. |
| A14 | GAP ergonomique | Vue humaine : résumé navigation et couleurs sont des valeurs dérivées à régénérer ; formules de présentation et saisies direction coexistent. Masquage des onglets ne constitue pas une permission. | Génération/contrôle par page_id, import brut allowlisté, projection distincte pour partage. |

### Sources ciblées de l'audit

- A01 : `apps/web/src/lib/navigation.ts`, `apps/web/src/app/(app)/explorer/page.tsx`, [fiche Feedback](./routes/04-reseau-discussions/feedback/feedback-README.md).
- A02 : `apps/web/src/app/(app)/profil/page.tsx`, [fiche Profil](./routes/01-accueil-pilotage/profil/profil-README.md).
- A03 : [audit généré](../architecture/product-surface-accessibility-audit.md), INDEX, `apps/web/src/lib/seo/indexability.ts`.
- A04/A07 : `apps/web/src/components/spogomi/spogomi-index-sections.tsx`, `spogomi-personal-events-list.tsx` dans le même dossier, `apps/web/src/lib/spogomi/navigation-intent.ts`.
- A05 : `apps/web/src/app/(app)/admin/admin-page-content.tsx`.
- A06/A07 : `apps/web/src/components/sections/rubriques/annuaire/annuaire-section.tsx`, `annuaire-view-tabs.tsx` dans le même dossier, `apps/web/src/app/mentions-legales/page.tsx`.
- A08/A09 : `apps/web/src/components/learn/learn-practice-theme-tabs.data.ts`, `apps/web/src/components/sections/rubriques/actors-section.tsx`, PAGE_FAMILIES.
- A10-A14 : INDEX, plan cartographie, tableur éditorial et code concerné ; aucune preuve runtime d'exécution.

## 7. Maintenance et condition de clôture

Le contrat courant de ce guide est maintenu lorsque la méthode de lecture, les frontières d'owners ou les relations structurantes changent. Les détails route-first et le tableur sont mis à jour chez leurs owners, pas recopiés systématiquement. Les constats datés doivent être requalifiés, fermés ou retirés après preuve, jamais prolongés comme vérités CURRENT sans vérification. Pas de nouvelle source de permissions ou d'indexabilité.

STOP CONDITION de la vue IA : un agent peut identifier l'owner de toute surface, suivre les parcours et relations, distinguer preuve/absence de preuve et CURRENT/PLAN, puis localiser les données éditoriales sans lire tout le code. Pour conclure à une exhaustivité de l'inventaire ou à une régression UI, les audits et observations correspondants restent nécessaires.
