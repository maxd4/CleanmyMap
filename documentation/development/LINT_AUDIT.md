# Audit ESLint - Plan de Correction Progressive

**Date de création** : 28/04/2026  
**Statut** : 0 erreur, 231 warnings  
**Objectif** : Corriger les warnings par rubrique lors du développement

---

## 📊 Vue d'ensemble

### Métriques globales
- **Erreurs critiques** : ✅ 0 (toutes corrigées)
- **Warnings totaux** : ⚠️ 231
- **Fichiers concernés** : 89
- **Types de warnings** : 8 catégories principales

### Répartition par sévérité
- 🔴 **Critique** : 0 (Performance React, imports manquants)
- 🟠 **Élevée** : 45 (Types `any`, variables non utilisées)
- 🟡 **Moyenne** : 156 (Apostrophes non échappées, images non optimisées)
- 🟢 **Faible** : 30 (Directives ESLint inutiles, fichiers longs)

---

## 🎯 Stratégie de correction

### Principe : "Fix as you go"
Corriger les warnings **uniquement** lors du développement actif d'une rubrique pour :
- Éviter les régressions
- Maintenir la vélocité de développement
- Garantir la qualité du code modifié

### Priorités de correction
1. **Immédiat** : Warnings critiques (performance, sécurité)
2. **Avec développement** : Warnings de la rubrique en cours
3. **Opportuniste** : Corrections rapides lors de passages sur le code

---

## 📋 Audit par rubrique

### 🏠 **Page d'accueil** (Priorité 1 - En cours de modularisation)
**Fichiers** : `src/app/page.tsx`, `src/components/home/*`

| Fichier | Warnings | Types | Priorité |
|---------|----------|-------|----------|
| `home-community-activity.tsx` | 3 | Apostrophes, `<img>` | 🟡 Moyenne |
| `home-hero.tsx` | 1 | Apostrophes | 🟡 Moyenne |
| `ZoneRepartitionChart.tsx` | 2 | Types `any` | 🟠 Élevée |

**Actions recommandées** :
```bash
# Lors du prochain développement sur la page d'accueil
- Remplacer les <img> par <Image> de Next.js
- Typer correctement les props des graphiques
- Échapper les apostrophes avec &apos;
```

---

### 🗺️ **Carte et Actions** (Priorité 2)
**Fichiers** : `src/app/(app)/actions/*`, `src/components/actions/*`

| Fichier | Warnings | Types | Priorité |
|---------|----------|-------|----------|
| `action-declaration-form.tsx` | 12 | Performance React, Types `any` | 🔴 Critique |
| `action-popup-content.tsx` | 7 | Variables non utilisées, Apostrophes | 🟠 Élevée |
| `actions-map-feed.tsx` | 3 | Apostrophes | 🟡 Moyenne |
| `action-drawing-map.tsx` | 2 | Performance React | 🔴 Critique |

**Actions recommandées** :
```bash
# Corrections critiques à faire rapidement
- Déplacer setState hors des useEffect (performance)
- Typer les props au lieu d'utiliser 'any'
- Supprimer les imports/variables non utilisés
```

---

### 📊 **Dashboard et Pilotage** (Priorité 3)
**Fichiers** : `src/app/(app)/dashboard/*`, `src/components/dashboard/*`

| Fichier | Warnings | Types | Priorité |
|---------|----------|-------|----------|
| `dashboard/page.tsx` | 3 | Apostrophes, Fichier long (537 lignes) | 🟡 Moyenne |
| `business-alerts-panel.tsx` | 2 | Apostrophes | 🟡 Moyenne |

**Actions recommandées** :
```bash
# Lors de la refactorisation du dashboard
- Diviser le fichier page.tsx en composants plus petits
- Échapper les apostrophes dans les textes
```

---

### 📈 **Rapports et Analytics** (Priorité 4)
**Fichiers** : `src/components/reports/*`

| Fichier | Warnings | Types | Priorité |
|---------|----------|-------|----------|
| `analytics.ts` | 1 | Fichier long (548 lignes) | 🟢 Faible |
| `AnimatedImpactMetrics.tsx` | 3 | Imports non utilisés | 🟠 Élevée |
| `reports-kpi-summary.tsx` | 2 | Apostrophes | 🟡 Moyenne |

**Actions recommandées** :
```bash
# Lors du développement des rapports
- Nettoyer les imports inutiles
- Modulariser analytics.ts
```

---

### 🎓 **Apprentissage et Quiz** (Priorité 5)
**Fichiers** : `src/components/learn/*`

| Fichier | Warnings | Types | Priorité |
|---------|----------|-------|----------|
| `environmental-quiz.tsx` | 4 | Apostrophes, Fichier long (543 lignes) | 🟡 Moyenne |
| `planetary-boundaries.tsx` | 4 | Types `any`, Apostrophes | 🟠 Élevée |
| `planetary-radar-chart.tsx` | 1 | Types `any` | 🟠 Élevée |

**Actions recommandées** :
```bash
# Lors de l'amélioration des quiz
- Typer correctement les données des graphiques
- Diviser environmental-quiz.tsx
```

---

### 🤝 **Partenaires et Communauté** (Priorité 6)
**Fichiers** : `src/components/sections/rubriques/*`

| Fichier | Warnings | Types | Priorité |
|---------|----------|-------|----------|
| `partner-onboarding-form.tsx` | 1 | Fichier long (528 lignes) | 🟢 Faible |
| `events-tabs-card.tsx` | 7 | Apostrophes, Guillemets | 🟡 Moyenne |
| `annuaire-map-canvas.tsx` | 6 | Variables non utilisées | 🟠 Élevée |

---

### 💬 **Chat et Communication** (Priorité 7)
**Fichiers** : `src/components/chat/*`

| Fichier | Warnings | Types | Priorité |
|---------|----------|-------|----------|
| `chat-shell.tsx` | 5 | Variables non utilisées, Dépendances | 🟠 Élevée |
| `rich-message-card.tsx` | 4 | Imports non utilisés, `<img>` | 🟡 Moyenne |

---

### ⚙️ **Administration et Scripts** (Priorité 8)
**Fichiers** : `scripts/*`, `src/components/admin/*`

| Fichier | Warnings | Types | Priorité |
|---------|----------|-------|----------|
| Scripts `.mjs` | 10 | Variables non utilisées | 🟢 Faible |
| `enhanced-admin.tsx` | 3 | Performance React, Types `any` | 🔴 Critique |
| `feature-flag-admin.tsx` | 3 | Performance React, Types `any` | 🔴 Critique |

---

## 🛠️ Guide de correction par type

### 🔴 Performance React (`react-hooks/set-state-in-effect`)
```typescript
// ❌ Problématique
useEffect(() => {
  setState(newValue);
}, []);

// ✅ Solution
useEffect(() => {
  const updateState = () => setState(newValue);
  updateState();
}, []);
```

### 🟠 Types `any` (`@typescript-eslint/no-explicit-any`)
```typescript
// ❌ Problématique
const handleData = (data: any) => { ... }

// ✅ Solution
interface DataType {
  id: string;
  value: number;
}
const handleData = (data: DataType) => { ... }
```

### 🟡 Apostrophes (`react/no-unescaped-entities`)
```jsx
// ❌ Problématique
<p>L'action s'est bien déroulée</p>

// ✅ Solution
<p>L&apos;action s&apos;est bien déroulée</p>
```

### 🟡 Images (`@next/next/no-img-element`)
```jsx
// ❌ Problématique
<img src="/photo.jpg" alt="Photo" />

// ✅ Solution
import Image from 'next/image';
<Image src="/photo.jpg" alt="Photo" width={300} height={200} />
```

### 🟠 Variables non utilisées (`@typescript-eslint/no-unused-vars`)
```typescript
// ❌ Problématique
import { unused, used } from './module';

// ✅ Solution
import { used } from './module';
```

---

## 📅 Planning de correction

### Phase 1 : Corrections critiques (Immédiat)
- [ ] `action-declaration-form.tsx` - Performance React
- [ ] `enhanced-admin.tsx` - Performance React  
- [ ] `feature-flag-admin.tsx` - Performance React
- [ ] `action-drawing-map.tsx` - Performance React

### Phase 2 : Avec développement actif
- [ ] **Page d'accueil** - Lors de la modularisation en cours
- [ ] **Carte** - Lors des améliorations UX
- [ ] **Dashboard** - Lors de la refactorisation

### Phase 3 : Corrections opportunistes
- [ ] Fichiers longs - Lors de modifications importantes
- [ ] Types `any` - Lors de l'amélioration des types
- [ ] Images - Migration progressive vers Next.js Image

---

## 🎯 Objectifs par milestone

### Milestone 1 (Mai 2026)
- ✅ 0 erreur (atteint)
- 🎯 < 200 warnings (-31)
- 🎯 0 warning critique

### Milestone 2 (Juin 2026)  
- 🎯 < 150 warnings (-50)
- 🎯 Page d'accueil sans warning

### Milestone 3 (Juillet 2026)
- 🎯 < 100 warnings (-50)
- 🎯 Rubriques principales sans warning

---

## 📝 Processus de développement

### Avant de commencer une rubrique
1. Consulter cet audit pour la rubrique concernée
2. Identifier les warnings à corriger
3. Inclure les corrections dans l'estimation

### Pendant le développement
1. Corriger les warnings de la rubrique modifiée
2. Éviter d'introduire de nouveaux warnings
3. Utiliser `npm run lint` régulièrement

### Avant de merger
1. Vérifier que `npm run lint` passe
2. Mettre à jour cet audit si nécessaire
3. Documenter les corrections apportées

---

## 🔧 Outils et commandes

### Linter par fichier spécifique
```bash
npx eslint src/components/home/home-hero.tsx
```

### Correction automatique
```bash
npx eslint src/components/home/ --fix
```

### Analyse par type de warning
```bash
npx eslint . --format json | jq '.[] | .messages[] | .ruleId' | sort | uniq -c
```

### Ignorer temporairement (à éviter)
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = response;
```

---

## 📊 Métriques de suivi

| Métrique | Valeur actuelle | Objectif M1 | Objectif M2 | Objectif M3 |
|----------|-----------------|-------------|-------------|-------------|
| Warnings totaux | 231 | 200 | 150 | 100 |
| Warnings critiques | 8 | 0 | 0 | 0 |
| Fichiers > 500 lignes | 4 | 2 | 1 | 0 |
| Types `any` | 45 | 35 | 25 | 15 |

---

*Cet audit sera mis à jour à chaque correction significative pour maintenir la visibilité sur la dette technique.*