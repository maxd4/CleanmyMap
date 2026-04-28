# Plan de Modularisation - 15 Fichiers Prioritaires

Plan détaillé des fichiers à modulariser avec objectifs et structure cible.

---

## 🔴 Priorité Haute (1-5) - Impact Immédiat

### 1. ✅ `src/app/page.tsx` (7695 → 3500 octets) - COMPLÉTÉ

**Réduction** : 54%

**Fichiers créés** :
- `components/home/index.ts` - Exports centralisés
- `lib/home/config.ts` - Configuration et builders

**Date** : 28/04/2026

---

### 2. ⏸️ `src/app/(app)/dashboard/page.tsx` (22545 octets) - CRITIQUE

**Objectif** : < 5000 octets

**Estimation** : 60-90 min

**Fichiers à créer** :
```
components/dashboard/
├── dashboard-layout.tsx
├── dashboard-header.tsx
└── index.ts

hooks/
└── use-dashboard-data.ts
```

**Responsabilités identifiées** :
- Layout et structure
- Header avec actions
- Panels de données
- Logique de chargement

---

### 3. ⏸️ `src/components/actions/actions-map-feed.tsx` (21586 octets) - CRITIQUE

**Objectif** : < 6000 octets

**Estimation** : 90-120 min

**Fichiers à créer** :
```
components/actions/map/
├── map-feed-sidebar.tsx
├── map-filters-panel.tsx
├── map-legend.tsx
└── index.ts

hooks/
└── use-map-feed-state.ts
```

**Responsabilités identifiées** :
- Sidebar avec liste d'actions
- Panel de filtres
- Légende de la carte
- État et logique de filtrage

---

### 4. ⏸️ `src/app/(app)/actions/map/page.tsx` (19189 octets) - HAUTE

**Objectif** : < 4000 octets

**Estimation** : 45-60 min

**Fichiers à créer** :
```
app/(app)/actions/map/
├── map-page-header.tsx
├── map-page-toolbar.tsx
└── index.ts

hooks/
└── use-map-page-state.ts
```

**Responsabilités identifiées** :
- Header de page
- Toolbar avec actions
- État de la page
- Gestion des filtres

---

### 5. ⏸️ `src/components/sections/rubriques/gamification-section.tsx` (18633 octets) - HAUTE

**Objectif** : < 5000 octets

**Estimation** : 60-90 min

**Fichiers à créer** :
```
components/sections/rubriques/gamification/
├── gamification-header.tsx
├── badges-showcase-panel.tsx
├── progression-tracker-panel.tsx
├── leaderboard-panel.tsx
└── index.ts

hooks/
└── use-gamification-data.ts
```

**Responsabilités identifiées** :
- Header de section
- Showcase des badges
- Tracker de progression
- Leaderboard
- Logique de gamification

---

## 🟡 Priorité Moyenne (6-10)

### 6. ⏸️ `src/components/learn/environmental-quiz.tsx` (24314 octets)

**Objectif** : < 6000 octets

**Estimation** : 90-120 min

**Fichiers à créer** :
```
components/learn/quiz/
├── quiz-question.tsx
├── quiz-answers.tsx
├── quiz-progress.tsx
├── quiz-results.tsx
└── index.ts

hooks/
└── use-quiz-logic.ts

lib/learn/
└── quiz-config.ts
```

---

### 7. ⏸️ `src/components/navigation/app-navigation-ribbon.tsx` (18742 octets)

**Objectif** : < 5000 octets

**Estimation** : 60-90 min

**Fichiers à créer** :
```
components/navigation/ribbon/
├── ribbon-menu.tsx
├── ribbon-user-menu.tsx
├── ribbon-notifications.tsx
└── index.ts

lib/navigation/
└── ribbon-config.ts
```

---

### 8. ⏸️ `src/components/sections/rubriques/weather-section.tsx` (17908 octets)

**Objectif** : < 5000 octets

**Estimation** : 60-90 min

**Fichiers à créer** :
```
components/sections/rubriques/weather/
├── weather-current.tsx
├── weather-forecast.tsx
├── weather-alerts.tsx
└── index.ts

hooks/
└── use-weather-data.ts
```

---

### 9. ⏸️ `src/components/actions/action-declaration-form.tsx` (17072 octets)

**Objectif** : < 5000 octets

**Estimation** : 45-60 min

**Note** : Partiellement modularisé, continuer l'extraction

**Fichiers à créer** :
```
components/actions/declaration/
├── declaration-form-wrapper.tsx
├── declaration-form-validation.ts
└── index.ts
```

---

### 10. ⏸️ `src/components/partners/partner-onboarding-form.tsx` (16797 octets)

**Objectif** : < 5000 octets

**Estimation** : 60-90 min

**Fichiers à créer** :
```
components/partners/onboarding/
├── onboarding-step-1.tsx
├── onboarding-step-2.tsx
├── onboarding-step-3.tsx
├── onboarding-navigation.tsx
└── index.ts

hooks/
└── use-onboarding-state.ts
```

---

## 🟢 Priorité Basse (11-15)

### 11. ⏸️ `src/components/learn/planetary-boundaries.tsx` (16536 octets)

**Objectif** : < 5000 octets

**Estimation** : 45-60 min

---

### 12. ⏸️ `src/components/reports/reports-kpi-summary.tsx` (16234 octets)

**Objectif** : < 5000 octets

**Estimation** : 45-60 min

---

### 13. ⏸️ `src/components/sections/rubriques/trash-spotter-section.tsx` (15892 octets)

**Objectif** : < 5000 octets

**Estimation** : 45-60 min

---

### 14. ⏸️ `src/components/chat/chat-shell.tsx` (15678 octets)

**Objectif** : < 5000 octets

**Estimation** : 45-60 min

---

### 15. ⏸️ `src/components/reports/reports-window-comparisons-section.tsx` (15234 octets)

**Objectif** : < 5000 octets

**Estimation** : 45-60 min

---

## 📊 Métriques Globales

### Taille Totale
- **Avant** : ~280 KB
- **Après** : ~85 KB (objectif)
- **Réduction visée** : 70%

### Temps Estimé Total
- **Priorité Haute** : 6-8 heures
- **Priorité Moyenne** : 6-8 heures
- **Priorité Basse** : 4-6 heures
- **Total** : 16-22 heures

### Fichiers à Créer
- **Composants** : ~40
- **Hooks** : ~15
- **Config/Utils** : ~10
- **Total** : ~65 nouveaux fichiers

---

## 🎯 Objectifs de Taille par Type

| Type de Fichier | Taille Max | Lignes Max |
|-----------------|-----------|-----------|
| Page (app/) | 5 KB | 200 lignes |
| Composant Complexe | 10 KB | 300 lignes |
| Composant Simple | 5 KB | 150 lignes |
| Hook | 5 KB | 200 lignes |
| Config/Utils | 3 KB | 100 lignes |

**Règle** : Si dépassement → Continuer à modulariser !

---

## 🎯 Objectifs par Sprint

### Sprint 1 (Semaine 1)
- [x] Documentation et outils
- [x] Modularisation #1 (page.tsx)
- [ ] Modularisation #2 (dashboard)
- [ ] Modularisation #3 (map-feed)

### Sprint 2 (Semaine 2)
- [ ] Modularisation #4 (map page)
- [ ] Modularisation #5 (gamification)
- [ ] Modularisation #6 (quiz)

### Sprint 3 (Semaine 3)
- [ ] Modularisations #7-10
- [ ] Revue et optimisations

### Sprint 4 (Semaine 4)
- [ ] Modularisations #11-15
- [ ] Documentation finale
- [ ] Validation complète

---

**Dernière mise à jour** : 28/04/2026  
**Progression** : 1/15 fichiers (6.7%)
