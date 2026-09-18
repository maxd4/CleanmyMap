# Partie IX — Plan de réduction des impacts {#partie-ix-plan-de-reduction-des-impacts}

## Actions complémentaires hors site

Cette section examine les impacts identifiés dans les parties III à V qui ne peuvent probablement pas être traités par la seule optimisation technique du site.
Elle vise à proposer des réponses complémentaires réalistes, mesurables et cohérentes avec CleanMyMap, sans prétendre à une neutralisation totale.

### Impacts impossibles à résoudre uniquement via le site

Plusieurs impacts restent hors de portée d'une simple amélioration technique du code ou de l'hébergement.

| Impact                                                        | Pourquoi le site seul ne suffit pas                                                                                         | Statut                                        |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Électricité consommée pendant le développement IA             | Les requêtes passées, les compilations, les sessions agentiques et les essais-erreurs sont déjà consommés.                  | Non compensé rétroactivement                  |
| Fabrication des serveurs, GPU, terminaux et réseau            | La sobriété logicielle réduit l'usage, mais ne supprime pas l'extraction de matériaux ni la fabrication du matériel.        | Difficilement compensable                     |
| Eau directe et indirecte des data centers                     | Le projet ne contrôle pas les régions de calcul, les technologies de refroidissement ni le mix électrique des fournisseurs. | Difficilement compensable                     |
| Dépendance aux plateformes privées                            | Vercel, Supabase, Clerk, Stripe, OpenAI, Google ou Anthropic restent des infrastructures externes.                          | Aggravé par l'existence du projet web         |
| Travail invisible d'annotation, d'évaluation et de modération | Le projet bénéficie de modèles entraînés et évalués par des chaînes de travail externes.                                    | Créé indirectement par l'usage IA             |
| Fracture numérique                                            | Une plateforme web peut exclure des bénévoles sans smartphone, sans aisance numérique ou avec faible connexion.             | Aggravé par le choix d'un outil numérique     |
| Effets rebond de déplacement                                  | Le site peut faciliter des actions éloignées, donc provoquer des trajets carbonés supplémentaires.                          | Créé ou aggravé par la coordination en ligne  |
| Infobésité et stockage photo                                  | Même avec compression, les usages peuvent produire beaucoup d'images et de données conservées.                              | Aggravé par l'usage réel                      |
| Dette technique liée à l'IA                                   | Les optimisations CI aident, mais la dette se traite aussi par culture de maintenance et revue humaine.                     | Aggravé par la vitesse de génération          |
| Risque de substitution politique                              | Le nettoyage citoyen peut masquer la responsabilité des collectivités, industriels ou producteurs de déchets.               | Difficilement compensable par le produit seul |

Ces impacts ne doivent pas être décrits comme "annulés" par les cleanwalks.
Une cleanwalk retire des déchets et produit une valeur locale réelle, mais elle ne rembourse pas directement l'électricité consommée, l'eau utilisée, le matériel fabriqué ou le travail invisible mobilisé par les chaînes d'IA.

### Réduction de l'empreinte Vercel par localisation d'exécution

La configuration actuelle du projet distingue deux plans qu'il ne faut pas confondre. Le message de build `Running build in Washington, D.C., USA (East) – iad1` renvoie à la phase de compilation et de packaging de Vercel, alors que la région `cdg1` déclarée dans `apps/web/vercel.json` pilote l'exécution des fonctions lors des requêtes. Le build reste ponctuel et attaché aux déploiements, tandis que le runtime est récurrent et pèse davantage sur l'empreinte d'usage.

Dans un plan de réduction de l'impact, le levier le plus pertinent n'est donc pas le seul choix du build, mais la localisation du runtime et des données. À périmètre comparable, le passage d'un runtime de type US-East, pris ici comme ordre de grandeur de travail à **400 à 500 gCO₂e/kWh**, à l'intensité moyenne de la production électrique française en 2024, soit **21,7 gCO₂eq/kWh**, réduit la composante carbone électrique d'environ **94,6 à 95,7 %** [@rte_annual_review_2024_keyfindings].

L'impact total de Vercel ne baisse cependant pas dans la même proportion, car d'autres postes subsistent : aperçus de déploiement, CDN, journaux, stockage, transferts réseau et éventuels services périphériques. Sans télémétrie précise, il n'est pas possible d'assigner un pourcentage global exact au service Vercel dans le projet. Une lecture de sensibilité raisonnable est la suivante :

| Part du runtime dans le coût opérationnel Vercel | Réduction totale estimée si le runtime passe à `cdg1` |
| ------------------------------------------------ | ----------------------------------------------------- |
| 30 %                                             | environ 28 à 29 %                                     |
| 50 %                                             | environ 47 à 48 %                                     |
| 70 %                                             | environ 66 à 67 %                                     |

Cette mesure ne supprime donc pas le coût du service, mais elle réduit fortement son poste le plus récurrent. Elle est cohérente avec la stratégie générale du projet : rapprocher l'exécution des usages réels, limiter les transferts inutiles et réduire l'empreinte des fonctions qui tournent le plus souvent.

### Actions complémentaires proposées

| Action                                          | Type principal                            | Impacts ciblés                                           | Impact potentiel    | Temps                | Coût financier | Réalisme      |
| ----------------------------------------------- | ----------------------------------------- | -------------------------------------------------------- | ------------------- | -------------------- | -------------- | ------------- |
| Journal public d'usage IA et sobriété numérique | Sensibilisation + amélioration systémique | Opacité IA, dette technique, crédibilité                 | Moyen à élevé       | 2 h/mois             | 0 €            | Très élevé    |
| Audit trimestriel de sobriété numérique         | Réduction réelle                          | Poids pages, stockage, mesure d'audience, compilations   | Élevé si suivi      | 4 à 8 h/trimestre    | 0 à 200 €      | Élevé         |
| Contribution source ouverte ciblée              | Amélioration systémique                   | Dette commune, dépendance aux outils propriétaires       | Moyen               | 2 à 6 h/mois         | 0 €            | Élevé         |
| Documentation éducative libre                   | Sensibilisation + systémique              | Fracture numérique, opacité IA, bonnes pratiques         | Moyen               | 4 à 12 h initiales   | 0 €            | Élevé         |
| Ateliers locaux avec associations               | Sensibilisation + réduction indirecte     | Fracture numérique, adoption sobre, actions locales      | Élevé localement    | 3 à 6 h/atelier      | 0 à 100 €      | Moyen à élevé |
| Mentorat numérique responsable                  | Amélioration systémique                   | Exclusion numérique, dépendance IA, qualité des projets  | Moyen               | 2 h/mois             | 0 €            | Élevé         |
| Programme "appareils prolongés"                 | Réduction réelle                          | ACV terminaux, déchets électroniques, fracture numérique | Élevé si suivi      | 1 journée/trimestre  | 0 à 300 €      | Moyen         |
| Partenariat recyclage/réemploi matériel         | Réduction + compensation partielle        | Déchets électroniques, extraction matérielle             | Moyen               | 4 h mise en place    | Variable       | Moyen         |
| Règle volontaire de réduction IA                | Réduction réelle                          | Consommation IA, dépendance, dette technique             | Élevé sur le projet | 1 h/semaine de suivi | 0 €            | Très élevé    |
| Soutien à communs numériques sobres             | Compensation + systémique                 | Dépendance plateformes, outils libres                    | Moyen               | 1 h/mois             | 5 à 50 €/mois  | Élevé         |
| Actions locales de dépollution mesurées         | Compensation qualitative                  | Pollution locale, mobilisation, données terrain          | Élevé localement    | 2 à 4 h/action       | 0 à 50 €       | Élevé         |
| Plaidoyer local et rapports aux collectivités   | Amélioration systémique                   | Substitution politique, prévention déchets               | Élevé si repris     | 2 à 6 h/rapport      | 0 €            | Moyen         |
| Charte de données et IA responsable             | Réduction + gouvernance                   | Confidentialité, usage IA, dépendance                    | Moyen               | 4 h initiales        | 0 €            | Très élevé    |
| Mutualisation d'hébergement ou ressources       | Réduction + systémique                    | Infrastructure, coûts, dépendance                        | Faible à moyen      | 4 à 12 h d'étude     | Variable       | Moyen         |

### Analyse détaillée de chaque action

La lecture détaillée qui suit n'a pas pour objectif de hiérarchiser moralement les initiatives, mais d'évaluer leur rapport entre effort, effet réel, coût de mise en œuvre et contribution à la sobriété ou à l'utilité du projet. Certaines actions sont faciles à lancer mais peu structurantes ; d'autres demandent davantage de suivi, mais peuvent produire une réduction plus durable des coûts numériques ou une amélioration plus nette de la gouvernance.

Cette analyse doit donc être lue comme une grille de décision opérationnelle. Une action n'est pertinente que si elle s'inscrit dans une logique mesurable, qu'elle évite de rajouter une couche de complexité inutile et qu'elle reste compatible avec la capacité réelle de CleanMyMap à la maintenir dans le temps.

### Journal public d'usage IA et sobriété numérique

Mécanisme : publier une page ou un fichier trimestriel indiquant les usages IA approximatifs, les modèles utilisés, les tâches concernées, les règles de limitation, les incidents évités et les optimisations réalisées.
Le journal doit distinguer les mesures réelles des estimations.

Impacts ciblés : opacité de l'IA, dette technique, confiance, risque de discours marketing.

Type d'effet : sensibilisation et amélioration systémique.
Réduction réelle seulement si le journal déclenche des décisions de limitation.

Impact potentiel : moyen à élevé, car il crée une discipline de mesure et rend les arbitrages visibles.

Temps : 2 h/mois après une mise en place initiale de 3 à 4 h.

Coût financier : 0 €.

Réalisme : très élevé.

Limites : ne réduit rien automatiquement.
Le risque est de produire une page de transparence qui n'influence pas les décisions.

### Audit trimestriel de sobriété numérique

Mécanisme : mesurer régulièrement le poids des pages, le nombre de scripts tiers, le volume d'images, les appels API, les événements mesure d'audience, les erreurs Sentry, les compilations et le stockage Supabase.
À chaque audit, fixer 3 corrections maximum avec objectif mesurable.

Impacts ciblés : surconsommation numérique, stockage photo, mesure d'audience, dette technique, compilations répétés.

Type d'effet : réduction réelle.

Impact potentiel : élevé si les corrections sont appliquées.
Exemples de cibles : -30 % de poids JS sur une page critique, -50 % de taille moyenne des images, suppression d'un script tiers inutile, réduction du échantillonnage.

Temps : 4 à 8 h/trimestre.

Coût financier : 0 à 200 € si un audit externe ponctuel est demandé.

Réalisme : élevé.

Limites : nécessite une discipline continue.
L'impact devient faible si l'audit reste documentaire.

### Contribution source ouverte ciblée

Mécanisme : contribuer à des outils utilisés par le projet ou par des associations : corrections de documentation, issues reproductibles, petits patchs, exemples d'intégration, traductions françaises, guides d'accessibilité ou scripts de compression.

Impacts ciblés : dette commune, dépendance aux plateformes fermées, qualité des outils libres, montée en compétence.

Type d'effet : amélioration systémique.

Impact potentiel : moyen.
Une petite contribution peut bénéficier à plusieurs projets, mais l'effet environnemental direct est difficile à quantifier.

Temps : 2 à 6 h/mois.

Coût financier : 0 €.

Réalisme : élevé si les contributions restent petites et ciblées.

Limites : effet indirect ; ne compense pas les impacts matériels passés.

### Documentation éducative libre

Mécanisme : publier des fiches courtes et réutilisables : "organiser une cleanwalk sobre", "réduire les photos inutiles", "utiliser l'IA sans données sensibles", "comprendre l'impact numérique d'un site associatif", "choisir des outils accessibles".

Impacts ciblés : fracture numérique, opacité IA, mauvaises pratiques de collecte de données, dépendance aux outils.

Type d'effet : sensibilisation et amélioration systémique.

Impact potentiel : moyen, plus élevé si les fiches sont reprises par des associations ou ateliers.

Temps : 4 à 12 h initiales, puis 1 h/mois de mise à jour.

Coût financier : 0 €.

Réalisme : élevé.

Limites : la documentation seule ne change pas toujours les pratiques.
Elle doit être reliée à des ateliers ou à des checklists concrètes.

### Ateliers locaux avec associations

Mécanisme : organiser des sessions courtes avec une association, une école, une maison de quartier ou un collectif : signaler une pollution, organiser une action locale, réduire les déplacements, compresser les photos, utiliser les données sans exclure les personnes non connectées.

Impacts ciblés : fracture numérique, effets rebond, actions locales, inclusion des bénévoles moins technophiles.

Type d'effet : sensibilisation, amélioration systémique et réduction indirecte.

Impact potentiel : élevé localement si l'atelier produit des actions de terrain mieux organisées.

Temps : 3 à 6 h par atelier, préparation incluse.

Coût financier : 0 à 100 € selon salle, impression ou matériel.

Réalisme : moyen à élevé.

Limites : dépend de la mobilisation locale.
Un atelier isolé a peu d'effet s'il n'est pas relié à une action concrète.

### Mentorat numérique responsable

Mécanisme : aider bénévolement une petite association ou un porteur de projet à mettre en place une présence numérique sobre : choix d'outils simples, accessibilité, sécurité de base, limitation des données collectées, réduction de dépendance aux plateformes.

Impacts ciblés : fracture numérique, dépendance technique, sécurité, surconsommation numérique.

Type d'effet : amélioration systémique.

Impact potentiel : moyen, parfois élevé si l'association évite un outil lourd ou propriétaire inutile.

Temps : 2 h/mois.

Coût financier : 0 €.

Réalisme : élevé.

Limites : difficile à mesurer ; nécessite de choisir des bénéficiaires réellement actifs.

### Programme "appareils prolongés"

Mécanisme : mettre en place une collecte ou un atelier de remise en état : vieux smartphones pour bénévoles, ordinateurs reconditionnés pour associations, installation de navigateurs à jour, nettoyage logiciel, orientation vers des filières de réemploi.

Impacts ciblés : ACV des terminaux, déchets électroniques, fracture numérique.

Type d'effet : réduction réelle et amélioration sociale.

Impact potentiel : élevé si des appareils sont réellement prolongés de 1 à 3 ans.
Indicateur simple : nombre d'appareils réemployés et mois d'usage supplémentaires.

Temps : 1 journée/trimestre ou partenariat avec une structure existante.

Coût financier : 0 à 300 € selon pièces, batteries ou accessoires.

Réalisme : moyen.

Limites : logistique, sécurité des données, compatibilité logicielle, responsabilité en cas de panne.

### Partenariat recyclage et réemploi matériel

Mécanisme : orienter le matériel inutilisable vers une filière locale certifiée, et le matériel fonctionnel vers du réemploi associatif.
Documenter le poids ou le nombre d'appareils traités.

Impacts ciblés : déchets électroniques, extraction matérielle, pollution liée au recyclage informel.

Type d'effet : réduction et compensation partielle.

Impact potentiel : moyen.
Le réemploi est plus utile que le recyclage quand il évite l'achat d'un appareil neuf.

Temps : 4 h de mise en place, puis suivi léger.

Coût financier : variable, souvent faible si partenariat local.

Réalisme : moyen.

Limites : le recyclage ne compense pas la fabrication initiale.
Il faut privilégier la prolongation d'usage.

### Règle volontaire de réduction IA

Mécanisme : fixer une règle opérationnelle : petits modèles par défaut, pas de génération massive sans test, pas de relance agentique après deux échecs sans diagnostic humain, pas d'IA pour les corrections triviales, revue humaine obligatoire des architectures et contenus factuels.

Impacts ciblés : consommation IA, dette technique, dépendance, hallucinations.

Type d'effet : réduction réelle.

Impact potentiel : élevé sur le projet, car elle réduit directement les requêtes inutiles et la dette générée.

Temps : 1 h/semaine de suivi ou revue.

Coût financier : 0 €.

Réalisme : très élevé.

Limites : dépend de la discipline.
Une règle trop stricte peut ralentir inutilement si elle n'est pas adaptée aux tâches.

### Soutien à des communs numériques sobres

Mécanisme : financer ou contribuer à des outils libres utilisés par les associations : cartographie libre, composants d'accessibilité, outils de compression, bibliothèques de tests, documentation française, hébergement associatif.

Impacts ciblés : dépendance aux plateformes, qualité des alternatives libres, résilience collective.

Type d'effet : compensation partielle et amélioration systémique.

Impact potentiel : moyen.
L'effet est durable si le commun est réellement utilisé.

Temps : 1 h/mois pour choisir et documenter le soutien.

Coût financier : 5 à 50 €/mois.

Réalisme : élevé.

Limites : ne compense pas directement l'empreinte matérielle.
Le choix du commun doit être cohérent avec les usages réels.

### Actions locales de dépollution mesurées

Mécanisme : organiser ou rejoindre des cleanwalks locales avec comptage simple : nombre de participants, distance moyenne de déplacement, kg ou sacs collectés, mégots, photos limitées, zone nettoyée, transmission éventuelle à la collectivité.

Impacts ciblés : pollution locale, mobilisation, données terrain, crédibilité du projet.

Type d'effet : compensation qualitative et action environnementale directe.

Impact potentiel : élevé localement, mais pas équivalent à une compensation carbone totale.

Temps : 2 à 4 h par action.

Coût financier : 0 à 50 €.

Réalisme : élevé.

Limites : ne neutralise pas l'impact IA.
Le bilan peut devenir négatif si les participants se déplacent loin en voiture.

### Plaidoyer local et rapports aux collectivités

Mécanisme : transformer les données de terrain en rapports sobres : localisation des déchets récurrents, types de déchets, besoins de poubelles/cendriers, zones à surveiller, photos compressées, recommandations concrètes.

Impacts ciblés : substitution politique, prévention des déchets, action publique.

Type d'effet : amélioration systémique.

Impact potentiel : élevé si une collectivité modifie une pratique : ajout de cendriers, meilleure collecte, signalétique, contrôle de dépôts sauvages.

Temps : 2 à 6 h par rapport.

Coût financier : 0 €.

Réalisme : moyen.

Limites : dépend de la réponse institutionnelle.
Il faut éviter les rapports trop longs ou accusatoires.

### Charte de données et IA responsable

Mécanisme : rédiger et appliquer une charte courte : données interdites dans les instructions, anonymisation, modèles autorisés, revue humaine, conservation minimale, transparence, droit à l'export, refus de décisions automatisées sensibles.

Impacts ciblés : confidentialité, opacité, dépendance IA, gouvernance.

Type d'effet : réduction et gouvernance.

Impact potentiel : moyen à élevé si elle est réellement utilisée dans les contributions.

Temps : 4 h initiales, 1 h/trimestre de revue.

Coût financier : 0 €.

Réalisme : très élevé.

Limites : une charte sans contrôle ne sert presque à rien.
Elle doit être reliée aux PR, aux instructions et aux validations.

### Mutualisation d'hébergement ou de ressources

Mécanisme : étudier une mutualisation avec une association, un hébergeur responsable ou un serveur déjà utilisé, pour éviter de multiplier les infrastructures, tout en gardant sécurité, disponibilité et sauvegardes.

Impacts ciblés : infrastructure, dépendance, coût récurrent.

Type d'effet : réduction et amélioration systémique.

Impact potentiel : faible à moyen pour un petit site, plus élevé si plusieurs projets mutualisent.

Temps : 4 à 12 h d'étude.

Coût financier : variable.

Réalisme : moyen.

Limites : peut dégrader la fiabilité ou la sécurité si mal géré.
Ne pas migrer pour le principe : il faut un gain mesurable.

## Priorisation des actions complémentaires

### Analyse critique des actions proposées

Les actions réellement utiles sont celles qui changent les pratiques, pas celles qui ajoutent seulement une page de bonnes intentions.
Les plus robustes sont l'audit trimestriel de sobriété numérique, la règle volontaire de réduction IA, la charte IA responsable reliée aux validations, et les actions locales mesurées avec limitation des déplacements.

Les actions qui risquent d'être symboliques sont le journal public s'il ne déclenche aucune décision, le financement de communs si le bénéficiaire est choisi au hasard, ou les ateliers s'ils ne débouchent sur aucune action locale.
Elles peuvent rester utiles, mais seulement si elles produisent des livrables mesurables.

Les actions à effet systémique durable sont la contribution source ouverte, le mentorat numérique responsable, les rapports aux collectivités, la documentation libre et la prolongation de durée de vie des appareils.
Elles dépassent le seul site CleanMyMap et améliorent l'écosystème autour du projet.

Le meilleur ratio impact/temps/argent semble être :

1. Règle volontaire de réduction IA : coût nul, réduction directe, très réaliste.
2. Audit trimestriel de sobriété : coût faible, gains mesurables.
3. Charte de données et IA responsable : coût faible, réduction des risques.
4. Actions locales mesurées et proches : impact terrain réel.
5. Documentation éducative libre : effet réutilisable, coût faible.

Les actions les moins directement compensatoires sont le recyclage matériel et le soutien financier aux communs.
Elles restent utiles, mais ne doivent pas être présentées comme une neutralisation de l'empreinte IA.

### Stratégie réaliste, équilibrée ou ambitieuse

- Mettre en place la règle volontaire de réduction IA.
- Publier une charte courte de données et IA responsable.
- Réaliser un audit sobriété numérique tous les trimestres.
- Organiser ou rejoindre une action locale mesurée par trimestre, en privilégiant moins de 5 km de déplacement.

Effet attendu : réduction directe des usages IA inutiles, baisse progressive du poids numérique, meilleure crédibilité, premiers indicateurs terrain.
Temps : 3 à 6 h/mois.
Coût : 0 à 50 €/trimestre.

- Appliquer toute la stratégie minimale.
- Ajouter une documentation éducative libre.
- Contribuer chaque mois à un outil source ouverte ou à une documentation utile.
- Faire un atelier local par trimestre avec une association ou un petit collectif.
- Produire un rapport terrain simple après chaque cleanwalk significative.

Effet attendu : réduction + sensibilisation + amélioration systémique.
Cette stratégie crée un bénéfice durable au-delà du site.
Temps : 8 à 15 h/mois.
Coût : 0 à 100 €/trimestre.

- Appliquer la stratégie équilibrée.
- Mettre en place un programme de réemploi d'appareils avec une structure locale.
- Financer ou maintenir un commun numérique sobre lié à la cartographie, l'accessibilité ou la compression d'images.
- Formaliser un partenariat avec une collectivité ou une association pour transformer les données de dépollution en prévention.
- Étudier une mutualisation d'hébergement si elle apporte un gain réel de sobriété, de coût ou de souveraineté.

Effet attendu : impact systémique plus fort, réduction de fracture numérique, prolongation matérielle, meilleure prévention des déchets.
Temps : 20 à 40 h/mois au démarrage, puis 8 à 20 h/mois.
Coût : 100 à 500 €/an selon matériel, ateliers et soutien aux communs.

### Indicateurs pour mesurer l'effet réel

Indicateurs IA et sobriété :

- nombre estimé de sessions IA par mois ;
- part de tâches faites avec petit modèle ;
- nombre de relances agentiques évitées ;
- nombre de décisions IA revues humainement ;
- poids JS/CSS des pages principales ;
- taille moyenne des images uploadées ;
- volume mensuel de stockage photo ;
- nombre d'événements mesure d'audience collectés ;
- nombre de compilations et durée totale CI/CD.

Indicateurs sociaux :

- nombre de personnes accompagnées en atelier ;
- nombre d'associations aidées ;
- nombre de participants sans compte ou sans smartphone intégrés via délégation ;
- nombre de ressources pédagogiques publiées et réutilisées ;
- nombre de contributions source ouverte ou issues utiles.

Indicateurs terrain :

- nombre d'actions locales menées ;
- distance moyenne de déplacement des participants ;
- part des participants venus à pied, vélo, transport ou covoiturage ;
- kg ou sacs de déchets collectés ;
- nombre de mégots collectés ;
- nombre de rapports transmis à une collectivité ;
- nombre de réponses ou actions publiques obtenues.

Indicateurs matériels :

- nombre d'appareils prolongés ou réemployés ;
- durée d'usage supplémentaire estimée ;
- nombre d'appareils orientés vers une filière de recyclage certifiée ;
- nombre d'achats évités ou reportés.

Ce qui ne peut probablement pas être compensé : la consommation IA passée, l'eau et l'électricité déjà mobilisées par les data centers, la fabrication du matériel déjà utilisé, et le travail invisible intégré aux chaînes d'entraînement et de modération.
Ces postes peuvent être reconnus, réduits pour l'avenir et mis en perspective par des bénéfices réels. En revanche, ils ne peuvent pas être annulés.

En synthèse, la crédibilité du projet dépend aussi de ce qu'il fait hors du site : réduire certains coûts, rendre visibles les arbitrages, et assumer lucidement ce qui restera irréductible.
