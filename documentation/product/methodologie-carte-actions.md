# Méthodologie de la carte d'actions

Ce document décrit la méthodologie de lecture de la carte d'actions de CleanMyMap.

Il complète le protocole scientifique général du projet et doit rester aligné avec le code runtime. En cas de divergence entre ce document et le code exécuté, le code constitue la source de vérité immédiate et la documentation doit être corrigée dans le même chantier.

## 1. Ce que représente la carte

La carte distingue deux lectures temporelles qui ne doivent pas être confondues.

### Calque Actions

Le calque Actions représente la mémoire territoriale des interventions réalisées ou documentées.

Pour une action, la carte peut afficher :

- le lieu ou l'emprise de l'intervention ;
- le niveau de pollution constaté avant l'action à partir des données disponibles ;
- une projection de re-pollution fondée sur le niveau historique et le temps écoulé ;
- la date de la dernière action ;
- les résultats collectés ;
- la qualité et l'origine de la géométrie.

La couleur d'une action n'est donc pas une mesure en temps réel de l'état du lieu.

### Calque Trash Spotter

Le calque Trash Spotter représente les signalements de pollution actuellement observée et encore actionnable.

Il sert de lecture opérationnelle de la pollution signalée, distincte de la mémoire historique des actions.

### Lieux propres

Le vert est réservé aux zones explicitement déclarées propres (`clean_place`).
Il ne signifie ni score nul, ni score très faible, ni absence de donnée, ni
géométrie en cours d'édition.

Le vert ne doit pas être utilisé comme niveau de « faible pollution » d'une action.

### Participants et unités opérationnelles

Les nouvelles actions collectent séparément trois catégories, sans âge exact ni
date de naissance : `childrenCount`, `adultCount` et `retiredCount`. Le nombre
public de participants est le total réel des personnes :

`participantsCount = childrenCount + adultCount + retiredCount`.

Cette valeur est conservée dans `volunteersCount` pour les surfaces de
participation, les KPI et les contrats scientifiques qui comptent des personnes.
Elle ne doit pas être remplacée par une unité pondérée.

Les indicateurs opérationnels qui mesurent une charge en temps peuvent utiliser
la dérivation distincte :

`effectiveVolunteerUnits = adultCount + 0,5 × childrenCount + 0,5 × retiredCount`.

La pondération est versionnée sous `effective-volunteer-units-v1` et centralisée
dans `apps/web/src/lib/actions/volunteer-participation.ts`. Le coefficient `1`
est l'unité de référence d'un adulte ; les coefficients `0,5` appliqués à un
enfant et à une personne retraitée sont une hypothèse métier d'efficacité
opérationnelle relative. Ils servent à représenter une contribution moyenne
estimée à la moitié de l'unité adulte dans les tâches de dépollution lorsque le
système ne collecte pas de mesure individuelle plus fine. Cette pondération ne
prétend pas que chaque enfant ou personne retraitée est exactement deux fois
moins efficace qu'un adulte : elle fournit une approximation commune, explicite
et versionnée pour les indicateurs qui ont besoin d'une unité opérationnelle.
Elle ne doit pas être lue comme une mesure de la valeur des personnes, de leur
engagement ou de leur performance individuelle. Une modification de cette
hypothèse doit faire évoluer la version de la formule et être motivée par une
décision métier documentée.

Les trois catégories ont aussi une fonction descriptive : elles permettent
d'estimer la répartition des générations de bénévoles mobilisées sur les actions
de dépollution lorsque les trois valeurs sont connues. Cette répartition décrit
la composition des groupes ; elle ne remplace ni le nombre réel de participants,
ni une analyse démographique exhaustive, et ne doit pas être utilisée pour
inférer une efficacité individuelle.

Les catégories sources restent persistées séparément dans les métadonnées
canoniques ; aucune répartition n'est reconstruite pour une action historique.
Pour une ancienne action qui ne possède que `volunteersCount`, ce nombre reste
le nombre historique de participants, les trois catégories et les unités
opérationnelles restent inconnues (`NULL`). Il est interdit de supposer que ces
participants étaient adultes. Le contrat détaillé de stockage et de compatibilité
est défini dans `documentation/architecture/data-governance.md`.

Les champs de durée gardent leur précision réelle pour le stockage et les
calculs. Sur les surfaces de synthèse destinées aux bénévoles, l'affichage
peut être arrondi au quart d'heure le plus proche pour faciliter la lecture ;
les horaires source, la valeur stockée et tous les calculs restent exacts à la
minute. Cette convention UX ne s'applique pas aux éditions, exports, contrôles
administratifs ou preuves techniques qui attendent la minute exacte. Le
contrat détaillé est défini dans
[`data-governance.md`](../architecture/data-governance.md).

## 2. Score de pollution constatée

Le score de pollution constatée est un proxy compris entre 0 et 100.

Il est dérivé des informations disponibles lors de l'action, notamment :

- masse de déchets collectée ;
- nombre de mégots collectés ;
- références de calibration utilisées par le runtime ;
- normalisation par bénévole selon le dénominateur historique sûr
  `max(1, volunteersCount)` ; la durée n'entre pas dans la formule et ne fait
  pas partie de la population de référence pré-77.

Le runtime calcule deux composantes indépendantes : l'intensité de déchets en
kg par bénévole et l'intensité de mégots en mégots par bénévole.
Chaque composante est comparée à sa référence globale maximale, puis bornée
entre 0 et 100. Le score historique retient la composante exploitable la plus
élevée ; une métrique absente reste indisponible et, lorsqu'aucune composante
n'est exploitable, le score est indisponible. La méthode actuellement utilisée
doit être lue directement dans :

`apps/web/src/lib/actions/pollution/pollution-score.ts`

Le score doit être présenté comme :

> Pollution constatée avant l'action

et non comme :

> Pollution actuelle

Les quantités collectées servent de proxy de l'état rencontré avant ou pendant l'action. Elles ne constituent pas une mesure instrumentale exhaustive de la pollution du lieu.

Dans l'interface, ce score reste une valeur interne comprise entre 0 et 100,
mais il est affiché en pourcentage (`x %`). La règle commune de formatage est
documentée dans [`ui-score-formatting.md`](../design-system/ui-score-formatting.md).

## 3. État post-action

La projection distingue :

- `S` : score de pollution constatée avant l'action ;
- `S_post` : score observé après l'action lorsqu'une mesure post-action fiable existe ;
- `t` : nombre de jours écoulés depuis l'action.

Une vraie mesure post-action doit toujours être prioritaire.

Le contrat de données prévoit le champ optionnel `postActionPollutionScore` (projeté vers `post_action_pollution_score` dans les objets de carte). L'absence de ce champ signifie qu'aucune mesure résiduelle explicite n'est disponible ; elle ne signifie pas que le lieu a été mesuré propre après l'action.

Pour une action terminée sans mesure post-nettoyage explicite, le modèle générique peut utiliser :

`S_post = 0`

Cette valeur est une hypothèse de modélisation signifiant « action considérée comme ayant remis le lieu à un état propre de référence ». Elle ne doit jamais être présentée comme une mesure réellement effectuée.

## 4. Projection non linéaire de re-pollution

Un lieu historiquement très pollué est supposé pouvoir retrouver rapidement un niveau élevé, tandis qu'un lieu faiblement pollué est supposé évoluer plus lentement.

La projection générique utilise donc une vitesse dépendante du score historique.

### Temps de retour à 80 % du niveau historique

Pour un score historique `S` compris entre 0 et 100 :

`T80(S) = 28 + 152 × (1 - S / 100)²`

`T80` est exprimé en jours.

Il représente le temps nécessaire au modèle pour parcourir environ 80 % de l'écart entre l'état post-action et le niveau historiquement observé.

Ordres de grandeur :

| Score historique S | T80 approximatif |
|---:|---:|
| 20 | 125 jours |
| 50 | 66 jours |
| 80 | 34 jours |
| 100 | 28 jours |

### Score de pollution projetée

La projection est :

`P(t) = S_post + (S - S_post) × (1 - exp(-ln(5) × t / T80(S)))`

avec :

- `P(t)` : pollution projetée au jour `t` ;
- `S` : pollution constatée avant l'action ;
- `S_post` : état post-action observé ou hypothèse de modèle ;
- `t` : jours écoulés depuis l'action.

Avec `S_post = 0`, après 30 jours, les ordres de grandeur sont :

| Score historique S | Pollution projetée à 30 jours |
|---:|---:|
| 20 | ≈ 6 |
| 50 | ≈ 26 |
| 80 | ≈ 61 |
| 100 | ≈ 82 |

Ces valeurs sont des estimations issues du modèle. Elles ne constituent pas des observations terrain.

## 5. Pourquoi une progression non linéaire

Une pénalité temporelle additive linéaire identique pour tous les lieux créerait une hypothèse peu crédible : elle supposerait que tous les espaces se re-polluent à la même vitesse.

Le modèle non linéaire encode au contraire l'hypothèse suivante :

- un lieu historiquement peu pollué nécessite plusieurs mois avant de retrouver un niveau projeté significatif ;
- un hotspot historiquement très pollué peut retrouver un niveau élevé en quelques semaines ;
- lorsque `S_post ≤ S`, la projection converge vers `S` sans le dépasser ; une mesure post-action supérieure à `S` reste bornée à 100 par le runtime.

Cette relation est une heuristique produit versionnée. Elle devra être recalibrée lorsque CleanMyMap disposera de suffisamment d'observations répétées.

## 6. Confiance des projections

Le runtime expose un resolver pur `resolveProjectionConfidence`. Il qualifie la robustesse des données d'entrée disponibles pour une projection ; il ne donne ni une probabilité de justesse, ni une validation empirique du modèle. La validation statistique reste le rôle futur du ledger d'erreur.

Les facteurs exposés sont :

- `geometry.confidence`, classée selon les seuils runtime de géométrie fiable et documentée ;
- la source de `S_post` (`measured` ou `model_baseline`) ;
- la calibration locale et son nombre d'intervalles valides ;
- la complétude déclarée de l'historique (`complete` ou `partial`).

Le niveau `high` exige simultanément une géométrie fiable, un `S_post` mesuré, une calibration locale avec au moins le nombre runtime d'intervalles requis pour une preuve forte, et un historique complet. Le niveau `medium` est attribué lorsque plusieurs preuves solides sont réunies sans satisfaire toutes ces conditions. Le niveau `low` est le défaut pour une projection générique, une géométrie approximative ou inconnue, une calibration insuffisante ou une source partielle.

Les constantes de ce resolver sont centralisées dans `PROJECTION_CONFIDENCE_CONSTANTS` : seuil de géométrie fiable, seuil de géométrie documentée, minimum d'intervalles locaux pour une preuve forte et minimum de preuves solides pour `medium`. Le minimum local est partagé avec le seuil d'override de la calibration existante ; la carte ne duplique donc pas cette règle.

La carte affiche cette information de manière neutre sous la forme « Confiance faible », « Confiance moyenne » ou « Confiance élevée ». Elle ne modifie jamais la couleur, l'opacité, l'épaisseur ou le style des tracés selon ce niveau : la palette reste exclusivement pilotée par le score de pollution projetée. Le read path cartographique actuellement partiel ne peut pas produire une confiance élevée par déduction.

## 7. Calibration locale de la vitesse de re-pollution

Le runtime possède une capacité domaine pure qui peut apprendre un `T80` local à partir de plusieurs actions terminées. Elle ne crée pas encore d'identifiant canonique de lieu, de `place_id` persistant, de table Supabase ou de migration. Chaque groupe expose une identité explicitement dérivée : `derivedPlaceKey`. Cette clé est remplaçable par un futur identifiant canonique sans changer l'API publique de projection.

### Rapprochement conservateur

Seules les actions `approved` dont `actionPhase` vaut `post_action_complete`, dont la qualité n'est pas bloquante, et qui disposent de coordonnées, d'une date observée et d'un libellé exploitable sont candidates. Les points et polygones sont traités ; les polylines/parcours sont exclus de ce premier apprentissage afin de ne pas transformer un long itinéraire en un seul lieu.

La distance spatiale est le critère principal. Les seuils sont centralisés dans `apps/web/src/lib/actions/pollution/local-repollution-calibration.ts` :

- à au plus `nearDistanceMeters` (valeur runtime actuelle : 20 m), le rapprochement ne dépend pas du libellé ;
- au-delà et jusqu'à `labelRequiredDistanceMeters` (60 m actuellement), les libellés normalisés doivent être compatibles ;
- au-delà, les observations ne sont jamais fusionnées, même si leurs noms sont identiques.

Le regroupement et sa clé sont déterministes indépendamment de l'ordre d'entrée. Les observations d'un lieu dérivé sont ensuite triées par `observedAt` pour former des intervalles consécutifs.

### Estimation inverse

Pour un intervalle valide, le runtime reprend le même modèle canonique que la projection générique. Avec `S` le score historique de l'action précédente, `S_post` sa mesure post-action réelle ou le baseline documenté `0`, `S_next` le score historique observé ensuite et `deltaDays` le temps écoulé :

`f = (S_next - S_post) / (S - S_post)`

`T80_local = -ln(5) × deltaDays / ln(1 - f)`

Une estimation numérique n'est conservée que si `deltaDays` atteint le minimum runtime de 7 jours, que le dénominateur est exploitable et que `0 < f < 1`. Les observations suivantes au moins aussi élevées que la précédente sont conservées séparément comme preuve de re-pollution rapide, sans leur fabriquer un `T80` exact. Les valeurs locales sont bornées par les constantes runtime actuelles de 7 à 365 jours.

Pour plusieurs intervalles valides, le runtime utilise leur médiane plutôt que leur moyenne. Une seule estimation est exposée comme confiance `low` informative mais ne remplace pas le fallback. L'override `local_history` est activé uniquement à partir de 2 intervalles valides (`medium`) ; la confiance devient `high` à partir de 4. Sinon, la provenance exposée reste `generic` et la formule `T80(S)` générique est utilisée. Le temps écoulé n'est jamais appliqué deux fois.

### Complétude de la source

La carte lit actuellement un flux borné par une fenêtre temporelle, une limite et éventuellement un viewport. Cette lecture ne garantit donc pas un historique complet. La capacité accepte explicitement `sourceCompleteness: "complete" | "partial"` et refuse toute calibration locale lorsque la source est `partial` ; une vue partielle ne peut pas activer silencieusement un apprentissage. Le seam est prêt pour un futur read path qui pourra prouver la complétude de l'historique avant de passer `complete`.

Le modèle générique reste donc le fallback des lieux sans historique complet, avec moins de 2 intervalles valides ou avec une calibration hors bornes. Cette calibration locale est une heuristique versionnée, pas une mesure en temps réel.

## 8. Résolution de l'état courant par lieu

Le runtime expose un resolver pur `resolveCurrentPlaceStates` qui produit un
`CurrentPlaceState` déterministe pour chaque identité de lieu dérivée. Il
réutilise les mêmes prédicats de validité et les mêmes règles spatiales que la
calibration locale ; il ne crée pas de `place_id`, ne fusionne pas les lignes
sources et ne supprime aucun enregistrement.

La priorité de résolution est :

1. observation terrain récente ;
2. projection issue de la dernière action ;
3. observation historique lorsqu'aucune projection exploitable n'est disponible.

Une action quantitative plus récente peut donc remplacer l'état projeté issu
d'une action précédente. Un Trash Spotter qualitatif produit un état
`observed` avec `scoreKind: unavailable` et le libellé
`Pollution observée · niveau non quantifié` ; le resolver ne fabrique jamais un
score à partir du seul type ou d'une catégorie de déchets. Un `clean_place`
récent produit un état explicitement propre, également sans score de pollution.
Une observation antérieure à la dernière action ne peut pas remplacer sa
projection.

Chaque état conserve son `record`, son `recordSource`, sa date, sa provenance,
sa date de dernière action et la liste des `historicalActions` du lieu dérivé.
Pour un état projeté, `scoreKind` vaut `projected`; pour une mesure quantitative,
`measured`; pour un Trash Spotter qualitatif ou un lieu propre, `unavailable`.
Les polylines ne sont pas des ancres de lieu : un spot ponctuel proche d'un
parcours reste un état séparé et ne recolore pas toute la route.

Le contrat prévoit dès maintenant le champ optionnel
`metadata.observedPollutionScore` pour une future observation Trash Spotter
réellement mesurée. Le read path actuel ne le renseigne pas et aucune donnée de
persistance n'est inventée.

### Lectures « Observé » et « Projeté aujourd'hui »

Le contrôle compact de la carte propose deux lectures du même état courant,
résolues par `resolveCurrentPlaceStateViews` à partir des mêmes contrats
sources :

- **Observé** affiche uniquement la dernière observation terrain réellement
  disponible. Une mesure `S_post` est alors l'observation post-action la plus
  récente ; le baseline `S_post = 0` du modèle n'est jamais affiché comme une
  observation. Un Trash Spotter qualitatif reste « Pollution observée · niveau
  non quantifié » et un `clean_place` reste explicitement propre.
- **Projeté aujourd'hui** calcule l'état à la date courante avec la projection
  existante et la calibration locale lorsqu'elle est activable. Une observation
  terrain plus récente remplace toujours la projection, y compris dans cette
  lecture.

La provenance affichée est donc « Observé le … » ou « Projeté aujourd'hui ·
dernière observation le … ». Cette lecture temporelle reste disponible
uniquement avec la référence globale.

### Références de score

Le contrat expose une référence **Globale** et, lorsque les données le
permettent, une référence départementale. Elles sont produites ensemble par la
RPC versionnée `action_pollution_score_references_v2()` et capturées une fois
par semaine dans le snapshot `map-pollution-score-references` ; la carte lit ce
snapshot une seule fois et ne fait aucun fetch par action.

Pour chaque action de référence, l'intensité est calculée par bénévole avec le
dénominateur historique sûr `max(1, volunteersCount)` :
`quantité / bénévoles`. Les composantes déchets et mégots sont normalisées
séparément par leur référence maximale, puis le score historique retient la
composante la plus élevée parmi celles réellement exploitables. Une mesure
égale à zéro reste une mesure valide ; une métrique absente reste indisponible.
Le score global conserve cette référence maximale à l'échelle de toutes les
actions de référence. La population restaurée est `status = 'approved'`.
La visibilité publique actuelle ajoute `moderation_visibility = 'visible'` à
la RPC, uniquement pour respecter la frontière de sécurité des surfaces
publiques. Aucun filtre supplémentaire `duration_minutes > 0`,
`action_phase` ou date n'appartient à ce contrat, et la RPC ne transforme pas
la formule en bénévole-heure.

Cette distinction s'applique aussi aux agrégats Impact, aux rapports et aux
comparaisons temporelles : `waste_kg = 0` signifie une mesure nulle, tandis que
`waste_kg = NULL` signifie que la masse n'a pas été renseignée. Une somme peut
représenter les seules valeurs connues, mais elle doit conserver le nombre
d'actions éligibles, le nombre de masses connues et le taux de couverture. Une
masse de mégots, même qualifiée, reste distincte de `waste_kg` et les mesures
exposent séparément compteur, masse, volume, état et provenance. Une masse brute
de `1,2 kg` peut donc conserver un nombre dérivé de `3000` avec la provenance
`weight_converted` et sa version de formule sans remplacer une éventuelle valeur
de comptage brute. Un volume sans relation de conversion fiable reste stocké
seul, avec les dérivés à `NULL`.

Le score `departmentRelativeScore` est une comparaison relative interne à un
`department_code` conservé comme chaîne (par exemple `01`, `2A`, `2B` ou un
code ultramarin). Sa référence est le maximum de l'intensité par bénévole
dans ce département, avec un nombre de sources conservé séparément pour les
déchets et les mégots. Une comparaison départementale exige au moins deux
actions éligibles. Lorsqu'un département ou une composante n'atteint pas ce
minimum, le statut `insufficient_data` est exposé et aucun score artificiel de
100 n'est produit ; une autre composante suffisamment documentée peut toutefois
rester exploitable. Un département absent des références reste indisponible.

`departmentRelativeScore` ne signifie donc pas « pollution actuelle » et ne
remplace jamais le score global. Il est interdit de le transmettre à `T80(S)`,
à la calibration locale de re-pollution, au ledger d'évaluation ou à un modèle
de projection. La projection temporelle reçoit exclusivement le
`combinedGlobalScore` global historique, puis applique exactement la formule de
re-pollution existante.

Sans référence globale v2 positive, aucun ancien défaut d'unité différente
n'est réutilisé : le score reste indisponible. La référence globale conserve
la projection temporelle décrite ci-dessus.
Les polylines restent hors du rapprochement point/zone ; un spot ponctuel ne
peut pas recolorer un parcours.

## 9. Couleurs de la carte d'actions

La couleur d'une action représente la pollution projetée, pas l'identité du type `action`.

La progression visuelle est :

`bleu → orange → rouge → violet → noir`

avec :

- bleu : premier seuil de pollution ;
- orange : seuil suivant de pollution ;
- rouge : niveau fort ;
- violet : niveau critique ;
- noir : niveau extrême ;
- vert : lieu explicitement propre uniquement.

Les seuils et interpolations exacts doivent être centralisés dans le runtime et réutilisés par la carte, la légende et la page Méthodologie. Les repères de catégorisation actuels sont `0`, `30`, `60`, `80` et `100`, avec une interpolation continue entre les couleurs. Ils ne doivent pas être recopiés dans plusieurs composants.

Le choix des couleurs vise à rendre la progression immédiatement lisible tout en réservant le vert à une sémantique positive non ambiguë.

Sur le plan clair, le niveau extrême conserve son noir canonique. Sur le plan
contrasté sombre, ce même niveau est affiché en blanc pour rester lisible ; les
autres parcours et contours de zones reçoivent un casing blanc très fin. Cette
adaptation de contraste ne crée ni catégorie ni score supplémentaire : la
couleur reste pilotée exclusivement par la pollution.

Pendant la création ou l'édition dans `ActionDrawingMap`, les parcours et les
zones sont affichés en gris foncé neutre. Cette prévisualisation représente la
géométrie en cours d'édition ; elle ne prédit ni le score final, ni la palette
scientifique, ni l'état `clean_place`.

## 10. Grammaire géométrique

La couleur ne doit pas porter l'information de fiabilité géométrique. Cette information utilise d'autres canaux.

### Parcours

- trait plein : parcours déclaré ou connu ;
- trait pointillé : parcours indicatif ou reconstruit.

Le pointillé signifie donc « parcours reconstruit », pas « pollution incertaine ».

Pour une action sans géométrie réelle, le serveur construit une boucle piétonne
fermée autour de l'origine à partir d'un petit nombre borné de points et de la
distance cible. La distance cible est éditable dans `/actions/new` et vaut par
défaut `durée en minutes / 60` (soit environ 1 km par heure). La distance finale
affichée, lorsqu'elle existe, est celle retournée par FOSSGIS/OSRM et reste
distincte de cette cible. Une réponse réseau porte la source `routed`; un repli
local déterministe porte `estimated_route` et ne doit pas être présenté comme
un parcours mesuré.

La priorité de géométrie est : tracé réel dessiné ou importé, parcours
opérationnel réel, reconstruction réseau serveur, repli estimé explicite, puis
localisation ponctuelle. Aucun appel de routage n'est effectué depuis le
navigateur et les anciennes polylignes synthétiques courtes ne sont plus
produites par le resolver générique.

### Zones

- polygone rempli avec bord plein : zone d'action ;
- zone de référence fiable : remplissage plus net ;
- zone indicative ou estimée : remplissage plus transparent et libellé explicite `Zone indicative`.

Un polygone estimé ne doit pas devenir pointillé.

### Localisation seule

Lorsqu'aucune géométrie exploitable n'existe, la carte affiche un point de localisation.

### Sélection

L'épaisseur du trait peut augmenter pour indiquer la sélection de l'objet.

L'épaisseur ne doit pas être utilisée pour encoder la pollution.

## 11. Lecture recommandée dans les tooltips et popups

Une action doit distinguer explicitement les informations historiques et projetées.

Exemple :

> - Pollution constatée avant l'action : 82 %
> - Temps depuis la dernière action : 31 jours
> - Pollution projetée : 63 %
> Estimation modélisée, pas une mesure en temps réel.

Le score projeté ne doit jamais être présenté comme une observation actuelle.

## 12. Limites du modèle

La projection actuelle ne connaît pas nécessairement :

- fréquentation réelle du lieu ;
- météo ;
- événements ponctuels ;
- saisonnalité ;
- travaux ou changements d'aménagement ;
- nouvelles politiques de propreté ;
- nouveaux signalements non encore rapprochés de l'action ;
- fréquence réelle de re-pollution propre à chaque lieu.

Elle doit donc être comprise comme une aide à la priorisation et à la revisite, pas comme une mesure scientifique de la pollution actuelle.

Trash Spotter reste la source opérationnelle des signalements de pollution actuellement observée.

## 13. Évaluation du modèle

Le dataset réel actuel contient 5 actions réparties sur 5 lieux différents. Il n'existe donc pas encore de répétition temporelle suffisante pour mesurer sérieusement une erreur globale, valider empiriquement la projection ou recalibrer ses constantes.

CleanMyMap prépare un protocole prospectif, sans fuite temporelle :

`projection figée juste avant la nouvelle observation → nouvelle observation quantitative → erreur → agrégation statistique → recalibration future`

Pour une nouvelle observation quantitative exploitable, la capacité domaine `evaluateRepollutionPredictionBeforeObservation` :

1. conserve uniquement les observations strictement antérieures à son timestamp ;
2. rapproche le lieu avec les règles spatiales centralisées de la calibration locale ;
3. choisit le dernier état antérieur exploitable ;
4. applique une calibration locale seulement si elle pouvait déjà être construite à partir de cet historique antérieur complet ;
5. calcule la projection au timestamp cible, puis la compare au score réellement observé.

Les métriques élémentaires conservées sont :

- `signedError = observedScore - projectedScore` ;
- `absoluteError = abs(signedError)` ;
- `squaredError = signedError²`.

Un pourcentage d'erreur n'est pas utilisé comme métrique principale, car il devient instable lorsque le score observé est proche de zéro. Lorsque des évaluations existent, une fonction descriptive peut calculer `sampleCount`, MAE, RMSE et le biais signé. Avec zéro évaluation, le résultat reste explicitement `insufficient_data`.

Une observation non quantifiée, un Trash Spotter actuel, un lieu non rapprochable ou un historique insuffisant produit un résultat `not_evaluable` explicite. Une catégorie de déchet ou le seul type `spot` ne peut jamais être transformé en score arbitraire.

Le ledger append-only conserve la version du modèle et le snapshot des paramètres nécessaires à la reproductibilité. L'idempotence est définie par l'observation évaluée et la version du modèle. La clé `derivedPlaceKey`, lorsqu'elle est conservée, reste un snapshot diagnostique et ne devient pas une identité métier durable.

Aucune recalibration automatique ni optimisation des constantes globales n'est active. Les métriques produisent de l'évidence pour une décision future ; elles ne modifient jamais `T80(S)`, ses constantes ou la calibration locale existante.

## 14. Transparence et versionnement

Toute modification durable de la méthodologie doit mettre à jour ensemble :

1. le code de calcul ;
2. les tests ;
3. la légende de la carte ;
4. la fiche canonique de `/actions/map` et le lien depuis `/methodologie` lorsque la page expose cette référence ;
5. ce document.

Les constantes de projection doivent être centralisées dans le code afin d'éviter toute divergence entre runtime, tests et documentation.

## 15. Sources internes

Sources de vérité techniques principales :

- `apps/web/src/lib/actions/pollution/pollution-score.ts` ;
- `apps/web/src/lib/actions/pollution/revisit-priority.ts` — projection, constantes et hook de calibration ;
- `apps/web/src/lib/actions/pollution/local-repollution-calibration.ts` — rapprochement dérivé, intervalles, médiane, confiance et garde de complétude ;
- `apps/web/src/lib/actions/pollution/current-place-state.ts` — état courant déterministe par lieu, priorité observation/projection/historique et seam Trash Spotter quantifié ;
- `apps/web/src/lib/actions/pollution/repollution-prediction-evaluation.ts` — évaluation prospective sans fuite temporelle et agrégat descriptif ;
- `apps/web/src/lib/actions/pollution/repollution-prediction-evaluation-store.ts` — écriture serveur idempotente du ledger append-only ;
- `apps/web/src/lib/actions/contracts/contract-model.ts` et `apps/web/src/lib/actions/contracts/contract-mappers.ts` — champs post-action et futur score Trash Spotter optionnels ;
- `apps/web/src/components/actions/map-marker-categories.ts` ;
- `apps/web/src/components/actions/map/actions-map-geometry.utils.ts` ;
- `apps/web/src/components/actions/map/map-layers.tsx` ;
- `apps/web/src/components/actions/map/map-geometry-legend.tsx` ;
- `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx`.

Voir également :

- `documentation/product/SCIENTIFIC_PROTOCOL.md` ;
- `documentation/architecture/data-governance.md` lorsque le contrat de données concerné y est documenté.
