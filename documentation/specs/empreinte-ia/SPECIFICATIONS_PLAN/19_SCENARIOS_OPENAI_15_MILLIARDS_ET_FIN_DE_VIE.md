# Dossier de calcul et fixtures : 15 milliards de tokens Codex, recyclage et devenir des déchets

**Statut : PLAN / documentation scientifique et jeu de références, pas un prompt Codex autonome. Date : 20 novembre 2026.** Scénarios reproductibles, mais **aucune mesure d'énergie du compte OpenAI ni d'une cleanwalk**. Les valeurs sont à comparer dans les tests de `08` et `18`, avec exactitude des unités et arrondis uniquement en UI.

## A. Entrée et incertitude

L'utilisateur déclare `T=15 000 000 000` « tokens générés sur mon compte Codex ». On ne sait pas si ce compteur couvre seulement les tokens de sortie ou tous les tokens d'activité. S'il représente uniquement les sorties, aucune empreinte totale d'utilisation ne peut être déduite sans les entrées, les mises en cache et les appels aux outils. On affiche donc un **scénario calculé sur le volume déclaré**, avec couverture potentiellement incomplète.

La déclaration OpenAI de Sam Altman (2025) porte sur une **requête ChatGPT moyenne** : `0,34 Wh/requête` et `0,000085 gallon US/requête ≈0,322 mL/requête`, **sans frontière énergétique/hydrique détaillée rendue publique** ; l'étude indépendante ~`0,3 Wh/requête GPT-4o` mentionnée par OpenAI Academy n'est pas une mesure Codex. Aucun de ces nombres ne se transforme en kWh/Mtokens sans distribution de tokens et modèle. Les raisons et comptes de cache/raisonnement sont conservés tels quels, jamais comptés deux fois. Sources : https://blog.samaltman.com/the-gentle-singularity ; https://academy.openai.com/en/public/clubs/higher-education-05x4z/resources/environmental-impact-of-ai ; https://help.openai.com/en/articles/4936856-understanding-and-counting-tokens .

## B. Formules et 3 hypothèses énergétiques (non calibrées)

```text
n = T / 1e6 = 15 000 millions de tokens
a = 0,06 / 0,30 / 0,60 kWh IT par million de tokens (scénarios, pas facteurs OpenAI)
PUE = 1,15 (hypothèse)
E_IT = n*a
E_site = E_IT*PUE
C_scenario = E_site * intensité [kgCO2e/kWh]
W_indirect_US = E_site * 4,52 L/kWh (scénario US 2023 uniquement)
W_direct = NA ; W_total = NA
```

| a kWh IT/Mtokens | E_IT kWh | E_site kWh | Scénario US à 0,35 kgCO₂e/kWh | Scénario FR 2025 à 0,0200 kgCO₂e/kWh | Eau US indirecte seulement |
|---:|---:|---:|---:|---:|---:|
| 0,06 | 900 | 1 035 | 362,25 kgCO₂e | 20,70 kgCO₂e | 4 678,2 L |
| 0,30 | 4 500 | 5 175 | 1 811,25 kgCO₂e | 103,50 kgCO₂e | 23 391 L |
| 0,60 | 9 000 | 10 350 | 3 622,50 kgCO₂e | 207,00 kgCO₂e | 46 782 L |

Le rapport `0,60/0,06 = 10` est **une sensibilité entre extrêmes choisis**, non une fourchette de confiance et non une vérité sur OpenAI. Le facteur `0,35` est un proxy US du projet, pas une mesure d'OpenAI. Les `20 gCO₂e/kWh` sont l'intensité **de consommation électrique** France 2025 (RTE), pas le serveur hébergeant Codex ; le scénario US/FR change uniquement le facteur carbone, pas les kWh. L'énergie nucléaire/renouvelable plus abondante dans un mix peut abaisser le carbone opérationnel, pas annuler kWh/eau/matériel. L'approvisionnement par contrats n'est pas automatiquement l'énergie physiquement livrée 24 h/24. Sources : https://analysesetdonnees.rte-france.com/bilan-electrique-2025/emissions ; https://www.iea.org/reports/energy-and-ai/energy-supply-for-ai .

## C. Référence terrain de calcul, **non mesure de compensation**

| Paramètre | Valeur illustrative | Statut |
|---|---:|---|
| Déchets par heure-personne | 9,9 kg/h | Proxy non calibré par cleanwalk |
| Mégots par heure-personne | 380 mégots/h | Proxy non calibré |
| Composition massique | 50 % plastique / 10 % aluminium / 40 % verre | Scénario fictif |
| Rendement global `y_i` réincorporé | 70 % de chaque matière | Scénario fictif, à ne pas confondre avec taux de tri ou taux moyen national |
| Plastique, MPR incorporée | 2,702 kgCO₂e/kg | ADEME BNR 2021 |
| Aluminium, MPR incorporée | 6,407 kgCO₂e/kg | ADEME BNR 2021 |
| Verre, MPR incorporée | **1,948 kgCO₂e/kg** | ADEME BNR 2021, corrige 0,948 |
| Mégot recyclé TchaoMegot | 0,0035 kg CO₂ déclaré/mégot | Chiffre fournisseur, comparabilité ACV non établie |
| Mégot sans recyclage qualifié | 0 contribution au **scénario recyclage** | Pas zéro émission réelle du traitement |
| Risque hydrique par mégot | 500 L d'eau potentiellement polluée | Proxy pédagogique, non eau consommée évitée |

Sources BNR : https://economie-circulaire.ademe.fr/bnr/plastiques ; https://economie-circulaire.ademe.fr/bnr/aluminium ; https://economie-circulaire.ademe.fr/bnr/verre . Rapport fournisseur : https://www.smet71.fr/media/Documents/RA_2023.pdf (référence historique déjà analysée dans `01`).

```text
f_mix = 0,5*2,702 + 0,1*6,407 + 0,4*1,948 = 2,7709 kgCO2e/kg MPR
f_eff = 0,7*f_mix = 1,93963 kgCO2e/kg collecté dans ce scénario
p = 0,20 ou 0,80 = part d'EFFORT théorique sur mégots
f_b = 0 si sans recyclage, 0,0035 sinon (kg CO2 déclarés, assimilés au CO2e POUR SCÉNARIO SEUL)
k_C = 9,9*(1-p)*f_eff + 380*p*f_b [kgCO2e comparatifs/h-personne]
H = C_scenario/k_C si k_C>0 ; H_Aqua = W_indirect/(500*380*p) si p>0
H_min = max(H, H_Aqua) dans le seul mode « RISQUE_CONVENTIONNEL », et uniquement comme analogie
M = 9,9*H_min*(1-p) [kg déchets hors mégots]
N = ceil(380*H_min*p) [mégots entiers]
```

Avec `W_indirect=23 391 L` et p=20 % ou 80 %, `H_Aqua` vaut respectivement `0,61555` et `0,15389` heure. Dans ces deux cas, H carbone est plus contraignant, **mais l'objectif eau au sens de l'eau consommée n'est PAS atteint ni même démontrable**. Le seuil 500 L/mégot est uniquement une analogie de pollution potentielle.

## D. Test principal : recyclage des mégots activé / désactivé

Objectif théorique `C=1 811,25 kgCO₂e`, scénario US central, y=0,70. Le facteur de mégots provient d'un chiffre fournisseur non vérifié indépendamment ; les chiffres suivants ne sont pas des compensations réelles.

| p effort mégots | Scénario mégots | k_C kg comparatifs/h | H heures-personne | Déchets M kg | Mégots N |
|---:|---|---:|---:|---:|---:|
| 20 % | sans recyclage | 15,3618696 | **117,90557** | **933,812** | **8 961** |
| 20 % | recyclage fournisseur | 15,6278696 | **115,89871** | **917,918** | **8 809** |
| 80 % | sans recyclage | 3,8404674 | **471,62228** | **933,812** | **143 374** |
| 80 % | recyclage fournisseur | 4,9044674 | **369,30616** | **731,226** | **112 270** |

**Démonstration de la variation :**

```text
p=0,80 : 100*(471,62228-369,30616)/471,62228 = 21,6945... % d'effort en moins
p=0,20 : 100*(117,90557-115,89871)/117,90557 = 1,702... % d'effort en moins
```

La même réduction relative s'applique à `M` avant arrondi ainsi qu'à `N` approximativement (avec un petit écart dû à `ceil`). **Le résultat « -20 % » n'est valable qu'à proximité du scénario p=80 % et avec ces facteurs choisis.** Désactiver la filière signifie seulement retirer du solveur le bénéfice carbone spéculatif de recyclage des mégots ; on continue à compter les mégots effectivement ramassés, l'engagement de terrain et la protection locale potentielle.

### Sensibilité au rendement d'incorporation

À `p=80 %`, autres hypothèses inchangées :

| Rendement y | H sans recyclage mégots | H avec scénario de recyclage mégots | Baisse relative de H |
|---:|---:|---:|---:|
| 30 % | 1 100,452 h | 668,379 h | 39,26 % |
| 70 % | 471,622 h | 369,306 h | 21,69 % |
| 100 % | 330,136 h | 276,511 h | 16,24 % |

**Deux sensibilités différentes :** `y` joue sur la proportion de **matière réellement réincorporée** ; `a` joue sur l'empreinte de l'IA. Une valeur inconnue de y n'est pas 70 % et un flux non identifié ne peut pas produire un bénéfice carbone observé. Les scénarios à y=100 % sont des bornes idéales mathématiques, pas un taux de recyclage réel.

## E. Décomposition par matériau et mode de traitement

Pour `p=80 %`, recyclage mégots fournisseur activé, y=70 % et `M=731,226 kg` :

| Matériau | Masse collectée (kg) | MPR théorique réincorporée (kg) | Bénéfice carbone conditionnel (kgCO₂e) |
|---|---:|---:|---:|
| Plastique | 365,613 | 255,929 | 691,52 |
| Aluminium | 73,123 | 51,186 | 327,95 |
| Verre | 292,490 | 204,743 | 398,84 |
| **Total MPR, sans mégots** | **731,226 collectés** | **511,858 incorporés** | **1 418,31** |
| Mégots recyclés | **112 270 mégots**, masse non déduite | Pas de coefficient MPR vérifié | **392,945 kg CO₂ fournisseur, distincts** |

Le scénario « tous les déchets sont **incinérés** » représente, pour les catégories aluminium/verre/plastique de cette simulation, `y=0` : **0 kg de MPR incorporée et 0 bénéfice par facteurs BNR**, MAIS pas « 0 CO₂e émis ». Sans ACV comparative locale de l'incinération, le bilan CO₂e net est `NA`. Si `p=80 %` et les mégots ne sont **pas** recyclés non plus, le seul mécanisme carbone ACV proposé par ce solveur a un coefficient `k_C=0` : **aucun H fini ne couvre le seuil carbone du simulateur**. Pourtant, l'enlèvement de déchets peut améliorer la propreté et limiter leur dispersion. Si la filière mégots est activée, le solveur peut encore produire un objectif symbolique sur les mégots, **mais** les émissions des déchets incinérés restent inconnues et ce n'est pas une compensation complète.

### Chemin physique de traitement à représenter

```text
1. Ramassé : masse, catégorie, contexte, statut et auteur de la part
2. Trié / transféré : quantité remise à un opérateur et filière annoncée
3. Traité : recyclage matière, incinération avec/sans énergie, stockage, autre
4. Réincorporé : masse réellement utilisée comme matière secondaire, si attestée
5. ACV comparative : bénéfice éventuel, à périmètre et contrefactuel démontrés
```

- **Incinération sans énergie** : élimination avec émissions possibles ; aucune économie de matière vierge, donc pas de facteur de recyclage.
- **Incinération avec récupération d'énergie** : chaleur/électricité valorisées et émissions de combustion, dont carbone fossile issu de plastiques ; le bilan comparatif dépend de l'énergie remplacée, des fumées, du transport et de la filière de référence ; `NA` en l'absence d'ACV.
- **Métaux et verre incinérés dans un flux mixte** : présence possible de résidus ou de récupération post-traitement. Ne pas supposer 0 ni 100 % d'incorporation a priori ; s'il existe une récupération mesurée et validée, documenter sa masse **comme flux MPR distinct**, sans la compter deux fois.
- **Mégots** : une part incinérée ne peut pas bénéficier du chiffre fournisseur de recyclage TchaoMegot. Le volume `N*500 L` est une convention de pollution potentielle, pas un volume d'eau réellement nettoyée ou restaurée.

Sources : ministère français https://www.ecologie.gouv.fr/politiques-publiques/traitement-dechets ; ADEME BNR https://librairie.ademe.fr/economie-circulaire-et-dechets/6993-8665-bilan-national-du-recyclage-bnr-2012-2021-evaluation-environnementale.html ; GHG Protocol https://ghgprotocol.org/blog/inventory-and-project-accounting .

## F. Invariants de vérification

1. Toutes les cellules non prouvées sont soit `ASSUMPTION/PROXY`, soit `NA`, jamais présentées comme mesure ou gain réel.
2. L'inversion des scénarios montre le facteur dix sur les kWh et le facteur dix sur CO₂e **à mix identique**.
3. La baisse des heures est 21,695 % à p=80 % / 1,702 % à p=20 % pour y=70 %.
4. Le facteur verre reste `1,948` partout.
5. Règle `kg collectés ≠ kg réincorporés`.
6. Une masse incinérée ne reçoit jamais un bénéfice de recyclage ni un zéro inventé en émissions.
7. Aucun calcul n'ajoute ou ne soustrait les bénéfices de terrain à l'empreinte IA ou aux émissions comptables d'une entreprise.
8. Pas de double comptage des mégots en masse et en nombre, ni des parts individuelles et des totaux d'Action.