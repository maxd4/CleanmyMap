# Partie I — Cadre, périmètre et méthodologie {#partie-i-cadre-perimetre-et-methode}

Cette partie fixe le **cadre de preuve** du rapport : ce qui est directement observé dans le dépôt ou dans une télémétrie, ce qui est déclaré par le porteur du projet, ce qui est dérivé par calcul, ce qui relève d'une hypothèse de scénario, ce qui constitue un proxy et ce qui doit rester indisponible (`NA`).

L'objectif n'est pas de transformer des données incomplètes en précision artificielle. CleanMyMap est un projet développé sur plusieurs mois, avec plusieurs outils d'IA, plusieurs comptes, des services cloud externes et une infrastructure qui a fortement évolué. Le rapport privilégie donc des **ordres de grandeur auditables**, une séparation explicite des niveaux de preuve et des scénarios reproductibles.

La [Partie II-A](./02a-empreinte-environnementale-cleanmymap.md) applique ce cadre à l'empreinte attribuable au développement de CleanMyMap. La [Partie II-B](./02b-ia-data-centers-materiel-acv.md) décrit les mécanismes physiques généraux — data centers, énergie, eau, semi-conducteurs, réseaux et matériel. L'[Annexe B](./annexes/B-methodologie-calcul-incertitudes.md) documente les équations, facteurs, conventions d'arrondi, hypothèses et règles anti-double-comptage.

## Genèse, objectifs et périmètre du projet

### Genèse du projet et contexte universitaire

CleanMyMap a été initié dans le cadre du Diplôme Universitaire « Engagement » de Sorbonne Université. Le projet est parti d'un besoin simple : mieux structurer et visualiser des informations issues d'actions de dépollution, puis progressivement relier signalement, cartographie, coordination, preuve d'impact et transmission.

Le développement a commencé **à la mi-février 2026**, avant la formalisation complète de l'historique Git. Les premières expérimentations ont été réalisées dans un environnement Python / Google Colab, à partir de données tabulaires et d'une carte Leaflet. Le projet a ensuite évolué vers une application web structurée, puis vers une plateforme plus large intégrant gouvernance des données, authentification, sécurité, rapports, méthodologie, coordination et outils de pilotage.

Le cadre du DU a structuré la démarche autant que le produit. Les journaux et ateliers du DU conservent des traces des arbitrages, des difficultés, des évolutions du projet et de la réflexion sur la sobriété, l'utilité réelle et la gouvernance.

### Chronologie synthétique

- **Mi-février 2026** : premiers prototypes, expérimentation Python / Colab, traitement de données et cartographie.
- **Fin février – mars** : passage vers un projet web, découverte progressive de GitHub, des agents de code et d'un développement assisté par IA plus structuré.
- **Avril – mai** : extension du périmètre fonctionnel, stabilisation progressive des pages principales, des formulaires, de la donnée, de l'authentification, du reporting et de la documentation.
- **Juin** : consolidation de l'UI, travail sur la méthodologie, partenariats, carte, formulaires de groupe et réduction de certains appels Vercel / Supabase afin de rester compatible avec des plans peu coûteux.
- **Été 2026** : approfondissement des audits de sécurité, de performance, de données, de qualité, de documentation et de gouvernance ; développement de mécanismes d'export, de suivi et de contrôle.
- **Septembre 2026** : stabilisation de l'architecture documentaire du rapport d'impact, audit plus fin de l'usage Codex, révision de la méthodologie environnementale et séparation plus nette entre empreinte propre à CleanMyMap et impacts généraux de l'infrastructure IA.

Cette chronologie décrit des **phases de travail**. Elle ne doit pas être utilisée pour déduire automatiquement un nombre d'heures de calcul ou une consommation énergétique.

### Objectifs fonctionnels de CleanMyMap

CleanMyMap n'a pas pour seul but d'afficher une carte. Le site vise à organiser des données utiles à l'action de terrain, faciliter la coordination entre bénévoles et associations et produire des informations réutilisables par les acteurs concernés.

Le produit s'organise autour de plusieurs familles fonctionnelles :

- **Accueil et pilotage** : vue d'ensemble, navigation et informations principales ;
- **Agir** : déclaration d'action, itinéraire, signalement, préparation et suivi ;
- **Visualiser** : carte, historique et représentation des actions ou zones concernées ;
- **Impact** : indicateurs, preuves, rapports et exports ;
- **Réseau** : acteurs, partenaires, communauté et observatoire ;
- **Échanges** : coordination et communication ;
- **Apprendre** : contenus pédagogiques, quiz et méthodologie ;
- **Piloter** : gouvernance, contrôle, paramétrage et surfaces administratives.

La valeur du projet ne dépend donc pas du volume de code produit mais de la capacité de ces fonctions à réduire des frictions réelles : informations dispersées, doublons, perte de preuves, difficulté de coordination ou manque de continuité entre signalement et action.

## Deux plans d'usage de l'IA

Le rapport distingue strictement deux plans.

### IA utilisée pour développer CleanMyMap — `CURRENT`

L'IA est effectivement utilisée comme outil de développement et de conception :

- génération et refactorisation de code ;
- analyse du dépôt ;
- rédaction et restructuration documentaire ;
- préparation de tests ;
- débogage ;
- recherche et synthèse ;
- réflexion UX / UI ;
- contrôle de cohérence ;
- préparation de lots d'intégration.

Ce poste appartient au **coût de production du projet**.

### IA intégrée au produit — `PROSPECTIVE` sauf preuve contraire

Une fonctionnalité applicative reposant sur un LLM, un agent ou une API d'IA doit être distinguée de l'IA ayant servi au développement.

À l'état actuel du dépôt, l'existence de routes, de cartes, de recommandations, de recherche, d'itinéraires ou de fonctions automatisées ne prouve pas qu'un LLM est appelé en production. Une capacité IA applicative ne doit donc être classée `CURRENT` que lorsqu'un appel, un SDK, une configuration ou une télémétrie réelle le démontre.

Cette séparation évite d'attribuer au fonctionnement quotidien du site un coût IA qui appartient en réalité à la phase de développement.

## Périmètre technique observé

Le dépôt courant décrit notamment :

- application web : **Next.js 16**, **React 19**, **TypeScript 7** ;
- rendu et interface : Tailwind CSS, Leaflet, Recharts, Framer Motion et autres composants UI ;
- serveur : routes et handlers Next.js ;
- authentification : **Clerk** ;
- données : **Supabase / PostgreSQL**, Storage, migrations et scripts de synchronisation ;
- hébergement / runtime : **Vercel** ;
- observabilité : **Sentry** ;
- mesure d'audience : **PostHog**, Vercel Analytics et Speed Insights selon configuration ;
- email : **Resend** ;
- services complémentaires déclarés : Upstash Redis / QStash, Pinecone, Stripe et autres intégrations présentes dans le code ;
- domaine et certains services de messagerie : **LWS** ;
- application mobile : Expo / React Native, avec périmètre produit distinct ;
- historique : scripts Python, SQLite, outils de maintenance, tests et artefacts de migration.

Cette liste indique la **présence technique** des dépendances. Elle ne constitue pas une mesure de leur consommation réelle.

## Période étudiée

La période historique retenue pour le développement assisté par IA est :

```text
mi-février 2026
→
septembre 2026
```

Les premières expérimentations peuvent précéder la première trace Git exploitable. Inversement, une trace Git ne démontre pas à elle seule qu'une activité IA a été utilisée sur chaque modification.

Le rapport distingue donc :

```text
historique du projet
≠
historique Git
≠
historique des comptes IA
≠
télémétrie locale
```

## Méthodologie d'évaluation

### Hiérarchie des niveaux de preuve

Le rapport utilise les statuts suivants :

| Statut | Définition |
| --- | --- |
| `OBSERVED` | Valeur directement observée dans une source technique ou une télémétrie disponible. |
| `DERIVED` | Valeur calculée à partir d'une observation avec une formule explicite. |
| `DECLARED` | Valeur déclarée par le porteur du projet mais non reconstruite exhaustivement. |
| `ASSUMPTION` | Hypothèse de scénario utilisée pour raisonner. |
| `PROXY` | Facteur ou indicateur comparable utilisé faute de mesure directe. |
| `NA` | Donnée indisponible ou non attribuable proprement. |

La logique générale est :

```text
OBSERVED
→ DERIVED
→ DECLARED / ASSUMPTION
→ PROXY
→ NA lorsque l'allocation n'est pas défendable
```

`NA` est préférable à un faux zéro.

Cette méthode reprend le principe du [protocole scientifique CleanMyMap](../../../product/SCIENTIFIC_PROTOCOL.md) : toute formule doit être explicite, toute hypothèse doit être signalée et un indicateur ne doit pas donner l'illusion d'une mesure absolue.

### Périmètre d'impact

Le bilan cherche à couvrir, lorsque les données existent :

- assistance IA au développement ;
- calcul et infrastructure cloud ;
- runtime et services applicatifs ;
- stockage et transferts ;
- électricité ;
- carbone ;
- eau ;
- matériel ;
- terminaux ;
- impressions ;
- déplacements attribuables au projet ;
- maintenance et effets rebond.

Il exclut du total propre à CleanMyMap toute allocation qui ne peut pas être défendue, notamment une fraction arbitraire de la consommation mondiale des data centers ou de l'entraînement d'un modèle propriétaire.

### ACV et comptabilité carbone

Une **analyse de cycle de vie** et une comptabilité carbone ne sont pas synonymes.

La comptabilité carbone peut distinguer les émissions opérationnelles et les émissions de chaîne de valeur. Une ACV cherche plus largement à suivre les impacts à travers la fabrication, l'usage, la maintenance et la fin de vie, et peut couvrir plusieurs catégories : climat, eau, ressources ou déchets.

Dans ce rapport :

```text
électricité d'usage
→ composante opérationnelle

fabrication + infrastructures + renouvellement
→ composante incorporée / cycle de vie

somme partielle de postes documentés
→ ACV partielle

ACV complète
→ NA tant que les postes nécessaires ne sont pas attribuables
```

## Construction des indicateurs

### Indice d'utilité réelle

L'IUR — Indice d'Utilité Réelle — sert de cadre d'arbitrage entre l'impact terrain et le coût numérique.

Il ne doit pas être interprété comme un ratio physique direct entre des unités incompatibles. Par exemple, additionner des litres d'eau et des kilogrammes de CO₂e puis diviser une masse de déchets par cette somme n'aurait pas de signification scientifique sans normalisation explicite.

L'IUR doit donc être compris comme :

- un **tableau de décision multidimensionnel** ;
- ou un indice normalisé lorsque les règles de normalisation sont versionnées.

Son rôle est de répondre à une question simple : **une fonctionnalité augmente-t-elle suffisamment l'utilité réelle pour justifier son coût supplémentaire ?**

### Scénarios bas, central et haut

Les évaluations incertaines sont présentées selon trois scénarios.

| Scénario | Fonction |
| --- | --- |
| **Bas** | borne favorable mais encore plausible |
| **Central** | hypothèse de travail utilisée pour les comparaisons principales |
| **Haut** | stress test prudent, sans chercher un maximum physiquement absurde |

Une plage de scénarios n'est pas un intervalle statistique de confiance. Elle représente la sensibilité du résultat à des hypothèses structurantes.

## Données observées du dépôt

Le dépôt fournit une photographie technique du projet. Les métriques suivantes sont des **snapshots** et doivent être rafraîchies par l'outillage du dépôt lors de l'intégration ou avant publication du rapport.

| Métrique | Valeur du dernier snapshot fourni |
| --- | ---: |
| Fichiers source filtrés | 1 226 |
| Lignes source totales | 212 520 |
| TypeScript / React | 146 708 |
| SQL / Supabase | 2 189 |
| Python / scripts | 17 953 |
| Style / CSS | 1 383 |
| Autres | 44 287 |
| Commits depuis le début du projet | 202 |
| Insertions totales | 478 544 |
| Suppressions totales | 276 107 |

Ces nombres ne mesurent ni la qualité, ni la valeur produite, ni la consommation IA. Le churn inclut ajouts, suppressions, refactorisations, migrations, tests, documentation et code remplacé.

## Reconstruction de l'activité IA

### Compteurs Codex déclarés

Deux comptes Codex sont utilisés :

| Compte | Volume déclaré |
| --- | ---: |
| Compte principal | **35 milliards de tokens** |
| Compte secondaire | **15 milliards de tokens** |
| **Total déclaré** | **50 milliards de tokens** |

Ces volumes ne sont pas exclusivement liés à CleanMyMap.

### Attribution centrale à CleanMyMap

L'hypothèse retenue attribue **50 %** du volume Codex total au projet :

\[
50\ \text{Md} \times 50\% = 25\ \text{Md}
\]

Des essais temporaires ont aussi été réalisés avec d'autres plateformes — notamment Antigravity, Windsurf, Cursor et Claude Sonnet via AWS. Faute de compteurs homogènes, leur activité est représentée par une convention correspondant à **20 % du total Codex déclaré** :

\[
50\ \text{Md} \times 20\% = 10\ \text{Md de token\text{-}équivalents}
\]

Le scénario central d'activité devient donc :

\[
25\ \text{Md} + 10\ \text{Md}
=
35\ \text{Md de token\text{-}équivalents}
\]

Statut :

```text
AI_ACTIVITY_CENTRAL = 35 Md token-equivalents
EVIDENCE = DECLARED + ASSUMPTION
EXACT_TOTAL = NA
```

Le terme **token-équivalent** n'affirme pas que tous les fournisseurs utilisent la même unité physique ou le même coût d'inférence. Il sert uniquement à construire un scénario d'activité commun.

### Télémétrie locale partielle

Une reconstruction locale récente couvre environ **69,9 jours**, du 11 juillet au 18 septembre 2026. Sur cette fenêtre, 39 sessions uniques ont été identifiées ; 33 disposent de compteurs exploitables, soit une couverture métrique d'environ **84,62 %**.

Le total observé sur cette fenêtre, tous projets confondus, est d'environ **1,875 milliard de tokens**. Les entrées observées sont très majoritairement marquées comme mises en cache.

Cette télémétrie sert de **contrôle de cohérence**, pas de total historique. Elle ne doit ni être ajoutée aux 50 milliards déclarés ni être extrapolée mécaniquement aux mois absents.

## Hypothèse environnementale centrale

La Partie II-A retient désormais une chaîne de lecture volontairement arrondie :

> **35 Md token-équivalents → ≈ 10 MWh → ≈ 3,7 tCO₂e de composante électrique proxy → ≈ 45 m³ d'eau indirecte proxy → ≈ 5 tCO₂e en ACV partielle centrale de sensibilité.**

Ces valeurs n'ont pas toutes le même statut :

| Valeur | Statut |
| --- | --- |
| 35 Md token-équivalents | `DECLARED + ASSUMPTION` |
| ≈ 10 MWh | `PROXY` |
| ≈ 3,7 tCO₂e | `PROXY` |
| ≈ 45 m³ d'eau indirecte | `PROXY` |
| ≈ 5 tCO₂e ACV partielle | `ASSUMPTION + PROXY` |

Les calculs détaillés et les valeurs intermédiaires non arrondies sont conservés en Annexe B.

### Le facteur carbone n'est pas un facteur OpenAI mesuré

Le rapport utilise actuellement **0,35 kgCO₂e/kWh** comme proxy configurable pour une électricité associée à des serveurs majoritairement américains. Ce facteur est issu du cadre méthodologique interne CleanMyMap fondé sur des références EPA eGRID / EIA.

Il ne doit pas être décrit comme :

```text
facteur d'émission OpenAI
```

car OpenAI ne publie pas un facteur carbone moyen unique permettant d'attribuer chaque requête à un mix électrique précis.

La localisation et le contrat énergétique peuvent fortement modifier la composante carbone. À titre d'exemple, OpenAI indique que Stargate Norway doit fonctionner entièrement à partir d'électricité renouvelable. Ce cas montre qu'une infrastructure particulière peut avoir une composante électrique beaucoup moins carbonée ; il ne permet pas d'extrapoler ce facteur à l'ensemble des calculs OpenAI.

### Nucléaire et renouvelables

Le mix électrique modifie fortement le **carbone opérationnel**, mais pas le nombre de kWh consommés.

```text
10 MWh fossiles
≈ même énergie finale

10 MWh nucléaire / hydraulique / éolien / solaire
≈ même énergie finale

mais émissions opérationnelles très différentes
```

Le nucléaire fournit une production bas-carbone pilotable, tandis que l'éolien, le solaire et l'hydraulique peuvent également réduire fortement les émissions opérationnelles. Leur rôle dépend toutefois de la région, du réseau, du moment de consommation, des interconnexions, du stockage et des conventions contractuelles.

Aucune de ces sources ne supprime l'empreinte de fabrication des GPU, serveurs, réseaux et centres de données. Une baisse du Scope 2 ne doit donc pas être confondue avec une disparition de l'ACV.

## Principes de réduction

La stratégie de sobriété repose d'abord sur l'évitement du calcul inutile :

- utiliser le modèle le plus léger capable de réussir correctement la tâche ;
- réserver les modèles les plus coûteux aux problèmes réellement complexes ;
- découper les tâches en lots bornés ;
- éviter de relancer un audit sans nouveau signal ;
- limiter les agents parallèles ;
- réduire les contextes inutiles ;
- préférer SQL, règle déterministe, script classique ou validation humaine lorsqu'ils suffisent ;
- réutiliser un résultat déjà validé ;
- arrêter un chantier lorsque sa condition de clôture est atteinte ;
- éviter de déclencher builds ou déploiements inutiles pour une modification documentaire.

Le plan détaillé de réduction est traité en Partie IX.

## Incertitudes principales

Les incertitudes structurantes sont :

- attribution des deux comptes Codex entre CleanMyMap et les autres projets ;
- volume exact des usages Antigravity, Windsurf, Cursor et AWS / Claude ;
- part réelle de cache sur toute la période ;
- différences entre modèles et générations matérielles ;
- localisation des calculs ;
- facteurs carbone heure par heure ;
- consommation directe d'eau des data centers ;
- fabrication et renouvellement des accélérateurs ;
- consommation locale du poste de travail ;
- consommation des services Vercel, Supabase, GitHub Actions, Clerk et LWS ;
- impact exact des générations d'images ;
- effets de réseau, stockage et réplication.

Ces incertitudes sont traitées par scénarios et statuts de preuve, pas par une marge arbitraire unique du type « ± 50 % ».

## Risques de surestimation et de sous-estimation

### Surestimation possible

- compter deux fois une télémétrie déjà incluse dans un compteur de compte ;
- additionner estimation par temps et estimation par tokens ;
- appliquer à toutes les requêtes un facteur correspondant à un workload lourd ;
- inclure une part d'entraînement sans règle d'allocation ;
- additionner eau directe et eau indirecte lorsqu'une source les agrège déjà.

### Sous-estimation possible

- omettre le matériel ;
- ignorer les images ;
- ignorer les services cloud périphériques ;
- ne compter que l'inférence visible et pas les appels d'agents ou outils ;
- ignorer les contextes longs, les sorties et le raisonnement ;
- omettre les terminaux et le réseau ;
- considérer les données `NA` comme nulles.

## Contrôles futurs

Les contrôles prioritaires sont :

- journal mensuel des usages IA par compte et par projet ;
- attribution structurelle des sessions lorsqu'elle est démontrable sans lire le contenu sensible ;
- conservation des compteurs cumulés et de leur provenance ;
- métriques de déploiement et de CI ;
- métriques Vercel / Supabase / GitHub Actions lorsqu'elles sont disponibles ;
- stockage et transfert des photos ;
- inventaire des générations d'images ;
- mesure locale au wattmètre sur une période représentative si nécessaire ;
- suivi des impressions et déplacements lorsqu'ils deviennent non nuls ;
- versionnement des facteurs environnementaux.

## Statut du rapport

Le rapport est un document évolutif. Ses hypothèses centrales sont utilisables pour comparer des scénarios et guider des choix, mais elles ne constituent ni un audit fournisseur ni une ACV certifiée.

La règle de gouvernance est :

> **mesurer quand c'est possible, dériver lorsque la formule est explicite, déclarer les hypothèses, utiliser des proxys transparents et laisser `NA` ce qui ne peut pas être attribué proprement.**
