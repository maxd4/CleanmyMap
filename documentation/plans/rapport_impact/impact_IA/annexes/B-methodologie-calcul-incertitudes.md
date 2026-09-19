## Annexe B — Méthodologie de calcul et incertitudes {#annexe-b-methodologie-de-calcul-et-incertitudes}

Cette annexe est la **source méthodologique détaillée** des calculs quantitatifs du rapport d'impact. Elle complète la Partie I et la Partie II-A sans devenir une seconde source de vérité sur le fonctionnement du produit.

Elle documente :

- les niveaux de preuve ;
- les unités ;
- la reconstruction de l'activité IA ;
- les scénarios énergétiques ;
- les facteurs carbone et eau ;
- l'ACV partielle ;
- les conventions d'arrondi ;
- les incertitudes ;
- les règles anti-double-comptage.

Les mécanismes physiques généraux des data centers, de l'eau, des semi-conducteurs et des équipements sont décrits en Partie II-B.

## B.1 Statut des données

Six statuts sont utilisés.

| Statut | Sens |
| --- | --- |
| `OBSERVED` | mesure ou compteur directement disponible |
| `DERIVED` | résultat calculé à partir d'une observation |
| `DECLARED` | valeur déclarée mais non reconstruite exhaustivement |
| `ASSUMPTION` | hypothèse de scénario |
| `PROXY` | facteur comparable utilisé faute de mesure directe |
| `NA` | donnée non disponible ou non attribuable proprement |

Une valeur peut cumuler plusieurs statuts, par exemple :

```text
35 Md token-equivalents
= DECLARED + ASSUMPTION
```

ou :

```text
3,7 tCO2e
= PROXY
```

La présence d'une valeur numérique ne transforme jamais automatiquement un proxy en mesure.

## B.2 Périmètre et frontières

Le bilan distingue quatre couches.

```text
1. activité numérique
2. énergie d'usage
3. impacts opérationnels
4. impacts de cycle de vie
```

Pour CleanMyMap :

```text
activité IA
→ token-equivalents

énergie
→ kWh / MWh estimés

carbone opérationnel
→ énergie × facteur carbone

eau indirecte
→ énergie × facteur hydrique

ACV partielle
→ opérationnel + allocation incorporée de sensibilité
```

L'entraînement des modèles, la fabrication précise des accélérateurs, la construction des centres de données, les réseaux et plusieurs autres postes restent `NA` lorsque l'allocation spécifique à CleanMyMap n'est pas défendable.

## B.3 Unités et conventions

Les unités sont :

- `token` : compteur logique propre à un fournisseur ou un modèle ;
- `token-équivalent` : unité d'activité conventionnelle, non physique ;
- `kWh` / `MWh` : énergie ;
- `kgCO₂e` / `tCO₂e` : effet climatique ;
- `L` / `m³` : volume d'eau.

Conversions :

\[
1\ \text{MWh} = 1\,000\ \text{kWh}
\]

\[
1\ \text{tCO₂e} = 1\,000\ \text{kgCO₂e}
\]

\[
1\ \text{m}^3 = 1\,000\ \text{L}
\]

### Convention d'arrondi

Le rapport sépare :

```text
valeur de calcul
≠
valeur éditoriale affichée
```

Les calculs conservent suffisamment de précision pour rester reproductibles. Les synthèses utilisent des ordres de grandeur simples.

Ainsi, le scénario central est calculé autour de **10,5 MWh**, mais est présenté dans le texte comme **≈ 10 MWh**.

Pour le carbone, le calcul sous-jacent conduit à **3,675 tCO₂e**, présenté comme **≈ 3,7 tCO₂e**.

Pour l'eau, le calcul complet sur 10,5 MWh conduit à environ **47,5 m³** ; la chaîne éditoriale simplifiée retient **≈ 45 m³** afin de rester cohérente avec l'affichage arrondi à 10 MWh. Le fichier de calcul ou l'annexe doit conserver la valeur intermédiaire afin que cet arrondi ne soit jamais interprété comme une nouvelle mesure.

## B.4 Reconstruction de l'activité IA

### Deux comptes Codex

Valeurs déclarées :

| Compte | Tokens |
| --- | ---: |
| principal | 35 Md |
| secondaire | 15 Md |
| **total** | **50 Md** |

Statut : `DECLARED`.

### Attribution à CleanMyMap

Hypothèse :

\[
50\ \text{Md} \times 0,50 = 25\ \text{Md}
\]

Soit **25 milliards de tokens Codex attribués à CleanMyMap**.

Statut : `DECLARED + ASSUMPTION`.

### Autres plateformes

Antigravity, Windsurf, Cursor et Claude Sonnet via AWS ont été utilisés temporairement. Leur télémétrie n'est pas homogène avec les compteurs Codex.

Le rapport utilise donc une convention :

\[
50\ \text{Md} \times 0,20 = 10\ \text{Md de token\text{-}équivalents}
\]

Statut : `DECLARED + ASSUMPTION`.

### Total central

\[
25\ \text{Md} + 10\ \text{Md}
=
35\ \text{Md de token\text{-}équivalents}
\]

```text
AI_ACTIVITY_CENTRAL = 35 Md token-equivalents
EXACT_TOTAL = NA
```

Les 10 Md « autres plateformes » ne sont pas présentés comme des tokens réellement facturés par ces fournisseurs. Ils servent uniquement à ramener l'activité hétérogène à une échelle commune.

## B.5 Télémétrie locale : rôle et limites

Une reconstruction locale récente couvre la période :

```text
2026-07-11T01:44:03.623Z
→
2026-09-18T22:57:18.689Z
```

soit environ **69,9 jours**.

Qualité du relevé :

| Élément | Valeur |
| --- | ---: |
| fichiers rollout bruts | 42 |
| sessions uniques | 39 |
| copies dédupliquées | 3 |
| sessions avec compteurs exploitables | 33 |
| sessions sans compteurs exploitables | 6 |
| couverture métrique | 84,62 % |
| lignes JSONL valides | 101 552 |
| lignes invalides | 0 |

Volumes observés sur la fenêtre, tous projets confondus :

| Métrique | Valeur |
| --- | ---: |
| input tokens | 1 867 497 074 |
| cached input tokens | 1 818 120 704 |
| uncached input tokens | 49 376 370 |
| output tokens | 7 303 361 |
| reasoning output tokens | 2 387 146 |
| total tokens | 1 874 800 435 |

Les entrées mises en cache représentent environ **97,36 % des input tokens observés**.

Cette valeur ne peut pas être extrapolée à toute la période :

```text
CACHE_RATE_FULL_PROJECT = NA
```

La télémétrie locale ne doit pas être additionnée aux 50 Md déclarés si elle est déjà incluse dans ces compteurs.

## B.6 Pourquoi un token n'est pas une unité d'énergie

L'énergie par token dépend de nombreux paramètres :

- modèle ;
- architecture ;
- taille du contexte ;
- cache ;
- batching ;
- génération de sortie ;
- raisonnement ;
- hardware ;
- taux d'utilisation ;
- région ;
- infrastructure du fournisseur.

Google a publié pour Gemini Apps une mesure d'environ **0,24 Wh**, **0,03 gCO₂e** et **0,26 mL d'eau** pour un prompt texte médian dans son propre système [@google_measuring_the_1].

Cette donnée est utile comme **preuve qu'une mesure fournisseur est possible**, mais elle ne constitue pas un facteur générique applicable à Codex, Claude, un agent de code ou un contexte de centaines de milliers de tokens.

Le calcul CleanMyMap repose donc sur une **analyse de sensibilité par million de token-équivalents**, pas sur une prétendue constante physique du token.

## B.7 Scénarios énergétiques

Volume central :

\[
35\ \text{Md}
=
35\,000\ \text{millions de token\text{-}équivalents}
\]

Formule :

\[
E = N_{\text{million token-eq}} \times f_E
\]

avec \(f_E\) le coefficient effectif du scénario.

| Scénario | Coefficient effectif | Énergie calculée | Affichage synthétique |
| --- | ---: | ---: | ---: |
| bas | 0,06 kWh / million | 2,1 MWh | ≈ 2 MWh |
| central | 0,30 kWh / million | 10,5 MWh | **≈ 10 MWh** |
| haut | 0,60 kWh / million | 21 MWh | ≈ 20 MWh |

Ces coefficients sont `ASSUMPTION + PROXY`.

Ils n'affirment pas qu'un million de tokens consomme toujours 0,06, 0,30 ou 0,60 kWh. Ils représentent une enveloppe de sensibilité pour une activité multi-modèles, multi-fournisseurs et fortement agentique.

## B.8 Facteur carbone

### Proxy CleanMyMap

Le moteur méthodologique CleanMyMap utilise actuellement :

\[
f_C = 0,35\ \text{kgCO₂e/kWh}
\]

pour une électricité associée à des serveurs majoritairement américains lorsque la localisation réelle n'est pas connue.

Cette valeur est un `PROXY` fondé sur des références EPA eGRID / EIA et versionné dans le projet.

Formule :

\[
C = E \times f_C
\]

### Résultats

| Scénario | Énergie calculée | Facteur | CO₂e |
| --- | ---: | ---: | ---: |
| bas | 2 100 kWh | 0,35 kg/kWh | 735 kg = 0,74 t |
| central | 10 500 kWh | 0,35 kg/kWh | 3 675 kg = **3,675 t** |
| haut | 21 000 kWh | 0,35 kg/kWh | 7 350 kg = 7,35 t |

Valeur éditoriale centrale :

```text
≈ 3,7 tCO2e
```

## B.9 Ce facteur n'est pas un facteur OpenAI

Le facteur `0,35 kgCO₂e/kWh` ne doit pas être nommé « facteur d'émission OpenAI ».

À la date de rédaction, le rapport ne dispose pas d'un facteur moyen OpenAI :

```text
kgCO2e / kWh
```

ou :

```text
kgCO2e / token
```

qui serait à la fois public, global, stable et suffisamment documenté pour être appliqué à toutes les sessions Codex ou ChatGPT.

OpenAI documente certaines infrastructures particulières. Par exemple, [Stargate Norway](https://openai.com/index/introducing-stargate-norway/) est annoncé comme devant fonctionner entièrement avec de l'électricité renouvelable. Cette information décrit ce projet précis ; elle ne prouve pas que chaque requête OpenAI ou Codex utilise le même mix.

Le facteur CleanMyMap doit donc être lu comme :

```text
PROXY REGIONAL PRUDENT
```

et non comme :

```text
MESURE OPENAI
```

## B.10 Comparaison avec d'autres grandes infrastructures IA

Les stratégies énergétiques des grands opérateurs montrent qu'il n'existe pas un mix unique de « l'IA ».

### Google

Google a publié une mesure environnementale par prompt pour Gemini Apps [@google_measuring_the_1]. Cette mesure dépend de son infrastructure, de son workload et de sa méthode d'allocation. Elle ne peut pas servir de facteur universel pour CleanMyMap.

### Meta

Meta indique que l'électricité de ses data centers et bureaux détenus et exploités est **appariée à 100 % avec de l'énergie propre et renouvelable** et investit parallèlement dans le nucléaire pour ses besoins futurs ([Meta Sustainability](https://sustainability.atmeta.com/data-centers/)).

L'appariement contractuel ne signifie pas nécessairement qu'à chaque heure chaque serveur est physiquement alimenté uniquement par la production renouvelable contractée.

### Microsoft

Microsoft combine contrats d'électricité renouvelable et investissements bas-carbone ; l'entreprise a notamment signé un contrat nucléaire de grande échelle avec le Crane Clean Energy Center ([Microsoft Sustainability](https://www.microsoft.com/corporate-responsibility/sustainability/)).

### Amazon

Amazon développe un portefeuille d'énergie bas-carbone combinant renouvelables, stockage, géothermie et nucléaire. Son rapport 2025 indique aussi un PUE moyen mondial de 1,14 pour ses data centers ([Amazon Sustainability Report 2025](https://www.aboutamazon.com/news/sustainability/amazon-sustainability-report-2025)).

Ces informations illustrent la diversité des stratégies. Elles ne permettent pas de déduire un facteur carbone exact applicable à un utilisateur donné.

## B.11 Nucléaire, renouvelables et importance du mix

### Ce que le mix change

Le mix électrique change fortement :

```text
kgCO2e / kWh
```

Il ne change pas directement :

```text
nombre de kWh consommés
```

Une charge de 10 MWh reste une charge de 10 MWh, quelle que soit la source d'électricité.

### Nucléaire

Le nucléaire présente un intérêt particulier pour les infrastructures fonctionnant en continu parce qu'il fournit une production **pilotable, disponible à forte puissance et faiblement carbonée en phase d'exploitation**.

Meta, Microsoft et Amazon investissent ou contractent actuellement de l'électricité nucléaire pour compléter leurs besoins croissants de data centers.

### Renouvelables

L'hydraulique, l'éolien et le solaire peuvent également présenter une faible intensité carbone opérationnelle. Leur contribution effective dépend de :

- la ressource locale ;
- la production au moment de la consommation ;
- les interconnexions ;
- le stockage ;
- l'équilibrage ;
- le mix résiduel du réseau.

### Ce que ni le nucléaire ni les renouvelables n'annulent

Une électricité bas-carbone ne supprime pas :

- fabrication des GPU ;
- serveurs ;
- mémoires ;
- cuivre et autres matériaux ;
- bâtiments ;
- refroidissement ;
- réseau ;
- eau ;
- renouvellement accéléré du matériel ;
- fin de vie.

Ainsi :

```text
Scope 2 faible
≠
ACV nulle
```

### Market-based et location-based

Un opérateur peut acheter ou apparier de l'électricité propre et afficher un Scope 2 `market-based` faible tout en étant connecté à un réseau qui, physiquement, utilise plusieurs sources à l'instant de la consommation.

Le rapport doit donc distinguer :

```text
électricité contractuellement attribuée
≠
électricité physique du réseau heure par heure
```

Cette distinction est particulièrement importante lorsqu'on compare des déclarations d'entreprises.

## B.12 Analyse de sensibilité du facteur carbone

À énergie identique, le carbone varie fortement avec le facteur d'émission.

Exemple sur **10,5 MWh** :

| Facteur | CO₂e associé | Interprétation |
| --- | ---: | --- |
| 0,0217 kg/kWh | ≈ 0,23 t | ordre de grandeur d'une électricité française très bas-carbone en 2024 [@rte_annual_review_2024_keyfindings] |
| 0,35 kg/kWh | ≈ 3,68 t | proxy central CleanMyMap |
| 0,50 kg/kWh | ≈ 5,25 t | stress test d'un mix plus carboné |

Cette table est une **analyse de sensibilité**. Elle ne prétend pas que les calculs OpenAI ont eu lieu en France, ni qu'ils utilisent systématiquement un mix à 0,35 ou 0,50 kg/kWh.

## B.13 Eau indirecte

Le projet utilise comme proxy configurable :

\[
f_W = 4,52\ \text{L/kWh}
\]

pour l'eau indirecte associée à l'électricité de data centers américains. Ce facteur provient du _2024 United States Data Center Energy Usage Report_ du Lawrence Berkeley National Laboratory : [LBNL](https://doi.org/10.71468/P1WC7Q).

Formule :

\[
W_{indirect} = E \times f_W
\]

Résultats :

| Scénario | Énergie | Eau indirecte |
| --- | ---: | ---: |
| bas | 2 100 kWh | ≈ 9,5 m³ |
| central | 10 500 kWh | ≈ 47,5 m³ |
| haut | 21 000 kWh | ≈ 94,9 m³ |

Affichage éditorial central :

```text
≈ 45 m3
```

La différence entre 47,5 m³ de calcul et 45 m³ affichés vient de l'arrondi de l'énergie centrale à 10 MWh dans la chaîne synthétique.

### Eau directe

L'eau directe réellement consommée par les data centers des fournisseurs est :

```text
DIRECT_WATER = NA
```

tant que les régions, technologies de refroidissement et allocations fournisseur ne sont pas connues.

L'eau directe ne doit pas être ajoutée à l'eau indirecte si une source agrège déjà les deux.

## B.14 ACV partielle centrale

### Pourquoi une ACV partielle

Le carbone opérationnel ne représente pas tout le cycle de vie.

Les ACV récentes des infrastructures cloud montrent que le matériel, les serveurs, la construction et le renouvellement doivent être considérés lorsqu'on compare des architectures [@nature_cool_clouds_lca_2025].

Cependant, le rapport ne dispose pas d'une allocation spécifique des équipements OpenAI / partenaires réellement utilisés par CleanMyMap.

### Hypothèse de sensibilité

Pour matérialiser ce poste sans prétendre le mesurer, le scénario central ajoute une **majoration de sensibilité de 30 %** au carbone opérationnel.

Cette valeur est :

```text
ASSUMPTION
```

et non :

```text
FACTEUR ACV UNIVERSEL
```

Elle sert à représenter de manière prudente un ordre de grandeur de carbone incorporé non directement mesuré.

Formule :

\[
C_{ACV\ partielle}
=
C_{operationnel}
\times
1,30
\]

Scénario central :

\[
3,675\ \text{tCO₂e}
\times
1,30
=
4,7775\ \text{tCO₂e}
\]

soit :

```text
≈ 4,8 tCO2e
```

et, dans la synthèse du rapport :

```text
≈ 5 tCO2e
```

### Ce que cette valeur ne couvre pas exhaustivement

Même cette ACV partielle ne garantit pas une couverture complète de :

- entraînement des modèles ;
- recherche et développement du modèle ;
- fabrication précise des accélérateurs ;
- construction détaillée des bâtiments ;
- groupes électrogènes ;
- batteries ;
- réseaux ;
- transport du matériel ;
- eau de fabrication ;
- fin de vie ;
- effets de remplacement accéléré.

La formulation correcte est donc :

> **ACV partielle centrale de sensibilité : environ 5 tCO₂e.**

La formulation « ACV complète de CleanMyMap = 5 tCO₂e » serait incorrecte.

## B.15 Tableau central des scénarios

| Indicateur | Bas | Central | Haut | Statut |
| --- | ---: | ---: | ---: | --- |
| activité IA | 35 Md token-eq | 35 Md token-eq | 35 Md token-eq | `DECLARED + ASSUMPTION` |
| coefficient énergétique | 0,06 kWh/M token-eq | 0,30 | 0,60 | `ASSUMPTION` |
| énergie calculée | 2,1 MWh | 10,5 MWh | 21 MWh | `PROXY` |
| énergie affichée | ≈ 2 MWh | **≈ 10 MWh** | ≈ 20 MWh | arrondi |
| CO₂e opérationnel | 0,74 t | **3,68 t** | 7,35 t | `PROXY` |
| CO₂e affiché | ≈ 0,7 t | **≈ 3,7 t** | ≈ 7,4 t | arrondi |
| eau indirecte calculée | 9,5 m³ | 47,5 m³ | 94,9 m³ | `PROXY` |
| eau affichée | ≈ 10 m³ | **≈ 45 m³** | ≈ 95 m³ | arrondi |
| ACV partielle +30 % | 0,96 t | 4,78 t | 9,56 t | `ASSUMPTION + PROXY` |
| ACV partielle affichée | ≈ 1 t | **≈ 5 t** | ≈ 10 t | arrondi |

Le tableau n'est pas un intervalle de confiance statistique. Il montre la dépendance du résultat au coefficient énergétique de scénario.

## B.16 Services numériques hors IA

Les services suivants existent dans le projet :

- Vercel ;
- Supabase ;
- GitHub / GitHub Actions ;
- Clerk ;
- LWS ;
- Resend ;
- Sentry ;
- PostHog ;
- Upstash ;
- autres services selon usage réel.

Leur présence n'autorise pas à inventer un kWh.

Règle :

```text
service present
+
usage environnemental inconnu
=
OBSERVED + NA
```

et non :

```text
service present
=
0
```

Ils ne sont pas ajoutés arbitrairement aux 10 MWh du scénario IA.

## B.17 Matériel, impressions et déplacements

### Matériel personnel

Aucun achat de PC ou GPU n'est déclaré comme ayant été déclenché par CleanMyMap.

Dans une lecture conséquentielle :

```text
PROJECT_INDUCED_HARDWARE_PURCHASE = 0
```

Cela ne signifie pas que l'ordinateur existant a une ACV nulle.

L'allocation attributionnelle de sa fabrication reste :

```text
NA
```

### Électricité locale

Sans mesure au wattmètre :

```text
LOCAL_DEVICE_ELECTRICITY = NA
```

### Impression

État courant :

```text
CURRENT_PRINTING = 0
```

Tout futur tirage papier doit être compté séparément.

### Déplacements de développement

État déclaré :

```text
CURRENT_DEVELOPMENT_TRAVEL = 0
```

Les déplacements liés aux actions terrain appartiennent à un autre périmètre.

## B.18 Générations d'images

Environ **130 générations ou modifications d'images** sont déclarées.

```text
IMAGE_COUNT = DECLARED
IMAGE_ENVIRONMENTAL_FACTOR = NA
```

Aucun facteur arbitraire n'est appliqué.

## B.19 Règles anti-double-comptage

1. Ne pas additionner une estimation par temps et une estimation par tokens pour la même activité.
2. Ne pas ajouter la télémétrie locale aux compteurs de compte si elle en constitue une sous-partie.
3. Ne pas additionner un facteur par prompt et un facteur par token pour un même appel.
4. Ne pas reconstruire des kWh en divisant un CO₂e proxy par un facteur carbone.
5. Ne pas additionner eau directe et eau indirecte si la source les agrège déjà.
6. Ne pas compter deux fois la fabrication du matériel dans plusieurs postes ACV.
7. Ne pas attribuer une fraction de l'entraînement d'un modèle sans règle explicite.
8. Ne pas considérer un quota gratuit comme un impact nul.
9. Ne pas convertir une absence de donnée en zéro.
10. Ne pas soustraire les bénéfices terrain de l'empreinte numérique comme s'il s'agissait d'une compensation physique.

## B.20 Incertitude : ne pas utiliser une marge unique arbitraire

L'ancienne méthode utilisait des marges fixes du type :

```text
cloud ±30 %
IA ±50 %
matériel ±20 %
```

Ces marges sont supprimées car elles donnaient une apparence statistique sans distribution probabiliste démontrée.

La nouvelle méthode distingue les **sources d'incertitude** :

| Source | Traitement |
| --- | --- |
| attribution des comptes | scénario / `ASSUMPTION` |
| autres plateformes | token-équivalent / `ASSUMPTION` |
| énergie par activité | bas / central / haut |
| mix électrique | analyse de sensibilité |
| eau | proxy séparé |
| matériel | ACV partielle + `NA` pour le non attribuable |
| services SaaS | `NA` tant que les métriques manquent |
| images | `NA` pour le facteur |
| télémétrie incomplète | couverture explicitée |

Cette approche montre **où** se situe l'incertitude au lieu de la masquer derrière un pourcentage global.

## B.21 Reproductibilité

Une estimation est considérée reproductible si elle conserve :

- source de l'activité ;
- période ;
- statut de preuve ;
- formule ;
- coefficient ;
- unité ;
- version ou date du facteur ;
- arrondi appliqué ;
- exclusions ;
- risque de chevauchement avec un autre poste.

Forme minimale :

```text
INPUT
× FACTOR
= RESULT

INPUT_STATUS
FACTOR_STATUS
BOUNDARY
DATE
```

## B.22 Limites finales

Le rapport n'est ni :

- un audit énergétique d'OpenAI ;
- une mesure physique du GPU réellement sollicité ;
- une ACV certifiée ;
- une déclaration Scope 1/2/3 du fournisseur ;
- une mesure heure par heure du mix électrique.

Il s'agit d'une **évaluation de projet**, construite pour rendre les ordres de grandeur et les arbitrages explicites.

La chaîne centrale retenue est :

> **35 Md token-équivalents → ≈ 10 MWh → ≈ 3,7 tCO₂e électrique proxy → ≈ 45 m³ d'eau indirecte proxy → ≈ 5 tCO₂e en ACV partielle centrale de sensibilité.**

La règle finale est :

> **une hypothèse clairement identifiée est préférable à une fausse mesure ; une donnée `NA` est préférable à un chiffre sans attribution défendable.**
