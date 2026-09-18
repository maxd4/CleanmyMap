# Partie III — Impacts sociaux, humains et informationnels de l'IA {#partie-iii-impacts-sociaux-humains-et-informationnels-de-lia}

Cette partie analyse les **impacts sociaux, humains, informationnels et éthiques de l'intelligence artificielle générative en général**. Elle ne cherche pas à fabriquer un bilan social propre à CleanMyMap à partir d'indicateurs de fidélisation, de lien social, d'activité physique ou d'apprentissage des bénévoles. Ces dimensions concernent les effets du projet lui-même et ne doivent être mesurées que si des données réelles et une méthodologie dédiée existent.

L'**impact environnemental** de l'IA et du développement de CleanMyMap est traité séparément en partie II. Les rapports de pouvoir liés au cloud, aux GPU, aux semi-conducteurs, à la concentration des fournisseurs et à la souveraineté sont traités en partie IV. Les risques techniques détaillés — sécurité logicielle, prompt injection, dépendances, code généré, secrets et contrôles de systèmes — relèvent de la partie V.

La présente partie répond donc à une question plus précise : **comment l'IA générative transforme-t-elle le travail, les compétences, les droits, l'information, la création, l'apprentissage, les relations humain-machine et l'exercice du jugement ?**

Le bilan est volontairement équilibré. L'IA peut produire des bénéfices réels ; ces bénéfices ne dispensent pas d'examiner les risques déplacés vers les travailleurs, les utilisateurs, les créateurs ou les institutions. Inversement, l'existence de risques ne permet pas de conclure que tout usage de l'IA est socialement négatif.

## Cadre de lecture et statut des preuves

Les six balises suivantes structurent le rapport :

| Balise | Périmètre |
| --- | --- |
| `ENVIRONMENTAL_COST` | Énergie, carbone, eau et ressources matérielles ; traités principalement en partie II. |
| `SOCIAL_BENEFITS` | Gains documentés ou plausibles pour le travail, l'accessibilité, l'éducation, la recherche et certains services. |
| `SOCIAL_RISKS` | Effets possibles ou observés sur l'emploi, les conditions de travail, les inégalités, l'information et le bien-être. |
| `ETHICAL_RISKS` | Biais, atteintes aux droits, perte d'autonomie, manipulation, propriété intellectuelle et délégation du jugement. |
| `GOVERNANCE` | Transparence, auditabilité, responsabilité, conformité, contrôle humain et possibilité de correction. |
| `CLEANMYMAP_APPLICATION` | Traduction prudente de ces enjeux au seul usage réellement observé ou déclaré dans CleanMyMap. |

Les affirmations utilisent autant que possible cinq niveaux de qualification :

- **Résultat empirique** : observation produite dans une étude ou un jeu de données déterminé ;
- **Analyse institutionnelle** : synthèse, cadre ou recommandation provenant d'une institution publique ou intergouvernementale ;
- **Risque potentiel** : mécanisme plausible ou documenté, sans preuve qu'il se produit dans tous les contextes ;
- **Controverse** : question juridique, économique, scientifique ou sociale encore disputée ;
- **Hypothèse** : proposition utile pour raisonner mais non démontrée par les sources disponibles.

Ces catégories évitent deux erreurs symétriques : généraliser une étude locale à toute la société, ou ignorer un risque simplement parce qu'il n'est pas encore quantifiable à l'échelle globale.

```{mermaid}
%%| fig-cap: "Principaux impacts sociaux, humains et informationnels de l'IA générative"
%%| fig-width: 10
%%| fig-height: 8
flowchart TB
  A["IA générative"]
  A --> B["Travail et compétences"]
  A --> C["Droits, biais et inégalités"]
  A --> D["Information, création et connaissance"]
  A --> E["Autonomie et relations humain-machine"]
  A --> F["Éducation, accessibilité et science"]
  B --> G["Contrôle humain"]
  C --> G
  D --> G
  E --> G
  F --> G
  G --> H["Responsabilité et gouvernance"]
```

## Travail, emplois et organisation du travail

### Transformation des tâches : exposition ne signifie pas suppression

**Analyse institutionnelle.** L'OIT estime en 2025 qu'environ **un emploi sur quatre dans le monde** présente un certain degré d'exposition potentielle à l'IA générative. Cet indicateur mesure l'exposition de tâches à des capacités techniques ; il ne mesure ni des licenciements observés ni un nombre futur d'emplois supprimés. L'OIT conclut que, pour la majorité des professions exposées, la **transformation des tâches** est plus probable que l'automatisation intégrale [@ilo_generative_ai_jobs_refined_2025].

Les niveaux d'exposition diffèrent fortement selon les pays, les secteurs, les professions et le sexe. Les économies où le travail est davantage numérisé comptent mécaniquement davantage de tâches techniquement exposables. Une moyenne mondiale ne doit donc pas être transformée en prévision uniforme du chômage.

**État de la littérature empirique.** La revue publiée par l'OIT en 2026 confirme que des gains de productivité existent dans plusieurs expériences et déploiements, mais qu'ils sont hétérogènes. Elle ne met pas en évidence, à ce stade, un déplacement massif de l'emploi à l'échelle agrégée ; elle souligne davantage des changements d'organisation, d'autonomie, de qualité de l'emploi et d'opportunités pour certains groupes, notamment les jeunes travailleurs [@ilo_genai_empirical_review_2026].

La conclusion raisonnable est donc limitée : **l'IA transforme déjà certaines tâches et certains métiers, mais ses effets nets sur l'emploi dépendent du contexte d'adoption, de la demande, de l'organisation et des politiques d'accompagnement**.

### Productivité, augmentation et automatisation

**Résultat empirique.** Une étude publiée en 2025 dans le _Quarterly Journal of Economics_ analyse le déploiement d'un assistant conversationnel auprès de **5 172 agents de support client**. L'accès à l'outil augmente en moyenne de **15 %** le nombre de problèmes résolus par heure. Les gains sont plus importants chez les agents moins expérimentés ou moins performants au départ ; les agents les plus expérimentés obtiennent des gains plus faibles et peuvent subir de petites baisses de qualité sur certains indicateurs [@brynjolfsson_genai_work_2025].

Ce résultat ne mesure pas « l'effet de l'IA sur tous les métiers ». Il concerne une entreprise, un type de travail et un système conçu pour assister des agents qui restent responsables des conversations. Il montre néanmoins qu'une IA peut agir comme **outil d'augmentation**, en diffusant rapidement certaines pratiques, plutôt que comme substitut complet.

**Analyse institutionnelle.** L'OCDE documente également des perceptions de gains de performance et d'expérience de travail, tout en signalant des risques d'intensification, de collecte accrue de données et de redistribution inégale des bénéfices [@oecd_ai_workplace_2024].

L'enjeu social ne se réduit donc pas à la question « combien d'emplois disparaissent ? ». Il faut aussi demander :

- quelles tâches sont automatisées ;
- quelles tâches nouvelles apparaissent ;
- qui conserve le pouvoir de décision ;
- qui capte le gain de productivité ;
- comment les objectifs de cadence sont modifiés ;
- si le temps économisé réduit réellement la charge ou devient une exigence de production supplémentaire.

### Intensification, surveillance et management algorithmique

**Analyse institutionnelle.** Les outils d'IA peuvent être intégrés au management, à l'évaluation, à l'affectation des tâches ou au suivi de la performance. L'OIT et l'OCDE soulignent que ces usages peuvent redistribuer le pouvoir de décision entre travailleurs, managers et systèmes techniques, avec des effets possibles sur l'autonomie, la surveillance et la qualité du travail [@ilo_ai_adoption_jobs_2025; @oecd_ai_workplace_2024].

**Risque potentiel.** Un gain de temps n'entraîne pas automatiquement une amélioration des conditions de travail. Une organisation peut transformer le temps économisé en objectifs plus élevés, en cadence accrue ou en contrôle plus fin. L'évaluation d'un usage professionnel de l'IA doit donc regarder simultanément la productivité, l'autonomie, la charge, la qualité et la distribution des gains.

## Compétences, deskilling et dépendance cognitive

### Transformation des compétences

**Analyse institutionnelle.** Les travaux interinstitutionnels publiés en 2026 soulignent que l'adoption de l'IA modifie la combinaison des compétences demandées : littératie IA, compétences numériques, capacités cognitives de haut niveau, compétences socio-émotionnelles, adaptabilité et autonomie deviennent importantes dans de nombreux contextes [@ilo_ai_skills_2026].

L'IA peut réduire l'effort nécessaire pour des tâches répétitives tout en augmentant la valeur du cadrage du problème, du contrôle qualité, de la vérification, du jugement de contexte, de la communication et de la responsabilité.

Le phénomène n'est donc pas univoque : certaines compétences deviennent moins sollicitées, d'autres deviennent plus importantes, et de nouvelles compétences de supervision apparaissent.

### Deskilling et effort critique

**Résultat empirique à interpréter avec prudence.** Une étude CHI 2025 menée auprès de **319 travailleurs du savoir**, à partir de **936 exemples d'usage** déclarés, observe qu'une confiance plus élevée dans l'IA est associée à un effort critique déclaré plus faible. L'étude décrit aussi un déplacement de l'activité cognitive : moins de recherche ou de production directe dans certains cas, davantage de vérification, d'intégration des réponses et de supervision [@lee_genai_critical_thinking_2025].

L'étude repose sur des perceptions et des exemples rapportés par les participants. Elle ne démontre pas une baisse générale, permanente ou biologique des capacités cognitives.

**Risque potentiel.** Le _deskilling_ devient particulièrement préoccupant lorsque l'outil prend en charge simultanément la formulation du problème, la production de la solution et l'évaluation finale. À l'inverse, un usage qui oblige l'utilisateur à expliquer, comparer, tester et corriger peut soutenir certaines formes d'apprentissage.

La question pertinente est donc : **quelles opérations cognitives restent réellement exercées par l'humain ?**

## Travail humain invisible derrière les systèmes d'IA

### Annotation, évaluation, RLHF et data labour

**Analyse institutionnelle.** Les systèmes d'IA reposent sur une chaîne de travail humain comprenant notamment annotation, catégorisation, évaluation de réponses, contrôle qualité, création d'exemples, filtrage et modération. L'OIT souligne le rôle de ces travailleurs de la donnée, parfois employés via des plateformes de microtravail ou des sous-traitants et souvent peu visibles pour l'utilisateur final [@ilo_ai_adoption_jobs_2025].

Cette réalité nuance l'image d'un système entièrement automatisé : une partie de la performance et de la sûreté des modèles provient d'un travail humain situé en amont ou en périphérie du produit visible.

**Risque social.** Les enjeux portent notamment sur la rémunération, la stabilité du revenu, le recours, la surveillance, les objectifs de cadence, la transparence des tâches et la protection des personnes exposées à des contenus difficiles. Ces conditions varient selon les entreprises, les pays et les fonctions ; elles ne doivent pas être généralisées à l'ensemble du secteur.

### Modération et exposition à des contenus pénibles

**Résultat empirique.** Une étude transversale publiée en 2024 sur des modérateurs de contenus observe une relation entre l'exposition fréquente à des contenus pénibles et la détresse psychologique ou le traumatisme secondaire ; elle met également en évidence le rôle possible du soutien des collègues et de la reconnaissance du travail [@spence_content_moderation_2024].

Cette étude ne permet pas d'attribuer un dommage humain direct à chaque requête adressée à une IA. Elle documente un problème plus structurel : **certaines fonctions de sûreté numérique reposent sur un travail d'exposition, de tri et de modération dont le coût social peut rester invisible**.

## Biais, discrimination et inégalités

### Biais et décisions discriminatoires

**Analyse institutionnelle.** Le NIST classe les biais nuisibles parmi les familles de risques à traiter dans les systèmes d'IA générative. Les biais peuvent provenir des données, de la définition des catégories, des objectifs d'optimisation, des évaluations, du déploiement ou du contexte d'usage [@nist_ai_600_1].

Il faut distinguer au moins deux situations :

- une sortie stéréotypée ou factuellement erronée, qui peut causer un préjudice informationnel ;
- l'utilisation d'un système pour prendre ou orienter une décision concernant une personne, où les conséquences juridiques, économiques ou sociales peuvent être beaucoup plus importantes.

**Analyse institutionnelle.** L'OIT met notamment en garde contre les objectifs mal définis, les données biaisées et l'opacité des systèmes utilisés en ressources humaines pour le recrutement, la rémunération, la planification ou l'évaluation des performances [@ilo_ai_hrm_2025].

Le problème éthique n'est donc pas seulement « l'algorithme contient un biais ». Il faut examiner **la décision, les données, la possibilité de recours et le rôle réel de l'humain**.

### Fracture numérique et inégalités d'accès

**Analyse institutionnelle.** L'UNESCO rappelle qu'en 2024 environ **2,6 milliards de personnes** restaient sans accès à Internet. L'IA peut donc ajouter une nouvelle couche d'inégalité à des écarts déjà existants de connexion, d'équipement, de compétences numériques, de langue et de capacité financière [@unesco_ai_education_rights_2025].

Les inégalités d'accès concernent aussi les organisations : petites structures, établissements publics, associations, chercheurs ou pays ne disposent pas des mêmes budgets, données, compétences ni infrastructures.

Les mécanismes de concentration du cloud, des puces et du calcul, ainsi que les enjeux de souveraineté, sont analysés séparément en **partie IV**. Ici, leur conséquence sociale est simplement rappelée : une technologie peut accroître les écarts si ses meilleurs usages restent accessibles surtout aux acteurs déjà les mieux dotés.

### Accessibilité : bénéfice possible, pas propriété automatique

`SOCIAL_BENEFITS` — L'IA peut réduire certaines barrières en facilitant la reformulation, la traduction, la transcription, la simplification de texte, l'assistance à la communication ou l'adaptation de supports. L'UNESCO documente ce potentiel, notamment pour certains apprenants ayant des besoins éducatifs spécifiques [@unesco_ai_education_rights_2025].

Ce bénéfice dépend toutefois de la qualité du système, de la langue, du coût, de l'accessibilité de l'interface et de la protection des données. Une fonctionnalité « assistée par IA » n'est donc pas accessible par nature.

## Vie privée, données personnelles et surveillance

### Données utilisées pour développer les modèles

**Analyse institutionnelle.** Le Comité européen de la protection des données rappelle qu'un modèle entraîné sur des données personnelles n'est pas automatiquement anonyme. Le caractère anonyme doit être évalué au cas par cas, notamment au regard de la possibilité d'identifier une personne ou d'extraire des informations personnelles depuis le modèle [@edpb_ai_models_2024].

La CNIL recommande pour sa part de documenter la finalité, la base légale, les responsabilités, les durées de conservation, les mesures de sécurité et, lorsque le risque l'exige, l'analyse d'impact relative à la protection des données [@cnil_ai_development_2025].

### Données saisies par les utilisateurs

`ETHICAL_RISKS` — Une conversation avec un système d'IA peut contenir des données personnelles, des pièces jointes, des secrets, du code non public ou des informations professionnelles sensibles. Le risque dépend du service, du contrat, des paramètres de conservation, des usages secondaires éventuels et de la nature des données.

La règle responsable est la **minimisation** : ne transmettre que les informations nécessaires à la tâche et retirer ce qui peut l'être avant envoi.

### Surveillance, profilage et décisions automatisées

**Risque potentiel et cadre juridique.** L'IA peut accroître la capacité à observer, classifier, prédire ou profiler des personnes. Le risque est particulièrement élevé lorsque la collecte est persistante, invisible, difficilement contestable ou utilisée dans une décision significative.

Le RGPD et le règlement européen sur l'IA encadrent une partie de ces usages selon des logiques différentes mais complémentaires : protection des données et des droits d'un côté, exigences proportionnées au niveau de risque des systèmes de l'autre [@parlement_europ_2024; @cnil_ai_development_2025].

## Propriété intellectuelle, création et rémunération

### Données d'entraînement et droits des créateurs

**Controverse juridique et économique.** L'entraînement de modèles sur de grandes quantités de textes, images, musique ou code soulève des questions de consentement, de fouille de textes et de données, de réservation des droits, de traçabilité des corpus et de répartition de la valeur.

Dans l'Union européenne, les obligations applicables aux fournisseurs de modèles d'IA à usage général comprennent notamment une politique visant à respecter le droit d'auteur de l'Union et la publication d'un résumé suffisamment détaillé du contenu utilisé pour l'entraînement [@eu_gpai_obligations_2025; @parlement_europ_2024].

Ces obligations de transparence ne résolvent pas à elles seules la question de la rémunération ou de la juste répartition de la valeur. Cette dimension reste en partie juridique, économique et politique.

### Création assistée et responsabilité humaine

`SOCIAL_BENEFITS` — L'IA peut réduire les coûts de prototypage, faciliter l'expression d'une idée, accélérer certaines variantes ou aider à traduire et adapter un contenu.

`ETHICAL_RISKS` — Elle peut aussi brouiller la provenance d'un style ou d'une contribution et favoriser la publication d'un contenu insuffisamment relu ou attribué. Une politique responsable doit distinguer **assistance**, **création**, **réutilisation** et **publication**.

La rapidité de génération n'est pas, en elle-même, une preuve d'originalité, de légitimité ou de qualité.

## Hallucinations, désinformation et contenus synthétiques

### Confabulations et fausse autorité

**Analyse institutionnelle.** Le NIST emploie le terme _confabulation_ pour désigner des contenus faux ou incohérents produits avec une apparence de plausibilité. Ces erreurs deviennent particulièrement problématiques lorsque l'utilisateur ne peut pas vérifier la sortie ou lorsqu'elle est mobilisée dans une décision importante [@nist_ai_600_1].

Une erreur générée n'est pas nécessairement une désinformation intentionnelle. Le risque vient de sa circulation : un contenu faux peut être reformulé, copié, cité ou intégré à une décision alors que son origine incertaine n'est plus visible.

La fluidité linguistique augmente ce risque de **fausse autorité** : qualité rédactionnelle et validité factuelle sont deux propriétés distinctes.

### Désinformation et deepfakes

**Analyse institutionnelle.** Les contenus générés ou manipulés peuvent servir à l'usurpation, à la fraude, à la manipulation ou à la production de faux éléments audio-visuels. Les analyses de l'OCDE suivent une augmentation des incidents et dangers rapportés liés aux contenus synthétiques, tout en rappelant que les catégories et les méthodes de collecte ont leurs propres limites [@oecd_ai_incidents_2026].

Depuis le **2 août 2026**, l'article 50 du règlement européen sur l'IA impose des obligations de transparence pour certains systèmes interactifs et certains contenus générés ou manipulés, notamment l'information de l'utilisateur dans les cas prévus, des mécanismes de marquage pour certains contenus synthétiques et des obligations spécifiques concernant les deepfakes [@eu_ai_transparency_2026].

`SOCIAL_BENEFITS` — Les mêmes outils d'IA peuvent contribuer à analyser de grands volumes de contenu, assister des vérifications ou détecter certaines manipulations. L'intégrité de l'information repose donc sur une combinaison de techniques, de vérification humaine, de littératie médiatique et de gouvernance.

## Cybersécurité et usages dual-use : périmètre social

Cette partie n'analyse pas en détail la sécurité logicielle de CleanMyMap ; ce sujet appartient à la partie V.

`ETHICAL_RISKS` — Au niveau sociétal, les systèmes génératifs peuvent réduire le coût de certaines activités offensives : rédaction de phishing, recherche d'information, adaptation de scripts, traduction, manipulation informationnelle ou automatisation de tâches. Google Threat Intelligence documente des usages réels de modèles génératifs par des acteurs malveillants tout en montrant que l'IA ne remplace pas nécessairement les compétences nécessaires aux opérations les plus sophistiquées [@google_gtig_adversarial_misuse_generative_ai].

`SOCIAL_BENEFITS` — Les mêmes capacités peuvent soutenir la défense : analyse de code, tri de télémétrie, recherche d'anomalies, documentation et assistance à la réponse à incident.

Le caractère **dual-use** impose donc une analyse par capacité, niveau d'accès, contexte et garde-fous plutôt qu'un jugement uniforme sur la technologie.

## Surconfiance, automation bias et délégation du jugement

### Surconfiance et automation bias

`ETHICAL_RISKS` — Une réponse rapide, structurée et formulée avec assurance peut recevoir davantage de confiance qu'elle n'en mérite. Ce phénomène est particulièrement problématique lorsque le coût de vérification est élevé ou lorsque l'utilisateur ne possède pas lui-même l'expertise nécessaire.

Le NIST traite explicitement les risques liés à la configuration humain-IA, notamment la surconfiance et l'anthropomorphisation [@nist_ai_600_1]. L'étude CHI 2025 sur les travailleurs du savoir montre parallèlement qu'une confiance plus forte dans l'IA est associée, dans l'échantillon étudié, à moins d'effort critique déclaré [@lee_genai_critical_thinking_2025].

La réponse n'est pas de vérifier manuellement chaque sortie de manière identique. La vérification doit être **proportionnée au risque** : plus une décision est sensible, coûteuse, difficilement réversible ou difficile à contrôler, moins elle peut être déléguée sans vérification indépendante.

### Autorité et responsabilité

Un modèle peut proposer, générer, comparer ou signaler. Il n'assume pas à la place d'une personne ou d'une organisation la responsabilité juridique, institutionnelle ou morale d'une décision.

`GOVERNANCE` — L'autorité finale doit donc rester attribuable. Pour une tâche à faible enjeu, cela peut se traduire par un contrôle léger ; pour une décision importante, par une validation explicite, une source externe, des tests ou un mécanisme de recours.

## Interactions anthropomorphiques et risques psychologiques

Les interfaces conversationnelles utilisent le langage naturel, conservent parfois un contexte et peuvent simuler de l'empathie ou une personnalité. Ces caractéristiques facilitent l'usage mais peuvent aussi favoriser l'attribution de compréhension, d'intention ou d'attachement au système.

**Résultat empirique récent.** Une étude publiée en août 2026 dans _Nature Human Behaviour_ analyse **1 131 adultes américains utilisant Character.AI**, avec des historiques de conversation pour un sous-échantillon. Les auteurs observent des associations entre certaines formes d'usage compagnon et un bien-être plus faible dans certains contextes, notamment lorsque l'usage est intense ou très auto-révélateur. Les associations varient avec le réseau social hors ligne et la manière d'utiliser le chatbot [@zhang_ai_companions_2026].

Cette étude ne démontre pas que les chatbots causent uniformément l'isolement ou une détérioration psychologique.

`SOCIAL_BENEFITS` — Des systèmes conversationnels peuvent aussi fournir de l'information, un espace de réflexion ou une assistance à certains utilisateurs.

`ETHICAL_RISKS` — Le risque augmente lorsque le système encourage une relation exclusive, renforce systématiquement les convictions de l'utilisateur, se présente comme une autorité thérapeutique ou remplace une aide humaine nécessaire. Dans les situations sensibles, la non-délégation et l'orientation vers des ressources humaines appropriées constituent des garde-fous essentiels.

## Culture, langues et non-neutralité des modèles

Les modèles apprennent à partir de corpus humains. Ces corpus reflètent des distributions de langue, de thèmes, de styles, de normes et de représentations qui ne sont ni complètes ni culturellement neutres.

**Risque potentiel.** Une langue dominante ou un contexte culturel très présent dans les données peut bénéficier d'une meilleure couverture, tandis que des langues minoritaires, des usages locaux ou des savoirs moins numérisés peuvent être moins bien représentés. Le risque n'est pas seulement une mauvaise traduction : il peut prendre la forme d'un lissage des nuances, d'une hiérarchie implicite des références ou d'une réponse qui paraît universelle alors qu'elle dépend d'un corpus situé.

Le NIST inclut les biais nuisibles et les effets liés aux données parmi les risques à gérer dans les systèmes génératifs [@nist_ai_600_1]. L'UNESCO souligne parallèlement que les inégalités d'accès et de représentation peuvent renforcer des exclusions déjà existantes [@unesco_ai_education_rights_2025].

La conséquence méthodologique est simple : **une réponse linguistiquement fluide ne doit pas être confondue avec une représentation complète ou neutre d'un contexte culturel**.

## Éducation, apprentissage et intégrité académique

### Opportunités pédagogiques

`SOCIAL_BENEFITS` — L'IA générative peut soutenir l'explication, la reformulation, la traduction, la production d'exercices, certains usages de tutorat et certaines fonctions d'accessibilité. L'UNESCO reconnaît ces possibilités dans une approche centrée sur l'humain et fondée sur les droits [@unesco_ai_education_rights_2025].

### Risques pour l'apprentissage

`SOCIAL_RISKS` — Une réponse immédiatement générée peut aussi court-circuiter la pratique nécessaire à l'acquisition d'une compétence. Le risque est particulièrement élevé lorsque l'apprenant délègue exactement la capacité que l'évaluation cherche à mesurer.

L'enjeu d'intégrité académique ne peut donc pas être réduit à la détection de texte généré. Il faut définir :

- ce qui doit être compris et maîtrisé ;
- ce qui peut être assisté ;
- ce qui doit être produit sans assistance ;
- ce qui doit être déclaré ;
- comment l'étudiant peut démontrer son propre raisonnement.

L'UNESCO recommande notamment la protection de la vie privée, la littératie IA, une adaptation aux publics et aux contextes, et la préservation de l'agentivité de l'apprenant [@unesco_ai_education_rights_2025].

## Recherche scientifique et travail intellectuel

### Accélération possible de certaines étapes

`SOCIAL_BENEFITS` — L'IA peut assister la recherche documentaire, l'analyse de grands volumes de données, la génération d'hypothèses, l'exploration d'espaces de conception ou certaines étapes de simulation et d'écriture. Les revues récentes sur l'usage des grands modèles dans la méthode scientifique décrivent un potentiel réel, mais conditionné à des critères d'évaluation définis par les humains [@nature_llm_science_2025].

### Productivité individuelle et diversité collective

**Résultat empirique à interpréter avec prudence.** Une étude publiée dans _Nature_ en 2026, fondée sur **41,3 millions d'articles scientifiques**, associe l'usage d'outils d'IA à davantage de publications et de citations pour les chercheurs concernés, tout en observant une contraction de la diversité collective de certains sujets et interactions [@hao_ai_science_2026].

Cette association ne suffit pas à établir une causalité simple dans tous les domaines. Elle illustre néanmoins un arbitrage possible : **augmenter l'efficacité individuelle n'implique pas nécessairement augmenter la diversité collective de la recherche**.

### Intégrité scientifique

Les bénéfices ne suppriment pas les risques de références inventées, de données synthétiques mal identifiées, de propagation d'erreurs ou de responsabilité diluée.

Les politiques éditoriales de revues et les recommandations biomédicales maintiennent une responsabilité humaine et ne reconnaissent pas un système d'IA comme auteur responsable [@nature_portfolio_ai_policy; @icmje_ai_use_by_authors].

La validité scientifique reste fondée sur les données, la méthode, la reproductibilité, la traçabilité et la responsabilité humaine — pas sur la qualité rédactionnelle de la sortie.

## Transparence, auditabilité et responsabilité

### Transparence réglementaire

`GOVERNANCE` — Les obligations applicables aux fournisseurs de modèles d'IA à usage général dans l'Union européenne comprennent notamment documentation technique, information des fournisseurs en aval, politique de respect du droit d'auteur et résumé du contenu d'entraînement [@eu_gpai_obligations_2025].

Depuis le **2 août 2026**, les obligations de transparence prévues à l'article 50 s'appliquent également à certaines interactions et à certains contenus synthétiques [@eu_ai_transparency_2026].

Ces règles n'entraînent pas une transparence totale du fonctionnement interne des modèles. Elles créent plutôt des obligations de documentation, d'information, de marquage et de responsabilité adaptées à certains usages.

### Auditabilité

Un usage de l'IA est davantage auditable lorsqu'il est possible de reconstruire au minimum :

- la finalité ;
- le système ou service utilisé ;
- la catégorie de données transmise ;
- les contrôles humains prévus ;
- les sources ou preuves externes mobilisées ;
- les incidents, corrections ou désaccords importants ;
- les dépendances externes ;
- les limites connues.

L'auditabilité ne signifie pas conserver ou publier des données personnelles, des secrets ou une chaîne de raisonnement interne. Elle consiste à préserver **assez d'éléments vérifiables pour comprendre la décision et sa provenance**.

### Contrôle humain proportionné au risque

Le NIST recommande une gestion des risques sur tout le cycle de vie, avec des responsabilités identifiées, des évaluations, du suivi et des contrôles adaptés au contexte [@nist_ai_600_1]. Le règlement européen sur l'IA suit également une logique fondée sur le niveau de risque [@parlement_europ_2024].

Le principe retenu ici est :

> **IA pour assister ; humain ou institution responsable pour décider, vérifier et assumer.**

Cela ne signifie pas qu'une personne doit relire manuellement chaque sortie de faible enjeu. Cela signifie que le niveau de contrôle, de traçabilité et de recours doit augmenter avec les conséquences possibles de l'erreur.

## Bilan équilibré

### `SOCIAL_BENEFITS`

Les bénéfices documentés ou plausibles comprennent :

- des gains de productivité sur certaines tâches et dans certains contextes ;
- la diffusion plus rapide de certaines pratiques de travail ;
- l'automatisation de tâches répétitives ;
- l'assistance à la traduction, à la reformulation et à l'accessibilité ;
- certains usages pédagogiques lorsqu'ils restent compatibles avec l'objectif d'apprentissage ;
- l'accélération de certaines étapes de recherche ou d'analyse ;
- l'assistance à la vérification, au contrôle qualité et à certaines tâches de cybersécurité.

Ces bénéfices ne sont ni uniformes ni garantis. Ils dépendent de la tâche, du système, de l'utilisateur, de la qualité de l'intégration et de la capacité à contrôler la sortie.

### `SOCIAL_RISKS`

Les principaux risques sociaux comprennent :

- la transformation inégale des métiers et des opportunités d'entrée ;
- l'intensification ou la surveillance du travail ;
- l'invisibilisation du data labour et de la modération ;
- des inégalités d'accès aux outils et aux compétences ;
- une exposition accrue à certains contenus synthétiques trompeurs ;
- une dépendance fonctionnelle à des outils qui deviennent difficiles à remplacer ;
- des effets variables sur le bien-être lorsque l'IA prend une fonction relationnelle.

### `ETHICAL_RISKS`

Les principaux risques éthiques concernent :

- biais et discrimination ;
- collecte ou utilisation disproportionnée de données personnelles ;
- surveillance et profilage excessifs ;
- propriété intellectuelle et traçabilité des contributions ;
- surconfiance et délégation du jugement ;
- manipulation, anthropomorphisation ou persuasion ;
- publication de contenu faux avec une apparence d'autorité ;
- dilution de la responsabilité humaine.

### `GOVERNANCE`

Une gouvernance responsable repose moins sur un score unique que sur des contrôles complémentaires :

- finalité claire ;
- proportionnalité ;
- minimisation des données ;
- documentation des systèmes et fournisseurs ;
- vérification proportionnée au risque ;
- transparence sur le recours à l'IA lorsqu'elle est pertinente ;
- capacité de correction et de recours ;
- sécurité ;
- traçabilité suffisante ;
- responsabilité humaine identifiable ;
- séparation explicite entre impacts sociaux et coûts environnementaux.

Aucun **score éthique global** n'est calculé dans ce rapport : agréger des risques hétérogènes dans une note unique donnerait une précision artificielle et masquerait les arbitrages réels.

## `CLEANMYMAP_APPLICATION` — traduction prudente au projet

Cette section ne transforme aucun risque général en incident CleanMyMap sans preuve. Elle décrit uniquement les règles qui découlent des constats précédents pour l'usage réellement observé ou déclaré du projet.

### Usage principal : développement, revue et documentation

Dans CleanMyMap, l'IA est principalement utilisée pour **développer, relire, rechercher, structurer et documenter**. Elle peut proposer du code, aider à identifier des incohérences, structurer une analyse ou accélérer une recherche documentaire.

Cette fonction d'assistance ne lui confère aucune autorité propre sur l'orientation du projet.

### Validation humaine

Les décisions durables concernant notamment :

- l'architecture ;
- la sécurité ;
- les données ;
- les règles métier ;
- la méthodologie scientifique ;
- les contenus publics ;
- les chiffres d'impact ;

restent soumises à validation humaine et, lorsque nécessaire, à des tests ou à des sources externes.

Une sortie d'IA peut constituer une proposition ; elle ne constitue pas une preuve.

### Minimisation des données

Les données personnelles, sensibles ou secrètes doivent être retirées des instructions et pièces jointes lorsqu'elles ne sont pas nécessaires à la tâche. Cette règle est cohérente avec les principes de minimisation et les recommandations de la CNIL et du CEPD [@cnil_ai_development_2025; @edpb_ai_models_2024].

### Dépendance fournisseur identifiée

L'utilisation de services d'IA propriétaires crée une dépendance à des conditions de disponibilité, de prix, de fonctionnalités et de politique fournisseur. La question structurelle de ces dépendances est développée en partie IV.

Pour CleanMyMap, la réponse attendue est de rendre ces dépendances visibles, d'éviter les couplages inutiles et de conserver des données et formats exploitables lorsque cela est pertinent.

### Coût environnemental séparé

`ENVIRONMENTAL_COST` — L'énergie, le carbone, l'eau et les ressources matérielles associés au développement et aux services numériques sont traités dans la partie environnementale. Ils ne sont pas convertis artificiellement en indicateurs sociaux.

Un bénéfice social ne « compense » pas automatiquement un coût environnemental ; inversement, un coût environnemental ne prouve pas à lui seul qu'un usage utile doit être abandonné. Les deux dimensions doivent rester lisibles séparément avant arbitrage.

### Utilité réelle comme condition d'usage

Le principe retenu est : **utiliser l'IA lorsqu'elle apporte une utilité réelle et vérifiable ; réduire ou supprimer l'usage lorsqu'il produit surtout du volume, du bruit, de la dépendance ou de la complexité**.

Une utilité réelle peut prendre la forme d'une meilleure qualité, d'une détection d'erreur, d'une documentation plus fiable, d'une analyse réellement accélérée ou d'une tâche répétitive réduite. Un usage décoratif, redondant ou impossible à vérifier ne bénéficie pas de la même justification.

### Aucun KPI social artificiel

Cette partie ne crée volontairement aucun KPI de fidélisation, de lien social, d'activité physique ou d'apprentissage des bénévoles.

Ces indicateurs décriraient l'impact social de **CleanMyMap sur ses participants**, alors que l'objet de cette partie est l'impact social et éthique de **l'utilisation et du développement de l'IA**.

Si des effets sociaux propres à CleanMyMap sont un jour mesurés, ils devront reposer sur des données réelles et une méthodologie distincte.

## Synthèse

L'état actuel des connaissances ne permet ni de présenter l'IA générative comme un bénéfice social automatique, ni de la réduire à une menace homogène. Les résultats disponibles décrivent plutôt une technologie capable d'augmenter la productivité, l'accessibilité ou certaines capacités de recherche dans des contextes précis, tout en redistribuant le travail, l'attention, la valeur, les compétences et la responsabilité.

Les résultats les plus solides portent aujourd'hui sur la transformation de tâches, certains gains de productivité, le rôle du travail humain invisible, les risques de biais et de confidentialité, les erreurs plausibles des modèles, les changements d'effort critique et les exigences de gouvernance. D'autres effets, notamment macroéconomiques ou psychologiques à long terme, nécessitent davantage de recul et doivent rester présentés avec leurs limites de preuve.

Pour CleanMyMap, la traduction reste volontairement sobre : l'IA sert principalement à développer, relire, rechercher et documenter ; les sorties importantes sont vérifiées ; les données sont minimisées ; la dépendance fournisseur est identifiée ; le coût environnemental est mesuré séparément ; et le recours à l'IA n'est justifié que lorsqu'il apporte une utilité réelle.
