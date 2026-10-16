# CleanMyMap : objectifs mesurables et progression collective

> **Statut : `PLAN`, hors chantier P0 des rapports mono-action.** Ce document regroupe la proposition prospective d'objectifs persistants, de campagnes et de progression. Rien ici ne prouve que les tables, liens ou écrans proposés sont implémentés.
>
> **Source antérieure :** sections « Objectifs mesurables » et « Deuxième onglet » de `reports-parameters-and-objectives.md`. Les paramètres de sélection des données sont décrits séparément dans [reports-generation-parameters.md](./reports-generation-parameters.md).

## Décision de périmètre

- Un **objectif** est une cible configurée, datée, rattachée à un périmètre et comparée à une mesure réelle ; ce n'est **pas** une valeur de référence codée en dur dans un rapport.
- L'objectif ne remplace ni les mesures terrain, ni les KPI canoniques, ni la qualité de données.
- Le lot P0 doit pouvoir générer un rapport fiable depuis une action terminée et admissible **sans table `impact_goals`**, sans campagne, sans nouveau flux communautaire.
- L'ancien document [« Objectifs non pertinents »](../../pages_site/routes/03-cartographie-impact/reports/reports-objectifs-non-pertinents.md) écarte les cibles figées et l'introduction des objectifs configurables **dans un lot de fiabilisation sémantique**. Il ne justifie pas à lui seul une interdiction définitive du futur projet ; un nouveau lot requiert néanmoins une décision produit explicite.

## Prérequis avant le développement

1. Justifier un usage réel de suivi d'objectif collectif et définir son propriétaire métier.
2. Auditer les sources existantes pour utilisateurs, organisations, campagnes, groupes, actions, événements, gamification et mesures, sans créer de doublons.
3. Définir les autorisations serveur de création, édition, consultation et agrégation, ainsi que les règles de données personnelles et de visibilité.
4. Définir la métrique avec unité, période, périmètre, provenance, limites et règle pour les valeurs absentes ou partiellement couvertes.
5. Décider où exposer les objectifs. La page `/reports` possède actuellement **Génération** et **Analyse** : ces onglets ne doivent pas être remplacés implicitement par la proposition ancienne de « deuxième onglet Objectifs & progression ».

## Spécification prospective des objectifs mesurables

### Principes : Logique d’objectifs

Les objectifs mesurables constituent une logique métier distincte des paramètres de génération.

Ils ne servent pas à décider quelles données existent, mais à définir **une cible à atteindre**, puis à comparer les résultats réels à cette cible.

Cette logique doit pouvoir être reliée à :

- la génération de rapports ;
- la gamification ;
- les campagnes et programmes ;
- les groupes de discussion communautaire ;
- les actions et événements associés.

---

### Principe

Un objectif doit être défini sur un périmètre métier explicite :

```text
Objectif
+ période
+ territoire
+ organisation
+ campagne ou groupe
+ métrique cible
+ valeur cible
```

Exemple :

```text
Objectif :
Collecter 1 000 kg de déchets

Période :
01/01/2026 → 31/12/2026

Organisation :
CleanMyMap

Campagne :
Programme dépollution 2026

Territoire :
Île-de-France
```

Le système calcule ensuite l’avancement à partir des données canoniques.

---

### Types d’objectifs proposés

| Objectif | Exemple |
|---|---|
| Nombre d’actions | réaliser 40 actions |
| Masse collectée | collecter 1 000 kg |
| Nombre de mégots | retirer 500 000 mégots |
| Nombre de bénévoles | mobiliser 1 500 bénévoles |
| Nombre de participants uniques | mobiliser 500 personnes différentes |
| Nouveaux bénévoles | recruter 200 primo-participants |
| Bénévoles récurrents | atteindre 100 bénévoles ayant participé à au moins 2 actions |
| Temps bénévole | atteindre 2 000 heures d’engagement |
| Territoires couverts | intervenir dans 15 communes |
| Signalements traités | résoudre 500 signalements |
| Taux de résolution | résoudre 80 % des signalements ciblés |
| Distance parcourue | couvrir 500 km de terrain |
| Surface couverte | traiter 1 000 000 m² si la mesure devient canonique |
| Événements organisés | organiser 20 événements |
| Participation événementielle | atteindre 1 000 présences réelles |
| Qualité des données | atteindre 95 % d’actions sans anomalie bloquante |

Les objectifs doivent conserver la distinction entre données mesurées, dérivées, estimées et indisponibles.

---

### Stockage recommandé

Les objectifs ne doivent pas être stockés dans le payload d’un rapport.

Ils doivent être des objets métier persistants.

Structure conceptuelle :

```text
impact_goals
- id
- title
- description
- metric_type
- target_value
- unit
- start_date
- end_date
- territory_scope
- organization_id
- campaign_id
- created_by
- status
- created_at
- updated_at
```

Relations possibles :

```text
goal_campaigns
goal_organizations
goal_community_groups
goal_actions
```

Le modèle exact devra être décidé après audit des entités existantes afin d’éviter toute duplication.

---

### Lien avec les campagnes

Une campagne peut porter plusieurs objectifs.

Exemple :

```text
Programme mégots — Paris 15

Objectifs :
- 100 actions
- 250 000 mégots retirés
- 500 bénévoles mobilisés
- 80 % des signalements ciblés résolus
```

Le rapport de campagne doit pouvoir présenter automatiquement l’avancement de ces objectifs.

---

### Lien avec la gamification

Les objectifs doivent pouvoir devenir des défis collectifs sans créer une seconde logique de calcul.

Principe :

```text
objectif métier canonique
        ↓
calcul d’avancement
        ↓
gamification
```

La gamification peut utiliser l’avancement pour :

- afficher une jauge collective ;
- déclencher des paliers ;
- attribuer des badges ;
- attribuer des récompenses ou XP lorsque les règles existantes le permettent ;
- créer des défis temporaires ;
- célébrer l’atteinte d’un objectif ;
- comparer la contribution individuelle au résultat collectif sans modifier la donnée source.

#### Invariant

Les règles de gamification ne doivent jamais devenir la source de vérité des métriques d’impact.

Elles consomment les mêmes métriques canoniques que les rapports.

---

### Lien avec les groupes de discussion communautaire

Un objectif doit pouvoir être associé à un groupe ou canal communautaire.

Exemple :

```text
Groupe :
Défi mégots — Paris 15

Objectif :
250 000 mégots retirés avant le 31 décembre

Progression :
187 420 / 250 000
```

Le groupe peut afficher automatiquement :

- la cible ;
- l’avancement ;
- les dernières actions contributrices ;
- les nouveaux paliers atteints ;
- les événements liés ;
- les prochains besoins ;
- les annonces de réussite.

#### Principe d’architecture

Le groupe communautaire ne calcule pas lui-même l’objectif.

Il consomme le même service d’avancement que :

- `/reports` ;
- la gamification ;
- les pages de campagne ;
- les éventuelles notifications.

---


## Présentation produit future : emplacement à arbitrer

La proposition historique plaçait « Rapports d’impact » et « Objectifs & progression » dans deux onglets. Elle omettait cependant l'onglet **Analyse** effectivement présent dans `/reports`. Cette composition à deux onglets ne doit donc pas être appliquée telle quelle.

Possibilités à évaluer après vérification des usages : un troisième onglet `Objectifs & progression` dans `/reports`, ou une surface dédiée reliée aux campagnes et aux groupes. Aucune route supplémentaire ni navigation définitive n'est décidée ici.

### Fonctionnalités attendues pour une future surface « Objectifs & progression »

La surface future sera dédiée à la création et au suivi d’objectifs mesurables. Son emplacement n’est pas décidé.

Fonctions cibles :

- créer un objectif ;
- choisir sa métrique ;
- définir sa valeur cible ;
- définir son unité ;
- choisir sa période ;
- définir son territoire ;
- l’associer à une organisation ;
- l’associer à une campagne ;
- l’associer à un groupe communautaire ;
- suivre sa progression ;
- voir les actions qui contribuent à l’objectif ;
- voir les événements qui contribuent à l’objectif ;
- voir les paliers de gamification associés ;
- visualiser les objectifs atteints, actifs, en retard ou archivés.

---


### Vue synthétique proposée

Chaque objectif peut être affiché sous forme de carte :

```text
Programme mégots — Paris 15

187 420 / 250 000 mégots
74,9 %

Échéance : 31/12/2026

[Voir le détail]
```

Une carte peut également afficher :

- état : en avance / dans le rythme / en retard / atteint ;
- contribution des dernières actions ;
- nombre de contributeurs ;
- campagne associée ;
- groupe communautaire associé.

---

### États d’un objectif

États proposés :

```text
draft
active
completed
paused
cancelled
archived
```

Un objectif ne doit être considéré comme atteint que par le calcul canonique de sa métrique.

---

### Progression

La progression doit être déterministe :

```text
progress = valeur comparable et admissible du périmètre / valeur cible
```

avec gestion explicite :

- des unités ;
- de la période ;
- du périmètre ;
- de la provenance des données ;
- des valeurs indisponibles ;
- des données estimées ;
- des limites méthodologiques.

Aucun objectif ne doit transformer une donnée manquante en zéro si le modèle canonique considère la donnée comme indisponible.

---

## Architecture logique cible

```text
Sources canoniques d'actions et de participations
                  │
                  ▼
          Métriques dérivées
                  │
                  ▼
    Objectif métier persistant (futur)
          │        │         │
          ▼        ▼         ▼
       Rapports  Communauté  Gamification
```

L'interface `/reports` conserve ses onglets `Génération` et `Analyse` tant qu'aucune décision de navigation distincte n'est validée.

## Invariants

1. Les objectifs sont des objets métier distincts des filtres de rapport et des snapshots PDF.
2. Une seule source canonique fournit chaque métrique. Les vues communautaires et la gamification la consomment sans recalcul concurrent.
3. L'état `atteint` exige une mesure admissible et comparable, sur la période et le périmètre de l'objectif.
4. Le rapport ne fabrique jamais un zéro, un nombre de participants uniques ou une performance lorsque les données sont absentes, tronquées ou incohérentes.
5. Une division de progression n'est calculable que si la valeur cible est strictement positive et que les unités sont compatibles. Sinon la progression est indisponible, et non égale à 0 %.
6. Les nouveaux liens vers groupes, campagnes et structures passent par leurs propriétaires canoniques et leur AuthZ serveur.
7. Une éventuelle place des objectifs dans la navigation reste une décision UX distincte ; ne pas effacer l'onglet Analyse existant.
8. Les tables et relations esquissées ci-dessus restent des hypothèses d'architecture jusqu'à l'audit et la décision d'intégration.

## Condition de lancement d'un lot ultérieur

Ouvrir ce chantier seulement après démonstration du parcours d'action, de la génération fiable et de la relecture historique du rapport. Le lot devra produire un contrat de données vérifié, un cas d'usage pilote, un contrôle d'AuthZ et un calcul de progression testable avant tout changement d'interface.
