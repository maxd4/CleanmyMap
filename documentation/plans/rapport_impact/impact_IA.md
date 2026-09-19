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

- Le modèle central retient **35 Md token-équivalent** (**DECLARED + ASSUMPTION**) et calcule **10,5 MWh**, **3,675 tCO₂e électrique** et **47,5 m³ d'eau indirecte** comme **PROXY**; l'affichage arrondi est ≈ **10 MWh**, ≈ **3,7 tCO₂e** et ≈ **45 m³**.
- L'ACV partielle est de **4,8 tCO₂e** (≈ **5 tCO₂e** affichées), sous statuts **ASSUMPTION + PROXY**. L'usage exact ChatGPT hors Codex, les facteurs physiques des images et les impacts physiques des services restent **NA** lorsqu'ils ne sont pas audités.
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

# Partie I — Cadre, périmètre et méthodologie {#partie-i-cadre-perimetre-et-methode}

<!-- SYNTHÈSE À COMPLÉTER MANUELLEMENT -->

[Lire la Partie I détaillée](./impact_IA/01-cadre-perimetre-methodologie.md)

## FAQ et questions pour le jury {.unnumbered}

[Consulter la FAQ et les questions d'oral](./impact_IA/00-faq-questions-jury.md)

# Partie II — Empreinte environnementale et matérielle {#partie-ii-empreinte-environnementale-et-materielle}

<!-- SYNTHÈSE À COMPLÉTER MANUELLEMENT -->

[Lire la Partie II détaillée](./impact_IA/02-empreinte-environnementale-materielle.md)

# Partie III — Impacts sociaux, humains et informationnels de l'IA {#partie-iii-impacts-sociaux-humains-et-informationnels-de-lia}

<!-- SYNTHÈSE À COMPLÉTER MANUELLEMENT -->

[Lire la Partie III détaillée](./impact_IA/03-impacts-sociaux-humains-informationnels.md)

# Partie IV — Pouvoir économique, infrastructures, souveraineté et régulation de l'IA {#partie-iv-pouvoir-infrastructures-et-souverainete-numerique}

<!-- SYNTHÈSE À COMPLÉTER MANUELLEMENT -->

[Lire la Partie IV détaillée](./impact_IA/04-pouvoir-infrastructures-souverainete.md)

# Partie V — Risques techniques, sécurité et contrôle des systèmes d'IA {#partie-v-risques-techniques-securite-et-controle-des-systemes-dia}

<!-- SYNTHÈSE À COMPLÉTER MANUELLEMENT -->

[Lire la Partie V détaillée](./impact_IA/05-risques-techniques-securite-controle.md)

# Partie VI — Utilité réelle de CleanMyMap {#partie-vi-utilite-reelle-de-cleanmymap}

<!-- SYNTHÈSE À COMPLÉTER MANUELLEMENT -->

[Lire la Partie VI détaillée](./impact_IA/06-utilite-reelle-cleanmymap.md)

# Partie VII — Sobriété fonctionnelle et Indice d'utilité réelle {#partie-vii-sobriete-fonctionnelle-et-indice-dutilite-reelle}

<!-- SYNTHÈSE À COMPLÉTER MANUELLEMENT -->

[Lire la Partie VII détaillée](./impact_IA/07-sobriete-fonctionnelle-iur.md)

# Partie VIII — Dette numérique, effets rebond et durabilité dans le temps {#partie-viii-dette-numerique-effets-rebond-et-durabilite-dans-le-temps}

<!-- SYNTHÈSE À COMPLÉTER MANUELLEMENT -->

[Lire la Partie VIII détaillée](./impact_IA/08-dette-numerique-effets-rebond-durabilite.md)

# Partie IX — Plan de réduction des impacts {#partie-ix-plan-de-reduction-des-impacts}

<!-- SYNTHÈSE À COMPLÉTER MANUELLEMENT -->

[Lire la Partie IX détaillée](./impact_IA/09-plan-reduction-impacts.md)

# Partie X — Sobriété numérique du site {#partie-x-sobriete-numerique-du-site}

<!-- SYNTHÈSE À COMPLÉTER MANUELLEMENT -->

[Lire la Partie X détaillée](./impact_IA/10-sobriete-numerique-site.md)

# Partie XI — Audit technique de sobriété {#partie-xi-audit-technique-de-sobriete}

<!-- SYNTHÈSE À COMPLÉTER MANUELLEMENT -->

[Lire la Partie XI détaillée](./impact_IA/11-audit-technique-sobriete.md)

# Partie XII — Apports de l'IA et enseignements du DU {#partie-xii-apports-de-lia-et-enseignements-du-du}

<!-- SYNTHÈSE À COMPLÉTER MANUELLEMENT -->

[Lire la Partie XII détaillée](./impact_IA/12-apports-ia-enseignements-du.md)

# Partie XIII — Conclusion institutionnelle {#partie-xiii-conclusion-institutionnelle}

<!-- SYNTHÈSE À COMPLÉTER MANUELLEMENT -->

[Lire la Partie XIII détaillée](./impact_IA/13-conclusion-institutionnelle.md)

{{< pagebreak >}}

# ANNEXES — Détails techniques et méthodologiques {#annexes .unnumbered}

- [Annexe A — Dépendances technologiques et scénarios de rupture](./impact_IA/annexes/A-dependances-scenarios-rupture.md)
- [Annexe B — Méthodologie de calcul et incertitudes](./impact_IA/annexes/B-methodologie-calcul-incertitudes.md)
- [Annexe C — Intérêts concrets de l'IA et avancées de recherche](./impact_IA/annexes/C-avancees-scientifiques-ia.md)
- [Annexe D — Documents de suivi et preuves internes](./impact_IA/annexes/D-preuves-internes-suivi.md)

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

{{< pagebreak >}}

## Documentation des outils, modèles et services utilisés

Cette section rassemble les documents de référence liés aux outils et services qui ont servi au développement et à l'évaluation du projet.

| Outil / service | Référence                                                                      |
| --------------- | ------------------------------------------------------------------------------ |
| OpenAI Codex    | [OpenAI Codex pricing](https://developers.openai.com/codex/pricing)            |
| Vercel          | [v0 — Build Agents, Apps, and Websites with AI](https://vercel.com/blog/v0)    |
| Supabase        | [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security) |
