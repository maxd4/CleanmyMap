# Transformation UX/UI : Modules Visuels Immersifs & Premium

L'objectif de cette refonte est de supprimer les murs de texte dans les rubriques clés de CleanMyMap pour les remplacer par des modules interactifs, animés et hautement visuels, tout en conservant d'excellentes performances mobiles et une accessibilité optimale.

## 1. Rubrique "Apprendre" (Limites Planétaires)

### Composant cible : `src/components/learn/planetary-boundaries.tsx`
**Problème :** Présentation sous forme de longues cartes textuelles énumérant les impacts et solutions.
**Transformation Visuelle : Système Orbital / Radar Interactif**
- **Concept** : Un graphique circulaire interactif (style "Radar" ou "Anneaux Concentriques") représentant la Terre au centre.
- **Visualisation** : Les 9 limites sont des segments autour du centre. La longueur du segment vers l'extérieur représente le niveau de risque (`safe`, `increasing-risk`, `high-risk`, `transgressed`).
- **Couleurs** : Dégradés Cyan/Vert (Safe) vers Jaune/Orange (Risque) et Rouge/Magenta (Transgressé) avec un effet de "Glow" subtil (Framer Motion).
- **Interaction** : 
  - *Default* : La roue tourne très lentement.
  - *Hover/Tap* : Le segment s'illumine (focus), les autres s'assombrissent.
  - *Détails* : Un panneau latéral ou central affiche dynamiquement la description, avec des icônes pour les impacts/solutions au lieu de listes à puces textuelles.
- **Composant créé** : `PlanetaryRadarChart.tsx`

## 2. Rubrique "Rapport d'Impact"

### Composants cibles : `src/app/reports/page.tsx` & `analytics.ts`
**Problème :** Tableaux de données brutes, listes de statistiques textuelles.
**Transformation Visuelle : Dashboard Dynamique**
- **KPIs Animés** : Les chiffres clés (volume de déchets, CO2 évité) utilisent des compteurs animés (`framer-motion` animate).
- **Timeline Écologique** : Remplacement des historiques par une frise chronologique interactive (Timeline) où chaque action est un point brillant.
- **Graphiques d'Impact** : Utilisation de jauges circulaires (Radial Bars) pour montrer la progression vers les objectifs environnementaux.
- **Composants créés** : `AnimatedImpactMetrics.tsx`, `EcologicalTimeline.tsx`, `RadialProgressGauge.tsx`

## 3. Rubrique "Formulaire" (Déclaration d'Action)

### Composant cible : `src/components/actions/action-declaration-form.tsx`
**Problème :** Instructions longues, nombreux champs textes, charge cognitive élevée.
**Transformation Visuelle : Expérience "App-Like" Gamifiée**
- **Sélecteurs Visuels** : Remplacement des boutons radios par des cartes illustrées (icônes Lucide de grande taille) avec bordure lumineuse lors de la sélection.
- **Jauges Interactives** : Remplacement des champs de saisie numériques (ex: volume) par des sliders visuels (ex: illustration de sacs poubelles qui se remplissent).
- **Feedback Immédiat** : Remplacement des textes d'aide par des micro-animations (checkmarks verts animés) lors de la validation d'une étape.
- **Composants créés** : `VisualOptionCard.tsx`, `VolumeSliderWidget.tsx`

## 4. Rubrique "Carte" & Feed

### Composants cibles : `actions-map-feed.tsx` & `actions-map-canvas.tsx`
**Problème :** Flux d'activité textuel (Feed) très long à côté de la carte.
**Transformation Visuelle : Exploration Spatiale**
- **Heatmap Dynamique** : Superposition d'une heatmap (carte de chaleur) animée pour voir les zones d'efforts citoyens d'un coup d'œil, plutôt que de lire une liste d'adresses.
- **Mini-Feed Flottant** : Le feed textuel devient un carrousel horizontal en bas de l'écran (mobile-first) ou des "Story cards" transparentes superposées à la carte.
- **Composants créés** : `MapHeatmapLayer.tsx`, `FloatingStoryFeed.tsx`

## 5. Rubrique "Discussion" (Communauté)

### Composant cible : `src/components/chat/chat-shell.tsx`
**Problème :** Interface de chat standard (bulles de texte denses).
**Transformation Visuelle : Réseau de Communauté**
- **Graphe d'Interactions** : Une visualisation en réseau (nodes) optionnelle montrant les sujets chauds.
- **Rich Media Cards** : Remplacement des longs messages par des cartes résumées (générées par IA) avec tags visuels.
- **Composants créés** : `TopicNetworkGraph.tsx` (optionnel), `RichMessageCard.tsx`

---

## 🛠 Compromis Techniques & Performances

1. **Performance Mobile vs 3D** : Pour les limites planétaires, au lieu de WebGL/Three.js qui est lourd, nous utiliserons du SVG + `framer-motion` (ou D3.js). Cela garantit une animation fluide à 60fps sur mobile tout en offrant l'aspect premium et glowing demandé.
2. **Lisibilité** : Le "Glow" et les effets de transparence utiliseront les tokens CSS existants (`cmm-surface-muted`, backdrop-blur) pour garantir le contraste. Les textes explicatifs (solutions) seront masqués par défaut et révélés progressivement.

> [!IMPORTANT]
> **Plan d'attaque :**
> Nous commencerons par la **Rubrique "Apprendre" (Limites Planétaires)** pour créer cet effet "Wow" avec la roue interactive, car c'est le cas d'usage le plus flagrant de "mur de texte".

## Open Questions

1. Pour la visualisation des Limites Planétaires, validez-vous l'approche "Radar / Roue SVG Animée" plutôt que de la vraie 3D (Three.js) afin de privilégier la fluidité mobile ?
2. Souhaitez-vous que je commence l'implémentation par ce composant (`planetary-boundaries.tsx`) ?
