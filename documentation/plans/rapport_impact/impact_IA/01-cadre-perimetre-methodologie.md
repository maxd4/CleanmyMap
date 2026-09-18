# Partie I — Cadre, périmètre et méthodologie {#partie-i-cadre-perimetre-et-methode}

Cette partie fixe le cadre de preuve du bilan : ce qui est directement mesuré dans le dépôt, ce qui relève d'une hypothèse déclarative, les ordres de grandeur retenus et les limites de validité de l'exercice. Elle est structurée en deux temps : d'abord la genèse, les objectifs et le périmètre du projet ; ensuite la méthodologie qui sert à interpréter les impacts.

## Genèse, objectifs et périmètre du projet

### Genèse du projet et contexte universitaire

CleanMyMap a été initié dans le cadre du Diplôme Universitaire « Engagement » de Sorbonne Université. Les ateliers suivis ont accompagné un passage d'un prototype centré sur la cartographie vers un outil plus large d'action citoyenne, de coordination et de transmission. Le développement a commencé dans un fichier Python sur Google Colab avec un objectif initial limité : récupérer des bilans d'action depuis un fichier Excel partagé, puis afficher ces bilans et les tracés associés sur une carte Leaflet.

Le cadre du DU a structuré la démarche autant que le sujet. Cette formation évalue un engagement étudiant à travers des ateliers d'accompagnement, un dossier réflexif et un oral de validation. Dans le cas de CleanMyMap, les fichiers de type `journal_DU` et `atelier_DU` constituent des traces de travail qui documentent la progression du projet, ses arbitrages successifs et la formalisation progressive de ses objectifs.

À cette phase, le modèle de langage chinois DeepSeek a servi à générer les premières lignes de code, mais la faible fenêtre de contexte du modèle a entraîné des boucles d'erreurs. La découverte progressive de Codex, GitHub et du vibe coding a ensuite transformé la méthode de travail. Le projet est passé d'une expérimentation locale à un projet web source ouverte déployé gratuitement sur Streamlit, puis stabilisé par l'achat d'un nom de domaine sur LWS.

Cette trajectoire montre une construction progressive, liée à l'apprentissage du développement assisté par IA autant qu'au sujet du projet lui-même. Les ateliers du DU ont aussi nourri la suite du travail d'évaluation et la réflexion sur les arbitrages de sobriété, d'utilité et de gouvernance.

### Chronologie du projet

- Fin février : prototype de cartographie et rapport d'impact sur Google Colab relié à un fichier Excel.
- Mars : structuration du projet vers un site web et découverte de l'écosystème du « vibe coding ».
- Avril : stabilisation de toutes les pages du site web et correction des bugs.
- Mai : finalisation et mise en fonctionnement des rubriques importantes, dont la homepage, le formulaire, le mail, la centralisation UI couleur et texte, le rapport d'impact, le ruban de navigation et la partie juridique.
- Juin : visioconférences avec des partenaires, application de l'UI de plusieurs pages très belles générées par ChatGPT LLM 5.5, travail de fond sur la page méthodologie, Trash Spotter, la météo et le rapport d'impact, création du formulaire de groupe et optimisation des appels Vercel et Supabase pour économiser les quotas gratuits avant une utilisation grand public.

### Objectifs fonctionnels de CleanMyMap

CleanMyMap n'a pas pour seul but d'afficher une carte. Le site doit organiser des données utiles à l'action de terrain, faciliter la coordination entre bénévoles et associations, et fournir des outils de pilotage proportionnés à un usage réel. Le projet s'articule autour de rubriques complémentaires :

- Accueil : tableau de bord, navigation générale, badges et informations clés.
- Agir : déclaration d'action, itinéraire, signalement, météo de terrain et priorisation.
- Visualiser : carte communautaire et environnement sécurisé de test.
- Impact : génération de rapports par compte, association, territoire ou ville.
- Réseau : cartographie partenariale, communauté et observatoire public.
- Échanges : discussion et messages privés.
- Apprendre : ressources pédagogiques, quiz et contenus de vulgarisation.
- Piloter : décision, gouvernance et configuration pour les administrateurs.

Cette organisation relie l'usage opérationnel à une logique de gouvernance responsable. Elle sert aussi à distinguer les fonctionnalités qui créent une utilité terrain de celles qui relèvent surtout de l'agrément d'usage ou du confort d'interface.

Le rapport distingue aussi deux plans d'usage de l'IA. Le premier concerne l'IA utilisée pour développer CleanMyMap : génération ou refactorisation de code, documentation, tests, rédaction, analyse technique et assistance à la conception. Le second concerne l'IA intégrée au site lui-même : par exemple un itinéraire IA, une recommandation automatique, un résumé d'action ou une aide conversationnelle exposée aux utilisateurs. Le premier plan relève du coût de production du projet ; le second relève du coût d'usage et de la valeur fonctionnelle du produit.

Ces usages ne sont pas théoriques : ils correspondent déjà à des routes et composants du dépôt, par exemple `apps/web/src/app/(app)/actions/new/page.tsx`, `apps/web/src/app/(app)/actions/map/page.tsx`, `apps/web/src/app/(app)/actions/history/page.tsx`, `apps/web/src/app/reports/page.tsx` et `apps/web/src/app/learn/hub/page.tsx`.

### Périmètre technique observé

- interface client : Next.js 16, React 19, Tailwind, Leaflet, Recharts, Framer Motion
- serveur/API : routes API Next.js
- Auth : Clerk côté web et côté application mobile, Supabase comme plan de données partagé
- Base de données : Supabase, migrations SQL, scripts d'import/sync
- mesure d'audience : PostHog, Vercel mesure d'audience, Speed Insights
- Observabilité : Sentry
- Email : Resend
- Paiement/dons : Stripe
- Infra complémentaire : Upstash Redis/QStash, Pinecone déclaré, Vercel
- Mobile : app Expo/React Native connectée à Supabase
- héritage : Python, SQLite, scripts, tests historiques et fichiers textes du développeur

Le périmètre étudié couvre le développement principal jusqu'au 13 mai 2026, puis la rédaction et la consolidation du rapport jusqu'au 16 mai 2026. Cette seconde phase est distincte du produit lui-même, mais utile pour documenter les arbitrages, les limites et les choix de méthode. Les chiffres retenus ici servent de repères de cadrage, pas de mesure exhaustive de toute l'activité du projet.

## Méthodologie d'évaluation

Cette sous-partie précise comment le rapport construit ses indicateurs et quelles limites il s'impose. L'objectif est de mesurer ce qui peut l'être, d'estimer ce qui ne peut pas l'être directement, et de signaler clairement ce qui reste hypothétique.

### Principes méthodologiques

Le bilan repose sur une distinction stricte entre ce qui est mesuré directement dans le dépôt, ce qui est reconstruit par hypothèse et ce qui reste incertain. Les mesures directes concernent surtout la structure du dépôt, les fichiers, les lignes, les routes, les dépendances et les services déclarés. Les estimations concernent le temps de travail assisté par IA, la part des usages, les consommations et les effets indirects. Les incertitudes couvrent notamment le nombre réel de requêtes, les modèles effectivement utilisés, la durée cumulée des sessions et les régions de calcul mobilisées.

### Périmètre d'impact retenu

Le périmètre d'impact retenu inclut le développement assisté par IA, l'hébergement, le stockage, les appels API, les services tiers, les compilations, les usages visibles et les usages futurs plausibles lorsqu'ils restent attribuables au projet. Il exclut en revanche les effets trop éloignés du système étudié, les hypothèses non documentables et les scénarios qui ne reposent sur aucun signal technique ou organisationnel. Cette délimitation est nécessaire pour éviter de confondre un audit avec une extrapolation générale sur tout le numérique.

L'approche retenue ne réduit pas l'impact à l'électricité ou au carbone. Elle prend aussi en compte l'eau, le matériel, les dépendances, la maintenance et les effets de cycle de vie lorsqu'ils peuvent être discutés de façon prudente. Le but n'est pas de produire une somme pseudo-exacte, mais d'obtenir un cadre d'évaluation défendable.

### Construction des indicateurs

L'indicateur central du rapport est l'IUR, pour Indice d'Utilité Réelle. Il se formule simplement ainsi : **IUR = Impact terrain / Coût numérique global**. Le numérateur regroupe les effets utiles observables sur le terrain, comme les déchets localisés ou retirés, les actions réalisées, les zones nettoyées, les participants mobilisés et les rapports effectivement transmis. Le dénominateur regroupe les coûts numériques et matériels estimés, notamment l'énergie, le CO₂e, l'eau, le stockage, les transferts et les services tiers.

L'IUR sert à comparer des versions du projet plutôt qu'à produire une vérité absolue. Une fonctionnalité devient plus défendable si elle augmente l'utilité terrain sans alourdir inutilement le coût numérique. À l'inverse, une fonctionnalité qui multiplie les scripts, les pages, les images, les requêtes ou les services sans effet terrain mesurable dégrade l'arbitrage global. Cette logique est complétée par des indicateurs auxiliaires de productivité, de sobriété et de bénéfice terrain, qui permettent d'évaluer si le développement assisté par IA crée une capacité utile ou seulement un volume de production.

### Scénarios d'évaluation

Les évaluations sont lues selon trois scénarios : bas, médian et haut. Le scénario bas sert de borne prudente pour éviter de surestimer l'impact ou le gain. Le scénario médian sert de base de travail et porte la conclusion principale du rapport. Le scénario haut sert de test de robustesse : il vérifie que la conclusion reste valable même lorsque les hypothèses sont défavorables.

Les calculs s'appuient sur des données observables dans le dépôt, sur des hypothèses d'usage de l'IA et sur des fourchettes d'intensité énergétique, carbone, hydrique et matérielle issues de la littérature. Le rapport retient volontairement des ordres de grandeur plutôt que des valeurs trop précises, afin de rester prudent sur un sujet où la mesure directe reste partielle.

## Données observées et hypothèses

### Données observées du dépôt

Le dépôt fournit une photographie du projet à l'instant du relevé. Il contient **1 226 fichiers source** et **212 520 lignes source** hors dépendances, compilations, documentation, fichiers publics et lockfiles. Cette photographie inclut principalement le code applicatif, les scripts, la configuration et les fichiers de travail utiles à l'audit.

| Métrique                       | Valeur (Photographie du dépôt) |
| ------------------------------ | ------------------------------ |
| **Fichiers source (filtrés)**  | **1 226**                      |
| **Lignes source totales**      | **212 520**                    |
| TypeScript / React (.ts, .tsx) | 146 708                        |
| SQL / Supabase (.sql)          | 2 189                          |
| Python / Scripts (.py, .mjs)   | 17 953                         |
| Style / CSS (.css)             | 1 383                          |
| Autres (Markdown, JSON, etc.)  | 44 287                         |

| Historique Git                            | Valeur         |
| ----------------------------------------- | -------------- |
| Validations Git depuis le début du projet | 202            |
| Insertions totales                        | 478 544 lignes |
| Suppressions totales                      | 276 107 lignes |

Le dépôt a donc connu un churn important : de nombreuses lignes ont été ajoutées, supprimées, réécrites ou déplacées avant d'arriver à l'état observé. Ce volume de remaniement est cohérent avec un développement itératif assisté par IA, fondé sur des essais, des corrections successives et des refactorisations progressives.

Le projet a été créé le 20 février 2026 et la période active retenue s'étend jusqu'au 16 mai 2026, soit environ **12,1 semaines**. Sur cette base, l'hypothèse de travail retient environ **100 h** de développement assisté par IA, auxquelles s'ajoutent environ **20 h** de rédaction, restructuration et intégration documentaire. Cela correspond à environ **8,2 h/semaine** pour la seule partie assistée par IA et à un impact total estimé de **100 kWh**, **20 kgCO₂e** et **100 L d'eau**, soit environ **8,2 kWh**, **1,6 kgCO₂e** et **8,2 L par semaine** sur l'intervalle retenu. Ces chiffres ne décrivent pas une productivité universelle : ils servent à cadrer la suite du raisonnement.

### Estimation de l'assistance IA

L'assistance IA n'est pas mesurée comme un temps machine exact. Le rapport repose sur des ordres de grandeur, des journaux partiels, des traces de travail et une reconstruction prudente des usages. Il faut donc distinguer trois modes d'utilisation rencontrés dans le projet : l'abonnement, la clé API et l'exécution locale. Ces trois modes donnent accès à des modèles d'IA, mais ils ne produisent ni les mêmes coûts ni les mêmes niveaux de traçabilité.

Le développement n'a pas reposé sur un seul modèle ni sur une seule plateforme. Plusieurs terminaux, plusieurs modèles et plusieurs comptes ont été sollicités, ce qui fragmente la vision globale de l'usage et limite la précision des estimations. La répartition horaire retenue reste donc indicative :

| Outil / mode                                   | Part horaire estimée | Heures sur 100 h | Usage principal                                            |
| ---------------------------------------------- | -------------------- | ---------------- | ---------------------------------------------------------- |
| ChatGPT / Codex / modèle de langage équivalent | 50 %                 | 50 h             | cadrage, génération, refactor, documentation, débogage     |
| Autres modèles de code                         | 20 %                 | 20 h             | UX, plans d'améliorations, modularisation, documentation   |
| GPT-5.4 mini — développement du site           | 20 %                 | 20 h             | instructions, réflexions, sources, rédaction du rapport IA |
| Outils non IA mais induits par l'usage IA      | 10 %                 | 10 h             | tests, validation, ajustements après propositions IA       |

Les ratios de productivité qui en découlent sont des ratios apparents, pas des mesures de performance humaine. Ils agrègent du code utile, du code remplacé, du refactor, de la configuration, du SQL, des scripts, du Markdown et du churn Git. Ils montrent surtout que la quantité produite doit toujours être relue à la lumière de la maintenabilité, de la qualité et du gain réel pour le projet.

### Hypothèses environnementales

La consommation électrique du développement assisté par IA dépend de plusieurs couches : temps d'inférence, nombre de relances, compilations, tests, CI/CD, aperçus, stockage et consultation de documentation. L'estimation ne sépare pas parfaitement ces couches. Elle agrège l'usage IA, le travail de développement induit et les effets techniques associés, ce qui est compatible avec un ordre de grandeur défendable mais pas avec un inventaire exhaustif.

Le rapport retient donc une lecture prudente de l'impact environnemental. Il ne faut pas réduire l'IA au seul carbone, ni présenter l'eau comme si elle était mesurée précisément lorsque ce n'est pas le cas. L'évaluation doit aussi intégrer le matériel, les dépendances, la maintenance et les effets de cycle de vie lorsqu'ils sont pertinents. L'approche rejoint ainsi une logique d'ACV, c'est-à-dire d'analyse du cycle de vie, même si le niveau de détail reste volontairement adapté au périmètre du rapport.

Nous verrons que les ordres de grandeur d'impact écologique a retenir sont de l'ordre de **100 à 400 kWh**, **20 à 160 kgCO₂e** et **100 à 1 000L** par trois mois de devellopement du site web. Ces plages sont a titre indicatif au vu de la propagande probable autour de la bulle IA et des approximations de temps de travail et de token utilisés pour le developpement du site web. Ils servent à comparer des choix et à discuter des arbitrages, pas à produire une certification. Ils doivent être réévalués si des logs d'usage, des factures cloud, des métriques de stockage ou des données fournisseurs deviennent disponibles.

### Stratégies de réduction déjà appliquées ou prévues

Une partie de la stratégie de réduction consiste à utiliser l'IA de manière plus sobre, plus ciblée et plus contrôlée. Lorsque la tâche ne demande pas le niveau de raisonnement maximal, un modèle d'inférence plus sobre peut être préféré à un modèle plus lourd ; à l'inverse, les modèles plus puissants sont réservés aux tâches réellement complexes. La logique n'est pas de bannir l'IA, mais de limiter son usage aux tâches où elle crée un gain net.

Cette stratégie repose aussi sur la discipline des instructions et des outils. Les demandes larges et floues doivent être évitées au profit de lots précis, plus courts et plus faciles à relire. L'usage du CLI ou d'un environnement dédié est préférable pour le code ; le portail de discussion est plus adapté aux questions de conception, de synthèse ou d'explication courte. Chaque patch doit être relu avant acceptation.

- utiliser l'outil le plus sobre suffisant pour la tâche ;
- réserver les modèles plus lourds aux besoins réellement complexes ;
- découper les demandes en lots précis ;
- éviter les instructions trop larges ;
- relire chaque patch avant acceptation ;
- réduire les boucles de correction inutiles ;
- limiter les compilations, aperçus et relances provoqués par de simples changements documentaires.

## Limites méthodologiques et contrôles futurs

### Incertitudes principales

Les principales incertitudes concernent le nombre réel de requêtes IA, leur type, la localisation effective des calculs, la part de modèles légers ou lourds, le volume de compilations déclenchés par les itérations, le stockage réel des photos en production, le trafic futur sur les cartes et rapports, ainsi que le nombre d'actions terrain réellement attribuables à CleanMyMap.

Le rapport reste aussi limité par l'opacité de certains fournisseurs : l'énergie mobilisée, la ventilation fine des sessions et la contribution exacte des services tiers ne sont pas observables directement. Cette limite impose une lecture prudente des chiffres et interdit de confondre estimation et mesure.

### Risques de surestimation ou de sous-estimation

Le risque de surestimation vient surtout du fait qu'un même volume de code peut inclure du contenu utile, du contenu remplacé et du churn, ce qui gonfle les ratios de productivité apparente. Le risque de sous-estimation existe à l'inverse lorsque les coûts indirects sont invisibles : appels API, stockage, services tiers, services cloud, usage futur ou dépendances peu traçables.

Le rapport évite aussi deux biais classiques : confondre la vitesse de production avec la valeur créée, et confondre une baisse apparente du carbone avec une baisse globale de l'impact. Une estimation prudente doit rester sensible aux incertitudes de mesure, à la diversité des outils utilisés et à la variabilité des contextes d'exécution.

### Contrôles futurs à mettre en place

Pour une version plus instrumentée, les contrôles les plus utiles seraient :

- journal mensuel des usages IA par type de tâche ;
- export des durées et fréquences de compilations ;
- mesure du poids des pages principales ;
- volume mensuel de stockage photo ;
- nombre d'exports ou rapports réellement téléchargés ;
- nombre de signalements transformés en actions ;
- suivi des impressions physiques du rapport ;
- estimation plus fine par utilisateur ou par type d'usage.

Ces contrôles permettraient de transformer les ordres de grandeur en mesures plus solides sans changer le cadre de raisonnement.

### Statut du rapport

Le rapport doit être lu comme un document évolutif. Les hypothèses retenues à ce stade sont suffisamment robustes pour soutenir un audit, mais elles doivent être affinées à mesure que l'usage réel du site produit de nouvelles données. Les sections quantitatives, les scénarios et les recommandations sont donc appelés à être révisés si des éléments mesurables plus précis deviennent disponibles.