# Visual Storytelling & Data Visualization

L'objectif de CleanMyMap est de transformer des données froides et textuelles en une expérience immersive, scientifique et visuelle. Ce guide définit quand et comment coder des visualisations directes (D3.js, SVG, Framer Motion) au lieu d'afficher du texte brut.

## Principes Fondamentaux

1. **Le Visuel Prime sur le Texte** : Si une information peut être transmise par une forme, une couleur ou un mouvement, privilégiez cette approche.
2. **Zéro Clavier** : Réduisez l'effort cognitif. Utilisez des curseurs, des cadrans et des cartes interactives plutôt que des champs de saisie ou des listes textuelles longues.
3. **Mouvement Sémantique** : L'animation n'est pas décorative, elle est informative. Elle doit guider l'œil vers l'action ou le changement d'état.

## Stack Technologique

- **D3.js** : Pour les graphes complexes, les réseaux de neurones/sujets, et les projections géographiques avancées.
- **SVG React** : Pour les indicateurs de performance (KPIs), les jauges personnalisées et les icônes animées.
- **Framer Motion** : Pour l'orchestration des entrées en scène, les transitions de page et les micro-interactions de feedback.

---

## Guide de Décision : Texte vs Visuel

| Type d'information | Approche Textuelle (À ÉVITER) | Approche Visuelle (PRIVILÉGIER) | Outil recommandé |
| :--- | :--- | :--- | :--- |
| **Ratios & Parts** | "30% de recyclage" | Radar Chart ou Donut Chart animé | SVG / D3.js |
| **Tendances** | "Le taux augmente de 5%" | Sparkline ou Area Chart luminescent | D3.js |
| **Relations** | Liste de sujets liés | Topic Network Graph (Bulles flottantes) | D3.js + Framer Motion |
| **Impact Scientifique** | "6kg de CO2 évités" | Jauge de pression ou Score Radial | SVG Animé |
| **Progression** | "Étape 2 sur 5" | Barre de progression organique ou Steps animés | Framer Motion |

---

## Standards de Codage

### 1. SVG Dynamique (React)
Ne pas utiliser d'images statiques pour les données. Codez le SVG directement pour pouvoir animer les attributs (`stroke-dasharray`, `fill-opacity`, etc.).

```tsx
// Exemple : Jauge d'impact circulaire
export const ImpactGauge = ({ value }: { value: number }) => (
  <svg className="w-24 h-24">
    <motion.circle
      cx="48" cy="48" r="40"
      stroke="url(#gradient)"
      strokeWidth="8"
      strokeDasharray="251"
      initial={{ strokeDashoffset: 251 }}
      animate={{ strokeDashoffset: 251 - (251 * value) / 100 }}
    />
  </svg>
);
```

### 2. D3.js & React
Utilisez D3 pour les calculs de mathématiques (layouts de force, échelles) mais laissez React gérer le rendu du DOM/SVG pour une meilleure intégration avec les hooks de l'application.

**Pattern recommandé :**
- Utilisez `d3-force` pour calculer les positions dans un `useEffect` ou un `useMemo`.
- Stockez les positions dans un état React ou transmettez-les à des composants `motion.circle` pour bénéficier des positions Framer Motion.
- Exemple : Le `TopicNetworkGraph` utilise ce pattern pour des bulles fluides.

### 3. Micro-animations (Framer Motion)
Chaque interaction (hover, clic) doit déclencher une micro-animation `spring` (ressort) pour un ressenti premium.

```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 400, damping: 10 }}
/>
```

## Accessibilité & Performance
- **Mode Sobre** : Toujours prévoir une alternative textuelle ou un rendu statique pour le mode `sobre` (accessible via `useSitePreferences`).
- **Légèreté** : Éviter les bibliothèques de charts lourdes (Recharts, etc.) si un simple SVG codé à la main suffit.
