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

{{< pagebreak >}}

# Foire aux questions {#foire-aux-questions .unnumbered}

Cette section rassemble les réponses rapides aux arbitrages les plus souvent discutés dans le rapport. Elle sert de point d'entrée avant l'analyse environnementale.

## Réponses courtes

- **Pourquoi utiliser l'IA si elle consomme de l'énergie ?** Parce qu'elle a servi à accélérer le développement, améliorer la qualité, renforcer la documentation et les tests, dans des ordres de grandeur limités à l'échelle du projet et sous contrainte de sobriété.
- **Ce projet n'ajoute-t-il pas du numérique à un problème physique ?** Ce risque existe si l'outil ne change rien au terrain. CleanMyMap n'est défendable que s'il réduit des frictions réelles : signalements dispersés, photos non centralisées, doublons, pertes d'information et coordination lente.
- **Pourquoi ne pas utiliser seulement Google Maps ou un tableur ?** Ces outils peuvent dépanner, mais ils laissent souvent les données dispersées entre cartes bricolées, fichiers, messages et photos. CleanMyMap vise à centraliser signalement, historique, preuve et coordination dans un même flux.
- **Comment éviter que le site devienne une usine à gaz ?** En gardant un noyau fonctionnel sobre et en refusant les couches plus lourdes tant qu'elles n'apportent pas de preuve d'usage.
- **Preuve des bénéfices terrain** : des indicateurs concrets permettent d'évaluer les signalements validés, les cleanwalks organisées, les participants, les déchets retirés, les zones nettoyées, les rapports transmis et les actions qui n'auraient probablement pas eu lieu sans la plateforme.
- **Que se passe-t-il si les services cloud deviennent trop chers ou indisponibles ?** C'est un risque identifié. Il est partiellement réduit par une architecture exportable, des formats simples, des fonctions désactivables et la possibilité de revenir à des usages plus sobres.

## Questions critiques sur l'usage de l'IA

### L'énergie consommée par l'IA lors du développement n'annule-t-elle pas l'impact positif du projet ?

Non, car il faut distinguer le coût de conception, ponctuel, du gain d'usage, récurrent. L'IA a consommé de l'énergie pour aider à coder et structurer CleanMyMap, mais ce coût initial a permis de sortir rapidement un outil qui coordonne des cleanwalks physiques.

### N'est-il pas contradictoire d'utiliser l'IA générative pour créer un site censé être sobre ?

Le paradoxe est apparent. L'IA a été utilisée comme outil d'optimisation pour générer des scripts de compression d'images, refactoriser le code et éliminer des dépendances inutiles. Le coût amont des requêtes IA doit rester inférieur au gain aval d'un site plus léger et plus durable.

### L'IA est-elle vraiment neutre ?

Non. Ses réponses dépendent de ses données d'entraînement, de son alignement, du contexte, de la langue et des garde-fous. Dans CleanMyMap, cela impose de limiter l'IA à des tâches d'assistance non sensibles, de relire ses sorties et de ne jamais lui déléguer une autorité décisionnelle.

### Quelle est la ligne rouge ?

L'IA peut aider, proposer et accélérer, mais elle ne doit jamais décider seule, ni devenir décorative, ni ajouter de la complexité sans gain réel.

## Questions critiques sur la sobriété du projet

### Pourquoi ne pas avoir fait un simple Google Maps ou un tableur partagé ?

Parce qu'un assemblage d'outils génériques peut suffire au démarrage, mais laisse rapidement les données éclatées entre messages, feuilles, cartes bricolées, photos et historiques incomplets. CleanMyMap devient pertinent seulement s'il unifie signalement, localisation, preuve, modération, export et mémoire des actions.

### Comment éviter l'effet « usine à gaz » typique des projets assistés par IA ?

En maintenant un noyau fonctionnel non négociable : signaler, voir, organiser, documenter, exporter. Tout ce qui relève d'animations, de tableaux de bord riches, d'IA optionnelle ou de portails secondaires doit rester subordonné à une preuve d'usage.

### Quel est le principal risque si le projet réussit ?

Paradoxalement, le succès peut accroître le coût numérique : davantage de photos, de sessions carte, d'exports, d'événements, de compilations et de demandes fonctionnelles. Le vrai enjeu n'est donc pas seulement de lancer le service, mais de conserver une discipline de sobriété quand l'usage augmente.

### Limitation des effets rebond liés aux déplacements

En faisant de la carte et de l'historique des outils d'orientation, pas de simple consultation. L'objectif est d'éviter les repérages inutiles, de mieux regrouper les actions et de concentrer les déplacements sur les interventions réellement utiles.

## Questions critiques sur l'utilité réelle de CleanMyMap

### Ce projet n'ajoute-t-il pas du numérique à un problème physique ?

Ce risque existe si l'outil ne change rien au terrain. CleanMyMap n'est défendable que s'il réduit les frictions réelles : signalements dispersés, photos non centralisées, doublons, pertes d'information, coordination lente et reporting difficile.

### Preuve des bénéfices terrain

La preuve n'est pas une impression, mais une chaîne observable : un signalement déclenche une action, l'action laisse une trace, et cette trace peut être transmise ou réutilisée. Concrètement, cela se lit dans le nombre de signalements validés, de cleanwalks organisées, de participants mobilisés, de déchets retirés, de zones nettoyées et de rapports effectivement transmis. Sans cette chaîne, CleanMyMap n'a pas de justification suffisante.

### Pourquoi ne pas utiliser seulement des outils existants comme Google Maps ou un tableur ?

Ces outils peuvent dépanner, mais ils laissent souvent les données dispersées entre cartes bricolées, fichiers, messages et photos. CleanMyMap vise à centraliser signalement, historique, preuve et coordination dans un même flux plus exploitable.

### Ce n'est qu'un site

Non. Le site n'a de sens que s'il produit un effet concret sur le terrain. S'il aide à organiser une action, à la documenter et à la rendre réutilisable, il devient un vrai outil d'engagement.

### Pourquoi ne pas faire une association ?

Parce que le besoin n'était pas de créer une structure supplémentaire. Le besoin était de concevoir un outil que plusieurs associations puissent utiliser, sans dépendre d'une seule organisation.

### Que se passe-t-il si les services cloud deviennent trop chers ou indisponibles ?

C'est un risque identifié. Il est partiellement réduit par une architecture exportable, des formats simples, des fonctions désactivables et la possibilité de revenir à des usages plus sobres sans rendre le projet dépendant d'une seule brique critique évitable.

### Qu'est-ce que le projet ne met pas encore assez en avant par rapport au DU Engagement ?

Le rapport met bien en avant la genèse du projet, la sobriété et la gouvernance, mais il insiste encore trop peu sur l'engagement comme action bénévole au service d'une communauté identifiable. Il gagnerait à montrer plus explicitement ce que le projet a apporté à des bénévoles, à des associations, à des collectivités ou à un territoire, et pas seulement à son architecture numérique.

Il devrait aussi davantage faire apparaître le retour réflexif demandé par le DU : ce que la démarche a appris, les difficultés rencontrées, les compétences acquises, les arbitrages personnels et collectifs, ainsi que les perspectives d'engagement futur. Enfin, le lien entre les ateliers DU et les décisions concrètes du projet peut encore être renforcé pour rendre visible la manière dont ces ateliers ont influencé la conception, la communication, la coordination et la preuve d'utilité terrain.

## Questions d'oral pour le jury DU Engagement

Les réponses ci-dessous sont formulées pour une prise de parole brève, simple et claire devant un jury non spécialiste du numérique ou de l'IA.

### Pourquoi CleanMyMap est-il un vrai projet d'engagement et pas seulement un projet numérique ?

Parce qu'il répond à un besoin concret de terrain : mieux signaler, mieux coordonner et mieux documenter des actions bénévoles utiles. L'objectif n'est pas de faire une démonstration technique, mais de faciliter une action citoyenne qui existe déjà et de lui donner plus de lisibilité.

### En quoi votre engagement sort-il du cadre associatif classique, et à quelle échelle le projet agit-il aujourd'hui ?

Je ne porte pas une association unique. Je construis un outil autonome qui peut servir plusieurs associations, leurs bénévoles et leurs besoins de coordination. Aujourd'hui, le projet est d'abord pensé à l'échelle de l'Île-de-France ; pour devenir pleinement utile, il doit pouvoir monter à une échelle métropolitaine, puis éventuellement à d'autres territoires, y compris à l'international si le contexte le permet.

### Comment le projet reste-t-il soutenable financièrement ?

Pour l'instant, l'abonnement Codex est auto-financé et la plupart des services web utilisés restent sur des plans gratuits ou inclus. Cela suffit pour une version encore limitée du projet. En revanche, si CleanMyMap dépasse l'échelle de Paris, il faudra prévoir au moins des abonnements basiques, autour de 20 euros par mois et par service concerné, pour garder quelque chose de stable et maintenable.

### Envisagez-vous une version mobile Android et iOS après le site web ?

Oui, mais seulement une fois le site web stabilisé et utile au quotidien. CleanMyMap contient désormais une application mobile destinée aux bénévoles, notamment pour le formulaire, la discussion, les notifications et certains usages de terrain. Cette application issue de l'ancien `companion-app` est actuellement gelée fonctionnellement ; son évolution produit reste à valider. Il faut aussi compter le coût des comptes développeur : Apple facture l'Apple Developer Program à **99 USD par an**, tandis que Google Play Console demande une **inscription unique de 25 USD** pour publier sur Android. [Apple Developer Program](https://developer.apple.com/help/account/membership/program-enrollment) ; [Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en-EN). Le projet aurait donc un budget plus élevé que la simple version web, avec des abonnements, de la maintenance et possiblement des frais supplémentaires pour les services mobiles et de géolocalisation.

### Comment comptez-vous faire connaître l'outil et le faire utiliser par des partenaires ?

Je compte m'appuyer d'abord sur des partenaires de terrain qui ont déjà un intérêt concret pour l'outil: associations, collectifs locaux, relais universitaires ou acteurs de proximité. L'idée n'est pas de faire une diffusion abstraite, mais de montrer l'outil sur des cas réels, de lancer un usage pilote, puis de laisser les résultats parler. Si le service est simple, utile et fiable, les partenaires peuvent ensuite le relayer à leur réseau, et c'est ce qui donne une adoption plus durable.

### À qui le projet sert-il concrètement, et qu'est-ce qu'il change sur le terrain ?

Il sert d'abord aux bénévoles, aux associations et, selon les cas, aux collectivités ou aux acteurs locaux qui veulent mieux organiser leurs actions. Concrètement, il réduit la dispersion des informations, évite de perdre des signalements et rend les actions plus faciles à suivre dans le temps.

### Qu'avez-vous apporté personnellement au projet ?

J'ai apporté le cadrage, la construction progressive de l'outil et le travail de mise en cohérence entre l'idée, la méthode et le résultat. J'ai aussi dû arbitrer entre simplicité, utilité et faisabilité, ce qui fait partie de l'apprentissage attendu dans un projet d'engagement.

### Qu'avez-vous appris grâce au DU Engagement ?

J'ai appris à ne pas regarder seulement le résultat final, mais aussi la manière de construire un projet utile pour les autres. Le DU m'a aidé à relier un projet concret, une réflexion sur l'engagement, et une exigence de présentation claire devant un public non technique.

### Que montrent les ateliers et les journaux DU dans votre démarche ?

Ils montrent que le projet n'a pas été improvisé. Ils gardent la trace des idées, des corrections, des hésitations et des décisions prises au fil du temps, ce qui rend la démarche plus lisible et plus honnête.

### Pourquoi avoir utilisé l'IA alors que le projet défend aussi la sobriété ?

Parce que l'IA n'a pas été utilisée comme une fin en soi, mais comme un outil d'aide. Je l'ai gardée sur des tâches où elle apportait un vrai gain de temps ou de clarté, tout en évitant de lui déléguer les décisions importantes.

### Comment avez-vous évité que le projet devienne trop complexe ou inutilement lourd ?

En gardant une règle simple : chaque fonctionnalité devait avoir une utilité réelle pour le terrain. Si une idée ajoutait surtout du bruit, de la dépendance ou de la complexité sans effet concret, elle était écartée ou mise de côté.

### Qu'est-ce qui prouve que le projet a une utilité réelle ?

L'utilité se voit dans la capacité à centraliser des signalements, à mieux suivre les actions, et à rendre les résultats plus faciles à transmettre. Le projet ne se justifie pas par son aspect technique, mais par sa capacité à rendre l'action bénévole plus lisible et plus utile.

### Quel est votre rôle exact ?

Je porte la conception de l'outil, son cadrage, sa cohérence et sa mise en forme. Mon engagement passe par la construction d'un support utile à d'autres, pas par l'appartenance à une association unique.

### Qu'est-ce qui différencie votre site des autres outils déjà existants ?

La différence, ce n'est pas une fonction isolée, mais l'assemblage des fonctions autour d'un vrai besoin de terrain. CleanMyMap relie signalement, coordination, suivi et trace d'action dans un cadre pensé pour plusieurs associations, avec un usage simple et sobre. Beaucoup d'outils existants font une partie du travail, mais pas avec cette logique d'engagement partagé et de réutilisation collective.

### Quelles sont les limites actuelles de CleanMyMap ?

Le projet dépend encore de son usage réel sur le terrain, donc il n'a de valeur que s'il est effectivement utilisé. Il reste aussi des limites classiques du numérique : dépendance à certains services, besoin de maintenance et risque de complexité si on ajoute trop de fonctionnalités.

### Si vous aviez plus de temps, quelle serait la prochaine amélioration prioritaire ?

Je renforcerais d'abord ce qui aide vraiment les utilisateurs à passer à l'action: preuve d'impact, suivi simple des actions et continuité entre signalement, coordination et bilan. Je privilégierais une amélioration qui augmente l'utilité réelle plutôt qu'une nouvelle couche d'interface ou de fonctions.

### Utilisation de l'IA

Ces réponses servent à expliquer le rôle de l'IA sans surjouer sa place dans le projet.

#### Pourquoi avoir utilisé l'IA alors que le projet défend aussi la sobriété ?

Parce que la sobriété ne veut pas dire renoncer à tout outil, mais choisir des outils proportionnés. L'IA a été utilisée seulement quand elle permettait de gagner du temps, de clarifier une idée ou d'améliorer la qualité sans alourdir inutilement le projet.

#### Comment éviter que l'IA prenne trop de place dans le projet ?

En gardant une règle simple : l'IA propose, mais l'humain décide. Je m'en sers comme d'un appui pour travailler plus vite ou plus proprement, pas pour remplacer la réflexion, la validation ou la responsabilité du projet.

#### Qu'est-ce que l'IA a réellement apporté à CleanMyMap ?

Elle a surtout aidé à structurer, corriger, documenter et accélérer certaines tâches répétitives. Le gain visible n'est pas "plus d'IA", mais un projet plus propre, plus rapide à faire évoluer et moins fragile dans la durée.

### Gestion du projet

Ces réponses servent à expliquer comment le projet a été piloté dans la durée.

#### Comment avez-vous géré un projet aussi long et parfois complexe ?

En avançant par étapes courtes, avec des priorités claires et des retours réguliers sur ce qui servait vraiment le projet. J'ai essayé d'éviter la dispersion en revenant toujours à la même question : est-ce que cela aide concrètement l'utilisateur ou le terrain ?

#### Comment avez-vous pris les décisions importantes ?

Je les ai prises à partir de trois critères simples : utilité, faisabilité et sobriété. Quand une idée était trop lourde, trop floue ou peu utile, je la repoussais ou je l'écartais.

#### Comment les ateliers DU ont-ils influencé la gestion du projet ?

Ils m'ont donné un cadre pour prendre du recul et mieux formuler les objectifs. Ils ont aussi aidé à transformer des intuitions en arbitrages plus clairs, notamment sur la manière de présenter le projet, de le relier à l'engagement et de justifier ses choix.

#### Comment réagissez-vous quand un jury ou un interlocuteur sceptique dit que ce n'est "qu'un site" ?

Je réponds que le site n'a de sens que s'il produit un effet concret sur le terrain. S'il ne fait que présenter une idée, il est dispensable ; s'il aide à organiser une action, à la documenter et à la rendre réutilisable, alors il devient un vrai outil d'engagement.
