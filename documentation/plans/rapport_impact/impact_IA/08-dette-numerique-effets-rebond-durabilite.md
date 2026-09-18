# Partie VIII — Dette numérique, effets rebond et durabilité dans le temps {#partie-viii-dette-numerique-effets-rebond-et-durabilite-dans-le-temps}

## Dette numérique du projet

Pour évaluer si l'impact environnemental et social lié au développement assisté par IA peut être justifié par l'usage réel du site, il faut dépasser la seule consommation des modèles d'IA. L'analyse porte sur l'ensemble de l'écosystème CleanMyMap.

### Dette liée au développement assisté par IA

Le projet mobilise des modèles d'IA pour le développement (refactoring, structure, analyse). Cette phase a un coût énergétique et hydrique initial (entraînement et inférence) qui constitue une "dette de création". L'IA n'est pas la finalité, mais un accélérateur technique dont l'empreinte doit être amortie par l'utilité terrain produite.

### Dette liée à l'hébergement, au stockage, aux API et aux services tiers

La dette s'étend aux infrastructures permanentes : runtime Vercel, base de données Supabase, stockage des photos, services d'authentification (Clerk) et outils d'observabilité. Les coûts évitables concernent surtout les excès : images trop lourdes, logs trop détaillés ou appels API redondants.

Cette dette est aussi une dette de **persistance**. Les logs, embeddings, caches, snapshots, mesure d'audience, versions de modèles, métriques et traces de débogage sont souvent conservés "au cas où", puis dupliqués dans plusieurs services. Une donnée peu utile peut ainsi rester copiée pendant des années dans des systèmes différents, ce qui augmente l'empreinte globale sans bénéfice direct pour l'action terrain.

Cette logique rejoint la redondance invisible des infrastructures cloud : backups, réplications géographiques, haute disponibilité, environnements aperçu, staging, CDN et journaux techniques créent plusieurs copies d'un même état. L'empreinte réelle d'un service n'est donc pas le simple poids de son fichier le plus visible, mais l'ensemble des copies et dépendances que l'infrastructure maintient autour de lui.

Dans le dépôt, cette persistance est déjà organisée par des modules dédiés comme `apps/web/src/lib/governance/governance-monthly-report-store.ts`, `apps/web/src/lib/governance/governance-monthly-report.ts` et `apps/web/src/components/admin/codex-usage-panel.tsx`, qui matérialisent des historiques, des snapshots et des usages suivis dans le temps.

### Coût d'inactivité des comptes et données dormantes

Un utilisateur inscrit mais inactif, avec photos, historique et notifications, continue souvent d'exister dans la base, les backups et les mesures d'audience. Même sans usage visible, il conserve une présence technique qui alourdit le stockage, l'observabilité et les sauvegardes.

Pour éviter cette inertie, CleanMyMap doit prévoir une politique de purge ou d'archivage des données dormantes : suppression des comptes inactifs au bout d'un délai défini, conservation minimale des éléments utiles à la preuve ou à la conformité, et archivage séparé des données qui n'ont plus d'utilité opérationnelle immédiate.

### Dette liée à la maintenance future

La dette future vient surtout de l'accumulation : largeur fonctionnelle importante, nombreuses routes API, migrations, services logiciel en tant que service et fonctionnalités secondaires maintenues sans usage fort. Une dette de gouvernance peut apparaître si des fonctionnalités sont conservées "au cas où".

### Impacts non neutralisables du fonctionnement numérique

Certains impacts sont incompressibles : consommation électrique des serveurs, eau pour le refroidissement des data centers, métaux critiques des GPU et fin de vie des équipements. Ces coûts physiques ne peuvent pas être effacés, seulement justifiés par un bénéfice supérieur.

## Limites de la compensation par l'utilité terrain

### Ce que l'action de terrain peut justifier partiellement

L'utilité terrain peut justifier une partie du coût numérique lorsque CleanMyMap réduit les frictions d'organisation, limite les doublons, améliore le ciblage des zones à traiter et produit une preuve exploitable pour les associations ou les collectivités. Cette justification reste toutefois partielle : elle dépend de l'usage réel du site, du nombre d'actions effectivement réalisées et de la sobriété des fonctions numériques activées.

Autrement dit, l'action de terrain ne compense pas automatiquement le coût numérique. Elle ne le justifie que si le site transforme une dépollution ponctuelle en capacité d'organisation durable, en meilleure coordination des bénévoles et en documentation vérifiable des résultats. Une fonctionnalité qui ne ferait qu'ajouter de l'interface, des notifications ou des couches de suivi sans améliorer l'action concrète ne créerait pas ce type de compensation.

Le critère décisif est donc l'arbitrage entre utilité mesurable et coût additionnel. Une fonctionnalité peut être admise si elle permet, par exemple, d'éviter des déplacements inutiles, de mieux répartir les efforts ou de produire des rapports exploitables pour les partenaires. En revanche, une fonctionnalité qui attire l'attention sans améliorer la boucle terrain ne réduit pas l'empreinte globale ; elle la déplace seulement vers davantage de complexité numérique. C'est précisément pour cela que l'IUR sert ici d'outil de vérification et non de simple indicateur décoratif.

### Coordination des actions

Le site peut justifier son coût numérique s'il raccourcit la boucle terrain, permettant d'organiser plus d'actions de dépollution avec moins de coordination manuelle dispersée (e-mails, messages).

### Réduction des doublons

En cartographiant précisément les zones polluées et les actions en cours, l'outil évite les déplacements inutiles de bénévoles vers des zones déjà traitées.

### Meilleur ciblage des zones polluées

L'historique des signalements permet d'orienter les moyens limités vers les points de pollution les plus critiques, améliorant réellement la coordination des actions.

### Rapports et preuve d'impact

La production de preuves exploitables et de rapports facilite la transmission des données aux associations et collectivités, transformant l'observation en action documentée.

### Ce que le site ne peut pas neutraliser totalement

La compensation par l'utilité terrain a des limites structurelles. Même lorsque CleanMyMap améliore la coordination, la traçabilité ou la lisibilité des actions, le site ne peut pas supprimer les coûts physiques qui précèdent ou accompagnent son fonctionnement : énergie des serveurs, refroidissement des data centers, fabrication des équipements, stockage, services tiers et circulation des données.

Cette limite est importante pour le jugement final. Le bénéfice social du projet peut justifier une part du coût numérique, mais il ne l'efface pas. Autrement dit, CleanMyMap peut rendre son empreinte plus défendable, pas la faire disparaître. C'est pour cela que les sous-parties suivantes distinguent les impacts matériels incompressibles, les dépendances cloud et les limites sociales de l'IA.

### Électricité, eau, ACV et impacts matériels persistants

Retirer des déchets ne "nettoie" pas l'eau consommée par un data center ou les gaz à effet de serre émis lors de la fabrication des serveurs. L'Analyse de Cycle de Vie (ACV) montre des coûts matériels et énergétiques irréductibles.

### Matériaux, serveurs et data centers

La dépendance aux infrastructures matérielles mondiales (GPU, serveurs, stockage, réseaux) reste entière. Le numérique ne peut être au mieux qu'une optimisation de l'usage, pas une suppression de l'impact matériel.

### Travail invisible, dépendances cloud et limites sociales de l'IA

L'IA repose sur des processus de production souvent opaques et soulève des risques de biais ou de perte d'autonomie (voir section 3.14). Ces impacts sociaux ne se prêtent pas à des mesures physiques simples et ne sont pas compensables par des bénéfices environnementaux.

Le projet dépend de services tiers privés. Cette dépendance crée un risque de verrouillage et une perte de souveraineté numérique qu'une action de nettoyage locale ne peut pas annuler totalement.

## Effets rebond et risques de bilan négatif

### Déplacements supplémentaires liés aux actions terrain

Un risque principal est que l'outil encourage des déplacements motorisés vers des zones lointaines, dont l'impact carbone dépasserait le bénéfice du ramassage. Ce risque est d'autant plus sérieux si la carte donne une impression de proximité sans tenir compte du mode de déplacement réel, de la fréquence des trajets ou du regroupement possible des actions. L'outil doit donc favoriser le ciblage raisonné, pas la multiplication des sorties.

### Stockage excessif de photos, fichiers et historiques

Le stockage de photos haute résolution sans durée de conservation crée une inflation numérique évitable. La priorité doit rester la preuve utile, pas l'accumulation d'images. En pratique, la persistance non bornée des fichiers alourdit aussi les sauvegardes, les exports, la bande passante et les coûts de recherche dans l'historique. Une politique de conservation courte, explicite et proportionnée évite que la preuve devienne une archive lourde sans usage.

### Fonctionnalités peu utilisées ou disproportionnées

Maintenir des services complexes (gamification, tableaux de bord redondants) consomme des ressources de compilation et de maintenance sans améliorer l'action terrain. Le problème n'est pas seulement le coût de développement initial, mais aussi la maintenance continue, la documentation, les tests et les régressions potentielles qu'ajoute chaque couche fonctionnelle. Une fonctionnalité peu utilisée devient rapidement une dette si elle exige d'être maintenue comme si elle était centrale.

### Mesures d'audience, notifications et bruit numérique

La dette numérique de CleanMyMap ne vient pas seulement des grandes briques visibles comme la cartographie, les photos ou les appels IA. Elle peut aussi provenir de postes plus diffus : mesure d'audience, observabilité, notifications, journaux d'erreurs, événements de suivi, impressions papier et supports de communication. Pris isolément, chacun de ces éléments paraît faible. C'est leur accumulation qui crée un **bruit numérique** et matériel difficile à justifier si les données collectées ou produites ne servent pas directement l'action terrain.

La sur-instrumentation constitue un premier risque. Des outils comme **PostHog** ou **Sentry** sont utiles lorsqu'ils permettent de comprendre un bug, de mesurer un parcours critique ou d'améliorer la qualité du service. En revanche, ils deviennent problématiques lorsqu'ils collectent trop d'événements, suivent des comportements peu utiles ou ajoutent des scripts sans lien clair avec une décision produit. Dans un projet de sobriété numérique, la mesure ne doit pas devenir un poste de consommation autonome. Chaque événement de mesure d'audience doit donc répondre à une question précise : aide-t-il à améliorer le signalement, la carte, l'organisation des actions, la sécurité ou la qualité des rapports ?

Le même raisonnement vaut pour les notifications. Une notification peut être légitime si elle prévient d'une action proche, d'un changement important, d'un message nécessaire ou d'un événement de coordination. Elle devient du bruit si elle sert surtout à maintenir l'attention, à relancer artificiellement l'utilisateur ou à augmenter l'engagement sans utilité environnementale réelle. Les notifications doivent donc rester rares, pertinentes, désactivables et liées à une action concrète.

Cette sobriété vaut aussi pour les emails, les relances, la gamification et les badges. Même si ce n'est pas un impact environnemental au sens strict, ce sont des mécanismes qui augmentent le temps d'écran et les micro-usages. Le numérique "engageant" devient alors contre-productif s'il détourne l'attention de l'objectif terrain et multiplie les sollicitations sans bénéfice réel.

Ce bruit numérique a aussi une dimension matérielle. Le rapport d'impact lui-même peut devenir un poste d'émission s'il est imprimé largement. Un exemplaire isolé reste modeste, mais la multiplication des tirages peut atteindre le même ordre de grandeur que certains postes numériques du projet. Un rapport d'environ 100 pages représente environ **0,4 à 0,7 kgCO₂e** s'il est imprimé en noir et blanc, recto-verso et de manière optimisée, contre environ **1 à 1,4 kgCO₂e** en couleur recto simple. Ainsi, **10 exemplaires couleur** peuvent représenter environ **10 à 14 kgCO₂e**, et **20 exemplaires couleur** environ **20 à 28 kgCO₂e**.

Ces valeurs ne doivent pas être lues comme des mesures exactes, mais comme des ordres de grandeur destinés à montrer un effet d'échelle. Un exemplaire papier peut être justifié pour une soutenance, une archive ou un usage institutionnel précis. En revanche, une impression systématique ou en couleur de nombreux exemplaires devient difficile à défendre si la version numérique suffit.

Les hypothèses retenues sont donc les suivantes :

| Support imprimé                                 | Ordre de grandeur carbone |
| ----------------------------------------------- | ------------------------: |
| 1 exemplaire noir et blanc recto-verso optimisé |      **0,4 à 0,7 kgCO₂e** |
| 1 exemplaire couleur recto simple               |        **1 à 1,4 kgCO₂e** |
| 10 exemplaires couleur                          |        **10 à 14 kgCO₂e** |
| 20 exemplaires couleur                          |        **20 à 28 kgCO₂e** |

L'analyse reste volontairement prudente, car elle ne couvre pas précisément les autres impacts : eau, fibres, bois, blanchiment, encres, toners, plastification, reliure, transport et fin de vie. Elle suffit toutefois à fixer une règle de sobriété : la version numérique du rapport doit rester la version principale, et l'impression papier doit être limitée aux besoins réels, idéalement en noir et blanc, recto-verso, avec seulement les parties pertinentes.

En synthèse, CleanMyMap doit éviter de transformer la mesure, la notification ou la documentation en nouveaux postes de consommation. Les mesure d'audience, les alertes et les impressions ne sont acceptables que s'ils servent une décision concrète, une action de terrain, une obligation de preuve ou une amélioration réelle du service.

### Dette technique future

Le couplage organisationnel et technique avec des plateformes mondiales rend la maintenance et la migration future plus complexes, augmentant le risque d'obsolescence forcée. À mesure que les choix actuels se multiplient dans les scripts, les runbooks, les schémas de données et les habitudes de déploiement, le coût d'une réécriture future augmente lui aussi. Cette dette n'est pas seulement du code à reprendre ; elle concerne aussi les outils de déploiement, les conventions internes et les dépendances humaines.

## Dépendances technologiques et stratégies de sortie

### Dépendances critiques du projet

Le triptyque **Vercel + Supabase + Clerk** porte l'hébergement, les données et l'identité. C'est le point de dépendance central du projet. Autrement dit, si l'un de ces services change de politique, de prix, de limite ou de modèle technique, le reste de l'architecture doit être ajusté en conséquence. Cette concentration technique simplifie le démarrage, mais elle accroît la sensibilité du projet à des décisions externes.

### Risques de verrouillage technique ou économique

Le verrouillage est technique (API propriétaires) mais aussi organisationnel : plus les scripts et runbooks s'appuient sur ces services, plus la migration devient coûteuse. Le risque n'est pas seulement de payer plus cher ; il est aussi de perdre de la marge de manœuvre sur l'architecture, la sécurité, la maintenance et la capacité à réorienter le projet vers une solution plus sobre.

### Stratégies de réduction de dépendance

La résilience repose sur trois niveaux :

- **Niveau 1** : Continuité minimale (exports CSV/SQL).
- **Niveau 2** : Réversibilité partielle (remplacement e-mail ou mesure d'audience).
- **Niveau 3** : Réversibilité forte (migration complète de l'hébergement et de l'auth).

### Renvoi vers les annexes techniques détaillées

Une analyse exhaustive (cartographie, risques de rupture, lecture géopolitique) est disponible en **Annexe A — Dépendances technologiques et scénarios de rupture**.

## Scénarios d'évolution et durabilité

La durabilité du projet n'existe que si une gouvernance technique stricte existe.

### Scénario de maintien sobre

Le projet reste volontairement compact : un noyau stable, des dépendances limitées, des usages mesurés et des fonctionnalités secondaires maintenues seulement si elles prouvent leur utilité. Ce scénario est le plus cohérent avec une trajectoire de long terme, car il évite d'ajouter de la complexité sans gain réel pour l'action terrain.

### Scénario d'abandon partiel ou de réduction fonctionnelle

Le site reste en ligne mais les dépendances, données et parcours ne sont plus activement maintenus.

- Coût humain : faible en apparence, élevé lors des incidents.

- Coût financier : abonnements et services oubliés.

- Coût écologique : gaspillage si données, logs, mesure d'audience et stockages continuent sans utilité.

- Risque : sécurité, RGPD, données obsolètes, mauvaise expérience utilisateur.

- Durabilité : faible. Un projet dormant devrait être archivé proprement ou réduit à une version statique.

### Scénario de réécriture future

Une réécriture devient tentante si les couches actuelles se contredisent ou si les services choisis deviennent trop coûteux.

- Coût humain : élevé, probablement plusieurs semaines à plusieurs mois.

- Coût financier : double run temporaire, migration, tests, support.

- Coût écologique : nombreux compilations, IA de développement, duplication d'environnements.

- Risque : perte de fonctionnalités utiles, régression de données, fatigue projet.

- Durabilité : mauvaise si la réécriture sert à ajouter plus de complexité; utile seulement si elle réduit drastiquement le périmètre.

### Simplifications possibles

Les simplifications les plus durables ne consistent pas à micro-optimiser chaque composant. Elles consistent à réduire les couches qui ne participent pas directement à l'utilité terrain.

Simplifications structurelles prioritaires :

1. **Définir un noyau produit non négociable** Noyau recommandé : déclarer une action, ajouter une preuve, afficher sur carte, organiser ou rejoindre une action, produire un rapport simple, modérer les données, exporter les résultats. Tout le reste devrait être classé en expérimental, optionnel ou supprimable.

2. **Mettre les fonctionnalités secondaires derrière des flags** Gamification avancée, chat, sponsor portal, sandbox, recommandations IA, vectoriel, classements ou tableaux de bord lourds ne devraient pas être chargés ni maintenus comme coeur du produit tant que leur utilité n'est pas prouvée.

3. **Réduire les services actifs** Conserver uniquement les services qui servent un usage mesuré. Par exemple : Supabase + Clerk + Resend + Sentry minimal peuvent être suffisants au début. PostHog, Pinecone, Upstash, mesure d'audience multiples ou flux de travail avancés doivent justifier leur présence par une décision concrète.

4. **Consolider la donnée** Supabase devrait devenir la source de vérité principale. Google Sheets peut rester un outil d'import/export, pas une base parallèle. Les miroirs locaux ou archives doivent être explicitement documentés comme temporaires ou de sauvegarde.

5. **Limiter les médias** Compression client stricte, dimensions maximales, formats WebP/AVIF, durée de conservation, quotas par action et suppression des doublons. C'est probablement l'un des meilleurs leviers écologiques.

6. **Alléger le interface client** Charger Leaflet, graphiques, calendrier, export image et xlsx seulement sur les pages qui en ont besoin. Les pages simples doivent rester légères.

7. **Rationaliser CI/CD** Tests rapides sur chaque PR, tests lourds programmés ou déclenchés manuellement, regroupement Dependabot, pas de aperçu complète pour changements documentaires, cache compilation contrôlé.

8. **Prévoir une sortie de service** Documenter comment exporter les données, désactiver mesure d'audience, archiver les images, couper les services logiciel en tant que service et publier une version statique si le projet ralentit.

### Matrice d'arbitrage : dette technique vs dette écologique

L'arbitrage final repose sur une matrice de décision qui compare systématiquement la dette technique créée à la dette écologique évitée ou réduite.

| Fonctionnalité                                 | Dette Technique créée      | Dette Écologique réduite          | Bilan Net   |
| ---------------------------------------------- | -------------------------- | --------------------------------- | ----------- |
| **Optimisation WebP/AVIF via script IA**       | Faible (un script de plus) | **Forte** (Bande passante -80 %)  | Positif     |
| **Refactoring Code (Complexité cyclomatique)** | Moyenne (code plus dense)  | **Moyenne** (CPU client préservé) | Positif     |
| **Système de Chatbot (IA Générative)**         | **Haute** (Dépendance API) | Nulle                             | **Négatif** |
| **Génération de carte statique**               | Faible                     | **Moyenne** (Moins de JS client)  | Positif     |

_Note : Cette matrice guide les décisions de développement. Les gains techniques sont refusés lorsqu'ils entraînent une dette écologique injustifiée._

#### Recommandations de durabilité technique

- Fixer un budget de bundle par page et mesurer les pages critiques (carte, rapport).
- Isoler les services tiers (Clerk, Supabase) derrière des modules d'adaptation pour faciliter une migration future.
- Refuser toute fonction IA applicative tant qu'un algorithme déterministe suffit.
- Appliquer une politique de rétention stricte : photos, logs et événements mesure d'audience.

## Bilan critique de l'audit technique

CleanMyMap a une utilité potentielle réelle, mais sa dette future est déjà significative parce que l'architecture vise une plateforme complète : carte, action terrain, données, reporting, partenaires, administration, observabilité, mesure d'audience, paiement, notifications et possibilités IA.

La dette écologique future ne viendra probablement pas d'une seule requête ou d'un seul serveur. Elle viendra de l'accumulation : photos conservées, cartes consultées, compilations répétés, logs, mesure d'audience, dépendances mises à jour, services logiciel en tant que service actifs, IA utilisée pour continuer à développer et fonctionnalités secondaires maintenues sans usage fort.

Cet effet rejoint le **prototype permanent** : plus l'IA rend la production facile, plus il faut résister à la tentation de conserver toutes les idées sous forme de pages, composants, routes ou services. La soutenabilité dépend alors moins de la capacité à produire vite que de la capacité à supprimer, mutualiser et refuser ce qui ajoute du volume sans ajouter d'usage.

L'effet rebond par amélioration de l'accessibilité technique est donc réel : plus l'outil rend le développement facile, plus il augmente le nombre total de projets, de maquettes et de variantes créées. Même si chaque projet individuel semble léger, la somme peut devenir importante. Le risque écologique ne tient alors pas seulement au poids d'un seul site, mais à la multiplication de sites et de services produits parce qu'ils sont devenus plus simples à fabriquer.

Le choix technique le plus durable n'est pas d'ajouter une couche verte au-dessus du projet. C'est de réduire son périmètre actif à ce qui transforme réellement une attention numérique en action locale utile. Le projet peut rester pertinent dans 5 à 10 ans s'il privilégie un noyau robuste, portable, mesurable et sobre. Il risque au contraire une obsolescence rapide s'il conserve toutes les ambitions d'une grande plateforme sans équipe, budget et gouvernance adaptés.

Conclusion nette : la durabilité réelle de CleanMyMap dépendra moins du fournisseur d'hébergement que de sa capacité à supprimer, mutualiser, mesurer et refuser les fonctionnalités qui n'augmentent pas clairement le nombre ou la qualité des actions écologiques concrètes.

Cette exigence de discernement rejoint une mise en garde classique d'Edgar Morin : « À force de sacrifier l'essentiel pour l'urgence, on finit par oublier l'urgence de l'essentiel » [@morin_essentiel_urgence]. Dans CleanMyMap, la phrase rappelle qu'un projet numérique à visée écologique peut très vite se laisser absorber par les urgences de livraison, les correctifs techniques et les ajouts de fonctionnalités, au point de reléguer sa finalité première au second plan. Le rapport doit donc préserver un ordre clair des priorités : d'abord l'impact terrain, ensuite la coordination, puis seulement les gains de productivité ou d'automatisation qui servent réellement cette finalité.
