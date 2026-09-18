# Partie IV — Pouvoir économique, infrastructures, souveraineté et régulation de l'IA {#partie-iv-pouvoir-infrastructures-et-souverainete-numerique}

Cette partie analyse l'intelligence artificielle comme un **système industriel, économique et géopolitique**. Les modèles ne fonctionnent pas isolément : ils reposent sur des semi-conducteurs, des équipements de fabrication, des centres de données, de l'énergie, des réseaux, des services cloud, des corpus de données, des logiciels et des plateformes de distribution.

L'enjeu central n'est donc pas seulement de savoir quels modèles sont les plus performants. Il faut aussi examiner **qui contrôle les ressources nécessaires à leur développement et à leur déploiement, quelles dépendances se créent entre les acteurs, quelles possibilités de sortie subsistent et comment les pouvoirs publics tentent de préserver la concurrence, la résilience et la capacité d'action collective**.

Les conséquences humaines directes — travail, biais, vie privée, création, désinformation, anthropomorphisation, éducation et science — sont traitées en partie III. Les risques techniques de sécurité, d'agents, de code généré, de secrets ou d'exploitation logicielle sont traités en partie V. La présente partie se concentre sur les **structures de pouvoir et de dépendance**.

## Cadre de lecture : de la chaîne de valeur au pouvoir de marché

L'écosystème IA peut être représenté comme une chaîne de valeur composée de plusieurs couches interdépendantes :

```{mermaid}
%%| fig-cap: "Chaîne de valeur simplifiée de l'intelligence artificielle"
%%| fig-width: 10
flowchart LR
  A["Équipements de fabrication<br/>lithographie, matériaux"] --> B["Fabrication de puces"]
  B --> C["Accélérateurs et serveurs"]
  C --> D["Centres de données<br/>énergie, réseau"]
  D --> E["Cloud / capacité de calcul"]
  E --> F["Modèles de fondation"]
  F --> G["API, agents et outils"]
  G --> H["Applications et utilisateurs"]
  I["Données et compétences"] --> F
  I --> G
```

L'OCDE souligne que cette chaîne combine plusieurs caractéristiques favorables à la concentration : **coûts fixes élevés, économies d'échelle et de gamme, barrières à l'entrée, intégration verticale, partenariats croisés, demande de calcul très élevée et dépendance à des fournisseurs spécialisés** [@oecd_ai_infrastructure_2025].

Cette concentration n'est toutefois pas uniforme. Certaines couches, en particulier les modèles et les applications, peuvent connaître une concurrence rapide et des changements de leadership, tandis que les couches physiques les plus capitalistiques — équipements de fabrication, fonderies avancées, accélérateurs ou cloud à grande échelle — restent beaucoup plus difficiles à reproduire.

L'analyse doit donc éviter deux simplifications :

- **concentration ne signifie pas absence totale de concurrence** ;
- **innovation rapide ne signifie pas automatiquement marché contestable**.

La question pertinente est la capacité d'un nouvel acteur ou d'un utilisateur à accéder aux intrants essentiels, à changer de fournisseur et à développer une solution concurrente sans dépendre des conditions imposées par un nombre très réduit d'intermédiaires.

## Infrastructures critiques et goulots d'étranglement

### Semi-conducteurs et équipements spécialisés

L'IA moderne dépend fortement d'accélérateurs spécialisés et d'une chaîne industrielle complexe : conception de puces, logiciels de calcul, fabrication avancée, mémoire à haute bande passante, équipements lithographiques, assemblage et intégration dans des serveurs.

**Analyse institutionnelle.** L'OCDE documente une concentration très élevée à plusieurs niveaux de cette chaîne. Dans certains segments étudiés, un seul fournisseur représente plus de 80 % du marché rapporté ; dans d'autres, les trois premiers acteurs dépassent collectivement 60 % [@oecd_ai_infrastructure_2025].

Cette concentration s'explique en partie par les investissements considérables nécessaires pour atteindre les frontières technologiques, les longues courbes d'apprentissage, la rareté de certains équipements, l'importance des écosystèmes logiciels et les délais de construction de nouvelles capacités.

Le risque systémique n'est pas qu'une entreprise « contrôle toute l'IA ». Il réside plutôt dans la possibilité qu'un **petit nombre de goulots d'étranglement** conditionnent l'accès au calcul avancé.

### Centres de données, énergie et réseaux

Une puce seule ne constitue pas une infrastructure IA. Les accélérateurs doivent être installés dans des centres de données disposant d'énergie, de refroidissement, de stockage et de réseaux à très haut débit.

Ces infrastructures demandent des investissements lourds et des délais importants. Leur localisation dépend de contraintes physiques : disponibilité électrique, connexion au réseau, foncier, refroidissement, télécommunications et autorisations.

Cette dimension matérielle est étudiée du point de vue environnemental dans la partie II-B. Ici, elle importe surtout parce qu'elle peut devenir une **source de pouvoir économique** : un acteur qui sécurise à grande échelle du calcul, de l'électricité ou des capacités de centre de données peut disposer d'un avantage difficile à reproduire rapidement [@oecd_ai_infrastructure_2025].

### Cloud et accès au calcul

Les fournisseurs cloud jouent un rôle d'intermédiaire entre l'infrastructure physique et de nombreux développeurs. Ils permettent d'accéder à des GPU, des services de stockage, des bases de données et des outils IA sans construire sa propre infrastructure.

Cette mutualisation présente des avantages importants :

- réduction de l'investissement initial ;
- capacité à monter ou descendre rapidement en charge ;
- maintenance matérielle externalisée ;
- accès à des services complexes pour de petites équipes.

Elle crée en parallèle une dépendance contractuelle et technique : modèle de facturation, interfaces propriétaires, régions disponibles, conditions de sortie, formats de données, services managés spécifiques et intégrations avec d'autres couches de la plateforme.

## Concentration économique et contestabilité

### Pourquoi la concentration apparaît

Les marchés liés à l'IA cumulent plusieurs mécanismes susceptibles de renforcer les acteurs déjà établis :

1. **coûts fixes élevés** pour les puces, les centres de données et l'entraînement de grands modèles ;
2. **économies d'échelle**, qui permettent d'amortir ces coûts sur de nombreux clients ;
3. **économies de gamme**, lorsqu'un même fournisseur combine cloud, données, modèles, outils et distribution ;
4. **effets d'écosystème**, liés aux logiciels, aux API, aux compétences disponibles et aux intégrations ;
5. **accès privilégié à certains intrants**, notamment calcul, données ou canaux de distribution ;
6. **coûts de changement**, lorsque les applications deviennent étroitement liées à des services propriétaires.

L'OCDE considère que ces caractéristiques peuvent créer des risques de verrouillage, d'exclusion de concurrents, de bundling ou de préférence accordée aux services appartenant au même groupe [@oecd_ai_infrastructure_2025].

### Intégration verticale et partenariats

Un même groupe peut intervenir à plusieurs niveaux : cloud, conception d'accélérateurs, financement de développeurs de modèles, distribution d'assistants, systèmes d'exploitation ou outils de productivité.

Cette intégration peut produire de vraies économies d'efficacité : meilleure optimisation de la pile, baisse de certains coûts, intégration plus simple pour l'utilisateur. Elle peut aussi rendre plus difficile la distinction entre une **efficacité technique** et un **avantage structurel lié au contrôle simultané de plusieurs couches**.

Les partenariats entre fournisseurs de cloud et développeurs de modèles doivent être analysés avec la même prudence. Ils peuvent fournir à une jeune entreprise le capital et le calcul nécessaires pour concurrencer les acteurs établis, tout en créant des dépendances financières, commerciales ou techniques durables.

### Marchés dynamiques, risques structurels persistants

La concentration n'évolue pas de la même façon partout. Les modèles de fondation et les applications peuvent connaître une innovation rapide, des baisses de prix et l'apparition de nouveaux concurrents. À l'inverse, les infrastructures physiques ont des cycles d'investissement plus longs et des barrières beaucoup plus élevées.

Il serait donc excessif de décrire l'ensemble du secteur comme un monopole figé. La préoccupation porte plutôt sur la **contestabilité dans le temps** : un marché aujourd'hui dynamique peut se fermer si l'accès aux intrants, au financement, aux données ou à la distribution devient durablement contrôlé par quelques acteurs.

## Verrouillage fournisseur, interopérabilité et réversibilité

### Le verrouillage ne se limite pas aux données

Un changement de fournisseur peut être coûteux même lorsque les données sont techniquement exportables.

Les coûts de sortie peuvent venir de :

- formats ou API spécifiques ;
- fonctions managées impossibles à reproduire exactement ailleurs ;
- schémas d'identité propres à une plateforme ;
- workflows de déploiement ;
- dépendances à un SDK ;
- différences de comportement entre modèles ;
- compétences acquises sur un écosystème donné ;
- frais ou délais de transfert ;
- indisponibilité d'un service équivalent.

Le verrouillage est donc un **continuum**, pas une propriété binaire.

### Le rôle du Data Act européen

La politique européenne traite explicitement ce problème. Le Data Act prévoit des obligations visant à faciliter le changement entre services de traitement de données, y compris les services cloud, et à réduire les obstacles contractuels ou techniques au changement de fournisseur [@commission_européenne_data].

Pour les services concernés, cela inclut notamment des exigences relatives à l'export des données, aux interfaces, à l'interopérabilité et à la suppression progressive de certains frais de changement.

Ces règles ne rendent pas toutes les architectures instantanément portables. Une application peut rester fortement couplée à une API ou à une fonction propriétaire. Elles créent néanmoins un cadre dans lequel la **réversibilité** devient un objectif réglementaire explicite, et non une simple bonne pratique interne.

### Réversibilité comme propriété d'architecture

Pour une petite organisation, la souveraineté ne consiste pas nécessairement à auto-héberger chaque composant. Elle peut être mieux définie comme la capacité à :

- identifier ses dépendances ;
- connaître leur criticité ;
- exporter ses données ;
- conserver des formats standards lorsque c'est possible ;
- isoler les fonctions propriétaires ;
- prévoir un mode dégradé ;
- documenter une stratégie de remplacement.

Cette approche peut être qualifiée de **souveraineté fonctionnelle** : le projet n'est pas autonome au sens industriel, mais il évite que sa mission dépende d'un fournisseur qu'il serait incapable de remplacer.

## Données comme actif économique

Les données interviennent dans l'écosystème IA à plusieurs niveaux : entraînement initial, ajustement, évaluation, recherche augmentée, personnalisation, télémétrie et amélioration de produit.

Leur importance économique peut créer des **boucles de rétroaction** : un acteur disposant d'une large base d'utilisateurs collecte davantage de signaux d'usage, améliore son service ou sa distribution et peut rendre l'entrée de nouveaux concurrents plus difficile.

L'OCDE identifie ainsi la concentration des données, les partenariats exclusifs et l'accès à des ensembles propriétaires comme des facteurs potentiels de pouvoir de marché [@oecd_ai_infrastructure_2025].

Cette dimension est distincte de la question des droits des créateurs ou de la licéité des données d'entraînement, traitée en partie III. Ici, la question est économique : **qui peut accéder aux données nécessaires pour construire, améliorer ou distribuer un service compétitif ?**

## Modèles ouverts, open-weight et modèles propriétaires

### Des catégories à ne pas confondre

Le terme « modèle ouvert » recouvre plusieurs réalités. Un modèle peut publier ses poids sans publier son corpus d'entraînement, son code complet, sa procédure de filtrage ou tous les éléments permettant de reproduire son développement.

Il est donc utile de distinguer :

- **service fermé par API** ;
- **modèle dont les poids sont accessibles** ;
- **logiciel ouvert autour du modèle** ;
- **système réellement reproductible**, catégorie beaucoup plus exigeante.

### Effets possibles sur la concurrence

Des modèles accessibles sous des conditions ouvertes ou permettant l'exécution locale peuvent :

- réduire la dépendance à une API unique ;
- permettre davantage de personnalisation ;
- faciliter certains audits ;
- créer une pression concurrentielle sur les prix ;
- permettre à des organisations de conserver davantage de contrôle opérationnel.

L'OCDE relève que le développement ouvert peut atténuer certains effets de concentration en abaissant des barrières d'entrée et en favorisant l'innovation cumulative [@oecd_ai_infrastructure_2025].

Mais l'ouverture des poids ne supprime pas toutes les dépendances. Un modèle volumineux peut exiger des accélérateurs coûteux, des compétences rares, un hébergement externe ou une chaîne logicielle dominée par les mêmes fournisseurs matériels.

### Choix de gouvernance plutôt qu'opposition idéologique

Le choix entre modèle propriétaire et modèle accessible ne peut donc pas reposer sur une règle unique.

Un service propriétaire peut être rationnel lorsqu'il :

- apporte une qualité ou une sûreté nettement supérieure ;
- évite de maintenir une infrastructure disproportionnée ;
- permet de limiter les coûts fixes ;
- reste remplaçable au niveau de l'application.

Un modèle ouvert peut être préférable lorsqu'il améliore réellement :

- la réversibilité ;
- le contrôle des données ;
- l'auditabilité ;
- la maîtrise des coûts ;
- la continuité d'un service critique.

La décision doit porter sur le **coût total de dépendance**, pas seulement sur le prix affiché d'une requête.

## Souveraineté technologique et dépendances géopolitiques

### La souveraineté n'est pas l'autarcie

À l'échelle d'un État ou de l'Union européenne, aucune chaîne IA avancée n'est entièrement nationale : équipements de fabrication, propriété intellectuelle, fonderies, mémoire, accélérateurs, centres de données, logiciels et capitaux sont distribués entre plusieurs pays.

La souveraineté technologique doit donc être comprise comme une **capacité d'action** :

- accès fiable aux technologies essentielles ;
- diversité de fournisseurs ;
- capacité de négociation ;
- maîtrise de certaines compétences critiques ;
- infrastructures disponibles sur le territoire pertinent ;
- capacité à appliquer ses règles ;
- possibilité de continuer à fonctionner en cas de tension ou de rupture.

### Semi-conducteurs et politique industrielle

La forte concentration de certains maillons de la chaîne des semi-conducteurs crée un enjeu stratégique dépassant le seul secteur de l'IA. Les mêmes composants sont essentiels à l'industrie, aux télécommunications, à la recherche, à la santé, aux transports et à la défense.

L'OCDE note que l'importance stratégique du calcul IA s'accompagne d'une intervention publique croissante : soutien à la production, investissements publics, politiques industrielles et restrictions commerciales [@oecd_ai_infrastructure_2025].

Ces politiques poursuivent plusieurs objectifs parfois en tension : sécurité d'approvisionnement, compétitivité, innovation, résilience et maîtrise des dépendances.

Pour ce rapport, il n'est pas nécessaire de déterminer quelle stratégie industrielle nationale serait « la meilleure ». Le constat pertinent est que **l'accès au calcul et aux semi-conducteurs est devenu un objet de politique économique et stratégique**, ce qui rend les utilisateurs finaux indirectement dépendants de décisions prises très en amont de leur propre projet.

### Dépendance européenne

Pour l'Europe, la question couvre au minimum quatre couches :

- semi-conducteurs ;
- capacité de calcul ;
- cloud ;
- modèles et logiciels.

La réduction des dépendances peut passer par le développement de capacités européennes, mais aussi par la diversification, l'interopérabilité, les standards ouverts, la concurrence et la possibilité de changer de fournisseur.

Une souveraineté crédible ne se mesure donc pas au nombre de composants portant une étiquette européenne. Elle se mesure aussi à la capacité réelle d'un acteur à **choisir, auditer, remplacer et continuer à opérer**.

## Régulation européenne : concurrence, transparence et risques systémiques

### AI Act et modèles à usage général

Le règlement européen sur l'IA établit un cadre spécifique pour les modèles d'IA à usage général. Les obligations applicables aux fournisseurs comprennent notamment la documentation technique, certaines informations destinées aux fournisseurs en aval, une politique de respect du droit d'auteur et un résumé public du contenu utilisé pour l'entraînement [@parlement_europ_2024; @eu_gpai_obligations_2025].

Pour les modèles à usage général présentant un **risque systémique**, le règlement prévoit des obligations supplémentaires portant notamment sur :

- l'évaluation du modèle ;
- les essais adversariaux ;
- l'identification et l'atténuation des risques systémiques ;
- le suivi et le signalement de certains incidents graves ;
- la cybersécurité du modèle et de son infrastructure [@parlement_europ_2024].

Ces dispositions régulent principalement les fournisseurs concernés ; elles ne transforment pas un petit projet utilisant une API en fournisseur de modèle de fondation.

### Régulation et pouvoir de marché : deux questions distinctes

La sûreté d'un modèle et la concurrence sur son marché sont deux problèmes différents.

Un fournisseur peut respecter des obligations de sûreté tout en occupant une position économique très forte. Inversement, un marché très concurrentiel ne garantit pas que les systèmes qui y circulent soient sûrs ou transparents.

La gouvernance de l'écosystème IA combine donc plusieurs instruments :

- droit de la concurrence ;
- règles sur les marchés numériques ;
- protection des données ;
- exigences propres aux systèmes et modèles d'IA ;
- règles favorisant le changement de fournisseurs de services de données ;
- politiques industrielles et de recherche.

Cette pluralité reflète la nature du problème : **aucun instrument unique ne couvre à la fois la sécurité, les droits, la concurrence, la résilience et la souveraineté**.

## Risques systémiques : niveau structurel uniquement

Le terme « risque systémique » peut être utilisé de plusieurs manières. Dans le cadre de l'AI Act, il possède un sens juridique précis pour certains modèles à usage général présentant des capacités ou impacts élevés [@parlement_europ_2024].

Dans une analyse économique plus large, un risque systémique peut aussi désigner une dépendance commune à une même infrastructure : une panne, une rupture d'approvisionnement ou une modification contractuelle touchant un fournisseur très central peut produire des effets simultanés sur de nombreux services.

Cette partie ne développe pas les scénarios cyber, militaires, biologiques ou psychologiques associés à des modèles très capables. Ces sujets relèvent respectivement des parties III et V ou d'analyses spécialisées. Ici, le point important est seulement que **plus une ressource ou un fournisseur devient central, plus sa défaillance ou sa restriction peut avoir des conséquences collectives**.

## `CLEANMYMAP_APPLICATION` — dépendances et souveraineté fonctionnelle

La traduction à CleanMyMap doit rester proportionnée. Le projet n'entraîne pas de modèle de fondation, ne fabrique pas de matériel IA et ne contrôle évidemment pas les marchés de semi-conducteurs ou du cloud.

Son enjeu se situe au niveau de la **dépendance applicative**.

### Dépendances réellement pertinentes

L'architecture actuelle repose notamment sur plusieurs services externes structurants :

| Fonction | Service ou catégorie actuelle | Nature de la dépendance |
| --- | --- | --- |
| hébergement et runtime web | Vercel | critique pour la disponibilité du web déployé |
| base de données et stockage | Supabase | critique pour les données applicatives |
| identité et sessions | Clerk | critique pour l'authentification |
| dépôt, CI et collaboration de développement | GitHub | important pour le cycle de développement |
| IA de développement et de documentation | services OpenAI / Codex | importante pour la productivité, mais ne doit pas être requise pour le fonctionnement essentiel du site |
| observabilité, analytics et communication | services externes dédiés selon les fonctionnalités activées | dépendances secondaires ou spécialisées |

Cette table décrit une **architecture de dépendance**, pas un état de disponibilité contractuelle ou de consommation. Les métriques réelles de Vercel, Supabase, GitHub, Clerk et autres services sont auditées séparément dans le volet environnemental et opérationnel.

### Criticité et remplaçabilité

Toutes les dépendances ne présentent pas le même risque.

Une méthode simple consiste à documenter pour chaque service :

| Critère | Question |
| --- | --- |
| criticité | Le service est-il nécessaire au cœur du produit ? |
| données | Quelles données y résident ou y transitent ? |
| export | Les données peuvent-elles être récupérées dans un format exploitable ? |
| couplage | Combien de code dépend directement du fournisseur ? |
| alternative | Une solution de remplacement réaliste existe-t-elle ? |
| délai de sortie | Combien de temps faudrait-il pour migrer ? |
| mode dégradé | Le produit peut-il continuer partiellement sans ce service ? |

L'objectif n'est pas d'obtenir une indépendance parfaite. Il est d'éviter qu'une dépendance soit à la fois **critique, opaque, fortement couplée et sans stratégie de sortie**.

### L'IA doit rester non essentielle au cœur du service

Pour CleanMyMap, l'utilisation de l'IA comme outil de développement, de revue ou de documentation peut être très importante sans devenir une dépendance d'exécution du produit.

Le principe de souveraineté fonctionnelle est donc :

> **une indisponibilité d'un fournisseur IA ne doit pas empêcher les fonctions essentielles de signalement, consultation, organisation ou conservation des données de continuer à fonctionner, sauf fonctionnalité explicitement identifiée comme IA et désactivable.**

Cette règle réduit simultanément :

- le verrouillage fournisseur ;
- le risque de hausse de prix ;
- le risque de rupture d'API ;
- le risque qu'un changement de politique commerciale bloque le service ;
- la difficulté à revenir à une solution déterministe ou humaine.

### Formats, abstractions et exports

La réversibilité doit être recherchée prioritairement là où elle apporte un bénéfice réel :

- données stockées dans des formats standards ;
- exports testables ;
- contrats internes séparant la logique métier du fournisseur ;
- secrets et configuration isolés ;
- documentation des services réellement critiques ;
- absence de dépendance IA implicite dans une règle métier centrale.

Une abstraction supplémentaire n'est toutefois pas automatiquement un gain de souveraineté. Une couche de compatibilité qui n'a qu'un seul consommateur et aucune stratégie de migration réelle peut simplement ajouter de la complexité.

La réversibilité doit donc être **proportionnée, vérifiable et maintenue**, pas seulement déclarée.

## Principes de gouvernance à retenir

Pour cette partie, la gouvernance peut être résumée par six principes :

1. **Cartographier les dépendances réelles**, au lieu de supposer qu'un service externe est interchangeable.
2. **Différencier criticité et confort** : une dépendance utilisée pour accélérer le développement n'a pas le même statut qu'une base de données de production.
3. **Préserver l'exportabilité des données** et la capacité de migration.
4. **Limiter les couplages propriétaires inutiles**, sans créer d'abstractions artificielles.
5. **Suivre la concentration et les changements réglementaires** lorsqu'ils modifient effectivement le risque pour le projet.
6. **Conserver l'IA comme capacité remplaçable** lorsqu'une règle déterministe ou une intervention humaine suffit au besoin essentiel.

## Synthèse

L'IA générative dépend d'une chaîne industrielle beaucoup plus large que les seuls modèles visibles par les utilisateurs. Les équipements de fabrication, les semi-conducteurs, les centres de données, le cloud, les données, les modèles et les plateformes de distribution forment un ensemble dans lequel plusieurs couches présentent de fortes barrières à l'entrée et une concentration importante [@oecd_ai_infrastructure_2025].

Cette concentration n'autorise pas à conclure que toute innovation est contrôlée par un acteur unique : certaines couches restent dynamiques et concurrentielles. Elle impose en revanche de considérer la **contestabilité, l'interopérabilité, les coûts de sortie et la résilience** comme des propriétés importantes de l'écosystème.

La réponse européenne combine régulation des modèles à usage général, droit de la concurrence, protection des données et règles favorisant la portabilité et le changement de services [@parlement_europ_2024; @eu_gpai_obligations_2025; @commission_européenne_data].

Pour CleanMyMap, l'objectif réaliste n'est pas une souveraineté industrielle complète. Il est une **souveraineté fonctionnelle** : connaître les dépendances, distinguer celles qui sont critiques, conserver les données, limiter les couplages inutiles, maintenir des solutions de sortie crédibles et éviter qu'un fournisseur d'IA devienne une condition invisible du fonctionnement essentiel du projet.
