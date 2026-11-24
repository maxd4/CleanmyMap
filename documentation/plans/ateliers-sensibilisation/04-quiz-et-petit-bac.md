# Atelier 04 : Quiz numérique et Petit Bac du développement durable

> **Statut : `PLAN / À TESTER`, chantier mis en pause le 14 novembre 2026.** Atelier 04 du catalogue de 11 ateliers CleanMyMap et référence **A4** du budget prévisionnel Culture-ActionS. **Format de référence : 60 minutes**, avec 31 minutes de contenu numérique et deux manches de Petit Bac papier. Deux publics : **fin collège + lycée (4e à terminale)** et **grand public**. Les grilles comportent quatre manches pour permettre des séances prolongées. Aucune séance pilote n'est encore documentée. Aucun développement du nouveau Mode Ateliers n'est considéré comme livré dans cette fiche.

## 0. Passation et reprise rapide

### Décisions acquises

- Renommer à terme le **Mode École** en **Mode Ateliers**. Il doit accueillir les **11 ateliers** de sensibilisation, dont quatre nécessitant un parcours numérique spécifique. Préserver les routes et les contrats du quiz déjà existants.
- Pour l'atelier 04, choisir **deux profils pédagogiques uniquement** : `fin-college-lycee` (4e à terminale) et `grand-public`. Le **primaire, la 6e et la 5e** utiliseront les jeux de cartes de l'atelier 02 ; ne pas les intégrer à ce parcours de Petit Bac.
- Le Mode Ateliers devra couvrir **tous les supports numériques** de cette activité : introduction, premier quiz, capsules pédagogiques, second quiz, transition/consignes et bilan. **Le Petit Bac lui-même reste sur papier**, sans saisie ou arbitrage automatisé.
- Employer **8 catégories larges**, non 10 catégories scientifiques spécialisées. La rigueur scientifique est apportée par les quiz, les capsules et le bonus de définition pendant la correction.
- Les lettres autorisées sont au nombre de **19**, hors `J, K, Q, W, X, Y, Z`. Chaque manche dure **3 minutes de recherche maximum**, avec des cases vides autorisées.
- Le barème est **2/1/0**, avec **+1 par définition technique précise**, plafonné à **2 bonus par équipe et par manche** : **18 points maximum par manche**.
- Les feuilles de jeu Google Slides sont **fusionnées en une présentation de 2 diapositives**, une par public, contenant chacune **4 lignes de manche**. Dans la séance de 60 minutes, seules **2 manches** sont jouées.
- Une **banque Google Slides de 41 diapositives** a été créée pour sélectionner ultérieurement les mini-présentations et construire les questions exactes. Elle ne doit pas être projetée intégralement.

### Travail en attente, dans l'ordre

1. Relire le dernier `main`, les contrats et tests concernés, puis intégrer le **lot A Codex** : Mode Ateliers et catalogue des 11 ateliers.
2. Intégrer le **lot B Codex** pour le parcours Quiz + Petit Bac, en **incorporant dès le départ** les décisions du prompt complémentaire sur les **deux profils**. L'ancien lot B, qui évoquait trois profils, est désormais **obsolète sur ce point**.
3. Intégrer le **prompt complémentaire d'impression des grilles**, en utilisant la **nouvelle présentation fusionnée** et les **8 catégories / 4 manches**, et non les anciennes présentations archivées.
4. Choisir les **5 capsules** à projeter dans les 10 minutes pédagogiques ; définir **5 questions du quiz initial** et **5 questions de consolidation** par profil, avec sources et corrections.
5. Tester l'impression en paysage, puis réaliser une séance pilote pour vérifier le temps de correction, l'équité du barème et la compréhension des notions. Mettre les statuts documentaires à jour après vérification réelle.

**Condition d'arrêt du présent chantier :** fiche de passation et fichiers Drive disponibles ; prompts **en attente**, aucune intégration GitHub ou séance pilote revendiquée. Ne pas relancer un nouveau chantier tant qu'une reprise n'a pas été demandée.

## 1. Emplacement et fichiers de référence Google Drive

**Dossier unique :** cleanmymap / ateliers / quiz+petit-bac.

| Ressource | Lien et rôle | État documentaire au 14/11/2026 |
| --- | --- | --- |
| **Feuilles de jeu officielles** | Google Slides : 2 diapositives, deux publics | **Créé** : huit colonnes, quatre manches, score /72, mise en page modifiée. Impression physique A4 paysage encore à valider. |
| **Guide animateur et corrigé** | Google Doc : règles, déroulé, lexique de 25 définitions | **Mis à jour** : deux publics, 8 catégories, formats 60/75/90 min, points et définitions. |
| **Banque de mini-présentations** | Google Slides : 41 diapositives | **Créé** : 3 diapositives introductives + 38 fiches de notions avec exemple, confusion, question possible et source. **Sélection pédagogique à faire**. |
| **Anciennes grilles** | Dossier d'archives | **LEGACY** : anciennes versions à 10 catégories et 2 manches, non utilisables comme référence courante. |
| **Synthèse des 11 ateliers** | Google Doc : catalogue des ateliers | **Mise à jour** : le descriptif de l'atelier 04 reflète les nouvelles règles. |

**Source de vérité des supports papier :** la présentation **fusionnée** ci-dessus et le guide animateur. Le présent fichier est la **fiche de conception / reprise du développement**. Ne pas recréer de troisième jeu de grilles ni dupliquer systématiquement les 41 diapositives dans le dépôt.

## 2. Principe, publics et objectifs pédagogiques

L'atelier combine :

1. **Préparation et bilan numériques**, pilotés collectivement par l'animateur depuis le futur **Mode Ateliers** : quiz initial, mini-présentations, quiz de consolidation et conclusion.
2. **Petit Bac papier par équipes** : recherche de mots à initiale imposée, discussion des réponses, explications scientifiques et points bonus pour les définitions justes.

| Public | Activité retenue | Profil numérique de l'atelier 04 |
| --- | --- | --- |
| Primaire, 6e et 5e | Atelier 02 : jeux de cartes environnementaux et biodiversité ; Petit Bac des déchets éventuellement en ressource secondaire | **Aucun** |
| 4e, 3e et lycée | Petit Bac du développement durable, version fin collège + lycée | `fin-college-lycee` |
| Grand public | Petit Bac du développement durable, version concrète et accessible | `grand-public` |

Les deux profils traitent les mêmes grands enjeux, avec une **difficulté de formulation et des exemples différents**. Pour les lycéens, l'animateur peut approfondir oralement les définitions sans créer une troisième grille. Il ne s'agit ni d'un examen certificatif ni d'une mesure démontrant une modification des comportements écologiques.

### Pertinence pendant le temps scolaire

La ressource institutionnelle [Éduscol, « Éducation au développement durable et à la transition écologique »](https://sti.eduscol.education.fr/ressources_pedagogiques/education-au-developpement-durable-et-la-transition-ecologique) donne des repères pour l'éducation au développement durable. L'atelier peut mobiliser sciences, vocabulaire, géographie et argumentation, sous réserve de choisir des exemples adaptés au niveau et aux objectifs de l'enseignant. **Cette référence justifie la pertinence pédagogique potentielle, pas une homologation ou validation officielle du jeu.**

## 3. Contrat du Petit Bac papier

### Les huit colonnes par profil

Les intitulés ci-dessous reprennent la présentation Google Slides officielle. **Une ligne permet une réponse par colonne et par manche.**

| N° | Fin collège + lycée | Grand public |
| --- | --- | --- |
| 1 | Déchet ou matériau | Déchet ou objet |
| 2 | Faune ou flore | Animal ou plante |
| 3 | Ressource ou énergie | Ressource ou énergie |
| 4 | Transport ou technologie | Transport ou appareil |
| 5 | Pollution ou GES | Pollution ou problème |
| 6 | Météo ou risque naturel | Phénomène ou météo |
| 7 | Action écologique | Geste ou solution |
| 8 | Notion ou organisme | Mot d'écologie ou climat |

Les colonnes sont **volontairement ouvertes**. Les GES, COP, limites planétaires, accords, risques ou processus climatiques peuvent apparaître spontanément comme réponses, sans constituer chacun une colonne difficile à remplir. L'animateur exige une correspondance réelle avec l'intitulé, pas une association artificielle.

**Exemples pour la lettre C :**

| Colonne | Fin collège + lycée | Grand public |
| --- | --- | --- |
| 1 | Carton | Canette |
| 2 | Coccinelle | Coccinelle |
| 3 | Charbon | Charbon |
| 4 | Camion | Camion |
| 5 | CO₂ | Contamination |
| 6 | Cyclone | Canicule |
| 7 | Compostage | Covoiturage |
| 8 | Cycle du carbone | Climat |

Il s'agit **d'exemples**, pas d'une liste de réponses autorisées. Le guide animateur reste l'appui pour les définitions scientifiques et les litiges.

### Lettres, temps et arbitrage

- **19 lettres autorisées** : `A, B, C, D, E, F, G, H, I, L, M, N, O, P, R, S, T, U, V`.
- **7 lettres exclues** : `J, K, Q, W, X, Y, Z`.
- Une lettre différente à chaque manche. **3 minutes fixes de recherche**, sans arrêt anticipé par une équipe. Les colonnes non remplies sont acceptées et ne bloquent pas la manche.
- Au plus un mot ou groupe nominal par colonne et par manche, **sans répéter exactement le même mot dans plusieurs colonnes d'une manche**. Noms propres, acronymes et formules établies recevables si exacts ; `CO₂` et `COP` comptent à **C**, « méthane » à **M**. Articles initiaux et accents ignorés pour l'initiale.
- L'animateur vérifie la catégorie et le sens. Réponses synonymes ou manifestement équivalentes dans une même catégorie : considérer comme **partagées**. Toute contestation incertaine est signalée comme **à vérifier**, sans validation inventée.
- Adapter les consignes et l'écriture aux besoins d'accessibilité, sans imposer un score individuel ni une prise de parole à chaque élève.

### Points et bonus

| Situation | Points |
| --- | ---: |
| Réponse valide et unique dans la colonne | **2** |
| Réponse valide partagée ou équivalente à celle d'une autre équipe | **1** |
| Réponse absente, incorrecte ou hors catégorie | **0** |
| Définition scientifique précise d'un terme valide | **+1**, au plus **2 bonus par équipe et par manche** |

Pour un bonus : le porte-parole doit dire **ce que désigne le terme** et donner **un mécanisme, une propriété essentielle ou une distinction correcte**, dans une formulation scientifiquement juste. Le bonus est indépendant de l'unicité du mot. Faire tourner les porte-parole et ne pas attribuer automatiquement les bonus.

**Maximum :** 8 réponses uniques × 2 + 2 bonus = **18 points par manche**. Deux manches : **36** ; trois : **54** ; quatre : **72**. Dans une séance de 60 minutes, inscrire les scores sur les **deux premières lignes** de la feuille ; les deux autres restent vides.

## 4. Déroulé détaillé de référence : 60 minutes

**Hypothèse d'organisation :** groupe d'environ 24 à 30 participants, quatre équipes de 6 à 8, un animateur avec ordinateur et vidéoprojecteur. L'enseignant reste responsable du groupe scolaire. Les durées n'ont pas été validées en situation réelle.

| Horaires | Durée | Étape | Actions de l'animateur et supports |
| --- | ---: | --- | --- |
| 00:00 à 00:03 | 3 min | Introduction numérique | Présenter objectifs, règles de participation et enjeux EDD ; choisir le profil numérique approprié. |
| 00:03 à 00:10 | 7 min | Quiz initial | **5 questions**, réponses collectives, révélation et explication courte ; relever les confusions à corriger. |
| 00:10 à 00:20 | 10 min | Capsules pédagogiques | **5 notions environ, 2 min chacune**, sélectionnées dans la banque de 41 diapositives. Chaque capsule explique un mécanisme, donne un exemple et corrige une idée fausse. |
| 00:20 à 00:27 | 7 min | Quiz de consolidation | **5 questions d'application**, distinctes des questions initiales ; corrections justifiées. |
| 00:27 à 00:32 | 5 min | Transition vers les grilles | Distribuer les feuilles, constituer ou stabiliser les équipes, rappeler les catégories, lettres, points et bonus ; mini-manche d'essai non notée. |
| 00:32 à 00:44 | 12 min | Petit Bac, manche 1 | **3 min** de recherche, **8 min** de correction orale et bonus, **1 min** de score. |
| 00:44 à 00:56 | 12 min | Petit Bac, manche 2 | Nouvelle lettre ; même progression **3 + 8 + 1 min** ; changer les porte-parole. |
| 00:56 à 01:00 | 4 min | Bilan numérique | Deux notions retenues, une confusion rectifiée, une piste d'action locale ou question à poursuivre. |
| **Total** | **60 min** | | **31 min de supports numériques et 29 min de transition/jeu papier.** |

**Risque principal du pilote :** 8 catégories × 4 équipes = jusqu'à 32 propositions par manche ; **8 minutes de correction** peuvent être insuffisantes si plusieurs réponses exigent un arbitrage. Tester le minutage, prioriser les termes litigieux et conserver la rigueur des définitions.

### Séances plus longues sans nouvelle grille

- **75 min :** ajouter une troisième manche de 12 min et 3 min de discussion ; 54 points maximum.
- **90 min :** ajouter une troisième et une quatrième manche (24 min) et 6 min de discussion/pauses ; 72 points maximum.

Les quatre bandes horizontales des feuilles servent à **quatre manches différentes**, une réponse par colonne dans chaque bande, et non à remplir quatre mots par colonne au cours d'une manche unique.

## 5. Parcours numérique cible et banque de notions

### Ce que devra gérer le Mode Ateliers

- Entrée de l'atelier 04 depuis le catalogue des 11 ateliers.
- Deux profils au choix, sans compte élève ni collecte nominative.
- Écrans projetables d'introduction (3 min), quiz initial (7 min), capsules pédagogiques (10 min), quiz de consolidation (7 min), pause pour jeu physique, puis bilan (4 min).
- Progression **pilotée par l'animateur**, non un déroulement automatique forcé par une minuterie.
- Corrections et justifications scientifiquement sourcées ; réutilisation du moteur et des composants quiz existants. Exclusion des contenus marqués `needsReview`.
- Accès aux **feuilles imprimables officielles** par profil et au guide animateur, sans lien privé exposé comme téléchargement public.
- **Aucune** saisie des mots, validation automatique des réponses, gestion des équipes, scores ou classements numériques du Petit Bac.

### Banque de mini-présentations créée

La banque de 41 diapositives contient **3 pages d'introduction** et **38 fiches de notions**. Thèmes : développement durable et ODD ; météo, climat, effet de serre, CO₂, CH₄, N₂O, CO₂e et cycle du carbone ; énergie, sobriété, matériaux, prévention des déchets, réemploi et recyclage ; biodiversité, écosystèmes, alimentation, sols et eau ; limites planétaires et système Terre ; aléas, vulnérabilité, adaptation, atténuation et résilience ; GIEC, COP, CCNUCC, Accord de Paris ; engagement local et CleanMyMap.

**À décider à la reprise :** cinq diapositives adaptées à chaque profil et à la progression de la séance, puis cinq questions diagnostiques et cinq questions d'application par profil. La banque comporte des **idées de questions**, pas une banque de quiz déjà validée et codée. Pour les 4e, éviter les mécanismes trop techniques ; au lycée, proposer des approfondissements oraux. Aucun chiffre, protocole scientifique ou effet environnemental ne doit être présenté comme démontré sans source.

## 6. Mode Ateliers : état du dépôt et prompts Codex en attente

### Vérification du `main` au 14 novembre 2026

Dépôt : [`maxd4/CleanmyMap`](https://github.com/maxd4/CleanmyMap), branche `main`, commit vérifié lors de cette passation : **`40869e55a6297bf3fcff44c3f0a66b0011c27945`**. **Ce SHA est seulement une photographie de vérification, pas un point de départ imposé à Codex.** Lors de la reprise, relire impérativement le nouveau `main`, ses consommateurs, tests et documents de gouvernance.

**Observé sur ce commit :**

- La route `apps/web/src/app/learn/ecole/page.tsx` affiche encore « **Mode École - Kit d'atelier** », avec `/learn/ecole`.
- `apps/web/src/lib/learning/quiz/school/quiz-school-types.ts` limite le contrat scolaire aux niveaux `6e`, `5e`, `4e`, `3e` et aux formats `quiz-30` / `atelier-60`.
- Les chemins `apps/web/src/app/learn/ateliers/page.tsx` et `apps/web/src/lib/learning/workshops/workshop-catalog.ts` étaient **absents** lors de la vérification.
- Le fichier versionné `documentation/plans/ateliers-sensibilisation/04-quiz-et-petit-bac.md` reste sur une ancienne proposition ; **la présente pièce jointe est sa version candidate à intégrer**. Ne pas affirmer qu'elle est déjà publiée sur GitHub.

**Conséquence :** **le lot A et le lot B ne sont pas démontrés exécutés sur `main`**. La conversation précédente avait formulé l'hypothèse de leur réalisation pour avancer dans la conception des supports. Cette hypothèse ne constitue pas une preuve de livraison. Les résultats de tests Web, de déploiement et de production du nouveau Mode Ateliers sont **non prouvés**.

### Prompts Codex déjà rédigés, encore en attente d'exécution

Les prompts se trouvent dans la conversation de préparation. Les descriptions ci-dessous servent d'**index de passation**, et non de nouveaux prompts ou d'instructions à exécuter sans relire le dépôt.

| Ordre | Prompt existant | Contenu et condition d'arrêt | État |
| --- | --- | --- | --- |
| **A** | **Lot A : transformer le Mode École en Mode Ateliers** | Catalogue des **11 ateliers**, route `/learn/ateliers`, registre typé et quatre parcours numériques `PLAN` : `pollution-megots` (10 min), `quiz-petit-bac` (31 min), `compostage` (14 min), `metiers-proprete` (14 min). Préserver `/learn/ecole`, `mode=ecole`, `quiz-30`, `atelier-60`, navigation, tests et documentation. Ne pas rendre accessibles des parcours vides. | **EN ATTENTE** |
| **B** | **Lot B : développer le parcours Quiz + Petit Bac** | Route `/learn/ateliers/quiz-petit-bac`, quiz, capsules, corrections et bilan collectif. Réutiliser le moteur quiz, sans numériser le Petit Bac papier ni stocker de données nominatives. **Adapter le prompt avant exécution** : il décrivait **trois profils**, remplacés depuis par **deux**. | **EN ATTENTE, PARTIELLEMENT OBSOLÈTE** |
| **C** | **Prompt complémentaire : finaliser les deux profils pédagogiques** | Retenir `grand-public` et `fin-college-lycee` ; couvrir les 31 min numériques, **5 + 5 questions**, cinq capsules sourcées, tests de difficulté, éligibilité et parcours. **Intégrer idéalement ces décisions au lot B s'il n'a pas commencé**, sans créer un lot redondant. | **EN ATTENTE** |
| **D** | **Prompt complémentaire : intégration des grilles imprimables** | Distribution des grilles par profil depuis le parcours, accessibilité et contrôles d'impression. **Mettre à jour les liens du prompt** : anciennes présentations individuelles archivées, remplacées par la **présentation fusionnée** à deux diapositives, **8 catégories / 4 manches / 18 points**. Ne jamais publier une URL Drive privée comme ressource publique garantie. | **EN ATTENTE, LIENS OBSOLÈTES** |

**Ordre de reprise recommandé :** **A**, puis **B et C ensemble** si le chantier B est encore vierge, puis **D** après stabilisation des interfaces et des supports. ChatGPT peut intégrer directement les changements de code, de tests et de documentation, les valider avec les outils disponibles et les publier selon `CHATGPT.md` et `AGENTS.md`. Codex complète les contrôles qui nécessitent le checkout ou un runtime local.

**Frontière de responsabilités :** ChatGPT décide et peut aussi implémenter les contrats, catégories, notions, arbitrages et critères d'acceptation ; ChatGPT ou Codex adapte les consommateurs, écrit et exécute les tests et publie selon les règles du dépôt. Le Google Drive est une ressource de préparation éditoriale ; le code GitHub réellement publié demeure autorité pour les fonctionnalités `CURRENT`.

### Dépendances et critères de validation après intégration

- Le Mode Ateliers liste les 11 ateliers, conserve les accès historiques et n'affiche comme jouables que les parcours effectivement implémentés.
- Le parcours 04 propose **deux** profils, non trois ; il couvre tous les segments numériques de 31 min et permet la pause pour le Petit Bac physique.
- Les notions et questions ont été relues, sourcées et testées ; aucune question `needsReview` n'est publiée.
- Les grilles téléchargeables reflètent **exactement** les huit colonnes actuelles, quatre lignes de manche, 19 lettres et barème **/18** ; impression paysage vérifiée.
- Les tests comportementaux, contrôles de compatibilité, vérification UI et couverture du Web sont exécutés et rapportés par ChatGPT ou Codex selon l'environnement de validation disponible. Après publication, relecture du **nouveau `main`** avant de changer les statuts `PLAN` en `CURRENT`.

## 7. Matériel, risques et séance pilote

- Ordinateur de l'animateur, vidéoprojecteur, connexion fiable, accès au futur parcours numérique ou solution de report du segment indisponible. Le quiz demeure **numérique**, conformément au format retenu.
- Feuille de la version concernée imprimée par équipe, stylos, tableau des points, chronomètre, guide animateur et lettres autorisées. Tester la lisibilité en **A4 paysage** ; agrandir en **A3** si nécessaire.
- Garder une répartition de parole équitable, des explications adaptées au groupe et une correction humaine. Préparer un corrigé ouvert ; les 25 définitions du guide ne prétendent pas épuiser les réponses possibles.
- Respecter l'enseignant responsable en temps scolaire, le droit à l'image et la confidentialité ; ne collecter ni noms d'élèves ni résultats individuels.
- Ne pas fabriquer de chiffres d'impact, de réductions d'émissions, de résultats de tests ou de validation institutionnelle. Les points du jeu ne prouvent pas une amélioration comportementale.
- **Avant diffusion récurrente**, effectuer un pilote des deux publics, recueillir les mots discutés, mesurer le temps réel d'arbitrage, tester différentes lettres parmi les 19 permises et vérifier la lisibilité des impressions.

**Conditions de report :** absence de responsable pédagogique, défaillance du parcours numérique sans solution adaptée, ou impossibilité de départager correctement des notions déterminantes. Ne pas présenter un quiz papier improvisé comme l'équivalent du parcours numérique prévu.

## 8. Sources, financement et droits

### Références pédagogiques et scientifiques

- [Éduscol STI, Éducation au développement durable et à la transition écologique](https://sti.eduscol.education.fr/ressources_pedagogiques/education-au-developpement-durable-et-la-transition-ecologique) : justification pédagogique d'une activité EDD en temps scolaire, **sans validation officielle de l'atelier spécifique**.
- [Éduscol, L'EDD dans le cadre des enseignements](https://eduscol.education.gouv.fr/6030/l-education-au-developpement-durable-dans-le-cadre-des-enseignements) : repères complémentaires.
- [GIEC, Rapport de synthèse du sixième cycle d'évaluation](https://www.ipcc.ch/report/ar6/syr/) et [glossaire GIEC](https://www.ipcc.ch/report/ar6/wg2/chapter/annex-ii/) : climat, risques, GES, adaptation et atténuation.
- [Stockholm Resilience Centre, limites planétaires](https://www.stockholmresilience.org/research/planetary-boundaries.html) : cadre et processus du système Terre.
- [CCNUCC, Accord de Paris](https://unfccc.int/process-and-meetings/the-paris-agreement) et [ADEME, économie circulaire](https://www.ademe.fr/les-defis-de-la-transition/economie-circulaire/) : gouvernance, prévention et ressources.
- [Parc amazonien de Guyane, Le Petit Bac des déchets](https://parc-amazonien-guyane.fr/fr/des-actions/education-lenvironnement/ressources-pedagogiques/le-classeur-danimations) : **ressource secondaire** pour les plus jeunes et le début du collège.

### Provenance et budget

- Candidature Culture-ActionS : atelier 04.
- Budget Culture-ActionS, ligne A4, **prévisionnel** : ne prouve aucun financement acquis.
- Catalogue général des 11 ateliers.

Les sources tierces servent de références pour les faits et l'animation, pas de licence implicite pour redistribuer leurs documents. **Vérifier les droits d'usage avant intégration au dépôt ou diffusion publique**, notamment pour les supports ADEME ou Parc amazonien de Guyane.
