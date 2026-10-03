# Couverture GPS multi-groupes des actions

> **Statut : `PLAN / TARGET` — décision produit et contrat d’intégration**
>
> Ce document décrit la cible CleanMyMap pour les actions réalisées par plusieurs
> sous-groupes disposant chacun d’une trace GPS, ainsi que la reconnaissance
> gamifiée des bénévoles qui améliorent la précision cartographique.
>
> Il ne décrit pas encore un comportement `CURRENT`. Le runtime et les contrats
> effectivement déployés restent gouvernés par le code, les migrations, les
> tests et les sources `CURRENT` du dépôt.

## 1. Problème à résoudre

Une action CleanMyMap peut être créée avant le terrain avec une géométrie
incomplète ou hypothétique :

```text
action planifiée
→ distance cible
→ reconstruction réseau
→ parcours pointillé
```

Le jour de l’action, la situation réelle peut être différente :

- plusieurs bénévoles se répartissent en sous-groupes ;
- chaque sous-groupe suit un parcours différent ;
- un téléphone peut enregistrer la trace mobile du sous-groupe ;
- certains bénévoles peuvent fournir un GPX après l’action ;
- plusieurs traces peuvent partager un tronc commun puis diverger ;
- un parc ou un espace clos peut être parcouru par plusieurs groupes sans qu’un
  itinéraire unique représente correctement l’action.

La cible n’est donc pas de choisir arbitrairement **un GPX gagnant** ni de
concaténer plusieurs traces. La cible est de conserver les observations
individuelles, puis de produire une représentation collective honnête de la
couverture réellement observée.

## 2. Principe directeur

```text
trace individuelle observée
≠ parcours collectif
≠ reconstruction hypothétique
```

Une action possède une réalité collective, mais cette réalité peut être
constituée de plusieurs parcours simultanés.

CleanMyMap doit donc distinguer :

1. les **preuves terrain** fournies par les bénévoles ;
2. la **projection cartographique collective** dérivée de ces preuves ;
3. les anciennes géométries de préparation ou de reconstruction.

La géométrie collective ne devient jamais une nouvelle preuve source. Elle
reste recalculable à partir des contributions terrain acceptées.

## 3. Organisation terrain cible

Le modèle opérationnel privilégié est :

```text
1 action
↓
N sous-groupes
↓
1 téléphone enregistreur recommandé par sous-groupe
↓
N traces terrain
↓
couverture observée de l’action
```

Exemple :

```text
                    ┌── sous-groupe A ──────────┐
départ commun ──────┤                            ├── retour
                    ├── sous-groupe B ──┐        │
                    │                   └────────┤
                    └── sous-groupe C ──────────┘
```

Un seul téléphone par sous-groupe est suffisant dans le cas nominal. Cela évite
d’imposer un suivi GPS à chaque bénévole et réduit :

- la consommation de batterie ;
- les permissions de localisation ;
- les volumes de points GPS ;
- les doublons de traces ;
- la complexité de synchronisation.

Cette règle reste une recommandation opérationnelle. Plusieurs bénévoles peuvent
malgré tout fournir des traces pour une même action ; le système doit savoir les
conserver et les dédupliquer au niveau de la récompense.

## 4. Contributions géographiques terrain

### 4.1. Unité canonique

La cible introduit le concept métier de **contribution géographique terrain**.

Une contribution correspond à une trace observée associée à :

- une action ;
- un contributeur identifiable ;
- une source ;
- une géométrie ;
- une distance observée ;
- une preuve d’origine permettant l’idempotence.

Sources initiales :

```text
gpx_import
gps_tracking
```

`gpx_import` signifie qu’un utilisateur a fourni une trace GPX exploitable.

`gps_tracking` signifie qu’une mission de l’application mobile a enregistré une
trace GPS serveur exploitable.

Ces deux sources sont **observées**. Elles se distinguent de :

```text
manual          → déclaration utilisateur
reference       → emprise géographique connue
routed          → reconstruction réseau
estimated_route → hypothèse / fallback
fallback_point  → localisation seule
```

### 4.2. Persistance cible

Le stockage de plusieurs traces ne doit pas être comprimé dans
`actions.preparation_data` ni dans une unique géométrie de `actions`.

La cible privilégiée est une relation `1 action → N contributions
géographiques`, portée par une source de données dédiée, par exemple :

```text
action_geometry_contributions
```

Le nom physique final doit être confirmé contre le schéma au moment de
l’intégration, mais la responsabilité est durable : cette source conserve les
**preuves terrain unitaires**.

Contrat logique minimal :

| Champ logique | Sémantique |
| --- | --- |
| `id` | identité de la contribution |
| `action_id` | action concernée |
| `contributor_user_id` | compte Clerk auquel la contribution est attribuée |
| `source` | `gpx_import` ou `gps_tracking` |
| `geometry` | LineString observée validée |
| `observed_distance` | distance propre à cette trace |
| `point_count` | nombre de points retenus |
| `mission_id` | mission mobile source, lorsque applicable |
| `source_fingerprint` | identité technique idempotente d’un GPX ou équivalent |
| état de validation | contribution reçue / exploitable / refusée selon le contrat final |
| timestamps | création et validation utiles |

Les unités physiques doivent rester explicites dans le schéma final
(`*_m`, `*_km`, etc.).

### 4.3. Idempotence

Une même preuve ne doit pas produire plusieurs contributions utiles.

Pour le tracking mobile :

```text
mission_id
→ identité stable de la preuve
```

Pour un GPX :

```text
action
+ contributeur
+ fingerprint du contenu normalisé
→ identité stable de la preuve
```

Un retry, un rebuild ou une resoumission exacte ne doit produire ni nouvelle
preuve métier ni nouvelle récompense.

## 5. Plusieurs traces pour une même action

### 5.1. Interdiction de concaténer

Il est interdit de fabriquer :

```text
fin trace A
→ segment artificiel
→ début trace B
```

Une concaténation créerait un parcours qui n’a jamais été réellement effectué.

### 5.2. Représentation collective

Pour une action de parcours, la représentation cible de plusieurs traces est
une **couverture observée multi-traces**.

Conceptuellement :

```text
Trace A ─┐
Trace B ─┼→ couverture observée de l’action
Trace C ─┘
```

La représentation géométrique privilégiée est un ensemble de LineStrings,
typiquement un `MultiLineString` GeoJSON ou un type métier équivalent.

Le contrat `ActionGeometryKind` CURRENT ne supporte pas encore cette forme :
son évolution fait partie du chantier d’intégration. Il ne faut pas encoder un
`MultiLineString` dans une fausse `polyline`.

### 5.3. Tronc commun et branches

Si trois sous-groupes parcourent le même tronçon initial puis se séparent :

```text
                    nord
                     │
départ ─ tronc ──────┼── est
        commun       │
                    sud
```

la carte collective doit exprimer :

- le tronc commun observé ;
- les branches observées ;
- aucune liaison inventée.

La source conserve toujours les traces originales de chaque sous-groupe.

## 6. Déduplication spatiale : V1 puis évolution

### 6.1. V1 — représentation honnête sans fausse précision

La première version multi-traces doit :

- conserver chaque trace source séparément ;
- produire une représentation collective multi-lignes ;
- afficher le nombre de traces terrain ;
- ne pas additionner leurs distances pour prétendre mesurer la couverture
  géographique unique ;
- ne pas inventer un algorithme de fusion approximatif.

Ainsi, deux traces très proches peuvent encore se superposer dans la projection
collective. Ce n’est pas une erreur scientifique : les preuves restent
correctes et aucune métrique fausse n’est dérivée.

### 6.2. Couverture unique — évolution conditionnelle

L’objectif à terme est de pouvoir représenter une **union de chemins distincts**
où les tronçons communs ne sont comptés qu’une fois.

Cette évolution exige une policy versionnée et testable.

Elle peut être introduite uniquement lorsqu’un mécanisme défendable permet de
déterminer qu’un segment de la trace A et un segment de la trace B représentent
le même chemin réel.

Préférence technique :

```text
traces observées
→ rapprochement / map matching dérivé
→ identité de segments réseau suffisamment stable
→ union des segments
→ couverture géographique unique
```

Le map matching, s’il est utilisé, ne modifie jamais les traces observées
sources. Il sert uniquement à construire la projection de couverture.

Tant que le provider ou le modèle de données ne fournit pas une identité de
segment suffisamment fiable, la **distance de couverture unique reste
indisponible**.

Une simple tolérance géométrique arbitraire ne doit pas devenir silencieusement
une mesure scientifique.

## 7. Cas des parcs et espaces clos

Une action réalisée dans un parc, jardin, campus ou autre espace clos peut avoir
de nombreuses traces internes.

Dans ce cas :

```text
emprise de référence fiable
→ polygone rempli principal

traces GPS terrain
→ preuves complémentaires de parcours
```

Le polygone représente la zone d’action.

Les traces représentent les déplacements observés à l’intérieur de cette zone.

Les traces ne doivent pas remplacer automatiquement une emprise de référence
fiable par une grande polyline artificielle.

L’UI peut permettre d’afficher la couverture GPS en surimpression ou en détail.

## 8. Cycle de vie de la géométrie d’une action

La cible complète est :

```text
action créée
↓
géométrie absente ou incomplète
↓
reconstruction hypothétique pointillée
↓
action réalisée
↓
première trace terrain acceptée
↓
géométrie observée
↓
traces supplémentaires acceptées
↓
couverture observée multi-traces
```

Une géométrie reconstruite peut donc être utile avant l’action sans être
présentée comme définitive.

Dès qu’une observation terrain exploitable existe :

- elle prime sur `routed`, `estimated_route` et `fallback_point` ;
- une reconstruction ultérieure ne peut plus redevenir la géométrie publique
  principale ;
- la reconstruction peut rester une information historique ou de préparation si
  un contrat existant le justifie.

Une deuxième observation ne remplace pas la première : elle enrichit la
couverture.

## 9. Distances : quatre notions à ne pas confondre

| Notion | Définition | Exemple |
| --- | --- | --- |
| Distance cible | objectif de préparation, notamment dérivé de la durée | `3,0 km` |
| Distance observée individuelle | longueur d’une trace terrain | groupe A : `3,2 km` |
| Distance cumulée des traces | somme des déplacements enregistrés, si la lecture est explicitement voulue | A+B+C : `9,1 km` |
| Distance de couverture unique | longueur des tronçons géographiques distincts après déduplication démontrée | `5,4 km` |

Invariants :

```text
distance cible
≠ distance individuelle
≠ distance cumulée
≠ distance de couverture unique
```

La somme des distances individuelles peut être utile pour décrire le mouvement
cumulé des groupes, mais elle ne doit jamais être libellée « distance du
parcours de l’action ».

La distance de couverture unique doit rester `NA` tant que l’union spatiale
n’est pas défendable.

## 10. Gamification de la contribution cartographique

### 10.1. Intention produit

Fournir une trace terrain améliore directement la qualité cartographique de
CleanMyMap.

Cette contribution doit être reconnue personnellement, sans récompenser le spam,
le nombre de fichiers ou le nombre de kilomètres.

### 10.2. Progression cible

La cible produit est une progression personnelle dédiée :

```text
Contribution cartographique
```

Identité technique candidate :

```text
cartography
```

Métrique candidate :

```text
verified_geometry_contributions
```

Elle représente :

> le nombre d’actions distinctes pour lesquelles l’utilisateur possède au moins
> une contribution géographique terrain acceptée.

### 10.3. Unité de récompense

L’unité est :

```text
1 utilisateur
+ 1 action
+ au moins 1 contribution acceptée
= 1 unité de progression
```

Par conséquent :

| Situation | Progression |
| --- | ---: |
| 1 GPX accepté sur l’action A | +1 unité |
| 4 GPX acceptés du même utilisateur sur l’action A | toujours 1 |
| GPX + tracking mobile du même utilisateur sur A | toujours 1 |
| nouvelle contribution sur l’action B | +1 unité supplémentaire |
| retry / duplicate / rebuild | +0 |

Aucun XP n’est accordé directement :

- par fichier ;
- par point GPS ;
- par kilomètre ;
- par nombre de traces.

### 10.4. Éligibilité

La récompense exige une preuve métier attribuable.

Cible :

- participant `confirmed` de l’action ; ou
- organisateur canonique de l’action ;
- contribution géographique acceptée.

Un utilisateur qui connaît simplement l’identifiant de l’action ne peut pas
s’attribuer une contribution gamifiée.

Pour le mobile, la mission apporte une attribution forte au compte Clerk
propriétaire.

Pour un GPX, CleanMyMap prouve que l’utilisateur **a fourni la trace**. Le
produit ne doit pas affirmer qu’il prouve que cette personne portait
physiquement le GPS pendant toute la trace.

### 10.5. Intégration au moteur CURRENT

Cette cible doit utiliser le moteur de gamification existant :

```text
progression_events
→ réconciliation
→ progression_profiles
→ progression.summary
→ badge / grade
```

Ne créer :

- ni second ledger XP ;
- ni compteur UI indépendant ;
- ni XP directement calculé depuis les uploads.

Le registre de gamification et le catalogue de badges restent les owners
canoniques.

L’introduction de cette progression ferait évoluer le nombre de progressions
CURRENT ; cette évolution doit être explicite dans la révision de règles et la
spécification canonique lors de son implémentation.

Les seuils de grade et montants XP ne sont pas fixés par ce document. Ils
doivent réutiliser une policy canonique existante ou faire l’objet d’une
décision produit versionnée, afin de ne pas inventer des seuils uniquement pour
le chantier technique.

## 11. Feedback utilisateur

Après acceptation d’une trace, le feedback doit expliquer la valeur réelle :

```text
Trace terrain ajoutée
Votre contribution améliore la précision cartographique de cette action.
Elle compte dans votre progression « Contribution cartographique ».
```

Le feedback ne doit pas annoncer une récompense tant que la contribution n’est
pas éligible.

Sur une action collective, la carte peut afficher par exemple :

```text
Couverture observée
3 traces terrain · 3 sous-groupes
```

ou, lorsque les contributeurs ne correspondent pas strictement aux
sous-groupes :

```text
Couverture observée
3 traces terrain
```

Ne jamais afficher :

```text
trajet réel de tous les bénévoles
```

si le système ne dispose que d’un échantillon de sous-groupes.

## 12. Vie privée et surface publique

Les traces GPS individuelles peuvent révéler des données de déplacement.

Principes :

- les missions et points GPS individuels restent privés selon leurs contrats
  AuthN/AuthZ ;
- le feed public des actions ne doit pas exposer `mission_id`, les points
  horodatés bruts, l’identité du porteur du téléphone ni les métadonnées
  privées ;
- la surface publique reçoit une projection action-level sanitizée ;
- le compteur de traces peut être public ;
- les identités des contributeurs ne sont pas affichées par défaut ;
- le fichier GPX original ne doit pas être conservé uniquement « au cas où » si
  la géométrie normalisée et la provenance suffisent au contrat.

La gamification personnelle peut expliquer à l’utilisateur quelle contribution
lui est attribuée sans rendre cette attribution publique.

## 13. Sous-groupes : frontière de modèle

Le concept de sous-groupe est utile opérationnellement, mais une nouvelle table
métier n’est pas requise uniquement pour afficher plusieurs traces.

Première cible :

- une mission GPS correspond idéalement au téléphone enregistreur d’un
  sous-groupe ;
- une contribution peut porter un identifiant ou libellé de sous-groupe si le
  workflow courant fournit cette information de manière fiable ;
- en son absence, la trace reste une contribution valide sans inventer un
  sous-groupe.

Créer une entité persistée `action_subgroups` ne devient justifié que si le
produit doit réellement gérer :

- composition des groupes ;
- affectation des participants ;
- responsable/enregistreur ;
- consignes ou zones distinctes ;
- coordination avant ou pendant l’action.

Ne pas créer cette table pour la seule déduplication géométrique.

## 14. Contrat de représentation publique cible

### Parcours avec aucune observation

```text
routed / estimated_route
→ pointillé
→ hypothèse
```

### Parcours avec une observation

```text
gpx_import / gps_tracking
→ trait plein
→ trace observée
```

### Parcours avec plusieurs observations

```text
N contributions observées
→ couverture multi-traces
→ traits pleins
→ projection collective observée
```

### Zone fermée avec emprise connue

```text
reference polygon
→ polygone rempli principal
+ traces observées complémentaires
```

La couleur reste réservée à la sémantique de pollution/impact définie par la
carte. Elle ne doit pas servir à coder la fiabilité de la géométrie.

## 15. Compatibilité avec les actions existantes

Les actions historiques restent valides.

Aucune migration ne doit :

- inventer des contributeurs ;
- transformer une reconstruction en observation ;
- convertir une ancienne polyline en trace mobile ;
- produire une récompense rétroactive sans preuve attribuable ;
- fabriquer une couverture multi-traces à partir d’une seule géométrie legacy.

Lorsqu’une nouvelle contribution terrain est ajoutée à une action historique,
l’action peut progressivement adopter le nouveau contrat.

## 16. Invariants d’implémentation

Le chantier d’intégration devra protéger ensemble les invariants suivants :

1. une preuve terrain brute n’est jamais écrasée par une projection dérivée ;
2. plusieurs traces ne sont jamais concaténées artificiellement ;
3. une reconstruction ne peut pas remplacer une observation ;
4. plusieurs observations valides peuvent coexister ;
5. la couverture collective est recalculable ;
6. aucune distance collective unique n’est inventée ;
7. la gamification compte au maximum une unité par utilisateur et par action ;
8. un duplicate/retry/rebuild ne crée pas de récompense ;
9. les données GPS privées ne deviennent pas publiques par commodité ;
10. une action de zone peut conserver son polygone principal ;
11. le mobile n’écrit pas directement les projections publiques ou l’XP ;
12. la documentation distingue toujours observation, déclaration, référence et
    hypothèse.

## 17. Périmètre d’intégration attendu

Cette capacité est transversale et doit être intégrée comme un chantier
cohérent, pas comme une succession de micro-corrections.

Le lot d’implémentation devra inspecter et faire évoluer ensemble, lorsque le
checkout réel le confirme :

- schéma Supabase et RLS ;
- contrats Actions et géométrie ;
- missions / GPS mobile ;
- import GPX ;
- projection publique de la carte ;
- rendu Leaflet des multi-traces ;
- distances et libellés ;
- gamification et réconciliation ;
- confidentialité ;
- exports pertinents ;
- tests de régression ;
- documentation `CURRENT` affectée.

## 18. Condition de clôture fonctionnelle

La cible est atteinte lorsqu’un scénario réel comme celui-ci fonctionne sans
ambiguïté :

```text
une action est créée
→ CleanMyMap reconstruit un parcours hypothétique

le jour J
→ trois sous-groupes partent
→ trois téléphones enregistrent trois missions GPS

après synchronisation
→ les trois traces sont conservées séparément
→ elles sont rattachées à la même action
→ la reconstruction cesse d’être la géométrie principale
→ la carte affiche la couverture observée multi-traces
→ aucune liaison artificielle n’est ajoutée
→ aucune distance de couverture unique n’est inventée

chaque enregistreur éligible
→ reçoit une contribution cartographique pour cette action
→ indépendamment du nombre de fichiers/traces qu’il a fournis
```

## 19. Décisions fermes et questions encore ouvertes

### Décisions fermes

- plusieurs traces sources sont conservées ;
- aucune concaténation artificielle ;
- une couverture collective est dérivée des preuves ;
- une action peut avoir plusieurs contributeurs cartographiques ;
- la récompense est dédupliquée par utilisateur/action ;
- les kilomètres ne génèrent pas directement d’XP ;
- les données individuelles GPS restent privées ;
- une reconstruction devient secondaire dès qu’une observation est disponible ;
- un parc peut rester représenté principalement par son polygone.

### Questions à résoudre pendant l’intégration

- format exact du contrat `MultiLineString` dans le domaine Actions ;
- persistance physique exacte de la contribution géographique ;
- nécessité ou non d’une entité `action_subgroups` pour un workflow futur ;
- méthode versionnée permettant un jour une distance de couverture unique ;
- seuils et politique XP exacts de la progression cartographique.

Ces questions ne doivent pas être résolues par des valeurs arbitraires.

## 20. Sources à maintenir alignées

Lors de l’implémentation, réaligner au minimum selon les responsabilités
réellement affectées :

- [`methodologie-carte-actions.md`](./methodologie-carte-actions.md) ;
- [`gamification-non-competitive.md`](./gamification-non-competitive.md) ;
- [`../architecture/data-governance.md`](../architecture/data-governance.md) ;
- [`../pages_site/routes/03-cartographie-impact/gamification/gamification-SPEC_CANONIQUE.md`](../pages_site/routes/03-cartographie-impact/gamification/gamification-SPEC_CANONIQUE.md) ;
- la fiche `CURRENT` de `/actions/map` ;
- [`../../apps/mobile/architecture_gps_companion.md`](../../apps/mobile/architecture_gps_companion.md) lorsque le tracking mobile est intégré.

Ce document reste une spécification `PLAN / TARGET` jusqu’à ce que ces contrats
soient réellement implémentés et validés.
