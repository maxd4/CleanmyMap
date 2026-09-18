# Partie III — Impacts sociaux, humains et informationnels de l'IA {#partie-iii-impacts-sociaux-humains-et-informationnels-de-lia}

Cette partie analyse les **impacts sociaux, humains, informationnels et éthiques de l'intelligence artificielle générative en général**. Elle ne cherche pas à mesurer la fidélisation, le lien social, l'activité physique ou l'apprentissage des bénévoles de CleanMyMap : ces dimensions relèvent du projet lui-même et ne doivent pas être inventées pour compléter artificiellement un bilan IA.

L'**impact environnemental** de l'IA, de l'infrastructure numérique et du développement de CleanMyMap est traité séparément en partie II. La présente partie ne réutilise donc pas de chiffres énergétiques ou carbone comme s'ils constituaient des indicateurs sociaux. Elle s'intéresse plutôt aux transformations du travail, aux conditions de production des systèmes d'IA, aux inégalités, aux droits fondamentaux, à l'information, à l'autonomie humaine et aux mécanismes de gouvernance.

Le fil directeur est double : l'IA peut apporter des bénéfices réels, mais ces bénéfices ne dispensent pas d'examiner les risques qu'elle déplace vers les travailleurs, les utilisateurs, les créateurs ou les institutions. Inversement, l'existence de risques ne permet pas de conclure que tout usage de l'IA est socialement négatif. Le bilan doit donc distinguer ce qui est **mesuré**, ce qui relève d'une **analyse institutionnelle**, ce qui constitue un **risque potentiel**, ce qui reste une **controverse**, et ce qui n'est encore qu'une **hypothèse**.

## Cadre de lecture et statut des preuves

Les six catégories suivantes structurent la lecture du rapport :

| Balise                   | Périmètre dans ce rapport                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `ENVIRONMENTAL_COST`     | Coûts énergétiques, carbone, eau et matériels ; traités principalement en partie II.                                       |
| `SOCIAL_BENEFITS`        | Gains documentés ou plausibles pour le travail, l'accessibilité, l'éducation, la recherche et l'accès à certains services. |
| `SOCIAL_RISKS`           | Effets possibles ou observés sur l'emploi, les conditions de travail, les inégalités, l'information et le bien-être.       |
| `ETHICAL_RISKS`          | Biais, atteintes aux droits, délégation du jugement, propriété intellectuelle, manipulation et perte d'autonomie.          |
| `GOVERNANCE`             | Transparence, auditabilité, responsabilité, conformité, contrôle humain et réversibilité.                                  |
| `CLEANMYMAP_APPLICATION` | Traduction prudente de ces enjeux au seul usage réellement observé ou déclaré dans CleanMyMap.                             |

Les formulations utilisent autant que possible les conventions suivantes :

- **Résultat empirique** : résultat observé dans une étude ou un jeu de données déterminé ;
- **Analyse institutionnelle** : position, synthèse ou cadre produit par une organisation publique ou intergouvernementale ;
- **Risque potentiel** : mécanisme plausible ou documenté, sans preuve qu'il se produit dans tous les contextes ;
- **Controverse** : question juridique, économique ou sociale encore disputée ;
- **Hypothèse** : proposition utile pour raisonner mais non démontrée par les sources disponibles.

Le schéma ci-dessous résume les principaux domaines couverts.

```{mermaid}
%%| fig-cap: "Impacts sociaux, humains, informationnels et mécanismes de gouvernance de l'IA générative"
%%| fig-width: 10
%%| fig-height: 9
flowchart TB
  A["IA générative"]
  A --> B["Travail et compétences<br/>augmentation ; automatisation ; data labour"]
  A --> C["Droits et inégalités<br/>biais ; vie privée ; fracture numérique"]
  A --> D["Information et sécurité<br/>hallucinations ; deepfakes ; cyber"]
  A --> E["Autonomie humaine<br/>surconfiance ; délégation ; anthropomorphisme"]
  A --> F["Éducation et science<br/>accessibilité ; apprentissage ; recherche"]
  A --> G["Pouvoir et gouvernance<br/>cloud ; GPU ; propriété intellectuelle ; audit"]
  B --> H["Contrôle humain"]
  C --> H
  D --> H
  E --> H
  F --> H
  G --> H
```

## Travail, emploi et productivité

### Transformation des emplois : exposition ne signifie pas suppression

**Analyse institutionnelle.** L'OIT estime en 2025 qu'environ **un travailleur sur quatre dans le monde** exerce une profession présentant un certain degré d'exposition potentielle à l'IA générative. Cette exposition n'est pas une mesure de suppressions d'emplois : elle décrit la part de tâches susceptibles d'être affectées si la technologie est effectivement adoptée. Les métiers administratifs restent parmi les plus exposés, mais l'OIT souligne que, dans la majorité des professions, la transformation des tâches est plus probable que l'automatisation intégrale [@ilo_generative_ai_jobs_refined_2025].

Les écarts sont importants selon les pays, les secteurs et le sexe. Les économies à revenu élevé présentent davantage d'emplois numérisés et donc davantage de tâches techniquement exposables à l'IA. Ces différences interdisent de transformer un indicateur mondial d'exposition en prévision uniforme de chômage.

**Résultat empirique et état de la littérature.** Une synthèse de l'OIT publiée en 2026 conclut que les gains de productivité liés à l'IA générative existent mais restent hétérogènes ; elle ne constate pas, à ce stade, de déplacement massif de l'emploi à l'échelle agrégée. Elle souligne en revanche des effets possibles sur l'organisation du travail, l'autonomie, les opportunités d'entrée pour les jeunes travailleurs et les inégalités [@ilo_genai_empirical_review_2026].

La formulation retenue dans ce rapport est donc prudente : **l'IA transforme déjà certaines tâches et certains métiers, mais les effets nets sur l'emploi dépendent fortement du contexte d'adoption, du modèle organisationnel, de la demande et des politiques d'accompagnement**.

### Augmentation de productivité versus automatisation

**Résultat empirique.** Dans une étude publiée en 2025 dans le _Quarterly Journal of Economics_, l'introduction d'un assistant conversationnel auprès de **5 172 agents de support client** a augmenté de **15 % en moyenne** le nombre de problèmes résolus par heure. Les gains étaient plus importants chez les agents moins expérimentés, alors que les agents les plus expérimentés ont obtenu des gains plus faibles et parfois une légère baisse de qualité sur certains indicateurs [@brynjolfsson_genai_work_2025].

Ce résultat ne doit pas être généralisé à l'ensemble du travail intellectuel : il concerne une entreprise, un métier, un outil et un ensemble de tâches relativement structurées. Il montre néanmoins qu'une IA peut agir comme **outil d'augmentation** plutôt que comme substitut complet, en diffusant plus rapidement certaines pratiques de travail.

**Analyse institutionnelle.** L'OCDE rapporte également que de nombreux travailleurs interrogés déclarent une amélioration de leur performance ou de leur expérience au travail grâce à l'IA, tout en signalant des préoccupations portant sur l'intensification du travail, la collecte de données et les inégalités [@oecd_ai_workplace_2024].

L'enjeu social n'est donc pas seulement « combien d'emplois disparaissent ? », mais aussi : **qui récupère le gain de productivité, qui conserve la capacité de décision, quelles tâches sont automatisées et comment le travail restant est réorganisé**.

## Compétences, deskilling et dépendance cognitive

### Une transformation des compétences plutôt qu'une disparition uniforme

**Analyse institutionnelle.** Un rapport conjoint publié en août 2026 par l'OIT et plusieurs institutions européennes et internationales conclut que l'adoption de l'IA modifie la combinaison de compétences mobilisées au travail. Elle augmente notamment l'importance de la littératie IA, des compétences numériques, des capacités cognitives de haut niveau, des compétences socio-émotionnelles, de l'adaptabilité et de l'autonomie humaine [@ilo_ai_skills_2026].

L'IA peut donc réduire l'effort nécessaire pour certaines tâches routinières tout en augmentant la valeur d'autres compétences : cadrage du problème, contrôle qualité, vérification, jugement de contexte, responsabilité, communication et coordination.

### Deskilling et effort critique

**Résultat empirique à interpréter avec prudence.** Une étude CHI 2025 portant sur **319 travailleurs du savoir** et **936 exemples d'utilisation** de l'IA générative a observé que les participants déclaraient généralement moins d'effort de pensée critique lorsqu'ils avaient davantage confiance dans l'IA. L'étude décrit aussi un déplacement de l'activité cognitive : moins de recherche ou de production directe, davantage de vérification, d'intégration des réponses et de supervision [@lee_genai_critical_thinking_2025].

Cette étude repose en partie sur des déclarations des participants. Elle ne démontre donc pas une baisse générale et permanente des capacités cognitives. Elle documente plutôt un **risque de dépendance fonctionnelle** lorsque l'utilisateur délègue progressivement des opérations qu'il ne sait plus reproduire ou vérifier seul.

**Risque potentiel.** Le _deskilling_ devient particulièrement préoccupant lorsque l'IA prend en charge non seulement l'exécution, mais aussi la définition du problème, le choix des critères et l'évaluation finale. À l'inverse, un usage qui oblige l'utilisateur à expliquer, comparer, tester et critiquer les sorties peut soutenir l'apprentissage. Le risque dépend donc moins de la présence de l'IA que de la **répartition réelle de l'effort cognitif entre l'humain et le système**.

## Travail humain invisible et conditions de production de l'IA

### Annotation, RLHF, évaluation et data labour

**Analyse institutionnelle.** Les systèmes d'IA reposent sur une chaîne de travail humain qui reste souvent invisible pour l'utilisateur final : annotation de données, catégorisation, vérification, évaluation de réponses, contrôle qualité, création d'exemples, filtrage et modération. L'OIT souligne le rôle central de ces « data labourers », souvent employés via des plateformes de microtravail ou des entreprises de sous-traitance, notamment dans les pays du Sud global [@ilo_ai_adoption_jobs_2025].

Cette réalité corrige l'image d'un système entièrement automatisé. Une partie de la performance, de la sûreté et de la qualité des modèles dépend d'opérations humaines parfois fragmentées et difficilement visibles dans les chaînes de valeur.

**Risque social.** Les principaux enjeux sont la rémunération, la stabilité des revenus, la possibilité de recours, la surveillance, la transparence des tâches, les objectifs de productivité et la protection des personnes exposées à des contenus difficiles. Ces enjeux ne sont pas identiques pour tous les fournisseurs ou tous les sous-traitants : le rapport ne suppose donc pas qu'une condition de travail donnée caractérise toute l'industrie.

### Modération et exposition à des contenus traumatisants

**Résultat empirique.** Une étude transversale publiée en 2024 sur des modérateurs de contenus a trouvé une relation dose-réponse entre la fréquence d'exposition à des contenus pénibles et la détresse psychologique ainsi que le traumatisme secondaire. Elle met aussi en évidence le rôle protecteur possible du soutien des collègues et de la reconnaissance du travail [@spence_content_moderation_2024].

Il serait abusif d'en déduire que chaque requête adressée à une IA produit directement un dommage psychologique chez un travailleur. Le point pertinent est structurel : **la sûreté de certains systèmes numériques repose en partie sur du travail humain d'exposition, de tri et de modération dont le coût social doit être rendu visible**.

### Intensification, surveillance et management algorithmique

**Analyse institutionnelle.** L'OCDE identifie parmi les risques du déploiement de l'IA au travail l'intensification des rythmes, la collecte de données sur les travailleurs et l'accroissement potentiel des inégalités [@oecd_ai_workplace_2024]. L'OIT souligne de son côté que le management algorithmique peut redistribuer le pouvoir de décision entre travailleurs, managers et systèmes techniques [@ilo_ai_adoption_jobs_2025].

**Risque potentiel.** Une IA qui fait gagner du temps ne réduit pas automatiquement la charge de travail : l'organisation peut transformer le temps économisé en objectifs supplémentaires, en cadence accrue ou en surveillance plus fine. Le gain de productivité doit donc être analysé avec la qualité du travail, l'autonomie et la distribution des bénéfices.

## Biais, discrimination et inégalités

### Biais de données et décisions discriminatoires

**Analyse institutionnelle.** Le NIST classe les biais nuisibles, la confidentialité, l'intégrité de l'information et les risques liés à la configuration humain-IA parmi les familles de risques des systèmes d'IA générative [@nist_ai_600_1]. Les biais peuvent provenir des données, du choix des catégories, des objectifs d'optimisation, de l'évaluation ou du contexte d'usage.

Il faut distinguer deux niveaux :

- une sortie stéréotypée ou inexacte, qui peut déjà causer un préjudice informationnel ;
- une utilisation du système pour prendre ou orienter une décision concernant une personne, qui peut créer des effets juridiques, économiques ou sociaux plus graves.

**Analyse institutionnelle récente.** Une étude de l'OIT publiée en 2025 sur l'usage de l'IA dans la gestion des ressources humaines insiste sur les risques liés à des objectifs mal définis, des données biaisées et des systèmes opaques dans le recrutement, la rémunération, la planification et l'évaluation des performances [@ilo_ai_hrm_2025].

Le risque éthique ne se résume donc pas à « l'algorithme est biaisé » : il faut examiner **la décision prise, les données utilisées, la possibilité de contester le résultat et le rôle réel de l'humain**.

### Fracture numérique et inégalités d'accès

**Analyse institutionnelle.** L'UNESCO rappelle qu'en 2024 environ **2,6 milliards de personnes** restaient sans accès à Internet. L'arrivée de services IA puissants peut donc créer une nouvelle couche d'inégalité entre ceux qui disposent de connexion, d'équipement, de compétences, de langue supportée et de capacité financière, et ceux qui n'y ont pas accès [@unesco_ai_education_rights_2025].

Les différences d'accès ne concernent pas seulement les individus. L'OIT souligne également que l'accès inégal aux infrastructures, aux compétences et aux outils peut creuser les écarts de productivité entre pays, grandes entreprises et petites structures [@ilo_ai_adoption_jobs_2025].

### Accessibilité : un bénéfice réel mais non automatique

`SOCIAL_BENEFITS` — Les mêmes technologies peuvent réduire certaines barrières : génération et simplification de texte, traduction, transcription, adaptation pédagogique, assistance à la communication ou outils personnalisés. L'UNESCO documente le potentiel des technologies numériques et de l'IA pour améliorer l'accès à l'éducation, notamment pour certains apprenants en situation de handicap ou ayant des besoins éducatifs spécifiques [@unesco_ai_education_rights_2025].

Ce bénéfice dépend cependant de la qualité du service, du coût, de la langue, de l'accessibilité de l'interface et de la protection des données. Une fonctionnalité « assistée par IA » n'est donc pas accessible par nature.

## Concentration économique, infrastructures et souveraineté

### Concentration du cloud, des puces et de la capacité de calcul

**Analyse institutionnelle.** L'OCDE a consacré en 2025 un rapport spécifique aux marchés d'infrastructure de l'IA. Elle identifie des risques de concentration et des barrières potentielles à l'entrée autour des puces avancées, du calcul, des centres de données, du cloud, de l'énergie et des réseaux [@oecd_ai_infrastructure_2025].

Cette concentration peut produire plusieurs effets sociaux et économiques :

- dépendance à un petit nombre de fournisseurs ;
- coûts de sortie élevés ;
- asymétrie d'accès au calcul ;
- pouvoir de négociation concentré ;
- difficulté pour les petites organisations à reproduire ou auditer les systèmes les plus avancés.

**Controverse.** La concentration peut aussi produire des économies d'échelle, financer des infrastructures très coûteuses et accélérer l'innovation. Le problème n'est donc pas la taille d'un fournisseur en elle-même, mais la **contestabilité du marché, l'interopérabilité et la possibilité réelle de changer de fournisseur**.

### Souveraineté et dépendance technologique

`ETHICAL_RISKS` et `GOVERNANCE` — La souveraineté numérique ne signifie pas que chaque organisation doit entraîner son propre modèle. Elle désigne ici la capacité à comprendre ses dépendances, conserver ses données sous contrôle, disposer de solutions de remplacement et éviter qu'une fonction essentielle dépende d'un fournisseur dont les conditions, les prix ou la disponibilité peuvent changer unilatéralement.

Pour les organisations européennes, cette question se combine avec le RGPD, le règlement européen sur l'IA, les règles de concurrence, la politique industrielle des semi-conducteurs et la localisation des services. La dépendance à une infrastructure étrangère constitue un risque de gouvernance, mais pas nécessairement un incident ou un préjudice déjà réalisé.

## Vie privée, données personnelles et surveillance

### Données utilisées pour développer les modèles

**Analyse institutionnelle.** Le Comité européen de la protection des données rappelle qu'un modèle entraîné sur des données personnelles n'est pas automatiquement « anonyme ». Le caractère anonyme doit être évalué au cas par cas, notamment au regard du risque d'identification ou d'extraction d'informations personnelles [@edpb_ai_models_2024].

La CNIL recommande, pour le développement de systèmes d'IA utilisant des données personnelles, de définir une finalité, une base légale, les responsabilités, les durées de conservation, les mesures de sécurité et, lorsque le risque le justifie, une analyse d'impact sur la protection des données [@cnil_ai_development_2025].

### Données saisies par les utilisateurs

`ETHICAL_RISKS` — Les instructions, pièces jointes ou conversations peuvent contenir des données personnelles, des secrets, du code propriétaire ou des informations sensibles. Le risque dépend des paramètres du service, du contrat, des mécanismes de rétention et de l'usage qui est fait des données.

La règle responsable n'est donc pas de considérer toute IA cloud comme incompatible avec la confidentialité, mais d'appliquer la **minimisation des données**, de supprimer les informations inutiles et de ne pas transmettre à un modèle des données dont il n'a pas besoin pour accomplir la tâche.

### Surveillance et décisions automatisées

L'IA peut également augmenter la capacité d'observer, classifier et profiler des personnes. Le risque devient particulièrement élevé lorsque la collecte est permanente, invisible ou utilisée pour prendre des décisions significatives sans recours humain. Les cadres européens de protection des données et le règlement sur l'IA répondent précisément à une partie de ces situations en imposant des obligations proportionnées au risque [@parlement_europ_2024].

## Propriété intellectuelle, création et rémunération

### Données d'entraînement et droits des créateurs

**Controverse juridique et économique.** L'entraînement des modèles sur de grandes quantités de textes, images, musique ou code soulève des débats sur le consentement, les exceptions de fouille de textes et de données, la réservation des droits, la traçabilité des corpus et la rémunération des créateurs. Les réponses juridiques diffèrent selon les juridictions et ne doivent pas être présentées comme définitivement stabilisées.

Dans l'Union européenne, l'article 53 du règlement sur l'IA impose notamment aux fournisseurs de modèles d'IA à usage général de mettre en place une politique de respect du droit d'auteur de l'Union et de publier un résumé suffisamment détaillé du contenu utilisé pour l'entraînement [@parlement_europ_2024; @eu_gpai_obligations_2025].

Le modèle européen ne crée pas pour autant une rémunération automatique de chaque créateur dont une œuvre a pu être présente dans un corpus. La question de la juste répartition de la valeur reste donc en partie économique et politique, au-delà des seules obligations de transparence.

### Création assistée et responsabilité humaine

`SOCIAL_BENEFITS` — L'IA peut réduire les coûts de prototypage, faciliter l'expression d'une idée, aider à traduire ou à explorer plusieurs variantes.

`ETHICAL_RISKS` — Elle peut aussi rendre plus difficile l'identification de l'origine des styles, des idées et des contributions, ou conduire à publier comme travail personnel un contenu qui n'a pas été suffisamment relu, transformé ou attribué. Une politique responsable doit donc distinguer **assistance**, **création originale**, **réutilisation** et **publication**.

## Hallucinations, désinformation et deepfakes

### Hallucinations et fausse autorité

**Analyse institutionnelle.** Le NIST utilise le terme _confabulation_ pour désigner la génération de contenus faux ou incohérents présentés avec une apparence de plausibilité. Ce risque devient plus important lorsque l'utilisateur ne peut pas vérifier la réponse ou lorsque le système est utilisé dans un domaine à fort enjeu [@nist_ai_600_1].

Une hallucination isolée n'est pas nécessairement une désinformation intentionnelle. Le risque informationnel vient du fait qu'un contenu faux peut être reproduit, reformulé, référencé ou intégré dans une décision sans que son origine incertaine reste visible.

### Désinformation et contenus synthétiques

**Analyse institutionnelle et observations de tendance.** L'OCDE relève une croissance importante des incidents et dangers rapportés dans les médias liés aux contenus synthétiques entre 2022 et 2025 ; ces incidents comprennent des images, vidéos et voix artificielles pouvant servir à tromper, usurper ou manipuler [@oecd_ai_incidents_2026].

Le règlement européen sur l'IA applique depuis le **2 août 2026** des obligations de transparence à certains systèmes interactifs et à certains contenus générés ou manipulés : information de l'utilisateur lorsqu'il interagit avec une IA dans les cas prévus, marquage détectable par machine de certains contenus synthétiques et obligations spécifiques de divulgation pour les deepfakes [@eu_ai_transparency_2026].

`SOCIAL_BENEFITS` — Les techniques d'IA peuvent également aider à détecter certaines formes de manipulation ou à analyser de grands volumes d'informations. L'OCDE recommande donc une approche hybride : outils techniques, intervention humaine, littératie médiatique et institutions capables d'assurer l'intégrité de l'information.

## Cybersécurité et usages dual-use

### L'IA comme accélérateur d'attaque et de défense

`ETHICAL_RISKS` — Les capacités de génération de texte, de code et d'automatisation peuvent réduire le coût de certaines activités offensives : rédaction de phishing, reconnaissance, automatisation de tâches, adaptation de scripts ou manipulation informationnelle. Google Threat Intelligence a documenté des usages réels d'outils génératifs par des acteurs malveillants, tout en montrant que les modèles ne remplacent pas nécessairement les compétences techniques nécessaires aux opérations les plus avancées [@google_gtig_adversarial_misuse_generative_ai].

`SOCIAL_BENEFITS` — Les mêmes capacités peuvent assister la détection d'anomalies, l'analyse de code, la réponse à incident, la documentation et l'audit. L'IA est donc typiquement **dual-use** : l'effet dépend du niveau d'accès, du contexte et des garde-fous.

Le NIST inclut la cybersécurité et l'usage abusif parmi les risques à gérer tout au long du cycle de vie des modèles génératifs [@nist_ai_600_1]. Les risques techniques détaillés pour un projet logiciel sont traités plus précisément dans la partie consacrée à la sécurité et au contrôle des systèmes d'IA.

## Surconfiance, automation bias et délégation du jugement

### Automation bias

`ETHICAL_RISKS` — Lorsqu'une réponse est fluide, rapide et présentée avec assurance, l'utilisateur peut lui accorder plus d'autorité qu'elle ne mérite. Ce phénomène peut conduire à valider une recommandation incorrecte, surtout lorsque le coût de vérification est élevé ou lorsque l'utilisateur manque lui-même d'expertise.

Le NIST traite explicitement les risques liés à la configuration humain-IA, notamment la surconfiance et l'anthropomorphisation [@nist_ai_600_1]. Les résultats CHI 2025 sur le travail du savoir montrent parallèlement qu'une confiance élevée dans l'IA est associée, dans l'échantillon étudié, à un effort critique déclaré plus faible [@lee_genai_critical_thinking_2025].

La réponse responsable n'est pas d'imposer une vérification identique à toutes les tâches. Elle consiste à **proportionner la vérification au risque** : plus la décision est sensible, irréversible ou difficile à corriger, moins elle doit être déléguée sans contrôle indépendant.

### Autorité finale et responsabilité

Un modèle peut proposer, comparer, signaler ou générer. Il ne peut pas assumer juridiquement ou moralement la responsabilité d'une décision à la place de la personne ou de l'organisation qui l'utilise. La responsabilité doit donc rester attribuable à un acteur humain ou institutionnel identifiable.

## Interactions anthropomorphiques et risques psychologiques

### Ce que l'on sait et ce que l'on ne sait pas encore

Les interfaces conversationnelles utilisent le langage naturel, peuvent exprimer de l'empathie et conserver un contexte. Cela facilite l'usage mais favorise aussi l'attribution de propriétés humaines au système : intention, compréhension, attachement ou autorité.

**Résultat empirique récent.** Une étude publiée en août 2026 dans _Nature Human Behaviour_ a analysé **1 131 utilisateurs adultes américains de Character.AI**, avec des historiques de conversation pour un sous-échantillon. Elle observe que l'usage du chatbot comme compagnon est associé à un bien-être plus faible dans certains contextes, notamment lorsque l'usage est intense ou très auto-révélateur ; les auteurs soulignent que ces associations varient selon le réseau social hors ligne et la manière dont le chatbot est utilisé [@zhang_ai_companions_2026].

Cette étude ne démontre pas que tout chatbot cause de l'isolement ou une détérioration psychologique. Elle fournit une preuve empirique que **les effets ne sont pas uniformes et que les caractéristiques de l'utilisateur et du mode d'usage comptent**.

`SOCIAL_BENEFITS` — Des interactions conversationnelles peuvent aussi fournir de l'information, un espace de réflexion, une assistance ou un sentiment de soutien à certains utilisateurs. Le rapport ne transforme donc pas l'anthropomorphisme en dommage automatique.

`ETHICAL_RISKS` — Le risque augmente lorsque le système encourage une exclusivité relationnelle, renforce systématiquement les convictions de l'utilisateur, se présente comme une autorité thérapeutique ou remplace une aide humaine nécessaire. Dans les situations sensibles, la règle de gouvernance doit être la non-délégation et l'orientation vers des ressources humaines appropriées.

## Éducation, apprentissage et intégrité académique

### Opportunités pédagogiques

`SOCIAL_BENEFITS` — L'IA générative peut soutenir l'explication, la reformulation, la traduction, la création d'exercices, l'accessibilité et certains usages de tutorat. L'UNESCO reconnaît ces opportunités tout en insistant sur une approche centrée sur l'humain et fondée sur les droits [@unesco_ai_education_rights_2025].

### Risques pour l'apprentissage

`SOCIAL_RISKS` — Une réponse immédiatement générée peut aussi court-circuiter la pratique nécessaire à l'acquisition de certaines compétences. Le risque est particulièrement évident lorsque l'évaluation mesure un travail que l'étudiant délègue entièrement au modèle, ou lorsque l'utilisateur ne peut plus expliquer le raisonnement derrière une réponse.

L'UNESCO recommande de protéger la vie privée, de développer la littératie IA, d'adapter les usages à l'âge et au contexte pédagogique et de préserver l'agentivité de l'apprenant [@unesco_ai_education_rights_2025].

L'enjeu d'intégrité académique ne peut donc pas être réduit à la seule détection de textes générés : il concerne aussi la **définition de ce qui doit être appris, de ce qui peut être assisté et de ce qui doit rester démontré par l'étudiant**.

## Recherche scientifique et accélération du travail intellectuel

### Bénéfices pour la recherche

`SOCIAL_BENEFITS` — L'IA est déjà utilisée pour analyser de grands jeux de données, assister la recherche documentaire, générer des hypothèses, proposer des structures moléculaires, accélérer certaines simulations ou soutenir la conception expérimentale. Les revues récentes sur l'IA pour la découverte scientifique décrivent un potentiel réel d'accélération, à condition de conserver des métriques d'évaluation et des objectifs scientifiques définis par les humains [@nature_llm_science_2025].

### Productivité scientifique versus diversité de la recherche

**Résultat empirique à ne pas interpréter causalement sans précaution.** Une étude _Nature_ publiée en 2026 sur **41,3 millions d'articles scientifiques** associe l'usage d'outils d'IA à davantage de publications et de citations pour les chercheurs concernés, mais aussi à une réduction de la diversité collective des sujets et des interactions entre scientifiques [@hao_ai_science_2026].

Cette observation illustre un arbitrage important : une technologie peut augmenter l'efficacité individuelle tout en concentrant collectivement l'attention sur les domaines les mieux dotés en données ou déjà fortement étudiés.

### Intégrité de la connaissance

Les bénéfices scientifiques ne suppriment pas les risques de références inventées, de données synthétiques mal identifiées, de reproduction d'erreurs ou d'uniformisation rédactionnelle. Les politiques éditoriales de nombreuses revues imposent désormais une responsabilité humaine explicite et refusent de traiter un système d'IA comme auteur [@nature_portfolio_ai_policy; @icmje_ai_use_by_authors].

La règle retenue ici est simple : **l'IA peut accélérer une étape scientifique, mais la validité d'un résultat reste fondée sur les données, la méthode, la reproductibilité et la responsabilité humaine**.

## Transparence, auditabilité et responsabilité

### Transparence des modèles et des contenus

`GOVERNANCE` — Depuis 2025, les fournisseurs de modèles d'IA à usage général relevant du règlement européen doivent satisfaire à des obligations de documentation, de transparence et de respect du droit d'auteur. Le cadre européen impose notamment un résumé public du contenu d'entraînement selon le modèle fourni par la Commission [@eu_gpai_obligations_2025].

Depuis le **2 août 2026**, certaines obligations de transparence de l'article 50 s'appliquent également aux systèmes interactifs et aux contenus synthétiques concernés [@eu_ai_transparency_2026].

Ces obligations ne rendent pas les systèmes totalement transparents. Elles créent plutôt un **minimum de traçabilité réglementaire** : information, documentation, marquage et capacité de contrôle par les autorités.

### Auditabilité

Un système est plus audit-able lorsque l'on peut reconstruire :

- le modèle ou service utilisé ;
- la finalité ;
- les données envoyées ou catégories de données concernées ;
- les paramètres et versions pertinents ;
- les contrôles humains ;
- les incidents ou corrections ;
- les dépendances externes ;
- les limites connues.

L'auditabilité ne signifie pas publier des secrets, des données personnelles ou toute la chaîne de raisonnement interne d'un modèle. Elle consiste à conserver **assez de preuves pour comprendre ce qui a été fait, par qui et avec quelles limites**.

### Responsabilité et contrôle humain

Le NIST recommande une gestion des risques sur tout le cycle de vie, avec des responsabilités identifiées, des évaluations, des mécanismes de suivi et des contrôles adaptés au contexte [@nist_ai_600_1]. Le règlement européen adopte également une logique proportionnée au risque [@parlement_europ_2024].

Le principe retenu par ce rapport est donc :

> **IA pour assister ; humain ou institution responsable pour décider, vérifier et assumer.**

Ce principe ne signifie pas qu'un humain doit relire manuellement chaque sortie sans exception. Il signifie que le niveau d'automatisation doit rester proportionné au risque et qu'une chaîne de responsabilité doit demeurer identifiable.

## Bilan équilibré : bénéfices, risques et limites de preuve

### `SOCIAL_BENEFITS`

Les bénéfices documentés ou plausibles incluent notamment :

- gains de productivité sur certaines tâches ;
- diffusion plus rapide de certaines bonnes pratiques ;
- réduction de barrières techniques pour de petites équipes ;
- traduction, reformulation et accessibilité ;
- automatisation de tâches répétitives ;
- assistance à l'éducation lorsqu'elle est intégrée à un cadre pédagogique ;
- accélération de certaines étapes de la recherche scientifique ;
- soutien à l'analyse, au contrôle qualité et à la cybersécurité.

Ces bénéfices ne sont ni uniformes ni garantis. Ils dépendent du métier, de l'utilisateur, du modèle, de la qualité de l'intégration et de la capacité de vérification.

### `SOCIAL_RISKS`

Les principaux risques sociaux comprennent :

- réorganisation de l'emploi et de certaines professions ;
- intensification du travail ou redistribution défavorable des gains de productivité ;
- invisibilisation du data labour et de la modération ;
- inégalités d'accès aux outils, aux compétences et au calcul ;
- dépendance économique à un petit nombre de fournisseurs ;
- exposition à la désinformation et aux contenus synthétiques ;
- effets variables sur le bien-être lorsque l'IA devient un acteur relationnel.

### `ETHICAL_RISKS`

Les principaux risques éthiques sont :

- biais et discrimination ;
- utilisation non proportionnée de données personnelles ;
- surveillance ou profilage excessifs ;
- propriété intellectuelle et transparence des corpus ;
- surconfiance et délégation du jugement ;
- manipulation, persuasion et anthropomorphisation ;
- publication de contenu faux avec une apparence d'autorité ;
- dilution de la responsabilité humaine.

### `GOVERNANCE`

La réponse n'est pas un score éthique unique. Elle repose sur un ensemble de contrôles :

- finalité claire ;
- proportionnalité ;
- minimisation des données ;
- documentation des modèles et fournisseurs ;
- contrôle humain proportionné au risque ;
- vérification factuelle et technique ;
- sécurité ;
- transparence sur le recours à l'IA ;
- mécanisme de correction ;
- réversibilité et capacité de changer de fournisseur ;
- suivi de l'impact environnemental séparé du bilan social.

## `CLEANMYMAP_APPLICATION` — traduction au cas du projet

Cette section ne transforme aucun risque général en incident CleanMyMap sans preuve. Elle décrit seulement comment les constats précédents doivent orienter l'usage de l'IA dans le projet.

### Usage principal de l'IA

Dans CleanMyMap, l'IA est principalement utilisée comme outil de **développement, revue, recherche, structuration et documentation**. Elle sert notamment à proposer du code, relire des changements, structurer des analyses, rechercher des sources et améliorer des contenus.

Elle ne doit pas devenir, sans nouvelle décision explicite et nouveau cadre de preuve, une autorité autonome qui décide à la place des bénévoles, des associations, des collectivités ou des responsables du projet.

### Validation humaine requise

Toute sortie susceptible d'affecter durablement :

- l'architecture ;
- la sécurité ;
- les données ;
- la méthodologie scientifique ;
- les contenus publics ;
- les règles métier ;
- les chiffres d'impact ;

reste soumise à une validation humaine et, lorsque nécessaire, à des tests ou à une vérification externe.

L'IA peut proposer une solution ; elle ne constitue pas la preuve que cette solution est correcte.

### Minimisation des données sensibles

Les informations personnelles ou sensibles doivent être exclues des instructions et pièces jointes lorsque leur présence n'est pas nécessaire à la tâche. Lorsque des données réelles sont indispensables, leur utilisation doit respecter les règles de protection des données du projet et le principe de minimisation.

Cette exigence est cohérente avec les recommandations de la CNIL et du CEPD sur le traitement de données personnelles dans les systèmes d'IA [@cnil_ai_development_2025; @edpb_ai_models_2024].

### Dépendance fournisseur identifiée

CleanMyMap dépend de plusieurs services externes pour son développement et son fonctionnement. L'usage de modèles propriétaires ajoute une dépendance supplémentaire : disponibilité, prix, règles d'usage, fonctionnalités et politique fournisseur peuvent évoluer.

La réponse attendue n'est pas de supprimer toute dépendance, mais de :

- la documenter ;
- éviter qu'elle devienne invisible ;
- conserver des formats et données exportables ;
- limiter les couplages inutiles ;
- garder une possibilité de remplacement lorsque la fonction est critique.

### Coût environnemental mesuré séparément

`ENVIRONMENTAL_COST` — Le coût énergétique, carbone, hydrique et matériel de l'utilisation de l'IA est calculé dans la partie environnementale du rapport. La présente partie n'utilise aucun ancien chiffre environnemental comme argument social et ne double-compte pas ces impacts.

Cette séparation permet de comparer ensuite les dimensions sans les confondre : un gain de productivité ne « compense » pas automatiquement un coût environnemental, et un coût environnemental ne prouve pas à lui seul qu'un usage socialement utile doit être abandonné.

### Utilité réelle comme condition d'usage

Le principe final appliqué à CleanMyMap est le suivant : **recourir à l'IA lorsqu'elle apporte une utilité réelle et vérifiable, et réduire l'usage lorsqu'elle produit surtout du volume, de la dépendance, du bruit ou de la complexité**.

Cette utilité peut prendre plusieurs formes :

- meilleure qualité du code ;
- détection d'erreurs ;
- meilleure documentation ;
- accélération d'une analyse nécessaire ;
- amélioration de l'accessibilité ;
- réduction d'une tâche répétitive ;
- vérification ou comparaison plus rigoureuse de solutions.

En revanche, un usage purement décoratif, redondant ou impossible à vérifier ne bénéficie pas de la même justification.

### Aucun KPI social artificiel

Cette partie ne crée volontairement aucun KPI de fidélisation, de lien social, d'activité physique ou d'apprentissage des bénévoles. Ces indicateurs décriraient l'effet social de CleanMyMap sur ses participants, alors que l'objet ici est l'impact social et éthique de l'**utilisation de l'IA**.

Si de tels effets propres au projet sont un jour mesurés, ils devront reposer sur des données réelles et une méthodologie distincte.

## Synthèse

L'état des connaissances ne permet ni de présenter l'IA générative comme un bénéfice social automatique, ni de la réduire à une menace homogène. Les résultats disponibles montrent plutôt une technologie capable d'augmenter la productivité et l'accessibilité dans certains contextes, tout en redistribuant le travail, l'attention, la valeur économique et la responsabilité.

Les risques les plus robustement documentés concernent aujourd'hui la transformation des tâches, les conditions de certains travailleurs invisibles, les biais, les données personnelles, l'intégrité de l'information, la dépendance aux infrastructures, la surconfiance et la difficulté à attribuer clairement la responsabilité. D'autres effets, notamment psychologiques ou macroéconomiques, nécessitent encore davantage de recul et doivent rester présentés avec leurs limites de preuve.

Pour CleanMyMap, la conséquence pratique est volontairement sobre : l'IA reste un **outil d'assistance**, utilisé principalement pour développer, relire, documenter et rechercher ; ses sorties sont vérifiées ; les données sensibles sont minimisées ; les dépendances sont documentées ; son coût environnemental est suivi séparément ; et son usage n'est justifié que lorsqu'il apporte une utilité suffisante pour compenser les risques et la complexité supplémentaires qu'il introduit.
