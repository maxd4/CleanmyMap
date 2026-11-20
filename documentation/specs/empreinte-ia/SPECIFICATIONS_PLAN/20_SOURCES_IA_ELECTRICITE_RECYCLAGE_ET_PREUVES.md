# Registre de preuves : IA, datacenters, recyclage matière et incinération

**Statut : PLAN / documentation source. Revue au 20 novembre 2026.** Une source donne un contexte et un périmètre, pas une autorisation de convertir des données hétérogènes. Ce registre aide les lots 0/08, 12, 18 et les contenus Apprendre 10. Ne pas copier ces valeurs comme facteurs CURRENT sans méthode et version dans l'owner scientifique.

## 1. OpenAI : informations publiques utilisables et limites

| Donnée | Source primaire | Ce qui est établi | Ce qui n'est PAS établi |
|---|---|---|---|
| `0,34 Wh` par requête ChatGPT moyenne, juin 2025 | Sam Altman, « The Gentle Singularity » : https://blog.samaltman.com/the-gentle-singularity | Déclaration publique du dirigeant sur une moyenne de requêtes | Durée/charge, périmètre IT ou site, modèle concerné, distribution, méthodologie détaillée, équivalence Codex |
| `0,000085 gallon US` d'eau par requête ChatGPT, ≈`0,322 mL` | Même source | Déclaration publique | Eau directe/indirecte/totale, consommation/prélèvement, localisation et protocole de mesure |
| `~0,3 Wh` par requête textuelle typique GPT-4o | OpenAI Academy citant Epoch AI : https://academy.openai.com/en/public/clubs/higher-education-05x4z/resources/environmental-impact-of-ai | Estimation indépendante relayée par OpenAI, plus étroite que la moyenne officielle | Coefficient par token ou par tâche agentique Codex, empreinte de l'ensemble des modèles récents |
| Tokens entrée, sortie, cached, reasoning | https://help.openai.com/en/articles/4936856-understanding-and-counting-tokens ; https://developers.openai.com/api/docs/guides/token-counting ; https://developers.openai.com/api/docs/guides/prompt-caching | Sémantique de comptage et de facturation selon les modèles/endpoint | kWh déductibles du prix ou de la seule somme des tokens ; même énergie/cache que token neuf |
| Lieux d'infrastructure et projets Stargate | Publications OpenAI sur Stargate, https://openai.com/index/announcing-the-stargate-project/ | Existence/annonces de projets d'infrastructure | Centre qui a servi une requête donnée, PUE réel, composition horaire de l'électricité et intensité de CO₂e d'un appel |

**État de preuve :** Aucune source ci-dessus n'établit pour l'ensemble des 15 milliards de tokens du compte utilisateur l'énergie IT réellement consommée, le mix du ou des centres de données utilisés par Codex, ni l'eau directe et indirecte totale. L'estimation doit rester un scénario. Les `0,34 Wh` ne sont **pas** un facteur kWh par million de tokens.

## 2. Champs à rechercher chez OpenAI ET chez chaque autre fournisseur

Contrat de revue pour OpenAI, Anthropic, Google/Gemini, Mistral, Meta, DeepSeek et hébergeurs tiers. L'absence de donnée vaut `NA`, pas zéro.

| Dimension | Champs/protocole requis | Motif |
|---|---|---|
| Modèle/version | ID stable, dates de validité, raisonnement, quantification, hébergeur effectif | Un éditeur peut exploiter plusieurs sites et versions |
| Compteurs | Tokens input, output, cache/read/write, reasoning, multimodalité, appels et outils, période | Éviter conversion fictive tokens -> requêtes |
| Énergie | Mesure par requête ou par token *à distribution de longueurs comparable* ; IT vs site, PUE, matériel, batch, charge, méthode, intervalle de validité | Comparer des frontières énergétiques homogènes |
| Électricité/CO₂e | Région et horaire des calculs, mix physique, intensité carbone, instruments d'achat et preuve d'additionnalité, location- vs market-based | Nucléaire/renouvelables peuvent réduire le facteur carbone, sans tracer automatiquement les requêtes |
| Eau | Eau directe (WUE), indirecte de production électrique, consommation vs prélèvement, saison et stress hydrique local | Litres génériques insuffisants pour attribution |
| Cycle de vie | Énergie d'entraînement, réentraînement, fabrication GPU, maintenance, fin de vie, périmètre carbone et ventilation | Ne pas additionner entraînement/inférence selon des périmètres incompatibles |
| Preuve / audit | Source primaire, date, revue indépendante, incertitude, licence, possibilité d'export, version de méthode | Qualifier `OBSERVED/DERIVED/DECLARED/PROXY/NA` |

Chez Google, des analyses publiées sur le prompt médian Gemini constituent **une autre unité statistique** ; chez Anthropic, les exports agrégés de tokens et coûts ne suffisent pas à estimer l'énergie ; chez les fournisseurs de poids ouverts, le nombre de paramètres, le TDP GPU et le temps théorique ne prouvent pas une consommation opérationnelle réelle. Une source éditoriale sur l'efficacité d'un modèle ne prouve pas automatiquement son bilan hydrique.

## 3. Mix électrique, nucléaire et renouvelables

Sources publiques : IEA, *Energy and AI* https://www.iea.org/reports/energy-and-ai/energy-supply-for-ai ; RTE, Bilan électrique 2025 https://analysesetdonnees.rte-france.com/bilan-electrique-2025/emissions ; GHG Protocol https://ghgprotocol.org/blog/inventory-and-project-accounting .

- `E_site[kWh]` est une charge ; `I_elec[kgCO₂e/kWh]` dépend de la géographie, de la période et du périmètre. `C=E_site*I_elec` ne peut utiliser un `I_FR` pour une requête non attribuée à la France.
- RTE 2025 : consommation électrique française à `20,0 gCO₂e/kWh`, production à `19,6 gCO₂e/kWh`. Différence pertinente pour choisir une frontière, non des intensités OpenAI.
- Nucléaire et renouvelables décarbonent le mix électrique opérationnel en comparaison d'un mix fossile, mais ils ne rendent pas l'énergie `0`, n'effacent pas automatiquement l'eau du refroidissement, la fabrication des datacenters ou les impacts locaux.
- `Location-based` = facteur physique du réseau ; `market-based` = comptabilité d'attributs d'énergie contractuels. Contrats d'achat, certificats et annonces de sites doivent être isolés des émissions physiques ; aucune promesse « 100 % renouvelable » ne permet d'attribuer un chiffre par token sans traçabilité.
- Contraste : `5 175 kWh * 0,0200=103,50 kgCO₂e` en hypothèse France contre `5 175 * 0,35=1 811,25 kgCO₂e` en scénario US proxy, soit **17,5 fois** pour le seul facteur carbone choisi. Ce n'est pas la comparaison de deux sites OpenAI observés.

## 4. ADEME : facteurs et taux d'incorporation

BNR 2012-2021, évaluation environnementale, modélisation 2021 : https://librairie.ademe.fr/economie-circulaire-et-dechets/6993-8665-bilan-national-du-recyclage-bnr-2012-2021-evaluation-environnementale.html . Résultats par **tonne de matière recyclée incorporée**, incluant collecte, tri/préparation et scénarios de production et de fin de vie substitués, non par tonne simplement ramassée.

- Plastique moyen : `2 702 kgCO₂e/tonne MPR = 2,702 kgCO₂e/kg incorporé` ; https://economie-circulaire.ademe.fr/bnr/plastiques
- Aluminium : `6 407 kgCO₂e/tonne MPR = 6,407 kgCO₂e/kg incorporé` ; https://economie-circulaire.ademe.fr/bnr/aluminium
- Verre : **`1 948 kgCO₂e/tonne MPR = 1,948 kgCO₂e/kg incorporé`**, **pas 0,948** ; https://economie-circulaire.ademe.fr/bnr/verre

Le rendement d'incorporation d'une collecte propre dépend du tri, contamination, acceptation, pertes de préparation, type de matériau, technologie, destination, année et transport. Les `30/70/100 %` des scénarios `19` sont fictifs, non des moyennes nationales ni des propriétés d'une structure. Aucun résultat d'incorporation n'est attribué à une association ou une entreprise sans provenance de la filière et lien à l'Action.

## 5. Ramassage et traitement final : quatre questions distinctes

| Traitement | Recyclage matière incorporé ? | CO₂e de la filière | Ce que CleanMyMap peut dire |
|---|---|---|---|
| Recyclage documenté | Seulement fraction acceptée et réellement incorporée | ACV comparative ADEME éventuellement applicable avec frontière appropriée | `M` collectés, `R` incorporés, bénéfice ACV conditionnel |
| Incinération **sans** récupération d'énergie | Non | Émissions possibles ; net climatique `NA` sans étude | Déchet retiré du milieu ; pas de bénéfice MPR, élimination |
| Incinération **avec** récupération d'énergie | Non en tant que combustion ; récupération matière post-traitement à prouver séparément | Émissions dont carbone fossile et éventuelle substitution énergie, net `NA` sans étude | Valorisation énergétique distincte du recyclage matière |
| Décharge / destination inconnue | Non démontré | `NA` pour l'effet réel ; déchets organiques peuvent produire CH4 | Déchet retiré et destination ou statut déclaré, sans économie carbone |

Source ministère : https://www.ecologie.gouv.fr/politiques-publiques/traitement-dechets ; hiérarchie des traitements : https://www.ecologie.gouv.fr/politiques-publiques/fiscalite-dechets . Le ministère distingue explicitement incinération avec récupération d'énergie de l'élimination sans valorisation. Pour la prévention de pollution locale, compter présence de matériaux retirés et suivre le site ; ne pas supposer qu'une filière d'élimination est sans impact environnemental.

Le facteur déclaratif de recyclage des mégots `63kg/18000 = 3,5 g CO₂ déclaré/mégot`, repris dans le rapport SMET 71 https://www.smet71.fr/media/Documents/RA_2023.pdf , reste non vérifié par ACV indépendante et **ne s'applique ni à une incinération ni à une collecte sans filière**. Le `500 L/mégot` est un indicateur de pollution potentielle, pas de l'eau sauvée.

## 6. Références institutionnelles et sociales complémentaires

- GHG Protocol : émission évitée par un projet à déclarer séparément des inventaires scopes, méthodologie de contrefactuel ; https://ghgprotocol.org/blog/inventory-and-project-accounting .
- OMS, recommandations d'activité physique : https://www.who.int/news-room/fact-sheets/detail/physical-activity . Une durée de cleanwalk ne suffit pas à qualifier l'intensité de chaque participant ni l'effet sur sa santé.
- Dangers de pollution par mégots et prévention : ADEME https://agirpourlatransition.ademe.fr/particuliers/reduire-dechets/bien-jeter/stop-megots-espace-public . Les 500 L/mégot doivent rester un proxy de pollution potentielle.
- Les microplastiques (fragments physiques) ne sont pas les particules fines atmosphériques `PM2.5` ; ne pas leur appliquer un coefficient commun.

## 7. Règles de péremption et de preuve

La documentation source n'est pas un inventaire live des datacenters. Les facteurs datés (ADEME 2021, RTE 2025, OpenAI 2025) gardent leur millésime. Réévaluer lorsque le fournisseur publie : mesure instrumentale de l'inférence par modèle/version et requêtes, énergie site vs IT, PUE/horaire, attribution régionale, WUE et ACV indépendante de la filière de mégots. Tout chiffre non couvert reste `NA`. Aucune externalité sociale ou territoriale n'est compensée par des mégots ou kg de déchets.