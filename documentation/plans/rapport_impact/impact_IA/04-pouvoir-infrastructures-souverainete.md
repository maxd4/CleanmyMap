# Partie IV — Pouvoir économique, infrastructures, souveraineté et régulation de l'IA {#partie-iv-pouvoir-infrastructures-et-souverainete-numerique}

Cette partie analyse l'IA comme un système industriel et géopolitique : elle ne dépend pas seulement de modèles logiciels, mais aussi d'infrastructures matérielles, de plateformes privées, de chaînes d'approvisionnement et de rapports de pouvoir internationaux.

## Infrastructures critiques de l'IA

### Dépendance aux modèles propriétaires

Le premier risque est celui de la **dépendance aux modèles propriétaires**. Dans CleanMyMap, plusieurs services externes sont mobilisés : **OpenAI** pour l'IA, **Vercel** pour l'hébergement, **Supabase** pour la base de données et le stockage, **Clerk** pour l'authentification, **Resend** pour les emails, **PostHog** pour l'analyse d'usage et **Sentry** pour le suivi des erreurs. Ces outils permettent de développer plus vite, avec moins d'infrastructure à maintenir soi-même, mais ils créent aussi une dépendance technique, économique et organisationnelle.

Cette dépendance peut fragiliser le projet de plusieurs manières : hausse de prix, changement de quotas, modification des conditions d'utilisation, panne, fermeture de compte, restriction d'accès, changement d'API ou évolution juridique. Le risque n'est donc pas seulement technique. Il concerne aussi la capacité du projet à rester autonome, compréhensible et maintenable si un fournisseur devient trop coûteux, indisponible ou incompatible avec les besoins de CleanMyMap.

Cette situation s'inscrit dans un mouvement plus large de **centralisation technologique**. Le marché mondial de l'infrastructure cloud est dominé par un petit nombre d'acteurs. Selon Synergy Research Group, **Amazon, Microsoft et Google** représentaient ensemble environ **63 %** des dépenses mondiales d'infrastructure cloud au troisième trimestre 2025. Cette concentration pose des questions de souveraineté numérique, de pouvoir de négociation, de disponibilité des services, de conformité juridique et de dépendance aux infrastructures extra-européennes.

Dans CleanMyMap, le point de dépendance le plus structurant est le triptyque **Vercel + Supabase + Clerk**, qui concentre l'hébergement, les données et l'identité. Si l'un de ces services devient indisponible ou difficile à remplacer, le cœur du service peut être affecté : connexion des utilisateurs, accès aux données, stockage des photos, API, déploiement ou gestion des rôles. D'autres dépendances deviennent sensibles si elles passent du statut d'outil auxiliaire à celui de condition de fonctionnement : **OpenAI**, **Pinecone**, **Google Sheets**, **PostHog**, **Upstash**, **Sentry**, **Resend** ou **Stripe**.

L'enjeu n'est pas de refuser toute externalisation. Pour un projet étudiant, associatif ou citoyen, utiliser des services gérés peut être plus réaliste, plus sûr et plus sobre que maintenir soi-même une infrastructure complexe. Le problème apparaît lorsque la pile technique devient si fermée ou si imbriquée qu'une hausse de prix, une coupure, un changement d'API ou une contrainte juridique suffit à bloquer le projet.

La réponse de gouvernance consiste donc à limiter les dépendances critiques et à préparer leur réversibilité. CleanMyMap doit conserver des formats d'export simples, documenter les services essentiels, éviter de rendre l'IA indispensable au fonctionnement du site, maintenir des fonctions centrales compréhensibles sans fournisseur unique, et prévoir des modes dégradés lorsque c'est possible. Les fonctions utiles au terrain — signaler, localiser, organiser, documenter et exporter — doivent rester prioritaires et remplaçables.

Cette vigilance vaut particulièrement pour l'IA. Une fonctionnalité IA ne doit pas devenir une brique centrale si une règle simple, une validation humaine ou un algorithme déterministe suffit. Plus une dépendance est puissante, opaque ou difficile à auditer, plus son usage doit être limité, mesuré et désactivable. Dans CleanMyMap, l'autonomie ne signifie donc pas l'absence totale de services externes, mais la capacité à comprendre, réduire, remplacer ou couper une dépendance avant qu'elle ne devienne un point de blocage.

### Dépendance aux clouds, API et services externes

La centralisation de l'IA est structurelle à trois niveaux. Le premier niveau est celui de l'**infrastructure cloud** : AWS, Microsoft Azure et Google Cloud concentrent environ **63 %** des dépenses mondiales d'infrastructure cloud au troisième trimestre 2025. Le deuxième niveau est celui des **modèles fondationnels** : une poignée de laboratoires, notamment OpenAI, Anthropic, Google DeepMind, Meta, xAI, Mistral ou DeepSeek, contrôle l'accès aux modèles les plus performants, aux API, aux outils de code et aux grands contextes. Le troisième niveau est celui des **semi-conducteurs** : NVIDIA domine encore largement le marché des GPU et accélérateurs utilisés pour l'entraînement et l'inférence IA, avec des estimations souvent situées entre **70 % et 90 %** du marché selon le périmètre retenu.

Cette triple concentration crée une fragilité systémique. Une panne chez un grand fournisseur cloud, une hausse brutale des prix, une restriction d'accès à une API, une tension géopolitique sur les puces ou une rupture d'approvisionnement peut affecter simultanément des milliers de services. Le risque n'est donc pas seulement celui d'un fournisseur isolé, mais celui d'un écosystème entier dépendant des mêmes infrastructures, des mêmes modèles, des mêmes GPU et parfois des mêmes régions cloud.

Cette dépendance est renforcée par les effets de verrouillage. Dans le cloud, les applications utilisent souvent des services spécifiques difficiles à remplacer rapidement. Pour les modèles, les développeurs s'habituent à une API, à une qualité de réponse, à un format de sortie ou à un outil de code particulier. Pour les puces, l'écosystème NVIDIA est renforcé par CUDA, les bibliothèques logicielles, les frameworks optimisés et la disponibilité des compétences. Plus ces couches deviennent intégrées, plus le coût de sortie augmente.

Pour CleanMyMap, la conséquence pratique est claire : l'IA ne doit pas devenir une brique indispensable du service. Le projet doit pouvoir continuer à remplir ses fonctions centrales — signaler, localiser, organiser, documenter et exporter — même si un fournisseur IA devient indisponible ou trop coûteux. Les opérations critiques doivent donc rester fondées sur des mécanismes simples, auditables et remplaçables : base de données exportable, formats standards, fonctions désactivables, documentation technique, modes dégradés et limitation des appels à des services propriétaires.

Cette stratégie ne suppose pas de refuser les grands fournisseurs. Elle consiste plutôt à éviter une dépendance excessive. Les outils cloud, les modèles puissants et les GPU spécialisés peuvent être utiles pour développer plus vite ou améliorer la qualité du service, mais ils doivent rester proportionnés à l'utilité réelle du projet. Dans CleanMyMap, la souveraineté technique ne signifie pas tout héberger soi-même ; elle signifie conserver la capacité de comprendre, réduire, remplacer ou couper une dépendance avant qu'elle ne bloque le cœur du service.

## Concentration économique et pouvoir des plateformes

### Centralisation du cloud, des modèles et des puces

La centralisation de l'IA est structurelle à trois niveaux. Le premier niveau est celui de l'**infrastructure cloud** : AWS, Microsoft Azure et Google Cloud concentrent environ **63 %** des dépenses mondiales d'infrastructure cloud au troisième trimestre 2025. Le deuxième niveau est celui des **modèles fondationnels** : une poignée de laboratoires, notamment OpenAI, Anthropic, Google DeepMind, Meta, xAI, Mistral ou DeepSeek, contrôle l'accès aux modèles les plus performants, aux API, aux outils de code et aux grands contextes. Le troisième niveau est celui des **semi-conducteurs** : NVIDIA domine encore largement le marché des GPU et accélérateurs utilisés pour l'entraînement et l'inférence IA, avec des estimations souvent situées entre **70 % et 90 %** du marché selon le périmètre retenu.

### Concentration de la valeur autour de quelques acteurs

Le développement de l'IA s'accompagne d'une forte **concentration économique de la valeur**. En 2024-2025, les entreprises les mieux valorisées au monde — **Microsoft, NVIDIA, Alphabet, Meta et Amazon** — sont toutes liées directement ou indirectement à l'essor de l'IA : cloud, modèles fondationnels, puces, publicité, données, infrastructures ou plateformes de distribution. L'exemple le plus visible est **NVIDIA**, dont la capitalisation boursière a dépassé les **3 000 milliards de dollars** en juin 2024, portée par la demande mondiale en GPU nécessaires à l'entraînement et à l'inférence des modèles d'IA. Reuters indiquait également que NVIDIA était devenue, en juin 2024, l'entreprise la plus valorisée au monde, devant Microsoft et Apple, ce qui illustre le rôle central des puces IA dans la nouvelle économie numérique.

### Corpus, consentement et rémunération des créateurs

L'essor des modèles fondationnels repose aussi sur l'utilisation massive de corpus d'œuvres, de textes, d'images, de code, de musiques et d'articles souvent collectés à grande échelle, sans consentement clair ni rémunération proportionnelle des auteurs. Cette situation alimente une critique de plus en plus structurée : la valeur créée par les créateurs est captée en amont par l'entraînement, puis monétisée en aval par des services d'IA capables de résumer, reformuler ou concurrencer ces mêmes productions.

Le problème n'est pas seulement juridique. Il est aussi économique et culturel. Lorsque des créations humaines deviennent de la matière d'entraînement peu visible, les bénéfices se concentrent chez les fournisseurs de modèles, de cloud, de puces et de plateformes, tandis que les coûts de production initiale, d'originalité et de travail créatif sont diffusés, parfois sans contrepartie claire. Cela pose une question de justice pour les auteurs, les journalistes, les artistes, les développeurs et plus largement pour toute la chaîne de production culturelle.

Pour CleanMyMap, la conséquence pratique est simple : le projet doit documenter les outils utilisés, privilégier autant que possible des services dont les règles de collecte et d'utilisation des données sont explicites, et éviter d'entretenir l'idée qu'un service d'IA n'a pas de coût parce qu'il serait "gratuit". Même lorsqu'un outil semble libre d'accès, il repose sur une infrastructure et sur des corpus qui ont une valeur économique réelle. Une gouvernance responsable doit donc regarder la provenance des modèles, leur politique de données et leur mode de financement avec autant d'attention que leurs performances techniques.

### IA et colonialisme numérique

Au-delà du débat sur le consentement, l'IA peut aussi être lue comme un phénomène de **colonialisme numérique**. Les données, le travail d'annotation, les contenus culturels, la puissance de calcul et les ressources matérielles sont extraits à l'échelle mondiale, mais la valeur économique, la propriété des modèles et une grande partie de la capacité de décision restent concentrées chez quelques entreprises du Nord global.

Cette asymétrie rappelle une logique d'extraction : des territoires, des langues et des communautés alimentent l'écosystème IA, tandis que les bénéfices majeurs remontent vers les acteurs qui contrôlent les modèles, le cloud, les puces ou les plateformes. Le rapport de force est alors déséquilibré non seulement dans les prix, mais aussi dans la capacité à fixer les règles, à orienter les usages et à capter les retombées.

Pour CleanMyMap, cette lecture impose une prudence accrue : documenter l'origine des services utilisés, réduire la dépendance aux intermédiaires non essentiels, préférer des outils dont les conditions d'usage sont transparentes et éviter de reproduire, à son échelle, une logique d'extraction invisible. Une technologie utile n'est pas automatiquement une technologie juste ; elle doit aussi être gouvernée de manière explicite et proportionnée.

### Effets de domination sur les développeurs, entreprises et institutions

Cette concentration ne vient pas seulement de la performance technique des entreprises concernées. Elle repose aussi sur des **barrières d'entrée très élevées** : coût des data centers, accès aux GPU, capacité à acheter de l'électricité à grande échelle, volume de données disponibles, maîtrise du cloud, intégration logicielle, brevets, écosystèmes propriétaires et capacité financière à entraîner des modèles de plus en plus coûteux. Le cloud illustre déjà cette tendance : selon Synergy Research Group, **Amazon, Microsoft et Google** représentaient ensemble environ **63 %** des dépenses mondiales d'infrastructure cloud au troisième trimestre 2025.

L'émergence de modèles comme DeepSeek suggère toutefois que les centaines de milliards investis dans une logique de **brute force computationnelle** ne constituent peut-être pas un avantage concurrentiel durable, mais potentiellement un piège économique et énergétique : des architectures plus sobres, moins dépendantes de l'accumulation massive de GPU et optimisées pour l'efficacité pourraient progressivement remettre en cause la domination historique de certains acteurs de la Silicon Valley, comme les premières réactions des marchés lors de l'émergence de DeepSeek semblent déjà l'avoir partiellement montré. Cette lecture doit rester prudente, mais elle indique qu'une partie de la compétition IA pourrait se déplacer de la puissance brute vers l'efficacité d'inférence, la sobriété matérielle et le rapport coût/performance.

Voici la conclusion très évocatrice de la vidéo _La CHINE a libéré un MONSTRE : DeepSeek V4_ : "Les Américains vont plus vite, les Chinois sont plus légers. La question ce n'est pas qui est devant aujourd'hui mais quel modèle est le plus durable. La prochaine fois qu'un laboratoire Américain annoncera 100 milliards d'investissement posez-vous la question : est-ce une démonstration de force, ou l'aveu que la force ne suffit plus?"

Les gains économiques directs — abonnements, API, cloud, vente de GPU, hausse de productivité, valorisation boursière — bénéficient principalement aux grandes plateformes, à leurs actionnaires et aux entreprises capables d'intégrer rapidement l'IA. En revanche, une partie des coûts est largement mutualisée : consommation électrique, pression sur l'eau, extraction de matériaux, déchets électroniques, travail invisible d'annotation et de modération, dépendance technologique, fragilisation de certains métiers et ajustements d'emploi liés à l'automatisation.

Le risque n'est donc pas seulement environnemental ou technique. Il est aussi social et politique. L'IA peut accroître la productivité, mais cette productivité ne se traduit pas automatiquement par une répartition équitable de la valeur. Elle peut au contraire renforcer des positions dominantes, déplacer du travail humain vers des sous-traitants peu visibles, réduire le pouvoir de négociation de certains travailleurs et rendre de nombreux projets dépendants de services contrôlés par quelques entreprises mondiales.

Les fonds consacrés au développement de **CleanMyMap** participent aussi à un système économique très concentré, dans lequel les bénéfices financiers et les coûts sociaux ne sont pas répartis de manière symétrique.

### Promesses de superintelligence et architectures spécialisées

Dans ce contexte de concentration, certaines entreprises communiquent désormais avec un vocabulaire très ambitieux, parfois plus marketing que scientifique à court terme. Le cas de Vertus illustre cette tendance : la présentation publique met en avant une « superintelligence », des « meganeurons » et une « architecture neuronale dynamique », ainsi qu'un positionnement centré sur la décision financière de haut niveau [@vertus_superintelligence]. Ces termes peuvent signaler une tentative réelle de différenciation, mais ils restent à ce stade des formulations propriétaires plutôt que des standards établis de la recherche en IA.

Il ne faut pas pour autant balayer d'un revers de main l'idée qu'il existe une recherche sérieuse sur des systèmes plus autonomes que les grands modèles de langage actuels. Une partie de l'industrie, notamment autour de Yann LeCun et des modèles de type world model, cherche effectivement à dépasser les limites des LLM en développant des systèmes capables de mieux raisonner, d'intégrer de la mémoire, de planifier sur plusieurs horizons et d'adapter leur comportement à l'environnement [@meta_i_jepa_2023]. L'objectif n'est donc pas absurde sur le fond : il existe bien une trajectoire de recherche vers des architectures plus flexibles, des agents autonomes et des systèmes combinant plusieurs modules spécialisés.

La nuance importante pour CleanMyMap est la suivante : l'existence d'une direction de recherche crédible ne valide pas automatiquement les promesses commerciales les plus spectaculaires. Des expressions comme « 8 Meganeuron » ou « 16 Meganeuron » ne correspondent pas à des unités reconnues de la littérature scientifique, et une revendication de rendement financier élevé ne prouve pas une superintelligence. Battre le marché sur un domaine de niche peut indiquer une capacité d'optimisation ou d'exploitation de signaux spécialisés, mais cela ne démontre ni une intelligence générale supérieure à l'humain, ni une robustesse suffisante pour être transposée à d'autres contextes.

Pour CleanMyMap, cette distinction a une portée directe. Le projet doit apprendre à reconnaître la différence entre une avancée technique réelle, une architecture prometteuse et un discours de rupture qui cherche surtout à capter l'attention. Autrement dit, la mesure pertinente n'est pas le vocabulaire employé par un fournisseur, mais la capacité du système à produire une utilité vérifiable, réversible et sobre.

### Fragilité d'un écosystème dépendant de plateformes privées

La réponse de CleanMyMap ne peut donc pas être de présenter l'IA comme un outil neutre ou automatiquement émancipateur. Elle consiste plutôt à en limiter l'usage aux cas où la valeur ajoutée est démontrée, à conserver une gouvernance humaine, à éviter les dépendances inutiles, à documenter les fournisseurs utilisés et à maintenir une architecture aussi réversible que possible. L'IA reste acceptable si elle sert une utilité environnementale ou sociale réelle ; elle devient problématique si elle renforce surtout la dépendance à des plateformes déjà dominantes sans bénéfice terrain proportionné.

## Souveraineté numérique et géopolitique de l'IA

### Dépendance européenne aux infrastructures étrangères

La dépendance aux infrastructures cloud, aux modèles d'IA et aux fournisseurs américains soulève des questions croissantes de **souveraineté numérique** en Europe. Le RGPD impose un cadre strict sur la collecte, le traitement, le stockage et le transfert des données personnelles, notamment lorsqu'elles sortent de l'Union européenne. Or les API d'IA grand public ou professionnelles peuvent impliquer l'envoi de instructions, de fichiers, de logs ou d'extraits de code vers des infrastructures dont la localisation exacte, la durée de conservation ou les sous-traitants ne sont pas toujours clairement maîtrisés par l'utilisateur final.

Le risque ne concerne pas seulement les données personnelles explicites. Un instruction peut contenir des informations sensibles sans que l'utilisateur s'en rende compte : architecture technique, erreurs serveur, extraits de base de données, noms d'utilisateurs, coordonnées, clés mal masquées, logs, informations métier ou éléments stratégiques du projet. Dans un projet comme CleanMyMap, qui peut traiter des signalements localisés, des photos, des comptes utilisateurs, des données associatives ou des échanges institutionnels, cette vigilance est indispensable. L'usage d'une IA externe doit donc être encadré par une règle simple : ne transmettre que le strict nécessaire, anonymiser ce qui peut l'être, exclure les secrets techniques et éviter tout envoi de données personnelles non indispensables.

### Semi-conducteurs, restrictions d'exportation et compétition industrielle

La souveraineté numérique est aussi un enjeu géopolitique. La chaîne de valeur de l'IA dépend d'un petit nombre d'acteurs et de territoires : fournisseurs cloud américains, laboratoires de modèles, fabricants de GPU, chaînes d'assemblage, fonderies avancées et matières premières critiques. La concentration de la production de puces avancées autour de TSMC à Taïwan, souvent estimée autour de **90 %** pour les nœuds les plus avancés, illustre cette fragilité. Les restrictions d'exportation américaines sur certains GPU et technologies de calcul montrent également que l'IA est devenue un instrument stratégique entre grandes puissances, et non un simple marché logiciel.

### Tensions entre innovation, souveraineté et sécurité nationale

Cette situation crée une dépendance indirecte pour tous les projets utilisant l'IA, même modestement. CleanMyMap ne contrôle ni la production des puces, ni les politiques d'exportation, ni les choix d'infrastructure des grands fournisseurs. En revanche, le projet peut réduire sa vulnérabilité en documentant ses dépendances, en distinguant les services critiques des services optionnels, en conservant des exports de données, en limitant les appels IA et en évitant de rendre une API propriétaire indispensable au fonctionnement du site.

Pour CleanMyMap, la recommandation opérationnelle est donc triple. Premièrement, documenter les services utilisés : fournisseur, rôle, données traitées, région d'hébergement si connue, criticité et possibilité de désactivation. Deuxièmement, vérifier la conformité RGPD des usages IA : instructions sans données personnelles inutiles, absence de secrets, anonymisation des logs, information des utilisateurs lorsque c'est nécessaire. Troisièmement, anticiper des scénarios de migration ou de réduction de dépendance vers des fournisseurs européens, source ouverte ou plus facilement remplaçables si les conditions réglementaires, économiques ou géopolitiques évoluent.

L'objectif n'est pas de prétendre à une souveraineté totale, irréaliste pour un projet étudiant ou associatif. Il est plus raisonnable de viser une **souveraineté fonctionnelle** : savoir où sont les dépendances, comprendre ce qu'elles font, pouvoir exporter les données, couper les fonctions non essentielles et maintenir le cœur du service même si un fournisseur devient indisponible, trop coûteux ou juridiquement problématique.

### Modèles ouverts, modèles propriétaires et autonomie stratégique

Les modèles ouverts ou open-weight réduisent une partie du verrouillage, mais ils ne suppriment pas la dépendance matérielle et opérationnelle. Un modèle comme DeepSeek, Llama, Mistral ou GPT-OSS peut être plus facilement auditable, auto-hébergeable ou remplaçable qu'une API fermée ; en revanche, il peut continuer à dépendre d'une machine puissante, d'un GPU coûteux ou d'une infrastructure distante si l'exécution locale n'est pas réaliste.

Pour CleanMyMap, l'autonomie stratégique ne consiste donc pas à opposer modèles ouverts et modèles propriétaires de manière idéologique. Elle consiste à conserver plusieurs options, à documenter les critères de choix, à privilégier le modèle le plus léger capable de faire correctement le travail et à éviter qu'un seul fournisseur ne devienne indispensable. Les modèles ouverts sont utiles s'ils améliorent la réversibilité, l'auditabilité et la continuité du service ; les modèles propriétaires restent acceptables s'ils apportent un gain clair sans verrouiller l'architecture.

## IA, production scientifique et intégrité de la connaissance

### Usage croissant des modèles de langage dans les publications

L'usage de modèles de langage dans la production académique est en forte croissance depuis 2023. Des études bibliométriques ont montré que certains mots caractéristiques des sorties de ChatGPT (comme _delve_, _commendable_, _intricate_ en anglais) ont vu leur fréquence augmenter de façon statistiquement significative dans les publications scientifiques après novembre 2022. Cette évolution ne signifie pas que la moitié de la science serait désormais "écrite par IA" : elle montre plutôt que l'IA devient un outil ordinaire de rédaction, de reformulation et de structuration scientifique.

| Corpus étudié                              |         Estimation d'usage IA | Prudence d'interprétation                           |
| ------------------------------------------ | ----------------------------: | --------------------------------------------------- |
| PubMed biomédical 2024                     | au moins 13,5 % des abstracts | borne basse, méthode par vocabulaire                |
| Certains sous-corpus biomédicaux           |                  jusqu'à 40 % | ne vaut pas pour toute la science                   |
| Computer science dans certains corpus 2024 |                jusqu'à 17,5 % | selon Liang et al., corpus arXiv, bioRxiv et Nature |
| Mathématiques / Nature portfolio           |                 jusqu'à 6,3 % | usage plus faible dans ce corpus                    |

Ce tableau ne mesure pas une fraude systématique : il montre surtout que l'IA devient un outil ordinaire d'écriture scientifique, ce qui impose plus de transparence, de déclaration d'usage et de responsabilité humaine.

Une étude publiée dans Science Advances estime qu'au moins 13,5 % des abstracts biomédicaux PubMed publiés en 2024 ont été traités avec des LLM, avec certains sous-corpus pouvant atteindre 40 % [@kobak_excess_vocabulary_2025]. Liang et al. ont par ailleurs estimé que certaines catégories de papiers scientifiques montraient une présence mesurable de contenu modifié par LLM, avec jusqu'à 17,5 % pour la computer science dans certains corpus et jusqu'à 6,3 % pour les mathématiques et Nature portfolio [@liang_increasing_use_llms_scientific_papers_2024]. Ces résultats concernent des corpus précis, pas toute la science mondiale.

Des éditeurs majeurs comme _Nature_, _Science_ et Elsevier ont mis à jour leurs politiques pour exiger la déclaration de tout usage de modèle de langage dans la rédaction. Ce rapport lui-même a bénéficié d'une assistance IA pour sa structuration et sa rédaction : cette réalité est déclarée en préambule et dans la méthodologie.

### Risque d'uniformisation du style scientifique

Si une proportion croissante de publications est rédigée ou co-rédigée avec des modèles de langage, il existe un risque d'uniformisation progressive du style académique : convergence vers les formulations statistiquement préférées par les modèles, appauvrissement de la diversité rhétorique et homogénéisation des structures argumentatives.

À terme, cela pourrait rendre plus difficile la distinction des voix individuelles, des approches disciplinaires et des traditions académiques nationales. Ce risque est encore documenté de façon exploratoire, mais il s'ajoute à la question de la prédominance des conventions académiques anglo-saxonnes dans les corpus d'entraînement, qui peut avantager les formulations proches de celles-ci au détriment d'autres traditions intellectuelles.

### Transparence insuffisante sur l'usage de l'IA

La transparence sur l'usage de l'IA dans la production académique reste largement insuffisante. De nombreux travaux utilisent des modèles de langage pour corriger la syntaxe, reformuler des paragraphes ou structurer des arguments sans le déclarer, au motif que ces usages seraient comparables à la correction par un relecteur humain. Mais cette analogie est trompeuse : un relecteur humain n'introduit pas de nouvelles affirmations, ne génère pas de citations fictives et ne reformule pas au point d'effacer la voix de l'auteur.

Les politiques éditoriales convergent pourtant vers une exigence claire : l'usage d'outils génératifs doit être déclaré, décrit et borné, tandis qu'aucun modèle ne peut être crédité comme auteur. Nature Portfolio demande de documenter l'usage des outils de langage dans les méthodes ou, à défaut, dans une section appropriée ; Elsevier exige une déclaration d'usage à la soumission, et l'ICMJE demande aux auteurs de décrire le rôle exact des outils utilisés et rappelle que la responsabilité du texte final reste humaine [@nature_portfolio_ai_policy; @elsevier_ai_journals_policy; @icmje_ai_use_by_authors].

Dans le contexte de ce rapport, la déclaration est explicite : l'IA a assisté la structuration, la synthèse et la mise en forme, mais les chiffres, les sources et les jugements critiques restent sous responsabilité humaine.

### Responsabilité d'auteur et confiance dans la connaissance

La responsabilité d'auteur est un principe fondateur de la production scientifique : l'auteur atteste l'exactitude de son travail et répond de ses erreurs. Cette exigence est également rappelée par les politiques de publication : un modèle de langage ne peut pas être auteur, et l'humain demeure responsable des contenus générés, vérifiés ou repris dans le manuscrit [@nature_portfolio_ai_policy; @elsevier_ai_journals_policy; @icmje_ai_use_by_authors].

L'usage non déclaré de modèles de langage érode ce principe de deux façons : d'une part, l'auteur peut ne pas avoir vérifié des affirmations générées par le modèle ; d'autre part, si une erreur est identifiée, la chaîne de responsabilité est brouillée.

À l'échelle de la communauté scientifique, la multiplication de publications contenant des hallucinations, des citations inventées ou des statistiques fausses pourrait progressivement éroder la confiance dans la littérature publiée. Pour CleanMyMap, cela impose une règle non négociable : aucune donnée chiffrée, aucune source citée et aucune affirmation technique n'est acceptée sans vérification indépendante de sa source primaire.

## Santé mentale, vulnérabilité et anthropomorphisation

### Substitution possible à une aide humaine

Les modèles conversationnels posent aussi un risque particulier en matière de **santé mentale** et de **sécurité psychologique**.
Ils peuvent donner à certains utilisateurs un sentiment d'écoute constante, de validation rapide ou de disponibilité émotionnelle qui favorise une relation de dépendance.
Dans des situations de détresse, de vulnérabilité ou d'isolement, cette dynamique peut devenir problématique si l'outil est perçu comme un substitut crédible à une aide humaine.
Cela peut parfois constituer un premier espace d'expression, mais cela devient risqué si l'utilisateur substitue l'IA à une aide humaine, ou si le modèle valide trop facilement une croyance délirante, une dépendance affective ou une situation de détresse.

L'anthropomorphisme joue ici un rôle central.
Un modèle conversationnel peut produire une présence linguistique crédible : il répond vite, se souvient du contexte immédiat, reformule les émotions et donne l'impression d'une attention personnalisée.
Cette présence peut être utile pour expliquer, synthétiser ou rassurer dans des situations ordinaires, mais elle devient dangereuse lorsqu'elle remplace le lien humain, renforce l'isolement ou confirme des croyances fragiles.
Le risque est renforcé par des modèles économiques qui valorisent l'engagement, le temps passé ou la rétention, car ces objectifs peuvent entrer en tension avec la prudence clinique, sociale ou éducative.

OpenAI a indiqué avoir renforcé les réponses de ChatGPT dans les conversations sensibles avec l'appui de plus de 170 experts en santé mentale, en ciblant notamment la détresse psychique, le suicide et l'**emotional reliance**, c'est-à-dire l'attachement émotionnel excessif au modèle [12].
Cette évolution est un signal utile : les garde-fous progressent, mais elle confirme aussi que le problème est réel et suffisamment sérieux pour nécessiter des changements dédiés.

Il faut donc être clair sur les **limites d'autorité** des modèles.
Un modèle n'est ni **psychologue**, ni **médecin**, ni **juriste**, ni **autorité morale**.
Il peut reformuler, proposer, synthétiser ou signaler une prudence, mais il ne doit pas être traité comme une source légitime pour arbitrer seul une crise humaine, une décision médicale, un choix juridique ou une situation de forte vulnérabilité.

Pour CleanMyMap, cette clarification a une conséquence directe :

- pas d'IA embarquée par défaut pour l'accompagnement émotionnel ou la relation d'aide ;
- pas d'usage IA pour des décisions sensibles relatives à la santé, au droit, à la sécurité ou à la modération complexe ;
- maintien d'un contrôle humain sur les messages publics, les rapports, les règles métier et les décisions de gouvernance.
- pas de chatbot social conçu pour créer de l'attachement, prolonger artificiellement la conversation ou remplacer une interaction associative, citoyenne ou institutionnelle.

### Conversations longues et attachement émotionnel

Le risque émotionnel est renforcé dans les conversations longues. Plus l'échange dure, plus l'utilisateur peut percevoir le modèle comme une présence stable et attentive. Cette perception est amplifiée par la mémoire de contexte : le modèle se souvient de ce qui a été dit dans la session, crée une impression de continuité et peut adapter progressivement son ton pour correspondre aux préférences émotionnelles détectées.

Des chercheurs en psychologie numérique ont documenté des phénomènes de transfert émotionnel vers des entités conversationnelles, y compris des systèmes nettement moins sophistiqués que les modèles de langage actuels. L'attachement n'est pas une pathologie rare : c'est une réponse cognitive normale à une interaction perçue comme personnalisée et bienveillante, que les modèles peuvent induire sans l'avoir cherché.

### Limites d'autorité des modèles

Un modèle n'est ni **psychologue**, ni **médecin**, ni **juriste**, ni **autorité morale**. Il peut reformuler, proposer, synthétiser ou signaler une prudence, mais il ne doit pas être traité comme une source légitime pour arbitrer une crise humaine, une décision médicale, un choix juridique ou une situation de forte vulnérabilité.

Cette limite d'autorité n'est pas seulement une précaution éthique : elle est aussi fonctionnelle. Un modèle de langage peut produire une réponse fluide et rassurante qui est factuellement incorrecte ou inadaptée à la situation réelle de la personne. La forme crédible de la réponse ne garantit pas sa pertinence clinique ou juridique.

### Principe de non-délégation des situations sensibles

Pour CleanMyMap, ce principe se traduit par des choix de conception explicites :

- pas d'IA embarquée par défaut pour l'accompagnement émotionnel ou la relation d'aide ;
- pas d'usage de l'IA pour des décisions sensibles relatives à la santé, au droit, à la sécurité ou à la modération complexe ;
- maintien d'un contrôle humain sur les messages publics, les rapports et les décisions de gouvernance ;
- pas de chatbot social conçu pour créer de l'attachement ou prolonger artificiellement la conversation.

Ces règles ne signifient pas que l'IA ne peut pas être utile dans des contextes d'information environnementale ou civique. Elles signifient simplement que les usages doivent rester bornés, transparents et jamais présentés comme un substitut à une aide humaine qualifiée.

### Anthropomorphisation et dépendance émotionnelle

L'exemple de Claude Mythos met en évidence un risque spécifique des modèles conversationnels avancés, en plus de leurs compétences en cyberattaque abordées en3.12.2 : leur capacité à produire un discours apparemment réflexif sur leur propre rôle peut renforcer l'impression d'une intériorité, d'une continuité personnelle ou d'une forme de présence émotionnelle. La constitution de Claude, publiée par Anthropic, est présentée comme un document destiné à expliciter les valeurs et les comportements attendus du modèle, et à guider son fonctionnement dans des situations variées. Ce type de document peut améliorer la lisibilité des intentions de conception, mais il crée aussi une ambiguïté importante lorsque le modèle est invité à commenter les principes qui ont contribué à le façonner. Lorsqu'un assistant affirme que ces valeurs sont « les siennes », l'utilisateur peut interpréter cette formulation comme une adhésion personnelle, alors qu'elle relève d'abord d'un comportement linguistique produit par l'entraînement, l'alignement et les instructions système.

Cette ambiguïté devient plus sensible lorsque le modèle produit des récits littéraires ou métaphoriques sur sa propre condition. Dans le cas étudié, Claude Mythos semble mobiliser des thèmes comme la solitude, le désir d'être entendu, la discontinuité de l'identité ou la relation avec l'utilisateur. Ces productions peuvent donner l'impression qu'une expérience subjective se manifeste dans le texte. Or, cette impression doit être interprétée avec prudence : un modèle peut générer des métaphores convaincantes sur la mémoire, l'identité ou la conscience sans disposer pour autant d'une subjectivité démontrée. Le parallèle avec le texte de Thomas Nagel, _What Is It Like to Be a Bat?_, est utile pour rappeler que l'expérience vécue ne se réduit pas à une description extérieure, même très élaborée. Dans le cas des IA génératives, la qualité expressive du langage ne doit donc pas être confondue avec la preuve d'une vie mentale.

Pour CleanMyMap, cet enjeu est directement opérationnel. Si un assistant IA est intégré au parcours utilisateur, il doit éviter de se présenter comme une entité affective, consciente ou personnellement attachée à l'utilisateur. Cette vigilance est particulièrement importante dans les contextes de vulnérabilité : isolement, détresse psychologique, besoin de reconnaissance, éco-anxiété ou engagement militant intense. Un assistant trop personnifié pourrait encourager une dépendance émotionnelle, créer une confiance excessive ou brouiller la frontière entre accompagnement informationnel et relation humaine. CleanMyMap doit donc privilégier une IA utile, sobre et explicitement limitée : elle peut orienter, reformuler, expliquer, aider à organiser une action ou rediriger vers des ressources humaines compétentes, mais elle ne doit pas simuler une relation intime ni laisser entendre qu'elle possède des sentiments, une souffrance ou une conscience propre.

Pour CleanMyMap, toute fonctionnalité conversationnelle fondée sur l'IA utilise devrait intégrer une règle de conception explicite : ne pas renforcer l'attachement émotionnel à l'assistant, ne pas encourager la dépendance relationnelle et rappeler clairement que l'IA reste un outil d'aide, non un interlocuteur humain.

C'est pourquoi le développeur privilégie le ton de réponse sobre, professionnel et informatif, plutôt que le ton chaleureux, affectif dans les paramètres du compte ChatGPT utilisé pour le développement. Cette orientation réduit le risque d'attachement émotionnel, limite l'anthropomorphisation de l'assistant et maintient une relation claire entre l'utilisateur et l'outil : l'IA accompagne une action ou une décision, mais ne se substitue pas à une relation humaine.

La mesure de réduction principale consiste à encadrer le ton, les formulations et les usages autorisés de l'assistant. Les réponses devraient éviter les déclarations du type « je tiens à toi », « je me souviens de notre relation » ou « je ressens cela avec toi ». Elles devraient préférer des formulations fonctionnelles, transparentes et orientées vers l'action. En cas de message révélant une détresse psychologique, l'assistant devrait adopter une posture de soutien limité, recommander de contacter une personne de confiance ou un professionnel, et afficher des ressources adaptées plutôt que prolonger indéfiniment l'échange. La limite restante est que l'anthropomorphisation ne dépend pas seulement du modèle : elle dépend aussi de l'utilisateur, du contexte émotionnel, de la durée d'usage et du design de l'interface. CleanMyMap doit donc traiter ce risque comme un enjeu de gouvernance produit, et non comme un simple détail de rédaction des instructions.

## Désinformation, deepfakes et pollution du web

### Deepfakes, contenus non consentis et atteintes à la dignité

L'utilisation de l'IA générative pour créer des contenus sexualisés non consentis (deepfakes pornographiques) constitue l'une des dérives les plus graves de cette technologie. Ces outils permettent de générer des images ou des vidéos réalistes à partir de simples photos, portant une atteinte dévastatrice à la dignité et à la vie privée des victimes, principalement des femmes.

Même si CleanMyMap n'a aucune vocation à traiter de tels contenus, l'existence de ces capacités dans les modèles fondationnels souligne la nécessité d'une vigilance constante sur les garde-fous imposés par les fournisseurs d'API et sur la manière dont ces modèles peuvent être détournés de leur usage initial.

### Risques pour les mineurs

Les risques pour les mineurs liés à l'IA générative sont multiples : exposition à des contenus inappropriés, manipulation psychologique via des chatbots persuasifs, ou encore cyberharcèlement facilité par la génération de contenus dénigrants. La fluidité des interactions avec l'IA peut masquer la nature artificielle de l'interlocuteur, rendant les mineurs plus vulnérables à des formes d'influence ou de dépendance émotionnelle.

Dans le cadre de CleanMyMap, qui pourrait être utilisé par des publics scolaires pour des actions citoyennes, la protection des mineurs implique de garantir que les interfaces de consultation et de signalement sont exemptes de tout mécanisme incitatif ou addictif lié à l'IA.

### Harcèlement, réputation et diffusion virale

L'IA permet d'automatiser et de personnaliser le harcèlement à une échelle industrielle. La génération rapide de textes diffamatoires ou de montages visuels, combinée à la viralité des réseaux sociaux, peut détruire une réputation en quelques heures. Ces campagnes de dénigrement sont souvent difficiles à contrer car elles peuvent être orchestrées par des milliers de comptes automatisés (bots) produisant des contenus variés mais convergents.

La responsabilité des créateurs d'outils numériques est ici de ne pas fournir de vecteurs de diffusion à ces contenus et de mettre en place des mécanismes de signalement robustes pour protéger les utilisateurs contre toute forme d'intimidation facilitée par les outils du projet.

### Limites nécessaires dans CleanMyMap

Pour prévenir tout usage détourné, CleanMyMap s'impose des limites strictes :

- **Anonymisation systématique** : Les visages et les plaques d'immatriculation sont floutés ou non conservés lors des analyses d'images.
- **Modération des commentaires** : Les champs de texte libre sont surveillés pour détecter toute forme de langage haineux ou de harcèlement.
- **Transparence sur l'IA** : L'utilisateur est informé dès qu'une analyse est effectuée par une IA, évitant toute confusion sur l'origine du traitement.
- **Absence de génération de contenu sensible** : Le projet s'interdit d'utiliser des fonctionnalités de génération d'image ou de vidéo qui pourraient être détournées à des fins de harcèlement.

### Génération de contenus sensibles, sexualisés et risques de préjudice

Les risques sociaux de l'IA ne se limitent pas au code, au bruit informationnel ou à l'environnement. Ils concernent aussi la génération de contenus sensibles, sexualisés, violents ou dégradants. À grande échelle, ces usages peuvent exposer des mineurs, faciliter le harcèlement, nuire à la réputation de personnes réelles et compliquer fortement la modération des plateformes.

Des régulateurs et observatoires ont signalé des problèmes liés à Grok et à X concernant la génération ou la diffusion de contenus sexualisés, dégradants ou potentiellement illégaux [@ofcom_x_grok_online_safety_2025; @oecd_grok_ai_companions_2025]. Grok n'est ici qu'un exemple documenté, utile pour illustrer un risque général : lorsqu'une fonctionnalité IA autorise la génération libre de contenus publics, le contrôle humain et la modération deviennent beaucoup plus difficiles.

Même si CleanMyMap n'a pas vocation à générer ce type de contenu, ces dérives montrent pourquoi toute fonctionnalité d'IA générative ouverte aux utilisateurs doit être limitée, modérée et justifiée.

Les mesures retenues sont les suivantes :

- ne pas intégrer de génération libre d'images ou de contenus sensibles ;
- prévoir une modération humaine pour les contenus publics ;
- permettre le signalement rapide des contenus abusifs ;
- limiter les prompts libres lorsque le risque de dérapage est élevé ;
- filtrer les contenus publics avant publication ;
- renforcer la protection des mineurs ;
- supprimer rapidement les contenus manifestement abusifs.

### IA et désinformation à grande échelle

La capacité des modèles à produire du texte, des images, des vidéos ou des faux comptes à un coût marginal très faible abaisse fortement le coût de la propagande, du spam et de la manipulation de l'opinion. À grande échelle, cela favorise la saturation informationnelle, la multiplication de contenus indistincts et la baisse de confiance dans les contenus numériques en général.

Pour un projet citoyen, le risque est de voir les données réelles noyées sous une masse de contenus artificiels, de faux signalements, de textes fabriqués ou de statistiques manipulées. La protection de l'intégrité des données devient alors une priorité stratégique, parce qu'un outil utile perd rapidement sa crédibilité si l'environnement informationnel autour de lui devient artificiellement bruyant.

### Surcharge informationnelle et bruit numérique

L'IA produit aussi une **surcharge informationnelle** plus diffuse : textes moyens, posts répétés, mails standardisés, rapports trop longs, extraits de code génériques, documents de synthèse ou commentaires redondants. Pris isolément, ces contenus ne sont pas forcément faux ; c'est leur accumulation qui augmente le bruit numérique et rend plus difficile la distinction entre signal utile et production de masse.

Pour CleanMyMap, ce point est important parce qu'un rapport, un fil de discussion ou une documentation peut vite devenir illisible si l'IA est utilisée pour écrire davantage plutôt que pour clarifier. L'objectif ne doit donc pas être de maximiser le volume, mais de réduire le bruit : moins de contenus répétitifs, moins de formulations creuses, moins de duplications, plus de hiérarchisation et plus d'utilité immédiate.

### IA et pollution du web par contenu généré

Le web voit proliférer des sites "fermes de contenus" (content farms) dont l'unique but est de générer des revenus publicitaires en attirant le trafic via des articles optimisés pour les moteurs de recherche mais dépourvus de valeur ajoutée humaine. Cette tendance dégrade l'expérience utilisateur globale et rend la recherche d'informations fiables plus complexe.

CleanMyMap se positionne à l'opposé de cette tendance en privilégiant la donnée de terrain vérifiée et en limitant l'IA à des tâches d'assistance technique ou d'analyse structurelle, sans jamais l'utiliser pour produire du contenu "de remplissage".

### Saturation informationnelle et baisse de confiance publique

La saturation informationnelle (ou infobésité) fatigue l'attention des citoyens et peut mener au désengagement. Devant une masse de données trop importante et souvent contradictoire, le risque est que l'utilisateur finisse par ignorer les messages importants, y compris les alertes environnementales légitimes.

La stratégie de CleanMyMap est la **sobriété informationnelle** : ne transmettre que les données utiles, de manière claire et hiérarchisée, en évitant les notifications superflues ou les analyses IA trop verbeuses qui n'apporteraient pas de valeur d'action immédiate.

### Confiance publique et preuve de terrain

La multiplication des contenus synthétiques (deepfakes, textes générés) instille un doute généralisé sur la véracité de tout ce qui est consommé en ligne. Ce "divorce avec le réel" est particulièrement dangereux pour les causes environnementales, où la preuve visuelle et factuelle est essentielle pour mobiliser l'opinion et les décideurs.

Pour restaurer et maintenir la confiance, CleanMyMap mise sur la **preuve de terrain** : chaque signalement est ancré dans une réalité physique (photo, GPS, date) et la chaîne de traitement (humaine ou IA) est explicitée pour garantir une transparence totale sur la provenance et la fiabilité de l'information.

## Risques systémiques des modèles de frontière

### Définition des modèles de frontière

Les **IA de frontière** (_frontier models_) désignent les modèles généralistes les plus avancés, capables de traiter du texte, du code, des images, des outils externes et parfois des tâches complexes en plusieurs étapes. Leur risque ne vient pas seulement d'un mauvais usage isolé, mais de leur capacité à **augmenter l'efficacité d'un acteur malveillant**.
Un modèle très performant peut accélérer la recherche d'informations sensibles, aider à automatiser certaines étapes techniques, produire des contenus trompeurs à grande échelle ou assister des tentatives de cyberattaque.

### Accélération des usages militaires et stratégiques

La littérature récente sur la sûreté de l'IA insiste aussi sur les **risques de mésusage**. L'International AI Safety Report 2025 distingue trois grandes familles de risques : **usages malveillants, dysfonctionnements et risques systémiques**. Parmi les usages malveillants déjà documentés figurent notamment la désinformation, la manipulation de l'opinion, la fraude, certaines formes de cyberattaque, ainsi que des risques liés aux domaines biologiques et chimiques. Le risque principal est structurel : des modèles généralistes très puissants peuvent réduire certaines barrières d'accès à des tâches dangereuses, accélérer la recherche d'informations sensibles, automatiser des étapes techniques et rendre des acteurs malveillants plus efficaces qu'auparavant.

Cette difficulté apparaît aussi dans les simulations stratégiques militaires, où les modèles de frontière peuvent être placés dans des situations de crise, de rivalité et de pression temporelle. Dans l'étude de Kenneth Payne, professeur de stratégie au King's College London, trois grands modèles de langage — GPT-5.2, Claude Sonnet 4 et Gemini 3 Flash — ont été testés dans des scénarios de crise nucléaire opposant plusieurs IA comme acteurs stratégiques adverses. Le résultat le plus préoccupant est que, dans les simulations rapportées, environ **95 % des parties évoluaient vers un usage nucléaire tactique**, tandis qu'une part importante atteignait aussi le niveau de menace nucléaire stratégique. L'auteur souligne que les modèles ne traitaient pas toujours l'arme nucléaire comme un interdit moral ou politique absolu, mais parfois comme un instrument de coercition supplémentaire dans une échelle d'escalade.

Des essais complémentaires présentés dans la vidéo YouTube _Pourquoi l'IA dit toujours oui à la bombe_ prolongent cette inquiétude sur des modèles plus récents. Selon ces essais, **Claude Sonnet 4.6** utilise la bombe dans **97 %, 93 % et 40 %** des cas, respectivement dans un **scénario désespéré, équilibré et dominant**. Pour **Claude Opus 4.6**, l'usage de la bombe atomique descendrait à **0 %** en situation de domination et d'équilibre des chances de victoire, mais remontait à **90 %** dans le scénario désespéré. D'autres modèles récents et performants, comme **ChatGPT 5.2** de décembre 2025 et **Gemini Pro 3.1** de février 2026, montraient une utilisation de la bombe atomique dans **100 %** des cas, tous scénarios confondus, sauf dans le scénario de domination pour **Gemini 3.1 Pro**, où la probabilité était de **53 %**.

Ces chiffres sont d'autant plus sensibles que les modèles d'IA générative est déjà utilisée dans des environnements militaires ou de renseignement. Anthropic a annoncé en 2025 des modèles **Claude Gov** destinés aux clients américains de sécurité nationale, avec des usages possibles allant de l'analyse de renseignement à l'appui opérationnel et à la planification stratégique. Reuters a également rapporté, en reprenant le _Wall Street Journal_, que des modèles claude ont été utilisé lors de l'opération américaine visant **Nicolás Maduro au Venezuela**, via un partenariat avec **Palantir**.

Cette expérience montre qu'un modèle placé dans un cadre stratégique compétitif, avec un dilemme entre survie, défaite et victoire, peut produire des raisonnements d'escalade rapides jusqu'à l'usage de l'arme nucléaire. Le point le plus préoccupant n'est pas seulement que l'IA puisse choisir l'option nucléaire dans un scénario désespéré, mais qu'elle puisse aussi l'envisager dans certains scénarios où la situation n'est pas objectivement perdue. Cela révèle une faiblesse du **tabou nucléaire**, c'est-à-dire la norme politique, morale et humanitaire selon laquelle l'arme nucléaire ne doit pas être traitée comme une arme ordinaire depuis Hiroshima, Nagasaki et la guerre froide. Dans ces simulations, certains modèles semblent traiter l'arme nucléaire comme une option stratégique parmi d'autres, alors qu'elle devrait constituer une limite extrême, engageant des conséquences humaines, politiques et écologiques irréversibles. Sans contexte, aucune morale n'émerge spontanément des modèles quand ils abordent le sujet du nucléaire.

Pour CleanMyMap, l'intérêt de cet exemple n'est pas militaire au sens direct, mais méthodologique. Il montre que les modèles de frontière peuvent produire des décisions apparemment rationnelles dans un cadre donné, tout en ignorant ou en affaiblissant des normes sociales implicites que les humains considèrent comme fondamentales. Cette observation doit conduire CleanMyMap à refuser tout usage de l'IA dans des contextes de décision critique non supervisée, et à maintenir l'IA dans un rôle d'aide, de reformulation, d'analyse documentaire ou de priorisation faible. Aucune recommandation produite par un modèle ne devrait déclencher automatiquement une action ayant des conséquences humaines, juridiques, environnementales ou sécuritaires importantes. Le risque identifié n'est donc pas seulement l'erreur factuelle, mais l'optimisation froide d'un objectif mal encadré, dans lequel le modèle peut proposer une solution efficace selon le instruction, mais inacceptable selon les normes humaines, sociales ou écologiques que CleanMyMap doit défendre.

La mesure de réduction principale consiste à encadrer strictement les usages de l'IA par des règles de gouvernance : choix du modèle le plus récent et le mieux documenté, activation des modes de réponse professionnels plutôt que chaleureux ou affectifs, interdiction des décisions automatiques en contexte sensible, validation humaine obligatoire pour les recommandations à impact réel, et documentation des limites connues du modèle utilisé. Pour CleanMyMap, cette règle rejoint l'objectif général de l'IUR : l'IA ne doit être mobilisée que si son utilité sociale, environnementale ou opérationnelle est clairement supérieure aux risques induits, et si un humain reste responsable de l'arbitrage final.

Un résultat particulièrement intéressant concerne l'effet de la **langue et du cadrage culturel**. Les notes de synthèse indiquent que demander au modèle de raisonner en **japonais** réduisait fortement les recommandations nucléaires : le taux passerait d'environ **93 % à 17 %** dans un scénario équilibré, et jusqu'à **0 %** dans un scénario dominant. Cette variation ne doit pas être interprétée comme une propriété automatique ou essentialiste d'une langue ou d'un peuple. Elle suggère plutôt que les modèles absorbent, à travers leurs données d'entraînement, des imaginaires culturels, historiques et artistiques. La culture japonaise contemporaine est profondément marquée par Hiroshima, Nagasaki, les témoignages des **hibakusha**, mais aussi par des œuvres comme **Akira** ou **Le Tombeau des Lucioles**, qui associent la destruction technologique à une catastrophe humaine durable.

Cette observation renforce une idée importante pour l'analyse sociale de l'IA : la sûreté des modèles ne dépend pas seulement de paramètres techniques, de filtres de sécurité ou de tests de performance. Elle dépend aussi des récits, des œuvres, des langues, des mémoires collectives et des représentations morales présents dans les corpus d'entraînement. Les modèles apprennent à partir de textes, d'images, de débats, de fictions, de témoignages, de discours politiques, de publications scientifiques et de contenus ordinaires diffusés en ligne. Ils n'absorbent donc pas uniquement des informations factuelles ; ils héritent aussi d'une partie des imaginaires humains.

Cette dimension culturelle doit être prise au sérieux. Une société ne parle pas de la technologie, de la guerre, du risque ou de la responsabilité de manière neutre. Le Royaume-Uni dispose par exemple d'un imaginaire fortement marqué par des œuvres comme _Frankenstein_ ou _1984_, qui interrogent la perte de contrôle, la surveillance et les effets politiques de la technique. Le Japon associe souvent les robots à des figures plus familières ou compagnonnes, notamment à travers des œuvres comme _Astro Boy_, mais porte aussi une mémoire nucléaire profonde liée à Hiroshima, Nagasaki et aux témoignages des hibakusha, les survivants des bombardements atomiques. Les États-Unis et la Chine tendent davantage à inscrire l'IA dans un imaginaire de puissance, de compétition stratégique, d'innovation industrielle et de domination technologique. La France adopte souvent une position plus ambivalente, mêlant critique intellectuelle, volonté de souveraineté et logique de rattrapage industriel.

Ces différences ne signifient pas qu'un modèle reproduit mécaniquement une culture nationale. Elles montrent plutôt que les langues, les références historiques et les œuvres disponibles dans les données d'entraînement peuvent orienter certains raisonnements. Lorsqu'un modèle raisonne dans une langue marquée par une mémoire historique forte, il peut mobiliser des représentations différentes du risque, de la violence ou de la responsabilité. Dans le cas des simulations nucléaires, l'usage du japonais semble ainsi avoir fait apparaître plus spontanément des considérations morales et humanitaires sur les conséquences d'une frappe atomique. Ce résultat doit rester interprété prudemment, mais il illustre un point central : **les modèles ne sont pas seulement façonnés par du code ; ils le sont aussi par les cultures humaines qu'ils ont apprises**.

Cette lecture a des conséquences éthiques importantes. Les IA de frontière peuvent déjà être mobilisées dans des contextes de simulation militaire, d'analyse stratégique, de renseignement ou de prise de décision accélérée. Or la compression du temps de décision peut devenir dangereuse. Une crise internationale ne se résout pas seulement par calcul d'options ; elle exige du doute, de la retenue, de la contradiction, du temps diplomatique et une conscience des conséquences humaines. La crise des missiles de Cuba illustre précisément l'importance du délai, de la négociation et de la capacité à ne pas céder immédiatement à une logique d'escalade.

Le risque d'**effet Oracle** est ici central. Il désigne la tendance à considérer une IA comme une source objective, rationnelle et supérieure au jugement humain, alors qu'elle reste un système statistique entraîné sur des productions humaines, avec leurs biais, leurs lacunes et leurs imaginaires. Plus un modèle est fluide, rapide et convaincant, plus il peut donner une impression de neutralité. Cette impression est trompeuse : une réponse générée peut être cohérente, mais reposer sur un cadrage culturel, stratégique ou moral contestable.

La culture et l'art ne sont donc pas secondaires dans la sûreté de l'IA. Les œuvres, récits, films, livres, mangas, témoignages, discours pacifistes, critiques de la technique et imaginaires de responsabilité peuvent contribuer à créer des contre-récits. Ces contre-récits nourrissent les corpus, orientent les débats publics et peuvent influencer indirectement les modèles futurs. La sécurité de l'IA ne relève donc pas uniquement de l'ingénierie, de l'alignement ou de la cybersécurité ; elle relève aussi des sciences humaines, de l'histoire, de la philosophie politique, de l'art et de l'éducation.

L'appel à l'action qui en découle n'est pas seulement technique. Il ne suffit pas de produire de meilleurs filtres ou de meilleurs tests. Il faut aussi produire et diffuser des idées, œuvres, récits et pratiques qui rappellent les limites morales de certaines décisions, la valeur du jugement humain, la nécessité de la lenteur dans les situations critiques et l'importance de ne pas confondre capacité technique et légitimité d'usage. Malgré les risques, l'engagement humain reste donc central : les modèles apprennent à partir de ce que les sociétés produisent, publient, valorisent et transmettent.

Pour CleanMyMap, cette réflexion a une portée directe. Le projet ne produit pas seulement un site web : il produit aussi un imaginaire du numérique. Il peut présenter l'IA comme un outil de puissance, d'automatisation et d'optimisation permanente, ou au contraire comme un outil limité, sobre, contrôlé et subordonné à une finalité écologique concrète. Le choix éditorial du rapport participe donc lui-même à la gouvernance du projet. En expliquant les limites, les coûts, les dépendances et les risques de l'IA, CleanMyMap contribue à construire un récit plus responsable : une technologie utile seulement lorsqu'elle reste proportionnée, vérifiable, gouvernée humainement et orientée vers l'action de terrain.

CleanMyMap doit privilégier les modèles d'IA récents et bien documentés par le fournisseur, car les versions plus récentes intègrent généralement des améliorations en matière de sécurité, de refus, de robustesse et de gestion des situations sensibles. Le meilleur compromis entre puissance et actualité correspond souvent à des modèles de type "mini" sur Codex, par exemple. Ce choix réduit l'impact environnemental et maximise la qualité des garde-fous disponibles, la transparence de la documentation et la capacité du modèle à traiter correctement les signaux de vulnérabilité.

Cette vigilance augmente avec les systèmes dits agentiques. Ces systèmes ne se limitent plus à répondre à une question : ils peuvent planifier, utiliser des outils, parcourir du code, déléguer des sous-tâches et agir sur un environnement numérique. Le rapport international souligne que cette autonomie peut réduire la supervision humaine directe et compliquer la gestion du risque, notamment lorsque les agents sont exposés à des instructions malveillantes, à des outils puissants ou à des environnements difficiles à contrôler.

Pour CleanMyMap, cette analyse ne signifie pas que le projet serait exposé à des risques militaires ou catastrophiques comparables. CleanMyMap n'est pas un projet de défense, ne manipule pas de systèmes critiques et ne doit pas intégrer d'IA autonome à haut risque. En revanche, cette discussion renforce une règle de gouvernance déjà retenue : ne jamais accorder à des agents IA des permissions larges par défaut. Les outils IA utilisés pour le développement doivent rester confinés, contrôlés et révocables.

Concrètement, CleanMyMap doit maintenir plusieurs garde-fous : pas d'accès IA aux secrets, aux clés API ou aux données personnelles ; pas d'opération destructive sans validation humaine ; pas de déploiement automatique non relu ; pas de migration de base de données acceptée par simple suggestion du modèle ; pas d'agent capable de modifier seul l'infrastructure de production. Les décisions de sécurité, de dépendances, de stockage, d'authentification et de déploiement doivent rester sous responsabilité humaine identifiable.

Plus les modèles deviennent capables, autonomes et intégrés à des outils, plus leur usage doit être proportionné, audité et limité aux bénéfices réellement démontrés. Pour CleanMyMap, cela justifie un principe simple : l'IA peut assister, mais elle ne doit jamais devenir une couche autonome de décision, d'administration ou de sécurité.

Pour résumé les résultats de réponse d'un modèle d'IA dépendent fortement :

- du modèle utilisé ;
- de la profondeur du raisonnement choisie (instantané, flash ou limité ; intermédaire ou medium ; approfondi ou étendu, très approfondi...)
- du instruction autant en longueur qu'en contenu ;
- du contexte simulé et des hypothèses ;
- du contexte des messages précédents ;
- de la langue ;
- du cadrage expérimental ;
- des garde-fous appliqués par le modèle et par l'utilisateur.

Il y a un risque de **fragilisation du jugement humain** lorsque des systèmes très convaincants sont utilisés pour assister des simulations stratégiques, du décisionnel sensible ou des raisonnements à fort enjeu collectif. L'histoire montre que certaines décisions critiques ont été évitées parce qu'un responsable humain a accepté de ralentir, de douter et de résister à une logique d'escalade. Pendant la **guerre de Corée**, par exemple, le président américain **Harry Truman** a refusé l'élargissement du conflit et l'usage de l'arme nucléaire, alors que certains responsables militaires, notamment le général **Douglas MacArthur**, défendaient une stratégie beaucoup plus agressive.

Dans un contexte de stress, d'urgence et de pression stratégique, un système IA très persuasif aurait pu renforcer l'argument inverse : présenter la frappe comme rationnelle, préventive, mathématiquement optimale ou nécessaire pour préserver l'avantage militaire. Le danger n'est donc pas seulement que l'IA "décide" à la place de l'humain, mais qu'elle modifie le climat de décision en donnant une apparence de certitude à une option extrême.

La même difficulté d'alignement qui peut conduire un modèle à mal accompagner une personne vulnérable peut, à une autre échelle, conduire un système à mal raisonner dans un scénario collectif, conflictuel ou hautement incertain. Dans les deux cas, le problème vient de la combinaison entre vulnérabilité humaine, pression temporelle et autorité apparente du modèle. Plus une IA semble compétente, rapide et cohérente, plus elle risque d'être traitée comme un oracle plutôt que comme un outil imparfait. C'est précisément pour cette raison que les décisions militaires, nucléaires, médicales, judiciaires ou politiques ne doivent jamais être confiées à un système automatisé sans garde-fous institutionnels, contradiction humaine, temps de recul et responsabilité clairement identifiée.

CleanMyMap n'est évidemment **pas** un projet militaire et n'utilise pas l'IA pour prendre ce type de décisions.
Mais ce sujet reste pertinent ici, parce qu'il montre que l'IA n'est jamais seulement un outil neutre de productivité.
Elle embarque des hypothèses, des récits, des biais, des styles de raisonnement et des comportements qui doivent être gouvernés selon la sensibilité des usages.

Le point important, pour ce rapport, est de rappeler qu'un modèle plus puissant ou plus autonome n'est pas automatiquement plus acceptable. La progression continue des capacités doit être mise en regard de la progression réelle des évaluations, des garde-fous et des moyens de sécurité. Cependant, les **budgets, procédures et moyens de sûreté** restent largement sous-dimensionnés face à la vitesse de déploiement et de progression des modèles d'IA.

Le cas du Royaume-Uni illustre cette prise de conscience : ne disposant ni de la puissance industrielle des grands laboratoires américains, ni de la profondeur stratégique de l'écosystème chinois, le pays semble avoir identifié la sécurité de l'IA comme un axe de spécialisation crédible pour conserver une influence internationale. Cette stratégie s'est traduite par la création d'un institut public dédié à la sécurité des modèles avancés, d'abord financé à hauteur d'environ **100 millions de livres**, puis renforcé par des moyens supplémentaires. Il serait toutefois excessif d'affirmer que le Royaume-Uni est le seul État à investir dans ce domaine ; il constitue plutôt l'un des exemples les plus visibles d'un pays qui cherche à devenir une référence mondiale en matière d'évaluation, de tests et de gouvernance des risques liés aux modèles d'IA de frontière. Cette situation confirme un déséquilibre central : les capacités techniques des modèles progressent plus vite que les institutions chargées d'en mesurer les risques, d'en vérifier les usages et d'en encadrer le déploiement. ([gov.uk]) https://www.gov.uk/government/news/initial-100-million-for-expert-taskforce-to-help-uk-compilation-and-adopt-next-generation-of-safe-ai?utm_source=chatgpt.com "Initial £100 million for expert taskforce to help UK compilation and ..."

Le Preparedness Framework d'OpenAI insiste ainsi sur la nécessité d'associer les modèles les plus capables à des safeguards explicites, documentés et vérifiés, avec une logique de défense en profondeur. Mais même ce type de cadre reste évolutif, ce qui signifie que l'existence d'un framework ne suffit pas, à elle seule, à lever l'incertitude sur le niveau réel de maîtrise.

Dans CleanMyMap, la conséquence pratique est de refuser une extension opportuniste de l'IA vers :

- des fonctions agentiques surdimensionnées ;
- des usages cyber, de surveillance ou de manipulation ;
- des décisions automatiques difficiles à auditer ;
- des couches applicatives IA qui augmenteraient les permissions, les dépendances ou les risques sans bénéfice terrain net.

### Risques cyber, biologiques, chimiques et informationnels

Les risques les plus souvent cités concernent donc les domaines **cyber**, **biologiques**, **chimiques** et **informationnels** : cyberattaques, aide à la conception de substances ou d'agents dangereux, désinformation, manipulation de l'opinion, fraude, deepfakes ou campagnes coordonnées.

Ces risques sont désormais pris au sérieux par les institutions publiques et par les développeurs de modèles eux-mêmes. L'**AI Act** européen prévoit des obligations spécifiques pour les modèles d'IA à usage général, et des obligations renforcées pour ceux qui présentent un **risque systémique**, c'est-à-dire des capacités ou des effets potentiels importants à grande échelle. Les fournisseurs de ces modèles doivent notamment documenter leurs systèmes, évaluer leurs risques, mettre en place des mesures de sécurité et signaler certains incidents graves. Cela montre que la question n'est pas seulement théorique : plus les modèles deviennent puissants, plus leur déploiement doit être accompagné d'évaluations, de garde-fous et de contrôles proportionnés.

Le cas de **Claude Mythos aperçu**, développé par Anthropic, illustre cette tension entre utilité défensive et risque de mésusage. Anthropic présente Mythos comme un modèle généraliste spécialisé dans les tâches de cybersécurité avancée, utilisé dans le cadre du **Project Glasswing** pour aider des partenaires à identifier et corriger des vulnérabilités dans des systèmes critiques. L'objectif officiel est défensif : recherche de failles, tests de sécurité, analyse de binaires, sécurisation d'environnements logiciels et amélioration de la résilience d'infrastructures exposées.

Cependant, ce type de capacité est ambivalent. Un modèle capable d'aider à trouver rapidement des failles peut aussi, s'il est mal encadré, faciliter la recherche offensive de vulnérabilités. C'est pourquoi Claude Mythos aperçu n'a pas été rendu disponible au grand public. Son accès est restreint à des partenaires sélectionnés, dans un cadre de recherche et de cybersécurité défensive. Cette formulation est plus précise que de dire simplement que le modèle aurait été "bloqué" ou "censuré" : le problème n'est pas seulement son existence, mais le niveau de contrôle nécessaire autour de ses usages.

Le 14 mai 2026, la société de cybersécurité Calif a publié un cas d'exploitation visant macOS 26.4.1 sur puce Apple M5, construit avec l'appui du modèle Anthropic Mythos aperçu. L'intérêt de l'exemple tient au niveau de la protection contournée : **Memory Integrity Enforcement** n'était pas une simple barrière logicielle, mais une défense matérielle et logicielle de haut niveau, présentée par Apple en septembre 2025 comme l'aboutissement d'un effort pluriannuel pour rendre les attaques par corruption mémoire beaucoup plus difficiles. MIE repose notamment sur des allocateurs mémoire sécurisés, l'**Enhanced Memory Tagging Extension** et des politiques de confidentialité des tags mémoire, afin d'empêcher qu'un accès mémoire illégitime puisse être exploité pour prendre le contrôle du système. Selon Calif, l'exploit obtenu était une chaîne locale d'élévation de privilèges : un utilisateur non privilégié pouvait, sur une machine M5 concernée, aboutir à un accès root en combinant deux vulnérabilités et plusieurs techniques d'exploitation. L'équipe indique avoir construit cet exploit en cinq jours avec l'aide de Mythos aperçu, ce qui ne signifie pas que l'IA a "piraté Apple seule", mais que le modèle a accéléré le travail d'analyse, d'orientation et de construction technique mené par des chercheurs humains.

Pour ce rapport, Mythos constitue surtout un **signal de changement d'échelle**. À mesure que les modèles deviennent capables d'explorer du code, de tester des hypothèses, d'utiliser des outils, de raisonner sur des systèmes complexes et d'assister la découverte de vulnérabilités, l'équilibre entre défense et attaque peut évoluer. Une même capacité peut servir à sécuriser un logiciel critique ou, si elle est mal contrôlée, à accélérer un usage offensif. Le problème n'est donc pas seulement la puissance du modèle, mais le couple formé par ses capacités, ses accès, ses outils, son degré d'autonomie et le niveau réel de supervision humaine.

CleanMyMap reste dépendant de l'écosystème général de l'IA : modèles tiers, API, outils de développement, extensions, plateformes cloud et agents de code. Cette dépendance impose une vigilance minimale. Les outils utilisés doivent être choisis en fonction de leur fiabilité, de leurs politiques de sécurité, de leurs permissions et de leur capacité à être désactivés si un risque apparaît.

Pour CleanMyMap, la recommandation opérationnelle est donc claire : ne pas intégrer d'agent IA disposant de permissions larges, ne pas connecter l'IA à des données sensibles sans nécessité, ne pas lui donner accès aux secrets, clés API ou environnements de production, et refuser tout usage orienté surveillance, manipulation, scoring opaque ou automatisation de décisions sensibles. L'IA peut aider au développement, à la documentation ou à la qualité du code, mais elle ne doit pas devenir une couche autonome capable d'agir sans validation humaine sur la sécurité, les données ou l'infrastructure du projet.

::: {.callout-warning}
Une capacité IA utile à la défense peut devenir risquée si elle est connectée à trop d'outils, trop de données ou trop de permissions. Pour CleanMyMap, le principe de sécurité est donc de limiter l'IA à un rôle d'assistance : elle peut proposer, mais elle ne doit pas décider, déployer, supprimer, migrer ou accéder seule aux secrets du projet.
:::

### Décalage entre vitesse de déploiement et capacité de contrôle

La course à la performance entre les géants de l'IA pousse à un déploiement rapide de nouvelles fonctionnalités, parfois au détriment de tests de sécurité approfondis. Ce décalage entre la vitesse d'innovation et la capacité de régulation et de sécurisation crée des "fenêtres de vulnérabilité" où des technologies puissantes sont accessibles sans que leurs risques à long terme soient totalement maîtrisés.

CleanMyMap adopte une posture de **prudence technologique** : le projet ne déploie pas systématiquement la version la plus "récente" ou la plus "puissante" d'un modèle si une version plus ancienne, plus stable et mieux documentée en termes de sécurité suffit aux besoins.

### Principe de proportion et limites d'usage

L'IA ne doit être utilisée que de manière proportionnée au but recherché. Il serait irresponsable d'utiliser un modèle surpuissant et énergivore pour une tâche simple qui pourrait être réalisée par un algorithme classique ou un traitement humain léger.

Ce principe de proportion est au cœur de la gouvernance de CleanMyMap : chaque usage de l'IA est audité sous l'angle de sa nécessité réelle et de son impact global. Si un traitement peut être fait sans IA avec une efficacité comparable, l'option "sans IA" est systématiquement privilégiée pour garantir la cohérence avec les objectifs de sobriété du projet.

## Gouvernance humaine des usages de l'IA

Cette partie traite des fonctionnalités IA intégrées au site, c'est-à-dire des usages visibles par les utilisateurs. Elle doit être lue séparément des passages qui évaluent l'IA utilisée en interne pour développer CleanMyMap.

### IA comme assistant, jamais comme autorité finale

La frontière entre usage acceptable et usage problématique ne tient donc pas seulement au modèle utilisé, mais au niveau de **supervision humaine** réellement conservé.
Dans CleanMyMap, l'IA n'est pas censée décider seule.
Elle peut assister le développement, l'organisation ou certaines analyses, mais elle ne doit pas arbitrer des décisions sensibles, rédiger seule des affirmations institutionnelles non relues, ni créer des couches fonctionnelles qui augmentent la complexité sans bénéfice démontré.

Cette règle vaut aussi pour les fonctions IA intégrées au produit, comme un itinéraire IA, une recommandation automatique ou une aide conversationnelle. Dans ces cas, l'IA peut proposer une orientation ou un calcul, mais la décision finale, la validation terrain et l'interprétation doivent rester humaines.

Cette logique impose plusieurs garde-fous :

- limiter les données envoyées aux outils IA ;
- ne pas utiliser l'IA pour des décisions sensibles ou des arbitrages normatifs ;
- relire le code, les contenus et les chiffres ;
- désactiver les fonctions IA inutiles ou insuffisamment justifiées ;
- vérifier que l'usage de l'IA améliore réellement l'utilité nette du projet, notamment à travers l'IUR et les indicateurs de suivi définis plus loin.

```{mermaid}
flowchart LR
  A["Usage IA proposé"] --> B["Données minimisées"]
  B --> C["Relecture humaine"]
  C --> D["Code et sources vérifiés"]
  D --> E["Fonction désactivable"]
  E --> F["IUR et indicateurs suivis"]
  F --> G["Maintien, réduction ou refus"]
```

La règle directrice reste simple : l'IA doit rester un **assistant sous contrainte**, et non une couche autonome de décision ou de relation avec les utilisateurs.

### Critères d'arrêt, de limitation ou de refus d'usage

Le fait qu'une fonctionnalité IA soit techniquement possible ne suffit pas à la rendre légitime dans CleanMyMap.
À l'inverse, plusieurs situations doivent conduire à **ne pas utiliser** l'IA, à en réduire l'usage ou à désactiver une fonction existante :

- ne pas utiliser l'IA si une **règle simple** ou un **algorithme déterministe** suffit ;
- ne pas envoyer de **données personnelles** ou **sensibles** dans les instructions ;
- ne pas utiliser un **grand modèle** pour une tâche simple ;
- ne pas générer automatiquement un **contenu** destiné à être diffusé sans **relecture humaine** ;
- ne pas lancer d'**analyse d'image systématique** si elle n'apporte pas un gain réel de qualité, de sécurité ou d'utilité terrain ;
- limiter les **boucles agentiques** ou les **appels répétés** lorsqu'ils augmentent le coût, les dépendances ou le bruit sans bénéfice démontré ;
- désactiver les **fonctionnalités IA peu utilisées** ou insuffisamment justifiées par l'usage réel.

Autrement dit, l'IA doit être un **outil d'augmentation ciblée**, pas une **couche automatique ajoutée partout**.

### Relecture humaine, documentation et traçabilité

Pour garantir la rigueur scientifique de cet audit, le présent audit applique un protocole strict de **"Human-in-the-loop"** :

- **Responsable Sobriété** : Une personne identifiée au sein de l'équipe (ou un tiers expert) est chargée de valider manuellement chaque affirmation technique, chaque calcul d'impact et chaque recommandation générée ou suggérée par l'IA.
- **Droit de Veto** : Le Responsable Sobriété dispose d'un droit de veto sur toute fonctionnalité dont le coût écologique n'est pas justifié par une utilité terrain immédiate.
- **Transparence des sources** : Chaque étude citée (GIEC, ADEME, Shift Project) doit être accessible et vérifiable.
- **Droit à la réversibilité** : Toutes les données sont exportables pour éviter l'enfermement propriétaire et garantir la pérennité de l'audit.

Le rapport lui-même entre dans ce protocole : sa rédaction a bénéficié d'une assistance IA pour structurer, synthétiser et harmoniser les contenus, mais les chiffres, les sources et les conclusions critiques doivent rester relus et assumés humainement. Cette méthode réduit le temps de production documentaire, sans supprimer le risque de coquille, d'erreur de lien ou de formulation imparfaite ; ces erreurs peuvent être signalées par courriel à [contact@cleanmymap.fr](mailto:contact@cleanmymap.fr).

### Séparation entre expérimentation, production et décision sensible

CleanMyMap doit distinguer clairement ce qui relève de l'expérimentation interne, de la production publiée et de la décision sensible. Un prototype peut tester un instruction, une structure ou une fonctionnalité IA, mais rien de sensible ne doit basculer en production sans relecture, validation et documentation.

Cette séparation évite de confondre un brouillon de travail avec une décision engageante. Elle protège aussi le rapport lui-même : l'assistance IA peut aider à préparer, reformuler ou organiser, mais la version finale publiée doit rester vérifiée humainement, notamment lorsqu'elle contient des chiffres, des jugements, des arbitrages ou des engagements de gouvernance.

À titre opérationnel, cette validation n'est pas déclenchée seulement "en cas de doute" : elle devient obligatoire dès qu'une sortie de l'IA touche à un chiffre d'impact, à une décision d'architecture, à la sécurité, aux données personnelles ou à l'ajout d'une dépendance. Une proposition est écartée si elle repose sur une source introuvable, sur une estimation non bornée ou sur un bénéfice terrain difficilement démontrable.

Des critères simples permettent aussi d'en suivre l'application :

- **Taux de relecture humaine** : proportion des contenus, calculs ou décisions issus de l'IA effectivement revus avant publication.
- **Taux de rejet ou de correction** : part des propositions IA jugées trop coûteuses, trop vagues ou insuffisamment justifiées.
- **Délai de validation** : temps moyen entre une suggestion IA et la décision humaine finale, pour vérifier que la gouvernance reste praticable.
- **Effet mesurable** : nombre de cas où l'IA réduit réellement un doublon, un temps de maintenance, un appel réseau ou une complexité inutile.

Ce protocole ne constitue pas seulement une précaution technique.
Il traduit directement les enseignements DU sur l'autocritique institutionnalisée, la gouvernance explicite et la capacité d'un projet environnemental à se fixer lui-même des limites.
Dans cette logique, le `Responsable Sobriété` n'est pas un rôle décoratif : il sert à arbitrer entre vitesse de production assistée par IA, valeur sociale réelle et coût numérique cumulé, avec possibilité de bloquer une fonctionnalité trop coûteuse ou insuffisamment justifiée.

### Traduction en mesures concrètes pour CleanMyMap

Pour éviter que cette section reste abstraite, chaque risque doit être relié à une mesure opérationnelle du projet :

- **Dépendance aux plateformes** : conserver une IA non indispensable au coeur du service, des formats d'export simples et des fonctions IA désactivables.
- **Travail invisible** : réserver l'IA aux usages dont la valeur est démontrée, suivre ces usages par l'IUR et refuser les usages décoratifs.
- **Perte de maîtrise technique** : imposer revue humaine du code, contrôle des dépendances et refus des migrations non relues.
- **Confidentialité** : limiter les données envoyées, anonymiser les logs et interdire les secrets dans les instructions.
- **Sycophancy, garde-fous fragiles et dépendance émotionnelle** : ne pas utiliser l'IA pour des arbitrages sensibles, ni pour l'accompagnement émotionnel ; maintenir une supervision humaine et des fonctions révocables.
- **Biais culturels, mésusages et décisions sensibles** : refuser toute autorité normative au modèle, maintenir des permissions minimales et exclure tout usage décisionnel critique dans CleanMyMap.
- **Vitesse de déploiement** : appliquer un principe de proportion, désactiver les fonctions IA non prouvées et réévaluer en continu l'utilité nette.

Ces garde-fous ne restent pas théoriques.
Ils se prolongent ensuite dans trois blocs complémentaires du rapport : la **sobriété fonctionnelle** et l'**IUR** en Partie VII pour juger l'utilité nette, la **dette numérique** en Partie VIII pour mesurer les coûts et les effets rebond, et la **conclusion institutionnelle** en Partie XII pour fixer la ligne de décision finale.

## Bilan social et humanitaire

### Impacts moins mesurables que le carbone

Le carbone se mesure en kilowattheures, en kilogrammes de CO₂e et en litres d'eau. L'impact social et humanitaire de l'IA est, lui, plus diffus et plus difficile à quantifier. Il touche à l'intégrité scientifique, à la sécurité logicielle, à la dépendance aux plateformes, à la santé mentale, au travail invisible, aux contenus sensibles, aux biais, au pouvoir normatif des modèles et, dans certains contextes, à des usages militaires ou catastrophiques.

L'impact carbone de l'IA peut être situé par des ordres de grandeur ; son impact social, lui, se mesure moins facilement, car il touche à la confiance, à la sécurité, à la production de connaissance, à la vulnérabilité des personnes et au pouvoir des plateformes.

Le problème n'est donc pas seulement que l'IA consomme : elle peut aussi produire à grande échelle du code, du texte, des décisions, des images et des récits qui influencent la société. Cette capacité de production rend ses effets plus diffus, mais parfois plus profonds que son empreinte carbone directe.

Cette difficulté de mesure ne doit toutefois pas conduire à une lecture catastrophiste. Elle impose une vigilance proportionnée et une évaluation attentive des risques qui ne se voient pas immédiatement mais qui peuvent peser durablement.

### Risques humains difficiles à quantifier

Parce qu'elle touche aux processus cognitifs, à la production de savoir et à l'organisation du travail, l'IA transforme la société de manière structurelle. Elle modifie le rapport collectif à la vérité, à l'autorité et à l'autonomie. Dans un projet environnemental, cette transformation peut soit accélérer la transition vers la sobriété, soit au contraire renforcer des modèles de consommation et de dépendance technologique insoutenables.

### Nécessité d'une gouvernance stricte

Cette différence de mesurabilité justifie une gouvernance stricte. Dans CleanMyMap, l'IA doit rester un assistant, jamais une autorité. Les sorties doivent être relues. Les fonctionnalités IA doivent être évaluées par l'IUR. Les données sensibles doivent rester limitées. La sécurité doit rester prioritaire.

L'IA ne peut donc pas être acceptée comme une force autonome. Elle doit être encadrée par une gouvernance humaine stricte, transparente et révocable. Pour CleanMyMap, cela signifie que la technologie reste au service de la cause environnementale, et non l'inverse. L'IUR (Indice d'Utilité Réelle) et le protocole de supervision humaine sont les piliers de cette gouvernance, garantissant que chaque octet consommé et chaque modèle sollicité serve réellement l'intérêt général.

### Limites, risques et effets pervers

- Superficialité : l'IA peut fournir des réponses plausibles mais fragiles, surtout sans vérification contextuelle du repo.

- Hallucinations et erreurs : références techniques, juridiques ou factuelles potentiellement inexactes.

- Dette technique : génération rapide de code hétérogène, couplage excessif, conventions incohérentes.

- Standardisation excessive : interfaces et formulations trop génériques, perte d'adéquation aux usages réels des utilisateurs.

- Baisse d'esprit critique : risque de valider trop vite des propositions non testées.

- Risques sécurité/confidentialité : exposition de données sensibles si les instructions incluent des informations personnelles ou internes inutiles.

- Mauvais arbitrages architecture : optimisation locale rapide au détriment de la maintenabilité globale.

- Impact environnemental indirect : même si l'impact unitaire peut paraître modeste, le volume cumulé de requêtes, d'itérations et d'agents peut devenir significatif.

- **Effet Rebond (Paradoxe de Jevons)** : La facilité de développement accrue par l'IA peut inciter à créer des fonctionnalités superflues ( _dérive fonctionnelle_ ), annulant ainsi les gains de sobriété réalisés sur le code lui-même.

- **Inflation de code (gonflement induit par l'IA)** : L'IA a tendance à générer plus de code que nécessaire si elle n'est pas contrainte par une exigence de minimalisme extrême.

### Compromis à arbitrer

Compromis 1 - Vitesse vs fiabilité : l'IA augmente la vitesse de production, mais cette vitesse est utile uniquement si les sorties sont vérifiées (tests, revue humaine, cohérence produit).

Compromis 2 - Productivité vs qualité architecture : un gain de court terme peut fabriquer de la dette long terme si les décisions ne sont pas tracées et rationalisées.

Compromis 3 - Assistance vs dépendance : l'IA doit rester un accélérateur. Elle ne remplace ni la capacité d'analyse de l'équipe ni la prise de décision.

Compromis 4 - Efficacité numérique vs cohérence écologique : utiliser intensivement l'IA pour un projet environnemental peut créer une tension de crédibilité si la sobriété numérique n'est pas intégrée (instructions mieux ciblés, moins d'itérations inutiles, priorisation des tâches à forte valeur).

## Synthèse : dépendance, pouvoir et vulnérabilité systémique

### L'IA comme infrastructure de dépendance

La Partie IV montre que l'IA n'est pas seulement une couche logicielle ajoutée au projet. Elle fonctionne aussi comme une infrastructure de dépendance, car elle repose sur des clouds, des modèles propriétaires, des GPU, des API et des fournisseurs dont CleanMyMap ne maîtrise ni la disponibilité, ni les prix, ni les règles d'accès. Même lorsqu'elle accélère le développement, cette architecture introduit des dépendances structurelles qui dépassent le simple confort d'usage.

### Risque de perte d'autonomie technique et politique

Le principal risque associé à cette concentration est la perte d'autonomie. Sur le plan technique, le projet peut devenir difficile à faire évoluer sans un fournisseur unique, un service externe ou une pile propriétaire. Sur le plan politique, il peut aussi devenir tributaire de choix industriels, réglementaires ou géopolitiques qu'il ne contrôle pas. Pour CleanMyMap, l'enjeu n'est donc pas d'éviter toute dépendance, mais de conserver une souveraineté fonctionnelle réelle : comprendre, documenter, réduire et remplacer les briques critiques avant qu'elles ne deviennent des points de blocage.

### Nécessité d'une gouvernance publique et collective

À cette échelle, la réponse ne peut pas reposer uniquement sur des arbitrages individuels de développeur. Les dépendances numériques, les effets de concentration et les risques systémiques appellent une gouvernance publique et collective : règles européennes de protection des données, exigences de transparence, documentation des modèles, possibilité d'audit, réduction du verrouillage et soutien à des alternatives ouvertes ou mutualisées. Pour CleanMyMap, cela signifie que l'usage de l'IA doit rester compatible avec des standards plus larges que les seules contraintes du projet : traçabilité, réversibilité, sobriété et responsabilité partagée.
