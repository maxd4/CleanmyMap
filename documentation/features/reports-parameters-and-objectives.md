# CleanMyMap — Paramètres de génération des rapports d’impact

## Statut du document

Ce document définit la logique cible des **paramètres de génération** de la page `/reports`.

Il ne définit pas :

- la composition exacte du rapport ;
- les chapitres présents ou absents ;
- les effets des niveaux de détail `Concis`, `Par défaut` et `Exhaustif`.

Ces trois sujets restent des logiques distinctes.

---

# Partie I — Paramètres obligatoires

Les six catégories ci-dessous constituent le socle principal de configuration d’un rapport. Elles doivent rester visibles directement dans l’interface de génération.

## 1. Période

La période est le filtre temporel principal du rapport.

### Paramètres proposés

| Paramètre | Options proposées | État |
|---|---|---|
| Période prédéfinie | 30 jours / 3 mois / 6 mois / 12 mois / année en cours / historique complet | Déjà récupérable |
| Dates personnalisées | Du `JJ/MM/AAAA` au `JJ/MM/AAAA` | Déjà récupérable |
| Année | 2025, 2026, etc. | Déjà récupérable |
| Trimestre | T1 / T2 / T3 / T4 | Calculable |
| Mois | janvier → décembre | Calculable |
| Date de référence | date de l’action / création / validation | Déjà récupérable lorsque disponible |
| Comparaison | aucune / période précédente / année précédente | Calculable |

### Données existantes

Le contrat d’action possède déjà plusieurs dates :

- `observedAt` ;
- `createdAt` ;
- `importedAt` ;
- `validatedAt`.

### Évolution recommandée

Remplacer la logique limitée actuelle par un véritable sélecteur temporel combinant :

- raccourcis prédéfinis ;
- période personnalisée ;
- comparaison optionnelle.

---

## 2. Territoire

Cette catégorie détermine le périmètre géographique des données retenues.

### Paramètres proposés

| Paramètre | Options proposées | État |
|---|---|---|
| Tout le territoire | Global | Déjà récupérable |
| Arrondissement | 1er → 20e | Déjà partiellement exploitable |
| Commune | Paris, Saint-Denis, etc. | À normaliser |
| Département | 75, 92, 93… | À normaliser |
| Région | Île-de-France… | À normaliser |
| Adresse / point | rayon de 500 m, 1 km, 5 km… | Déjà calculable avec coordonnées |
| Zone dessinée | polygone libre sur la carte | Techniquement exploitable |
| Itinéraire / corridor | actions touchant une trace donnée | Techniquement exploitable |
| Type de lieu | rue, parc, forêt, berge, plage… | Déjà récupérable |

### Données existantes

Les actions disposent déjà de :

- latitude ;
- longitude ;
- géométrie `point` ;
- géométrie `polyline` ;
- géométrie `polygon` ;
- provenance de la géométrie ;
- niveau de confiance de la géométrie ;
- type de lieu.

### Données à rendre canoniques

La localisation textuelle libre ne doit pas rester l’unique source pour les filtres territoriaux.

À terme, il est recommandé de rendre persistants et canoniques :

- `commune_name` ;
- `commune_code` ;
- `postal_code` ;
- `department_code` ;
- `region_code`.

Cela doit permettre des filtres fiables du type :

> Toutes les actions réalisées dans le Val-d’Oise en 2026.

---

## 3. Organisateur et structure

Cette catégorie détermine quelles structures ou quels organisateurs sont inclus dans le rapport.

### Paramètres proposés

| Paramètre | Options proposées | État |
|---|---|---|
| Mes actions | créées par le compte courant | Déjà récupérable |
| Organisateur précis | utilisateur précis | Déjà récupérable |
| Nom de structure | association / entreprise précise | Déjà récupérable |
| Type d’organisateur | spontané / entreprise / association / association étudiante / collectif / autre | Déjà récupérable |
| Co-organisateur | inclure les actions où la structure est co-organisatrice | Déjà stocké ailleurs, à raccorder |
| Plusieurs organisateurs | sélection multiple | Déjà stocké ailleurs, à raccorder |
| Équipe / antenne / établissement | agence, campus, antenne locale, etc. | Nouvelle donnée à structurer |
| Organisation parente | toutes les antennes d’une même organisation | Nouvelle donnée à structurer |

### Données existantes

Le site dispose déjà de types d’organisateur canoniques :

- action spontanée ;
- entreprise ;
- association ;
- association étudiante ;
- collectif ;
- autre.

Il existe également une table dédiée aux co-organisateurs d’actions.

### Évolution recommandée

À terme, mettre en place une vraie couche organisationnelle :

```text
organizations
organization_memberships
action_organizations
```

L’objectif est d’éviter de dépendre uniquement d’un nom de structure libre dans les actions et de rendre fiables les rapports associatifs, institutionnels et RSE.

---

## 4. Nature de l’action

Cette catégorie filtre les interventions incluses dans le rapport.

### Paramètres proposés

| Paramètre | Options proposées | État |
|---|---|---|
| Type d’entité | action / signalement / zone propre | Déjà récupérable |
| Objectif | repérage / nettoyage / collecte mégots / action mixte / sensibilisation / autre | Déjà récupérable |
| Phase | action préparée / brouillon post-action / action terminée | Déjà récupérable |
| Type de lieu | parc / rue / forêt / etc. | Déjà récupérable |
| Formulaire | rapide / complet | Déjà récupérable |
| Action individuelle / collective | selon le mode de participation | Déjà récupérable |
| Difficulté prévue | facile / modérée / soutenue | Déjà récupérable |
| Action avec itinéraire | oui / non | Déjà calculable |
| Action avec photos | oui / non | Déjà calculable |
| Action avec mesure quantitative | oui / non | Déjà calculable |

### Exemples de filtres

> Uniquement les collectes de mégots organisées par l’association en 2026.

> Actions collectives réalisées dans des parcs.

---

## 5. Participation et mobilisation

Cette catégorie doit distinguer les mesures agrégées de bénévoles des participants identifiés individuellement.

### Paramètres proposés

| Paramètre | Options proposées | État |
|---|---|---|
| Nombre de bénévoles | min / max | Déjà récupérable |
| Taille des groupes | 1 / 2–5 / 6–20 / 20+ | Calculable |
| Participants confirmés | min / max | Déjà stocké ailleurs, à raccorder |
| Origine de participation | formulaire / ajout manuel / admin / import | Déjà stocké ailleurs, à raccorder |
| Participant précis | utilisateur précis | Déjà stocké ailleurs, à raccorder |
| Primo-participants | première action | Calculable après raccordement |
| Bénévoles récurrents | ≥2, ≥5 actions, etc. | Calculable après raccordement |
| Taux de retour | bénévoles revenus sur une autre action | Calculable après raccordement |
| Organisateur vs participant | distinction des rôles | Déjà stocké ailleurs, à raccorder |
| Type de participant | bénévole / salarié / étudiant / membre associatif… | Nouvelle donnée à structurer |

### Données existantes

Les actions disposent déjà d’un nombre agrégé de bénévoles.

Le site possède aussi une source séparée de participation avec notamment :

- statut de participation ;
- origine de participation ;
- date de jonction ;
- historique de participation.

### Évolution recommandée

Raccorder la source de participation existante à `/reports` plutôt que créer une seconde source de vérité.

Cela doit permettre de calculer :

- nouveaux bénévoles ;
- bénévoles récurrents ;
- nombre réel de participants inscrits ;
- fidélisation ;
- provenance des inscriptions.

---

## 6. Déchets et pollution

Cette catégorie filtre les actions selon les déchets collectés, leur caractérisation et les indicateurs de pollution.

### Paramètres proposés

| Paramètre | Options proposées | État |
|---|---|---|
| Masse collectée | min / max kg | Déjà récupérable |
| Nombre de mégots | min / max | Déjà récupérable |
| Catégorie de déchet | plastique, verre, métal, batterie, DEEE, etc. | Présente mais stockage à consolider |
| Famille de déchets | emballage, dangereux, encombrant… | Calculable |
| Niveau de danger | faible / précaution / élevé / critique | Calculable |
| Qualité du tri | faible / moyenne / élevée | Présente mais stockage à consolider |
| Masse mégots | kg | Présente mais stockage à consolider |
| Masse plastique | kg | Présente mais stockage à consolider |
| Masse verre | kg | Présente mais stockage à consolider |
| Masse métal | kg | Présente mais stockage à consolider |
| Masse mixte | kg | Présente mais stockage à consolider |
| Pollution avant | score | Future donnée canonique |
| Pollution après | score | Déjà récupérable lorsque renseigné |
| Amélioration avant / après | différence de score | À rendre calculable après stabilisation du score avant |

### Taxonomie existante

La taxonomie du site comprend notamment :

- mégots ;
- sachets de nicotine ;
- plastique ;
- verre ;
- verre cassé ;
- métal ;
- déchets résiduels ;
- encombrants ;
- bois ;
- équipements électriques ;
- batteries ;
- médicaments ;
- objets piquants ;
- autres.

### Évolution recommandée

Les déchets structurés ne doivent pas rester dépendants de métadonnées transitoires ou de marqueurs textuels.

Une structure cible possible :

```text
action_waste_measurements
- action_id
- category_slug
- mass_kg
- item_count
- measurement_method
- provenance
```

---

# Partie II — Paramètres avancés

Les cinq catégories suivantes doivent être accessibles depuis un contrôle du type **« Filtres avancés »** afin de ne pas surcharger le parcours principal.

---

## 7. Signalements Trash Spotter

Cette catégorie permet de relier le rapport d’impact aux signalements et à leur résolution.

### Paramètres proposés

| Paramètre | Options proposées | État |
|---|---|---|
| Inclure les signalements | oui / non | Déjà stocké ailleurs, à raccorder |
| Statut | nouveau / validé / nettoyé | Déjà stocké ailleurs, à raccorder |
| Signalements nettoyés | oui / non | Déjà stocké ailleurs, à raccorder |
| Date du signalement | période | Déjà stocké ailleurs, à raccorder |
| Date du nettoyage | période | Déjà stocké ailleurs, à raccorder |
| Type | spot / zone propre | Déjà stocké ailleurs, à raccorder |
| Avec preuve photo | oui / non | Déjà stocké ailleurs, à raccorder |
| Catégorie de déchet | multi-sélection | Présente mais stockage à consolider |
| Action liée au signalement | oui / non | Nouvelle relation canonique à créer |
| Délai signalement → nettoyage | durée | Calculable après création du lien canonique |

### Évolution recommandée

Créer une relation canonique :

```text
signalement → action → résultat post-action
```

Cela doit permettre de produire des indicateurs tels que :

- taux de signalements résolus ;
- nombre de signalements traités ;
- délai médian entre signalement et dépollution ;
- évolution de la pollution avant / après intervention.

---

## 8. Terrain et itinéraire

Cette catégorie exploite les données de parcours et de présence réelle sur le terrain.

### Paramètres proposés

| Paramètre | Options proposées | État |
|---|---|---|
| Durée de l’action | min / max | Déjà récupérable |
| Distance de l’itinéraire | min / max | Partiellement calculable |
| Géométrie | point / trajet / zone | Déjà récupérable |
| Type de trajet | direct / souple | Déjà récupérable |
| Départ | zone / adresse | Déjà récupérable |
| Arrivée | zone / adresse | Déjà récupérable |
| Avec trace GPS réelle | oui / non | Déjà stocké ailleurs, à raccorder |
| Distance GPS réelle | min / max | Déjà stocké ailleurs, à raccorder |
| Durée GPS réelle | min / max | Déjà stocké ailleurs, à raccorder |
| Surface effectivement couverte | m² | Nouvelle donnée ou calcul à formaliser |
| Dénivelé | min / max | Nouvelle donnée ou calcul externe |
| Milieu | urbain / forêt / berge / etc. | À normaliser |

### Données existantes

Le site possède déjà des missions GPS avec notamment :

- début ;
- fin ;
- distance ;
- durée ;
- points GPS ;
- altitude ;
- précision.

### Évolution recommandée

Ajouter un lien canonique entre mission GPS et action :

```text
missions.action_id
```

Il ne faut pas reconstruire cette relation à partir d’une proximité de date ou d’utilisateur.

---

## 9. Fiabilité et provenance des données

Cette catégorie permet de contrôler la qualité scientifique et opérationnelle des données incluses dans un rapport.

### Paramètres proposés

| Paramètre | Options proposées | État |
|---|---|---|
| Toutes les données | aucune restriction | Déjà récupérable |
| Données sans anomalie bloquante | oui / non | Déjà récupérable |
| Niveau qualité | OK / avertissement / bloquant | Déjà récupérable |
| Mesures | mesurées / dérivées / estimées / absentes | Déjà récupérable |
| Géolocalisation | valide / partielle / absente / invalide | Déjà récupérable |
| Confiance géométrique | seuil minimal | Déjà récupérable |
| Avec coordonnées | oui / non | Déjà récupérable |
| Avec trace | oui / non | Déjà récupérable |
| Avec preuve photo | oui / non | Déjà récupérable |
| Source | formulaire / import / Trash Spotter… | Déjà récupérable |

### Principe

Le site distingue déjà explicitement :

- donnée mesurée ;
- donnée dérivée ;
- donnée estimée ;
- donnée manquante ;
- anomalie d’avertissement ;
- anomalie bloquante.

### Preset proposé

Ajouter un preset :

> **Seulement les données suffisamment fiables pour un rapport externe**

Ce preset doit être basé sur des règles explicites, stables et documentées, jamais sur un jugement opaque.

---

## 10. Événements et mobilisation communautaire

Cette catégorie permet d’intégrer les événements communautaires et leur participation dans le périmètre du rapport.

### Paramètres proposés

| Paramètre | Options proposées | État |
|---|---|---|
| Inclure les événements | oui / non | Déjà récupérable |
| Organisateur | utilisateur | Déjà récupérable |
| Période des événements | dates | Déjà récupérable |
| Territoire | localisation | Déjà récupérable |
| Objectif | type d’événement | Déjà récupérable |
| Déchets attendus | mégots / plastique / verre / métal / mixte | Déjà récupérable |
| Niveau de soutien | faible / moyen / fort | Déjà récupérable |
| Capacité prévue | min / max | Déjà récupérable |
| Présence réelle | min / max | Déjà récupérable |
| RSVP oui / peut-être / non | seuils | Déjà récupérable |
| Taux de transformation RSVP → présence | filtre | Calculable |

### Cas d’usage

Cette catégorie doit notamment permettre des rapports d’activité associatifs ou communautaires, sans imposer tous ces contrôles dans le parcours principal.

---

## 11. Campagne / programme / projet

Cette catégorie introduit une nouvelle notion métier destinée à regrouper plusieurs actions dans un même programme de suivi.

### Exemples

- Cleanwalks RSE 2026 ;
- Programme mégots — Paris 15 ;
- Projet Sorbonne ;
- World Cleanup Day 2026 ;
- Convention Ville de Paris ;
- Subvention Région Île-de-France.

### Paramètres proposés

| Paramètre | État |
|---|---|
| Campagne | Nouvelle donnée à structurer |
| Programme | Nouvelle donnée à structurer |
| Projet | Nouvelle donnée à structurer |
| Financeur | Nouvelle donnée à structurer |
| Partenaire | Nouvelle donnée à structurer |
| Client / commanditaire | Nouvelle donnée à structurer |
| Site / établissement | Nouvelle donnée à structurer |
| Code interne / centre de coût | Nouvelle donnée à structurer |

### Structure cible possible

```text
campaigns
action_campaigns
campaign_organizations
```

Une action doit pouvoir appartenir à plusieurs campagnes lorsque le besoin métier le justifie.

### Objectif

Cette structure doit permettre de générer des rapports tels que :

> Rapport d’impact — Programme RSE 2026

ou :

> Rapport d’impact — Convention Ville de Paris — T2 2026

sans bricolage basé sur le nom d’un organisateur ou une chaîne de texte.

---

# Partie III — Objectifs mesurables

## 12. Logique d’objectifs

Les objectifs mesurables constituent une logique métier distincte des paramètres de génération.

Ils ne servent pas à décider quelles données existent, mais à définir **une cible à atteindre**, puis à comparer les résultats réels à cette cible.

Cette logique doit pouvoir être reliée à :

- la génération de rapports ;
- la gamification ;
- les campagnes et programmes ;
- les groupes de discussion communautaire ;
- les actions et événements associés.

---

## 12.1. Principe

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

## 12.2. Types d’objectifs proposés

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

## 12.3. Stockage recommandé

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

## 12.4. Lien avec les campagnes

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

## 12.5. Lien avec la gamification

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

### Invariant

Les règles de gamification ne doivent jamais devenir la source de vérité des métriques d’impact.

Elles consomment les mêmes métriques canoniques que les rapports.

---

## 12.6. Lien avec les groupes de discussion communautaire

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

### Principe d’architecture

Le groupe communautaire ne calcule pas lui-même l’objectif.

Il consomme le même service d’avancement que :

- `/reports` ;
- la gamification ;
- les pages de campagne ;
- les éventuelles notifications.

---

# Partie IV — Deuxième onglet de `/reports`

## 13. Nouvelle architecture de la page

La page `/reports` doit à terme distinguer clairement deux usages.

### Onglet 1 — Rapports d’impact

Cet onglet conserve la logique actuelle de génération.

Il permet de :

- définir le périmètre des données ;
- appliquer les 6 catégories obligatoires ;
- ouvrir les 5 catégories avancées si nécessaire ;
- choisir séparément le niveau de détail ;
- générer et consulter les rapports.

La composition du rapport et la logique des niveaux de détail restent des chantiers séparés.

---

### Onglet 2 — Objectifs & progression

Ce nouvel onglet est dédié à la création et au suivi d’objectifs mesurables.

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

## 13.1. Vue synthétique proposée

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

## 13.2. États d’un objectif

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

## 13.3. Progression

La progression doit être déterministe :

```text
progress = valeur réelle du périmètre / valeur cible
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

# Architecture conceptuelle finale

```text
                         /reports
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
     Rapports d’impact              Objectifs & progression
             │                             │
             │                             ├── Campagnes
             │                             ├── Organisations
             │                             ├── Groupes communautaires
             │                             └── Gamification
             │
             ├── 6 paramètres obligatoires
             │   ├── Période
             │   ├── Territoire
             │   ├── Organisateur et structure
             │   ├── Nature de l’action
             │   ├── Participation et mobilisation
             │   └── Déchets et pollution
             │
             └── 5 paramètres avancés
                 ├── Signalements Trash Spotter
                 ├── Terrain et itinéraire
                 ├── Fiabilité et provenance
                 ├── Événements et mobilisation communautaire
                 └── Campagne / programme / projet
```

---

# Invariants

1. Les paramètres déterminent **quelles données entrent dans le rapport**.
2. Le niveau de détail est une logique séparée.
3. La composition du rapport est une logique séparée.
4. Les objectifs mesurables sont des objets métier persistants, indépendants des rapports générés.
5. Rapports, gamification et communauté doivent consommer les mêmes métriques canoniques.
6. Aucune interface ne doit inventer une donnée absente.
7. Les données mesurées, dérivées, estimées et indisponibles doivent rester distinguées.
8. Les nouvelles relations doivent converger vers les sources canoniques existantes au lieu de créer des doublons.
9. Les objectifs doivent pouvoir être reliés à une campagne, une organisation et un groupe communautaire.
10. Le deuxième onglet `/reports` doit devenir la surface principale de suivi des objectifs collectifs.
