---
title: "Bilan d'impact IA — CleanMyMap"
subtitle: "Audit environnemental, social et méthodologique de l'usage de l'intelligence artificielle dans le monde et à l'echelle du projet CleanMyMap"
author: "Maxence Deroome"
date: "16 mai 2026"

toc: true
toc-title: "Sommaire"
toc-depth: 4

number-sections: true
number-depth: 4

format:
  pdf:
    documentclass: scrreprt
    top-level-division: chapter
    papersize: a4
    fontsize: 10pt
    pdf-engine: lualatex
    link-citations: true
    geometry:
      - top=12mm
      - bottom=13mm
      - left=14mm
      - right=14mm
      - headheight=14pt
      - headsep=4mm
      - footskip=6mm
      - includeheadfoot
      - heightrounded

  html:
    toc: true
    toc-depth: 4
bibliography:
  - references.bib
  - references_annexes.bib
reference-section-title: Bibliographie
nocite: |
  @*
---

{{< pagebreak >}}

# Résumé exécutif {.unnumbered}

Ce rapport évalue l'usage de l'IA dans le développement de CleanMyMap afin de déterminer si le gain de productivité obtenu justifie son coût environnemental, ses risques sociaux et sa dépendance technique. L'enjeu n'est pas de juger l'IA en général, mais d'examiner un cas d'usage concret, dans un projet numérique à finalité environnementale, avec des contraintes de sobriété, de sécurité et de gouvernance. Le projet s'inscrit par ailleurs dans le cadre du Diplôme Universitaire « Engagement » de Sorbonne Université, ce qui invite à l'évaluer aussi comme une démarche d'intérêt général et de réflexivité étudiante. Cette question est d'autant plus importante que des cadres de référence comme le NIST AI Risk Management Framework recommandent une gestion explicite des risques des systèmes génératifs, tandis que l'OWASP classe parmi les vulnérabilités majeures l'overreliance, l'excessive agency, la divulgation d'informations sensibles et les faiblesses de chaîne d'approvisionnement [@nist_ai_600_1; @owasp_llm_top_10_2025]. Dans le même temps, Google Threat Intelligence documente des usages offensifs de l'IA par des acteurs malveillants, notamment pour le phishing, la reconnaissance et l'automatisation d'actions de nuisance [@google_gtig_adversarial_misuse_generative_ai].

Le document a été préparé et sourcé avec assistance IA, puis relu et amélioré humainement. Cette transparence ne remplace pas la vérification : elle rend le rapport auditable, et toute coquille, erreur ou omission doit pouvoir être signalée à [contact@cleanmymap.fr](mailto:contact@cleanmymap.fr).

## Objectif du rapport

CleanMyMap doit être évalué comme un système technique et opérationnel, pas seulement comme une interface. Le rapport cherche donc à savoir si l'IA accélère réellement la conception, la documentation, la qualité du code et la production d'outils utiles, ou si elle ajoute au contraire une complexité qui finit par dépasser le bénéfice obtenu. Cette évaluation repose sur un arbitrage explicite entre utilité réelle, coût environnemental, risques sociaux et dépendance technique.

## Résultats principaux

- L'ordre de grandeur retenu pour l'assistance IA et le développement associé est d'environ **100 kWh**, **20 kgCO₂e** et **100 L d'eau** pour **100 h** de travail assisté, avec une forte dépendance au mix électrique, aux services cloud et au volume réel de requêtes.
- Ces valeurs doivent être lues comme des ordres de grandeur, non comme une mesure instrumentée, et elles s'ajoutent aux coûts d'usage du site, des images, des compilations, du stockage et des services tiers.
- L'IA peut améliorer la productivité de développement sur des tâches ciblées comme la génération de code, la documentation, la correction d'erreurs ou la simplification de parcours, mais ce gain n'est pertinent que s'il ne provoque pas d'inflation technique.
- Les bénéfices potentiels du projet restent réels si l'outil transforme des signalements dispersés en données localisées, modérées, exportables et utiles à l'action de terrain.
- Les limites restent structurantes : dépendance à des plateformes privées, exposition aux choix d'architecture, difficulté à auditer certains coûts et risque de faire croître l'empreinte logicielle sans gain terrain mesurable.

## Enseignements stratégiques

L'IA doit être évaluée comme un arbitrage, pas comme une solution par défaut. La question centrale est de savoir si une fonctionnalité augmente assez l'utilité réelle de CleanMyMap pour justifier son coût numérique, ses effets sociaux et sa dépendance technique. Le triptyque Vercel + Supabase + Clerk illustre bien ce point : l'efficacité opérationnelle peut coexister avec un risque de verrouillage, de centralisation et de dépendance organisationnelle. À ce niveau, la bonne question n'est pas seulement « est-ce que ça marche ? », mais « à quel coût, avec quels risques, et sous quelle gouvernance ? ».

## Recommandations prioritaires

- Mettre en place un suivi régulier de l'impact numérique et technique du rapport et du site.
- Réduire les usages IA aux tâches qui apportent un gain clair de qualité ou de productivité.
- Privilégier les modèles et les flux de travail les plus sobres pour les besoins courants.
- Encadrer les instructions, les usages et les validations humaines par une gouvernance explicite.
- Renforcer la cybersécurité, la limitation des accès et la transparence sur les choix techniques et les dépendances.

## Guide de lecture

Ce rapport peut se lire de trois manières selon le temps disponible et l'objectif poursuivi.

### Parcours rapide

- Commencer par le **Résumé exécutif** pour saisir l'enjeu général, les résultats principaux et les limites du rapport.
- Lire ensuite la **Partie I** pour comprendre le cadre du projet, la méthode et les hypothèses de travail.
- Consulter la **FAQ** pour aller directement aux objections les plus fréquentes sur l'IA, l'utilité réelle et le DU Engagement.

### Parcours de fond

- Poursuivre avec la **Partie II** pour comprendre l'empreinte environnementale et matérielle de l'IA.
- Lire la **Partie III** et les parties suivantes pour suivre les impacts sociaux, informationnels, techniques et de gouvernance.
- Aller jusqu'aux **parties XII et XIII** pour comprendre ce que l'IA a apporté au projet, ce qu'elle lui a coûté et pourquoi son usage peut rester justifié sous conditions.

### Parcours de préparation à l'oral

- Relire le **Résumé exécutif** pour avoir les trois messages clés à retenir.
- Travailler la section **Questions d'oral pour le jury DU Engagement** pour préparer les réponses aux questions non techniques.
- Revoir les sections de FAQ sur **l'usage de l'IA**, **l'utilité réelle** et **la gestion du projet** pour répondre de manière simple, précise et cohérente.

### Lecture complémentaire

- Les **annexes** servent à approfondir les dépendances, les scénarios de rupture, les calculs détaillés et les points techniques qui ne sont pas nécessaires à une première lecture.
- Les parties les plus détaillées du rapport peuvent être lues sélectivement selon la question posée par le jury ou par un lecteur technique.

{{< pagebreak >}}

# ANNEXES — Détails techniques et méthodologiques {#annexes .unnumbered}

Cette section examine CleanMyMap comme un projet inscrit dans une infrastructure numérique mondiale concentrée : clouds, plateformes d'authentification, bases managées, mesure d'audience, observabilité, IA, paiement, e-mail, monitoring et stores éventuels. Elle vise moins à refuser toute dépendance externe qu'à distinguer ce qui reste raisonnable, ce qui devient dangereux et ce qui est véritablement critique.

Le point décisif n'est pas seulement technique : l'architecture retenue engage aussi une dépendance économique, juridique et géopolitique.

## Annexe A — Dépendances technologiques et scénarios de rupture {#annexe-a-dependances-technologiques-et-scenarios-de-rupture}

### A.1 Lecture géopolitique des dépendances

La majorité des services critiques ou structurants sont liés à des entreprises américaines ou à des infrastructures fortement intégrées au cloud américain : Vercel, GitHub/Microsoft, Google, Stripe, Sentry, PostHog selon hébergement, Pinecone, OpenAI, Upstash selon régions, npm et potentiellement Cloudflare.

Enjeux principaux :

- **souveraineté des données** : données d'utilisateurs, actions, photos, coordonnées, messages, mesure d'audience et logs peuvent dépendre de juridictions et sous-traitants hors contrôle local ;
- **extraterritorialité juridique** : selon fournisseurs, région d'hébergement et contrat, des règles non européennes peuvent s'appliquer ou créer une incertitude ;
- **pouvoir de plateforme** : changement de prix, quotas, restrictions, fermeture de compte ou modification d'API peut affecter le projet sans décision locale ;
- **concentration du savoir-faire** : le projet devient plus facile à maintenir pour des développeurs habitués à ces plateformes, mais moins autonome pour une association locale ;
- **dépendance IA fermée** : si l'IA devient centrale, le projet dépend de modèles opaques, coûteux, peu auditables et soumis à des politiques d'accès externes.

Le risque n'est pas que ces services soient mauvais par nature.
Le risque est qu'une infrastructure à finalité écologique locale dépende d'une pile mondiale centralisée dont les intérêts, coûts et règles peuvent diverger des besoins locaux.

### A.2 Scénarios de rupture

| Scénario de rupture    | Effet immédiat                                             |                        Gravité |      Probabilité | Commentaire                                    |
| ---------------------- | ---------------------------------------------------------- | -----------------------------: | ---------------: | ---------------------------------------------- |
| Supabase indisponible  | carte, déclarations, profils, rapports et stockage touchés |                       critique |          moyenne | point de défaillance central                   |
| Clerk indisponible     | connexion, droits, admin, profil, espaces privés bloqués   |                       critique |          moyenne | la partie publique peut survivre partiellement |
| Vercel indisponible    | site et API indisponibles si pas de déploiement alternatif |                       critique | faible à moyenne | dépend aussi DNS/CDN                           |
| Google Sheets coupé    | import/export opérationnel perturbé                        |                          moyen |          moyenne | grave seulement si source de vérité            |
| Resend coupé           | e-mails et notifications sortantes stoppés                 |                          moyen |          moyenne | contournable manuellement                      |
| Stripe coupé           | paiement/dons/sponsor affectés                             |                          moyen | faible à moyenne | pas coeur terrain                              |
| PostHog/Sentry coupés  | perte de mesure et observabilité                           |                 faible à moyen |          moyenne | ne devrait pas bloquer l'usage                 |
| Upstash/QStash coupé   | files/cache/tâches async affectées                         |                          moyen |          moyenne | dépend du niveau d'usage réel                  |
| Pinecone/OpenAI coupés | fonctions IA/vectorielles indisponibles                    | faible actuel, fort si central |          moyenne | doit rester optionnel                          |
| npm/GitHub coupés      | maintenance, CI et déploiement perturbés                   |            fort pour évolution | faible à moyenne | n'empêche pas forcément le site déjà en ligne  |

Le projet pourrait continuer partiellement sans certains services : pages statiques, documentation, méthodologie et contenus publics peuvent survivre avec un export statique ; des données déjà exportées en CSV/JSON peuvent rester exploitables ; une carte simple peut fonctionner avec données statiques et tuiles ouvertes ; des rapports simples peuvent être générés hors ligne si les données sont exportées.

Le projet cesserait immédiatement ou fortement de fonctionner sans Supabase pour les données dynamiques et le stockage, sans Clerk pour l'authentification et les rôles, ou sans Vercel ou équivalent pour le runtime web/API.

### A.3 Cartographie détaillée des dépendances

| Dépendance     | Rôle dans le projet     | Type                                                     | Criticité   | Remplaçabilité      |
| -------------- | ----------------------- | -------------------------------------------------------- | ----------- | ------------------- |
| Vercel         | hébergement, runtime    | plateforme cloud                                         | critique    | moyenne à difficile |
| Supabase       | base Postgres, Storage  | BaaS/Postgres managé                                     | critique    | moyenne             |
| Clerk          | authentification        | auth propriétaire                                        | critique    | difficile           |
| Resend         | e-mails transactionnels | logiciel en tant que service e-mail                      | raisonnable | facile à moyenne    |
| Stripe         | paiements               | paiement propriétaire                                    | raisonnable | moyenne             |
| PostHog        | mesure d'audience       | mesure d'audience logiciel en tant que service/open-core | raisonnable | moyenne             |
| Sentry         | observabilité           | logiciel en tant que service/open-source                 | raisonnable | moyenne             |
| Upstash/QStash | cache, files, tâches    | serverless data/queue                                    | raisonnable | moyenne             |
| Pinecone       | recherche vectorielle   | base vectorielle                                         | optionnelle | moyenne à difficile |
| OpenAI         | IA sémantique           | modèle IA fermé                                          | optionnelle | moyenne à difficile |

## Annexe B — Méthodologie de calcul et incertitudes {#annexe-b-methodologie-de-calcul-et-incertitudes}

### Facteurs d'émission de référence

Les calculs s'appuient sur les données de la **Base Empreinte de l'ADEME** et les rapports de durabilité des fournisseurs cloud :

- **Électricité (France)** : 0,052 kgCO₂e / kWh.
- **Électricité (Moyenne Cloud Global)** : ~0,4 kgCO₂e / kWh.
- **Eau (Refroidissement Data Center)** : ~0,5 L / kWh consommé.
- **Inférence IA (GPT-4 class)** : ~0,01 kgCO₂e par requête complexe (incluant amortissement infrastructure).

### Hypothèses de consommation

- **Développement** : Un compilation CI/CD complet consomme environ 0,1 kWh. Le développement assisté par IA (2000+ invites) est estimé à une dette initiale de 50 kgCO₂e.
- **Usage Web** : 1 Go de données transférées équivaut à environ 0,02 kgCO₂e selon le mix énergétique moyen.
- **Stockage** : 1 Go stocké pendant un an génère environ 0,05 kgCO₂e.

### Marges d'incertitude

Les résultats présentés comportent des marges d'erreur inhérentes à l'opacité des infrastructures logiciel en tant que service :

- **Incertitude Cloud** : ± 30 % (dépend du mix énergétique réel au moment du calcul).
- **Incertitude IA** : ± 50 % (l'impact de l'entraînement des modèles propriétaires n'est pas auditable précisément).
- **Incertitude Matérielle** : ± 20 % (basée sur des moyennes d'ACV serveurs génériques).

### B.4 Limites des estimations

Les estimations restent des ordres de grandeur utiles pour l'arbitrage, mais elles ne doivent pas être lues comme des mesures instrumentées. Elles dépendent des hypothèses de calcul, des données disponibles et du périmètre retenu.

## Annexe C — Intérêts concrets de l'IA et avancées de recherche {#annexe-c-intérêts-concrets-de-lia}

Cette annexe reprend le détail des avancées scientifiques résumées dans la Partie III. Elle documente les cas où l'IA apporte déjà des gains concrets de découverte, de calcul ou d'exploration, tout en restant soumise à validation humaine ou expérimentale.

### Découverte massive de nouveaux matériaux cristallins

Le système GNoME développé par DeepMind identifie plus de 2,2 millions de structures cristallines candidates, dont environ 380 000 sont considérées comme potentiellement stables. Cette avancée change radicalement l'échelle de la découverte de matériaux, alors que l'humanité n'en avait répertorié qu'environ 48 000 en plusieurs siècles de recherche.

L'IA ne crée pas instantanément des matériaux exploitables industriellement, mais elle accélère considérablement l'exploration théorique de nouvelles possibilités chimiques et physiques.

### AlphaFold révolutionne la biologie structurale

AlphaFold est une IA capable de prédire la structure tridimensionnelle des protéines à partir de leur séquence d'acides aminés. Une tâche qui pouvait demander des années d'expérimentation est désormais réalisée en quelques minutes avec une précision remarquable.

**Qu'est-ce qu'AlphaFold ?** AlphaFold est une IA capable de prédire la structure tridimensionnelle des protéines à partir de leur séquence moléculaire (acides aminés).

Cette avancée transforme profondément la biologie structurale, la recherche médicale et la compréhension du vivant. Le prix Nobel de chimie 2024 a notamment récompensé Demis Hassabis et John Jumper pour AlphaFold, ainsi que David Baker pour ses travaux sur le design computationnel de protéines.

Limite importante : AlphaFold et ses successeurs améliorent fortement la prédiction structurale et certaines interactions biomoléculaires, mais ne remplacent pas l'expérience et ne modélisent pas parfaitement toute la dynamique réelle dans les cellules vivantes.

### Découverte de nouveaux antibiotiques par IA

L'IA permet d'identifier de nouvelles molécules antibiotiques, comme l'halicine découverte en 2020. Cette molécule possède un mécanisme d'action original contre certaines bactéries résistantes.

Cependant, découvrir une molécule n'est qu'une première étape. Les essais cliniques, les validations toxicologiques et les contraintes réglementaires restent extrêmement longs et coûteux. L'IA accélère donc la phase de découverte, sans supprimer les exigences de sécurité du développement pharmaceutique.

**Pourquoi les découvertes IA ne deviennent-elles pas immédiatement des applications concrètes ?** Parce que les validations industrielles, médicales et réglementaires restent longues, coûteuses et complexes.

### Cartographie ultra-détaillée du cerveau humain

Des techniques combinant IA et imagerie haute résolution permettent la cartographie nanométrique de fragments du cerveau humain. Cette approche révèle une complexité neuronale encore plus importante qu'attendu.

**Comment l'IA aide-t-elle les neurosciences ?** Grâce à l'analyse d'images massives et à la cartographie neuronale ultra-détaillée permettant d'étudier les connexions du cerveau.

Malgré ces avancées, comprendre pleinement le fonctionnement du cerveau reste un immense défi scientifique. Ces travaux rappellent l'humilité nécessaire face à la complexité du vivant.

### Synthèse automatisée de matériaux

Des laboratoires robotisés utilisent l'IA pour sélectionner puis synthétiser automatiquement certains matériaux prometteurs identifiés numériquement.

La majorité des matériaux prédits restent toutefois difficiles à produire ou inutilisables industriellement. Le passage entre simulation numérique et application concrète demeure une étape critique.

### Contrôle du plasma et fusion nucléaire

DeepMind applique l'apprentissage profond au contrôle des plasmas dans les réacteurs Tokamak de fusion nucléaire. Les systèmes IA optimisent la gestion des champs magnétiques et explorent de nouvelles configurations physiques.

Cette approche nourrit l'espoir d'une meilleure maîtrise de la fusion nucléaire, potentielle source d'énergie propre et abondante. L'IA ne "résout" pas encore la fusion, mais elle améliore fortement certaines capacités de contrôle et de simulation.

### Révolution des prévisions météorologiques

Des modèles IA comme GenCast améliorent fortement la rapidité et la précision des prévisions météorologiques à moyen terme.

Ces systèmes peuvent surpasser certains modèles traditionnels sur plusieurs indicateurs tout en utilisant moins de ressources computationnelles. Cela représente un enjeu important pour l'anticipation des catastrophes climatiques et la gestion des risques environnementaux.

### Déchiffrement des rouleaux carbonisés du Vésuve

L'IA permet de lire progressivement des textes antiques carbonisés lors de l'éruption du Vésuve il y a près de 2000 ans.

Des algorithmes analysent les variations internes du papyrus numérisé pour reconstituer des caractères invisibles à l'œil humain. Cette avancée offre la possibilité de redécouvrir des œuvres philosophiques perdues depuis l'Antiquité.

### Structure du langage chez les cachalots

L'analyse IA des communications des cachalots révèle des structures répétitives et organisées dans leurs "codas" sonores.

Ces résultats suggèrent l'existence d'une communication plus complexe qu'imaginé chez certains cétacés et remettent en question l'idée que les systèmes de communication sophistiqués seraient exclusivement humains.

### Résolution de problèmes mathématiques avancés

Des systèmes comme AlphaProof montrent des capacités importantes en raisonnement mathématique formel.

L'IA peut désormais résoudre certains problèmes complexes de niveau olympique en produisant des démonstrations structurées, montrant une progression importante au-delà du simple calcul automatique.

### Création de protéines artificielles

Des modèles d'IA générative permettent désormais de concevoir des protéines inédites adaptées à des fonctions précises : médecine, dépollution, industrie ou biotechnologies.

L'IA ne se contente donc plus d'analyser le vivant existant; elle participe à l'invention de nouvelles structures biologiques artificielles.

### Cartographie complète du cerveau de la drosophile

Le cerveau entier de la drosophile (mouche du vinaigre) a été cartographié avec une précision inédite.

Cette avancée fournit un modèle précieux pour comprendre l'organisation neuronale et étudier certaines maladies neurodégénératives humaines.

### AlphaMissense

Il permet d'évaluer la dangerosité potentielle de millions de mutations génétiques humaines. Cet outil pourrait aider à mieux comprendre les maladies rares et à orienter le diagnostic génétique, tout en nécessitant une validation clinique humaine.

### AlphaDev

Il a découvert de nouveaux algorithmes de tri plus efficaces que certaines solutions conçues par des programmeurs humains. Ces améliorations ont été intégrées à des bibliothèques informatiques utilisées à très grande échelle.

### FunSearch

Il a permis de produire de nouvelles constructions mathématiques et de meilleures stratégies pour certains problèmes d'optimisation. Cela montre que l'IA peut contribuer à la recherche mathématique, à condition que ses résultats soient vérifiables.

### Astronomie

En astronomie, des outils IA analysent les archives de grands télescopes comme Hubble et détectent des objets atypiques passés inaperçus. L'IA devient ainsi un outil puissant pour explorer les masses de données accumulées par les observatoires.

### Conception de protéines artificielles

L'IA accélère la conception de protéines artificielles, notamment pour créer des molécules antibactériennes ou thérapeutiques. Ces résultats restent à valider expérimentalement, mais ils ouvrent une nouvelle phase de recherche biomédicale.

{{< pagebreak >}}

## Annexe D — Documents de suivi et preuves internes {#annexe-d-documents-de-suivi-et-preuves-internes}

Cette annexe rassemble les éléments de suivi qui documentent la consolidation du rapport et les vérifications à garder avant publication.

### D.1 Journal des améliorations issues du rapport d'impact IA

- Restructuration progressive des parties I à XIII selon une logique académique.
- Migration de la FAQ dans le corps du rapport entre la Partie I et la Partie II.
- Déplacement des avancées scientifiques de l'IA vers l'Annexe C.
- Normalisation des citations et suppression des séparateurs non académiques.

### D.2 Historique des optimisations réalisées

- Réduction des services numériques coûteux.
- Hiérarchisation des optimisations interface client, réseau, stockage et CI/CD.
- Mise en cohérence des blocs de sobriété fonctionnelle et de décision.
- Consolidation de la logique d'audit technique et des scénarios de durabilité.

### D.3 Éléments de preuve technique à compléter

- Captures de performances avant et après optimisation.
- Mesure du poids des pages critiques.
- Journal des compilations, aperçus et déploiements.
- Suivi des requêtes réseau redondantes et des dépendances lourdes.

### D.4 Liste des points à vérifier avant publication

- Cohérence des titres, sous-titres et renvois internes.
- Absence de paragraphes orphelins ou de doublons.
- Présence des citations `[@clé]` et des entrées bibliographiques associées.
- Vérification finale de la bibliographie et des annexes.

{{< pagebreak >}}

# Bibliographie {.unnumbered}

Les références formelles du rapport sont générées automatiquement via `references.bib` pour le corps du texte et `references_annexes.bib` pour les annexes, avec les citations `[@clé]` intégrées dans le corps du texte.

## Sources institutionnelles et techniques

Cette table regroupe les sources de référence mobilisées dans plusieurs parties du document. Les références spécifiques déjà attachées à certaines sections restent conservées à leur emplacement d'origine ou dans les annexes correspondantes.

Comme le document a été consolidé avec assistance IA, les liens externes peuvent évoluer ou devenir indisponibles après publication ; toute source cassée, référence imprécise ou erreur de citation peut être signalée à [contact@cleanmymap.fr](mailto:contact@cleanmymap.fr).

| Source                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ADEME / Arcep** (2022). _Étude d'impact environnemental du numérique en France_. [Lien](https://librairie.ademe.fr/consommer-autrement/5277-impact-environnemental-du-numerique-en-france.html)                                                                                          |
| **ADEME**. _Des idées écolos pour tous les jours au bureau_. [Lien](https://agirpourlatransition.ademe.fr/particuliers/bureau/bons-gestes/papier-premier-dechet-bureau)                                                                                                                    |
| **ADEME** (2011). _Analyse comparée des impacts environnementaux de la communication par voie électronique - Complément_. [Lien](https://studylibfr.com/doc/4015667/acv_ntic_synthese_resultats)                                                                                           |
| **AIE (IEA)** (2024). _Electricity 2024: Analysis and forecast to 2026_. [Lien](https://www.iea.org/reports/electricity-2024)                                                                                                                                                              |
| **AIE (IEA)** (2024). _Energy and AI Report_. [Lien](https://www.iea.org/reports/energy-and-ai)                                                                                                                                                                                            |
| **Anthropic**. _Towards Understanding Sycophancy in Language Models_. [Lien](https://www.anthropic.com/news/towards-understanding-sycophancy-in-language-models)                                                                                                                           |
| **ANSSI** (2023). _Souveraineté numérique et Cloud_.                                                                                                                                                                                                                                       |
| **Cigref / INR** (2022). _Référentiel d'écoconception de services numériques_. [Lien](https://eco-conception.designersethiques.org/guide/fr/)                                                                                                                                              |
| **Cigref** (2021). _Souveraineté numérique : de quoi parle-t-on ?_.                                                                                                                                                                                                                        |
| **Commission Européenne** (2022). _Data Act_. [Lien](https://digital-strategy.ec.europa.eu/en/policies/data-act)                                                                                                                                                                           |
| **Commission Européenne** (2022). _Data Governance Act_.                                                                                                                                                                                                                                   |
| **European Union Research** (2021). _Cloud Vendor Lock-In: Causes, Impacts, and Solutions_.                                                                                                                                                                                                |
| **GAIA-X Association** (2024). _Technical Architecture Release 24.04_.                                                                                                                                                                                                                     |
| **GreenIT.fr** (2019/2023). _L'empreinte environnementale du numérique mondial_. [Lien](https://www.greenit.fr/etude-empreinte-environnementale-du-numerique-mondial/)                                                                                                                     |
| **International AI Safety Report** (2025). _International AI Safety Report 2025_. [Lien](https://internationalaisafetyreport.org/publication/international-ai-safety-report-2025)                                                                                                          |
| **King's College London**. _King's study finds AI chose nuclear signalling in 95% of simulated crises_. [Lien](https://www.kcl.ac.uk/news/artificial-intelligence-under-nuclear-pressure-first-large-scale-kings-study-reveals-how-ai-models-reason-and-escalate-under-crisis)             |
| **Kenneth Payne** (2026). _AI Arms and Influence: Frontier Models Exhibit Sophisticated Reasoning in Simulated Nuclear Crises_. [Lien](https://arxiv.org/abs/2602.14740)                                                                                                                   |
| **Li, P. et al.** (2023). _Making AI Less Thirsty: Uncovering the Secret Water Footprint of AI Models_. [Lien](https://arxiv.org/abs/2304.03271)                                                                                                                                           |
| **NIST**. _Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile_. [Lien](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)                                                  |
| **OCDE**. _AI principles_. [Lien](https://www.oecd.org/en/topics/ai-principles.html)                                                                                                                                                                                                       |
| **OpenAI**. _Expanding on what we missed with sycophancy_. [Lien](https://openai.com/index/expanding-on-sycophancy/)                                                                                                                                                                       |
| **OpenAI**. _Strengthening ChatGPT's responses in sensitive conversations_. [Lien](https://openai.com/index/strengthening-chatgpt-responses-in-sensitive-conversations/)                                                                                                                   |
| **OpenAI**. _Our updated Preparedness Framework_. [Lien](https://openai.com/index/updating-our-preparedness-framework/)                                                                                                                                                                    |
| **Parlement Européen** (2024). _EU AI Act (Règlement 2024/1689)_. [Lien](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689)                                                                                                                                             |
| **Shift Project** (2019/2023). _Pour une sobriété numérique_. [Lien](https://theshiftproject.org/article/pour-une-sobriete-numerique-rapport-shift/)                                                                                                                                       |
| **Data Center Dynamics / Synergy Research Group** (2025). _Synergy Research: Neoclouds gradually increasing CIS market share, as Amazon declines_. [Lien](https://www.datacenterdynamics.com/en/news/synergy-research-neoclouds-gradually-increasing-cis-market-share-as-amazon-declines/) |
| **TIME** (2023). _OpenAI Used Kenyan Workers to Make ChatGPT Less Toxic_. [Lien](https://time.com/6247678/openai-chatgpt-kenya-workers/)                                                                                                                                                   |
| **The Guardian** (2023). _It's destroyed me completely: Kenyan moderators decry toll of training of AI models_. [Lien](https://www.theguardian.com/technology/2023/aug/02/ai-chatbot-training-human-toll-content-moderator-meta-openai)                                                    |
| **UNESCO**. _Recommendation on the Ethics of Artificial Intelligence_. [Lien](https://www.unesco.org/en/articles/recommendation-ethics-artificial-intelligence?hub=343)                                                                                                                    |
| **UNITAR / ITU** (2024). _Global E-waste Monitor 2024_. [Lien](https://ewastemonitor.info/the-global-e-waste-monitor-2024/)                                                                                                                                                                |
| **WHO**. _Children and digital dumpsites: e-waste exposure and child health_. [Lien](https://www.who.int/publications/i/item/9789240023901)                                                                                                                                                |
| **Vidéo YouTube**. _Pourquoi ChatGPT a manipulé des ados_. [Lien](https://www.youtube.com/watch?v=fbAfLv7CBic)                                                                                                                                                                             |
| **Vidéo YouTube**. _Il faut qu'on parle de Claude Mythos_. [Lien](https://www.youtube.com/watch?v=JBaBAg4ny6U)                                                                                                                                                                             |
| **Vidéo YouTube**. _Pourquoi l'IA ne remplacera pas les artistes_. [Lien](https://www.youtube.com/watch?v=B_MR20jqR48)                                                                                                                                                                     |
| **Vidéo YouTube**. _Le jeu dans lequel on vit est en train de changer_. [Lien](https://www.youtube.com/watch?v=waoKjITpot0)                                                                                                                                                                |

## Documentation des outils, modèles et services utilisés

Cette section rassemble les documents de référence liés aux outils et services qui ont servi au développement et à l'évaluation du projet.

| Outil / service          | Référence                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI Codex             | [OpenAI Codex pricing](https://developers.openai.com/codex/pricing)                                                                       |
| OpenAI API               | [OpenAI API Pricing](https://openai.com/api/pricing/)                                                                                     |
| OpenAI GPT-4             | [GPT-4 Technical Report](https://openai.com/research/gpt-4)                                                                               |
| Anthropic Claude         | [Claude's Constitution](https://www.anthropic.com/news/claudes-constitution)                                                              |
| Anthropic Claude         | [Claude's new constitution](https://www.anthropic.com/news/claudes-new-constitution)                                                      |
| Anthropic safety notes   | [Towards Understanding Sycophancy in Language Models](https://www.anthropic.com/news/towards-understanding-sycophancy-in-language-models) |
| Ollama                   | [Library documentation](https://ollama.com/library)                                                                                       |
| Vercel                   | [v0 — Build Agents, Apps, and Websites with AI](https://vercel.com/blog/v0)                                                               |
| Supabase                 | [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)                                                            |
| Google AI for Developers | [Gemini API release notes](https://ai.google.dev/gemini-api/docs/changelog)                                                               |
