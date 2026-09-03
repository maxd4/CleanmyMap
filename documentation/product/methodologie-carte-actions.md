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

Le vert est réservé aux lieux explicitement déclarés propres (`clean_place`) ou à un état propre réellement représenté comme tel par le contrat.

Le vert ne doit pas être utilisé comme niveau de « faible pollution » d'une action.

## 2. Score de pollution constatée

Le score de pollution constatée est un proxy compris entre 0 et 100.

Il est dérivé des informations disponibles lors de l'action, notamment :

- masse de déchets collectée ;
- nombre de mégots collectés ;
- références de calibration utilisées par le runtime ;
- lorsque le contrat le prévoit, normalisation par le nombre de bénévoles.

Le runtime combine les contributions déchets et mégots selon le contrat de score courant. La méthode actuellement utilisée doit être lue directement dans :

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
dernière observation le … ». Le mode change uniquement l'état/source présenté :
il ne modifie ni le score historique, ni la palette, ni la grammaire
géométrique. Les polylines restent hors du rapprochement point/zone ; un spot
ponctuel ne peut pas recolorer un parcours.

## 9. Couleurs de la carte d'actions

La couleur d'une action représente la pollution projetée, pas l'identité du type `action`.

La progression visuelle est :

`bleu → orange → rouge → violet → noir`

avec :

- bleu : niveau faible ;
- orange : niveau moyen ;
- rouge : niveau fort ;
- violet : niveau critique ;
- noir : niveau extrême ;
- vert : lieu explicitement propre uniquement.

Les seuils et interpolations exacts doivent être centralisés dans le runtime et réutilisés par la carte, la légende et la page Méthodologie. Les repères de catégorisation actuels sont `0`, `30`, `60`, `80` et `100`, avec une interpolation continue entre les couleurs. Ils ne doivent pas être recopiés dans plusieurs composants.

Le choix des couleurs vise à rendre la progression immédiatement lisible tout en réservant le vert à une sémantique positive non ambiguë.

## 10. Grammaire géométrique

La couleur ne doit pas porter l'information de fiabilité géométrique. Cette information utilise d'autres canaux.

### Parcours

- trait plein : parcours déclaré ou connu ;
- trait pointillé : parcours indicatif ou reconstruit.

Le pointillé signifie donc « parcours reconstruit », pas « pollution incertaine ».

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
