# CleanMyMap : paramètres de génération des rapports d’impact

> **Statut : `CURRENT`.** Ce document décrit les paramètres effectivement acceptés par le générateur multi-actions. La période, le périmètre et le sous-ensemble borné de filtres avancés décrit ci-dessous sont livrés ; les familles qui exigent encore une relation ou une source canonique supplémentaire restent `PLAN`.
>
> **Source antérieure :** `reports-parameters-and-objectives.md`, répartie par responsabilité. La logique des objectifs mesurables figure désormais dans [impact-goals-and-progression.md](./impact-goals-and-progression.md).

## Objet et frontières

Les paramètres de génération déterminent **quelles données entrent dans un rapport**. Ils sont indépendants :

- des **modules et chapitres** qui déterminent le contenu rendu ;
- du **niveau de détail** (`concis`, `default`, `exhaustif`), qui modifie réellement la densité du PDF sans changer les calculateurs, les KPI communs ni l'état des modules ;
- des **objectifs mesurables**, qui sont des objets métier persistants distincts ;
- de la **preuve de fiabilité** des données, qui dépend du serveur et des contrats canoniques.

Le générateur multi-actions accepte les périmètres `global`, `account`, `association` et `arrondissement`, ainsi que `thirty_days`, `three_months`, `six_months`, `twelve_months`, `current_year`, `full_history` et `custom_range`. Les dates personnalisées sont deux dates civiles inclusives `YYYY-MM-DD`, interprétées en UTC sur `dates.observedAt`. Le périmètre `single_action` est un contrat distinct : son identifiant est résolu côté serveur et ses bornes restent verrouillées sur l'action. Pour le fonctionnement courant, voir la [fiche `/reports`](../../pages_site/routes/03-cartographie-impact/reports/reports-README.md) et le code associé.

Pour `POST /api/reports/generations`, le navigateur transmet l'entrée typée, le niveau de détail, les modules et la sélection avancée. Le serveur recharge les actions publiques admissibles depuis la source canonique avec les critères `status = approved`, `moderation_visibility = visible`, `published_at` non nul et `action_phase = post_action_complete`, valide le scope contre ces identifiants et libellés canoniques, filtre la période puis les filtres avancés, et calcule `ReportModel` et le PDF sur ce même ensemble. La projection complète est paginée ; si un champ indispensable ou une page échoue, la génération multi-actions est refusée plutôt que présentée comme exhaustive. Le nom libre d'une association ne constitue ni une appartenance ni une permission privée : ce filtre ne porte que sur le corpus public résolu côté serveur.

### Reprise depuis `Mes fichiers` — `CURRENT`

Le bouton **Reprendre la configuration** ne relit pas les KPI du snapshot pour
produire la nouvelle génération. La page `/reports` charge d'abord la ligne et
le snapshot avec l'ownership serveur, puis réutilise le formulaire, les states
et les validations du générateur courant. Elle restaure seulement les champs
vérifiables : scope et valeur, période, bornes personnalisées, niveau de détail,
modules, filtres avancés et thème PDF historisé.

Pour une période relative, les bornes absolues conservées sont affichées comme
dates d'origine ; le `POST` suivant envoie l'identifiant relatif et le serveur
recalcule la période courante avec ses sources canoniques. Pour
`custom_range`, les deux bornes civiles `YYYY-MM-DD` du snapshot sont
restaurées sans conversion. Un snapshot legacy, v1 ou v2 incomplet expose les
paramètres absents comme inconnus ; aucune valeur historique n'est déduite des
KPI, du libellé seul ou d'un défaut d'interface. Un scope ou une action qui ne
peut plus être résolu côté serveur est signalé et le bouton de génération reste
bloqué jusqu'à une nouvelle sélection valide.

La reprise elle-même ne réserve ni ne consomme de quota. La nouvelle demande
est une génération indépendante : elle repasse par `POST
/api/reports/generations`, les contrôles d'admissibilité et le quota quotidien,
et n'altère jamais la ligne ni le snapshot historiques.

### Filtres avancés CURRENT

Le panneau secondaire **« Filtres avancés »** est fermé par défaut. Sa sélection est validée côté serveur, appliquée après la période et le scope sans jamais élargir ce dernier, puis conservée dans `snapshotMetadata.filters` avec `advancedFiltersVersion = reports-advanced-filters-v1`.

Le contrat livré couvre uniquement les champs canoniques suivants :

- qualité : toutes les données ou aucune anomalie bloquante, niveau de qualité existant (`A`, `B`, `C`), provenance des mesures (`measured`, `derived`, `estimated`, `missing`), coordonnées valides, provenance géométrique et mode de déclaration (`quick` / `complete`) lorsqu'il est renseigné ;
- résultats : bornes inclusives de `metadata.wasteKg` et `metadata.cigaretteButts` ; catégories limitées aux champs structurés de `metadata.wasteBreakdown` (`recyclablesKg`, `glassKg`, `householdWasteKg`, `otherWasteKg`) ; les notes et marqueurs textuels ne satisfont aucun filtre de mesure ;
- preuves : présence ou absence d'une géométrie exploitable et preuve photographique finalisée.

Le filtre photographique ne lit que l'agrégat serveur `public.action_media` (`action_id`, `upload_state = ready`) après un contrôle explicite du lecteur `created_by_clerk_id`. Une preuve `ready` appartenant à un tiers rend la source indisponible pour ce rapport ; elle n'est pas transformée en absence de preuve. Aucun objet privé, chemin Storage ou URL signée n'est envoyé au navigateur. Une erreur de cette source rend le filtre photo indisponible et la génération est refusée explicitement. Les seuils actifs ne considèrent jamais `null` comme zéro.

Le résumé, l'aperçu, le calcul serveur et le snapshot utilisent le même ensemble d'actions admissibles. Le résultat affiche son nombre d'actions et une couverture complète ou partielle ; une fenêtre tronquée reste partielle après filtrage.

## Ordre de déploiement proposé

1. **P0 livré : rapport d'une action validée** avec périmètre exact résolu côté serveur et historique réutilisable. Voir la [roadmap produit](../../product/roadmap-priorisee.md) et la [proposition mono-action](../../pages_site/routes/03-cartographie-impact/reports/reports-liste-propositions-a-traiter.md).
2. **CURRENT livré :** paramètres multi-actions avec période, scope et sous-ensemble avancé de qualité, provenance, résultats structurés, géométrie et preuve photo décrit ci-dessus.
3. **Évolutions conditionnelles :** nouveaux liens métier (GPS, signalements, campagnes, organisations) après inspection de leurs sources et permissions canoniques.

L'interface ne doit pas obliger un organisateur à renseigner toutes les catégories pour exporter le résultat d'une action connue. Préférer un périmètre prérempli, puis des réglages facultatifs accessibles progressivement. Un ID ou une valeur transmis par l'URL ou le client ne constitue jamais une preuve d'accès.

### Interprétation des tableaux hérités

Les colonnes « État », « Déjà récupérable », « Calculable », « Déjà stocké ailleurs » et « À normaliser » sont des **qualifications proposées dans le plan source**, pas des validations du runtime, des tables Supabase ou de l'interface. Avant chaque implémentation, vérifier le producteur canonique, les consommateurs, les droits d'accès, la provenance et les tests effectifs. Les structures SQL ébauchées sont conceptuelles et ne prescrivent aucune migration.

## Partie I — Familles de paramètres principales

Ces six familles décrivent les options de filtrage possibles, et non six champs obligatoires pour produire chaque rapport. Leur exposition dans l’interface dépend du scénario et de la disponibilité réelle des données.

### 1. Période

La période est le filtre temporel principal du rapport.

#### Paramètres proposés

| Paramètre | Options proposées | État |
|---|---|---|
| Période prédéfinie | `thirty_days` / `three_months` / `six_months` / `twelve_months` / `current_year` / `full_history` | CURRENT |
| Dates personnalisées | `custom_range` avec `from` et `to` en `YYYY-MM-DD`, bornes inclusives UTC | CURRENT |
| Année | 2025, 2026, etc. | Déjà récupérable |
| Trimestre | T1 / T2 / T3 / T4 | Calculable |
| Mois | janvier → décembre | Calculable |
| Date de référence | date de l’action / création / validation | Déjà récupérable lorsque disponible |
| Comparaison | aucune / période précédente / année précédente | Calculable |

#### Données existantes

Le contrat d’action possède déjà plusieurs dates :

- `observedAt` ;
- `createdAt` ;
- `importedAt` ;
- `validatedAt`.

#### Évolution recommandée

Remplacer la logique limitée actuelle par un véritable sélecteur temporel combinant :

- raccourcis prédéfinis ;
- période personnalisée ;
- comparaison optionnelle.

---

### 2. Territoire

Cette catégorie détermine le périmètre géographique des données retenues.

#### Paramètres proposés

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

#### Données existantes

Les actions disposent déjà de :

- latitude ;
- longitude ;
- géométrie `point` ;
- géométrie `polyline` ;
- géométrie `polygon` ;
- provenance de la géométrie ;
- niveau de confiance de la géométrie ;
- type de lieu.

#### Données à rendre canoniques

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

### 3. Organisateur et structure

Cette catégorie détermine quelles structures ou quels organisateurs sont inclus dans le rapport.

#### Paramètres proposés

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

#### Données existantes

Le site dispose déjà de types d’organisateur canoniques :

- action spontanée ;
- entreprise ;
- association ;
- association étudiante ;
- collectif ;
- autre.

Il existe également une table dédiée aux co-organisateurs d’actions.

#### Évolution recommandée

À terme, mettre en place une vraie couche organisationnelle :

```text
organizations
organization_memberships
action_organizations
```

L’objectif est d’éviter de dépendre uniquement d’un nom de structure libre dans les actions et de rendre fiables les rapports associatifs, institutionnels et RSE.

---

### 4. Nature de l’action

Cette catégorie filtre les interventions incluses dans le rapport.

#### Paramètres proposés

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
| Action avec photos | oui / non | CURRENT via `action_media.ready` côté serveur |
| Action avec mesure quantitative | oui / non | Déjà calculable |

#### Exemples de filtres

> Uniquement les collectes de mégots organisées par l’association en 2026.

> Actions collectives réalisées dans des parcs.

---

### 5. Participation et mobilisation

Cette catégorie doit distinguer les mesures agrégées de bénévoles des participants identifiés individuellement.

#### Paramètres proposés

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

#### Données existantes

Les actions disposent déjà d’un nombre agrégé de bénévoles.

Le site possède aussi une source séparée de participation avec notamment :

- statut de participation ;
- origine de participation ;
- date de jonction ;
- historique de participation.

#### Évolution recommandée

Raccorder la source de participation existante à `/reports` plutôt que créer une seconde source de vérité.

Cela doit permettre de calculer :

- nouveaux bénévoles ;
- bénévoles récurrents ;
- nombre réel de participants inscrits ;
- fidélisation ;
- provenance des inscriptions.

---

### 6. Déchets et pollution

Cette catégorie filtre les actions selon les déchets collectés, leur caractérisation et les indicateurs de pollution.

#### Paramètres proposés

| Paramètre | Options proposées | État |
|---|---|---|
| Masse collectée | min / max kg | Déjà récupérable |
| Nombre de mégots | min / max | Déjà récupérable |
| Catégorie de déchet | recyclables / verre / déchets ménagers / autres, via `wasteBreakdown` | CURRENT, taxonomie limitée aux champs structurés |
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

#### Taxonomie existante

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

#### Évolution recommandée

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

## Partie II — Paramètres avancés

Les familles ci-dessous restent des possibilités documentées et ne font pas
partie de l'entrée typée multi-actions actuelle, sauf le sous-ensemble de
qualité, déchets et preuves explicitement marqué `CURRENT` plus haut.

Les familles encore non livrées restent décrites ici pour éviter de les
présenter comme disponibles. Leur implémentation devra réutiliser un owner
canonique et une preuve de permission réelle.

---

### 7. Signalements Trash Spotter

Cette catégorie permet de relier le rapport d’impact aux signalements et à leur résolution.

#### Paramètres proposés

| Paramètre | Options proposées | État |
|---|---|---|
| Inclure les signalements | oui / non | Déjà stocké ailleurs, à raccorder |
| Statut | nouveau / validé / nettoyé | Déjà stocké ailleurs, à raccorder |
| Signalements nettoyés | oui / non | Déjà stocké ailleurs, à raccorder |
| Date du signalement | période | Déjà stocké ailleurs, à raccorder |
| Date du nettoyage | période | Déjà stocké ailleurs, à raccorder |
| Type | spot / zone propre | Déjà stocké ailleurs, à raccorder |
| Avec preuve photo | oui / non | CURRENT uniquement via `action_media.ready` pour les actions |
| Catégorie de déchet | multi-sélection | Présente mais stockage à consolider |
| Action liée au signalement | oui / non | Nouvelle relation canonique à créer |
| Délai signalement → nettoyage | durée | Calculable après création du lien canonique |

#### Évolution recommandée

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

### 8. Terrain et itinéraire

Cette catégorie exploite les données de parcours et de présence réelle sur le terrain.

#### Paramètres proposés

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

#### Données existantes

Le site possède déjà des missions GPS avec notamment :

- début ;
- fin ;
- distance ;
- durée ;
- points GPS ;
- altitude ;
- précision.

#### Évolution recommandée

Ajouter un lien canonique entre mission GPS et action :

```text
missions.action_id
```

Il ne faut pas reconstruire cette relation à partir d’une proximité de date ou d’utilisateur.

---

### 9. Fiabilité et provenance des données

Cette catégorie permet de contrôler la qualité scientifique et opérationnelle des données incluses dans un rapport.

#### Paramètres proposés

| Paramètre | Options proposées | État |
|---|---|---|
| Toutes les données | aucune restriction | CURRENT |
| Données sans anomalie bloquante | oui / non | CURRENT |
| Niveau qualité | qualité existante `A` / `B` / `C` (seuil minimal) | CURRENT |
| Mesures | mesurées / dérivées / estimées / absentes, si la distinction existe | CURRENT |
| Géolocalisation | valide / partielle / absente / invalide | CURRENT pour le filtre de coordonnées valides |
| Confiance géométrique | seuil minimal | Déjà récupérable |
| Avec coordonnées | oui / non | CURRENT |
| Avec trace | oui / non | CURRENT via la géométrie du contrat |
| Avec preuve photo | oui / non | CURRENT via `action_media.ready` côté serveur |
| Source | formulaire / import / Trash Spotter… | PLAN hors mode de déclaration canonique existant |

#### Principe

Le site distingue déjà explicitement :

- donnée mesurée ;
- donnée dérivée ;
- donnée estimée ;
- donnée manquante ;
- anomalie d’avertissement ;
- anomalie bloquante.

#### Preset proposé

Ajouter un preset :

> **Seulement les données suffisamment fiables pour un rapport externe**

Ce preset doit être basé sur des règles explicites, stables et documentées, jamais sur un jugement opaque.

---

### 10. Événements et mobilisation communautaire

Cette catégorie permet d’intégrer les événements communautaires et leur participation dans le périmètre du rapport.

#### Paramètres proposés

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

#### Cas d’usage

Cette catégorie doit notamment permettre des rapports d’activité associatifs ou communautaires, sans imposer tous ces contrôles dans le parcours principal.

---

### 11. Campagne / programme / projet

Cette catégorie introduit une nouvelle notion métier destinée à regrouper plusieurs actions dans un même programme de suivi.

#### Exemples

- Cleanwalks RSE 2026 ;
- Programme mégots — Paris 15 ;
- Projet Sorbonne ;
- World Cleanup Day 2026 ;
- Convention Ville de Paris ;
- Subvention Région Île-de-France.

#### Paramètres proposés

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

#### Structure cible possible

```text
campaigns
action_campaigns
campaign_organizations
```

Une action doit pouvoir appartenir à plusieurs campagnes lorsque le besoin métier le justifie.

#### Objectif

Cette structure doit permettre de générer des rapports tels que :

> Rapport d’impact — Programme RSE 2026

ou :

> Rapport d’impact — Convention Ville de Paris — T2 2026

sans bricolage basé sur le nom d’un organisateur ou une chaîne de texte.

---


## Contrats transversaux à préserver

- **Authentification et autorisation :** résoudre les entités côté serveur, contrôler le périmètre de lecture, la visibilité et l'admissibilité métier. Le rôle `service_role` ne confère pas de privilège à un utilisateur HTTP.
- **Périmètre exact :** un rapport `single_action` ne peut contenir que l'action choisie. Les autres filtres ne doivent pas élargir silencieusement ce périmètre.
- **Traçabilité :** chaque indicateur conserve sa provenance, son unité, sa période et son statut (`mesuré`, `dérivé`, `proxy` ou `inconnu`). Les valeurs absentes ne deviennent pas des zéros.
- **Qualité des résultats :** distinguer données réelles, données partielles et source indisponible ; ne jamais afficher « complet » sur une fenêtre tronquée.
- **Reproductibilité :** les nouvelles générations utilisent un snapshot v2 qui
  conserve les métadonnées de période, scope, provenance, modules, sources et
  versions proxy/règles qualité. Le réexport historique ne recalcule pas les
  données et ne crée pas de nouvelle génération ; la garantie est sémantique,
  tandis que le PDF demandé est conservé séparément comme artefact versionné
  dans le bucket privé `reports`, sans promettre une identité binaire entre
  versions de renderer.
- **Unicité :** aucune nouvelle table, formule ni relation ne doit doubler une source canonique métier ; la table technique de déduplication PDF reste limitée aux artefacts binaires.

## Hors périmètre de ce document

- Composition des chapitres et formats de sortie : [Master Pack](./master-pack.md) et code runtime, avec leurs frontières propres.
- Navigation et états de la page : [fiche `/reports` CURRENT](../../pages_site/routes/03-cartographie-impact/reports/reports-README.md).
- Objectifs collectifs, progression, groupes et gamification : [plan séparé](./impact-goals-and-progression.md).
- Décisions de priorité globales : [roadmap](../../product/roadmap-priorisee.md).
