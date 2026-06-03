# Présentation détaillée de la carte des actions

Cette fiche sert de lecture métier pour la page `/actions/map`. Elle est destinée à un collègue cartographe ou à toute personne qui doit comprendre rapidement la structure de la page, ses données, ses interactions et ses zones de vigilance UI.

## Rôle de la page

La carte des actions est la page de lecture cartographique du bloc **Cartographie & Impact**.

Elle permet de :

- visualiser les actions et les données terrain sur une carte immersive ;
- comparer les interventions selon plusieurs filtres ;
- lire les indicateurs clés d’impact ;
- basculer entre une lecture analytique et une lecture tabulaire ;
- accéder rapidement aux vues de soutien comme la méthodologie, l’observatoire et la création d’action.

La page est pensée comme une interface de supervision et de lecture terrain. Elle ne sert pas uniquement à afficher une carte, mais à croiser des signaux terrain, des KPI et des détails d’actions.

## Position dans le site

- **Route** : `/actions/map`
- **Famille** : Cartographie & Impact
- **Palette dominante** : `sky`
- **Statut** : protégé
- **Contexte nécessaire** : compte connecté, parfois rôle ou profil spécifique

Cette page appartient au bloc cartographique du site. Elle doit rester visuellement cohérente avec les autres pages de cartographie et d’impact, sans mélanger sa teinte dominante avec les palettes réservées aux autres blocs.

## Choix de sobriété

La page privilégie la légèreté.

- carte seule = pas de calcul de score détaillé ;
- popup = calcul à la demande sur la même référence partagée ;
- référence chargée une fois par page ;
- même référence pour carte, popup et tableau ;
- popup chargé à la demande, sans fetch score séparé ;
- pas de RPC score au chargement de la carte ;
- pas de recalcul global inutile ;
- même logique, mais déclenchée au bon moment.
- la référence se réinitialise après une validation `approved`.
- les points se regroupent par cluster selon le zoom.
- zoom bas = cluster plus large.
- zoom haut = séparation plus fine.
- export vue = PNG du bloc carte + GeoJSON des actions filtrées.
- GeoJSON = métadonnées de vue + viewport courant + filtres.
- PNG = capture du rendu courant.

Ce choix garde la carte fluide. Il limite la charge DB. Il réduit aussi la surcharge visuelle pour les bénévoles et les cartographes.

## Structure fonctionnelle

La page est organisée en plusieurs zones.

### En-tête

L’en-tête pose la lecture générale de la page :

- titre principal de la carte des actions ;
- sous-titre de contexte ;
- badges de lecture terrain et de données en temps réel ;
- accès rapide vers la création d’action, l’observatoire et la méthodologie.

Cette zone sert à orienter l’utilisateur avant l’entrée dans la carte elle-même.

### Carte immersive

Le cœur de la page est la carte immersive affichée sur toute la largeur utile.

Cette zone :

- présente les actions géolocalisées ;
- sert de point d’entrée principal pour explorer le terrain ;
- peut ouvrir des détails sur une action sélectionnée ;
- constitue la lecture la plus visuelle de la page.

Les tracés de trajet sont rendus en mode piéton.

- départ / arrivée renseignés -> tracé OSRM `foot`
- OSRM indisponible -> fallback piéton en plusieurs segments
- jamais de simple segment droit départ -> arrivée quand une géométrie routée existe

Cette règle évite le tracé a vol d’oiseau sur la carte.

La carte est le premier niveau de compréhension. Elle doit rester stable, lisible et rapide.

### Ruban KPI

Sous la carte, la page expose un ruban d’indicateurs.

Il sert à :

- donner un aperçu rapide des volumes et agrégats ;
- résumer l’état du terrain ;
- fournir un repère immédiat entre les filtres et les données affichées.

Ces indicateurs complètent la carte plutôt que de la remplacer.

### Tour de contrôle

La tour de contrôle regroupe les filtres et les paramètres de lecture.

On y retrouve notamment :

- la recherche de zone ;
- la période d’analyse ;
- le statut des actions ;
- les catégories visibles ;
- la mise à jour de référence après validation ;
- le réinitialiseur de filtres ;
- le compteur d’éléments visibles et chargés.

Cette zone est critique pour la lecture cartographique, car elle pilote directement les données visibles dans la carte, les graphiques et le journal.

Elle affiche aussi :

- compteurs par catégorie ;
- compteurs visibles / chargés ;
- légende UI persistante ;
- réinitialisation rapide.

Les boutons de filtre affichent le volume par catégorie.

- Lieux propres
- Faible
- Moyen/Fort
- Critique
- Bacs
- Cendriers
- Combinés

### Panneau analytique et journal

La zone principale de lecture secondaire propose deux modes :

- **Analytique** : lecture synthétique des données ;
- **Journal** : vue tabulaire des actions filtrées.

Le basculement entre ces deux modes permet de passer d’une lecture exploratoire à une lecture plus opérationnelle.

La sélection est synchronisée :

- clic carte -> journal ouvert ;
- clic ligne -> popup carte ouvert ;
- ligne active -> visible et surlignée.

Le journal sert aussi de repère rapide pour relier un point à son score, ses métriques et sa géométrie.

### Carrousel de récits

La colonne latérale contient un carrousel de récits ou d’actions mises en avant.

Son rôle est de :

- mettre en avant des cas concrets ;
- donner une lecture plus narrative du terrain ;
- faciliter l’ouverture rapide d’une action spécifique.

La version latérale est compacte. Elle reste secondaire.

### Méthodologie

La page expose aussi un accès à la méthodologie.

Cette zone est utile pour expliquer :

- les formules ;
- les sources ;
- les marges d’erreur ;
- le cadre de lecture des indicateurs.

Pour un collègue cartographe, cette section est importante car elle documente le sens des données affichées.

### Aide secondaire

La colonne droite contient aussi une aide secondaire repliable.

Accès rapides :

- méthodologie ;
- sandbox terrain.

Ce bloc doit rester léger.

Les cartes d’aide sont compactes et repliables par défaut.

### Lecture rapide

Un bloc court aide les nouveaux à démarrer.

Il rappelle :

- couleur = niveau pollution ;
- compteur = volume visible ;
- clic carte ou journal = détail ouvert.

Ce bloc reste volontairement bref. Il ne remplace pas la légende ni la méthodologie.

### État vide

L’état vide est explicite.

Deux cas :

- aucune donnée visible à cause des filtres ;
- aucun point disponible.

CTA :

- `Réinitialiser` ;
- `Rafraîchir` ;
- `Méthodologie`.

L’état vide doit aussi garder une sortie simple :

- `Réinitialiser`
- `Rafraîchir`
- `Méthodologie`

## Légende de la carte

Légende = couleurs, seuils, filtres, besoins terrain.

La lecture suit le code réel de la page et du score.

| Partie | Valeur / seuil | Sens rapide |
|---|---:|---|
| Bleu | `0` déchets, `0` mégots | Lieu propre |
| Vert | score `< 30` | Faible, suivi simple |
| Jaune | score `30-79` | Moyen/Fort, vigilance |
| Violet | score `>= 80` | Critique, priorité |
| Bac | seuil infra `>= 75` | Besoin collecte |
| Cendrier | seuil infra `>= 75` | Besoin mégots |
| Combiné | `bac` + `cendrier` | Double besoin |

### Couleurs de pollution

Deux scores séparés sur `100`.

- score déchets
- score mégots

Références :

- base = actions approuvées only
- référence = plus grosse action par bénévole sur cette base
- déchets = plus fort `kg / bénévole`
- mégots = plus fort `mégots / bénévole`
- si une action nouvelle dépasse la référence, elle devient le nouveau max

Formule :

- `kg / bénévole = kg total / bénévoles`
- `mégots / bénévole = mégots total / bénévoles`
- `score déchets = clamp((kg / bénévole / réf déchets) * 100, 0, 100)`
- `score mégots = clamp((mégots / bénévole / réf mégots) * 100, 0, 100)`
- `score global = max(score déchets, score mégots)`

Cas à part :

- `kg = 0` et `mégots = 0` → score global `0`
- un seul axe suffit à faire monter la couleur
- aucun mélange, aucune pondération
- référence recalculée depuis la base
- référence = maximum observé par bénévole sur actions approuvées
- nouvelle référence = score `100` pour cette action
- anciens scores = recalculés au prochain fetch

Effet métier :

- le plus haut score décide de la couleur
- un pic déchets suffit à basculer la carte
- un pic mégots suffit aussi
- le score s’exprime toujours en `0-100`
- si une action dépasse `100`, elle devient la nouvelle référence
- les autres scores bougent au prochain chargement de la carte
- la carte seule ne charge pas le détail des scores
- le détail des scores se charge à l’ouverture d’une action

### Lecture exacte des couleurs

Seuils fixes, pas d’interprétation libre.

- **Bleu** : `0` déchets, `0` mégots
- **Vert** : score global `< 30`
- **Jaune** : score global `30-79`
- **Violet** : score global `>= 80`

Lecture bénévole :

- bleu → pas d’urgence
- vert → suivi léger
- jaune → vérification, suivi, priorisation possible
- violet → intervention prioritaire

### Libellés UI des catégories

Filtres visibles :

- **Lieux propres** → bleu
- **Faible** → vert
- **Moyen/Fort** → jaune
- **Critique** → violet
- **Bacs** → besoin collecte
- **Cendriers** → besoin mégots
- **Combinés** → deux besoins

Ces libellés filtrent l’affichage. Ils ne créent pas de nouvelles données.

### Seuils de lecture

Progression couleur :

- `0` à `29` → vert vers orange
- `30` à `59` → orange vers rouge
- `60` à `79` → rouge vers violet
- `>= 80` → violet fixe

`60` = palier visuel interne, pas une catégorie.

Deux actions d’une même catégorie peuvent garder des nuances différentes selon le score exact.

### Exemple de calcul

Références d’exemple :

- déchets = `10 kg / bénévole`
- mégots = `1000` mégots / bénévole

Cas A :

- `4 kg`, `0 mégots`, `2 bénévoles`
- déchets = `2 kg / bénévole`
- mégots = `0 mégots / bénévole`
- score déchets = `20`
- score mégots = `0`
- score global = `20`
- lecture = vert

Cas B :

- `10 kg`, `1000` mégots, `2 bénévoles`
- déchets = `5 kg / bénévole`
- mégots = `500` mégots / bénévole
- score déchets = `50`
- score mégots = `50`
- score global = `50`
- lecture = jaune

Cas C :

- `16 kg`, `1800` mégots, `2 bénévoles`
- déchets = `8 kg / bénévole`
- mégots = `900` mégots / bénévole
- score déchets = `80`
- score mégots = `90`
- score global = `90`
- lecture = violet

La couleur finale suit le score le plus haut.
La base calcule la référence, la carte lit le résultat.

### Signaux d’infrastructure

Signal infra séparé du score pollution.

Seuils :

- déchets `>= 75` → bac
- mégots `>= 75` → cendrier
- deux seuils atteints → combiné

Ces signaux ne remplacent pas la couleur. Ils ajoutent un besoin terrain.

### Lecture du panneau d’infrastructure

Lecture du panneau :

- mégots détectés → type suggéré `cendrier`
- sinon → type suggéré `bac`
- deux besoins → icône combinée, texte simplifié

Icône = niveau de besoin.
Texte = résumé rapide.
Analyse précise = icône + contexte terrain + score.

### Implications concrètes pour les bénévoles

Légende = guide d’action.

- **Bleu** : vigilance, pas d’urgence
- **Vert** : suivi léger, observation, relevé
- **Jaune** : passage dédié, nettoyage ciblé, contrôle
- **Violet** : point chaud, priorité, signalement possible
- **Bac détecté** : capacité de collecte à renforcer
- **Cendrier détecté** : mobilier anti-mégots ou prévention ciblée
- **Signal combiné** : priorité haute, pollution + manque d’infra

### Fonction de la légende dans les filtres

La légende aide à lire les filtres :

- interpréter les boutons de catégorie
- comprendre pourquoi une action apparaît ou non
- relier carte, journal et KPI

Les boutons affichent aussi un compteur.

### Ce qu’il faut retenir

- Couleur = score global pollution
- Signal infra = besoin terrain
- Combinaison possible des deux
- Référence = plus grosse action par bénévole en base
- Aucune pondération
- Score global = max déchets / mégots
- Seuil jaune = `30`
- Seuil violet = `80`
- Seuil infra = `75`
- Libellés UI = filtres de visibilité
- Compteurs = volume par catégorie
- Légende = système de classification, pas décor

## Données et logique de lecture

La page agrège plusieurs couches de données :

- éléments de carte issus du flux d’actions
- filtres de période, de statut et de catégorie
- indicateurs dérivés pour l’affichage des KPI
- éléments de détail visibles dans le journal et le panneau analytique

La géométrie affichée n’est pas limitée au point source.

- géométrie réelle si présente
- géométrie routée si départ et arrivée sont connus
- point fallback si aucune géométrie exploitable n’existe

Le routage piéton passe par `OSRM` sur le profil `foot`.

Le principe de fonctionnement est le suivant :

1. les données sont chargées ;
2. les filtres réduisent l’ensemble visible ;
3. la carte et les panneaux secondaires se recalculent ;
4. l’utilisateur bascule entre lecture cartographique, analytique ou tabulaire.

La fiche de détail reprend la lecture métier de chaque action :

- score exact sur `100`
- étiquette courte de lecture terrain
- volume `kg` et mégots
- statut, type de lieu, qualité, géométrie
- besoin infra si le seuil `75/100` est atteint

## Interactions principales

- ouvrir ou fermer la sélection d’une action ;
- changer la période d’analyse ;
- filtrer par statut ;
- filtrer par zone ;
- filtrer par catégorie ;
- réinitialiser les filtres ;
- basculer entre analytique et journal ;
- ouvrir une action depuis la carte, le carrousel ou la table ;
- faire remonter la sélection dans le journal ;
- garder la ligne active visible.

Chaque interaction doit conserver une cohérence entre la carte, les KPI et les vues secondaires.

## Points de vigilance UI

### Lisibilité

La page est dense. Il faut éviter :

- la surcharge textuelle ;
- la multiplication des widgets concurrents ;
- les cartes trop proches visuellement ;
- les micro-contextes qui ralentissent la lecture.

Le panneau latéral doit rester compact.
L’aide secondaire ne doit pas dominer.

### Hiérarchie

L’ordre de priorité doit rester :

1. carte ;
2. KPI ;
3. filtres ;
4. journal ou analytique ;
5. éléments contextuels secondaires.

### Cohérence couleur

La page doit rester dominée par la teinte `sky`.

Il faut éviter de mélanger cette teinte avec les palettes réservées à l’impact ou à l’alerte dans les zones principales.

La légende peut montrer du `rose` ou du `violet` pour les niveaux critiques, mais la base de page reste `sky`.

### États

La page doit documenter et supporter clairement :

- chargement ;
- vide ;
- accès refusé.

Chaque état doit rester sobre et utile, avec un CTA clair quand c’est pertinent.

L’état vide doit distinguer filtre vide et absence de données.

Si une zone est saisie, l’état vide doit dire que la zone ne renvoie aucun point.

## Ce que le cartographe doit retenir

- Surface de lecture terrain, pas simple vue de carte.
- Filtres = lecture globale, pas bloc isolé.
- Méthodologie = clé d’interprétation.
- Carte, journal, analytique doivent rester synchronisés.
- Lisibilité globale > densité d’informations.
- Tracés piétons dès qu’un itinéraire existe.
- Légende et compteurs servent la priorisation terrain.
- Le panneau latéral reste secondaire.

## Références

- [Fiche canonique](./README.md)
- [Photo desktop](./photo/desktop/)
