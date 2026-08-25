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

`apps/web/src/lib/actions/pollution-score.ts`

Le score doit être présenté comme :

> Pollution constatée avant l'action

et non comme :

> Pollution actuelle

Les quantités collectées servent de proxy de l'état rencontré avant ou pendant l'action. Elles ne constituent pas une mesure instrumentale exhaustive de la pollution du lieu.

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

## 6. Calibration locale future

Lorsqu'un même lieu disposera de plusieurs observations fiables séparées dans le temps, CleanMyMap pourra estimer une vitesse locale de re-pollution.

Une calibration locale pourra alors remplacer le `T80` générique pour ce lieu. Le runtime prévoit déjà l'option `calibration.t80Days` sur la fonction de projection ; cette extension ne change ni le score historique ni le sens des champs affichés.

L'architecture doit permettre cette évolution sans changer le sens public des champs :

- pollution constatée avant l'action ;
- pollution projetée ;
- temps depuis la dernière action ;
- origine de la projection (`mesurée` ou `model_baseline`).

Le modèle générique décrit dans ce document reste le fallback des lieux sans historique suffisant ou sans calibration locale validée.

## 7. Couleurs de la carte d'actions

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

## 8. Grammaire géométrique

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

## 9. Lecture recommandée dans les tooltips et popups

Une action doit distinguer explicitement les informations historiques et projetées.

Exemple :

> - Pollution constatée avant l'action : 82/100
> - Temps depuis la dernière action : 31 jours
> - Pollution projetée : 63/100
> Estimation modélisée, pas une mesure en temps réel.

Le score projeté ne doit jamais être présenté comme une observation actuelle.

## 10. Limites du modèle

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

## 11. Transparence et versionnement

Toute modification durable de la méthodologie doit mettre à jour ensemble :

1. le code de calcul ;
2. les tests ;
3. la légende de la carte ;
4. la fiche canonique de `/actions/map` et le lien depuis `/methodologie` lorsque la page expose cette référence ;
5. ce document.

Les constantes de projection doivent être centralisées dans le code afin d'éviter toute divergence entre runtime, tests et documentation.

## 12. Sources internes

Sources de vérité techniques principales :

- `apps/web/src/lib/actions/pollution-score.ts` ;
- `apps/web/src/lib/actions/revisit-priority.ts` — projection, constantes et hook de calibration ;
- `apps/web/src/lib/actions/contract-model.ts` et `apps/web/src/lib/actions/contract-mappers.ts` — champ post-action optionnel ;
- `apps/web/src/components/actions/map-marker-categories.ts` ;
- `apps/web/src/components/actions/map/actions-map-geometry.utils.ts` ;
- `apps/web/src/components/actions/map/map-layers.tsx` ;
- `apps/web/src/components/actions/map/map-geometry-legend.tsx` ;
- `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx`.

Voir également :

- `documentation/product/SCIENTIFIC_PROTOCOL.md` ;
- `documentation/architecture/data-governance.md` lorsque le contrat de données concerné y est documenté.
