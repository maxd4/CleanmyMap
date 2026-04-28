# Aide-Mémoire Modularisation IA

> Référence ultra-rapide pour les agents IA. Lire `AI_MODULARIZATION_GUIDE.md` pour les détails complets.

---

## 🚀 Démarrage Immédiat

```bash
# 1. Analyser
npm run analyze:heavy-files

# 2. Consulter
# - MODULARIZATION_PLAN.md (stratégie)
# - MODULARIZATION_PROGRESS.md (état)

# 3. Modulariser (voir ci-dessous)

# 4. Valider
npm run lint && npm run test && npm run build

# 5. Documenter
npm run modularize:report <fichier>
```

---

## 📋 Processus en 5 Étapes

### 1. ANALYSER (5 min)
- Lire le fichier
- Identifier responsabilités
- Noter dépendances

### 2. PLANIFIER (5 min)
- Définir structure
- Nommer fichiers
- Définir types

### 3. EXTRAIRE (20-40 min)
- Créer config.ts (types + constantes + builders)
- Créer hooks (logique métier)
- Créer composants (UI)
- Créer index.ts (exports)

### 4. INTÉGRER (10 min)
- Mettre à jour imports
- Remplacer code inline
- Passer props

### 5. VALIDER (5 min)
- lint + test + build
- Générer rapport
- Mettre à jour progression

---

## 🎯 Objectifs de Taille

| Type | Max |
|------|-----|
| Page | 200 lignes |
| Composant Complexe | 300 lignes |
| Composant Simple | 150 lignes |
| Hook | 200 lignes |
| Config | 100 lignes |

---

## ✅ Checklist Rapide

```
□ Plan consulté
□ Types créés
□ Config extraite
□ Hooks extraits
□ Composants extraits
□ index.ts créé
□ Imports mis à jour
□ lint ✓
□ test ✓
□ build ✓
□ Rapport généré
□ Progression mise à jour
```

---

## 🔧 Templates Code

### Config
```typescript
// lib/feature/config.ts
export interface FeatureConfig { }
export const CONFIG = [];
export function buildData(input) { }
```

### Hook
```typescript
// hooks/use-feature.ts
export function useFeature() {
  const [state, setState] = useState();
  return { data, loading };
}
```

### Composant
```typescript
// components/feature/section.tsx
interface Props { }
export function Section(props: Props) {
  return <div></div>;
}
```

### Index
```typescript
// components/feature/index.ts
export { Section1 } from './section-1';
export { Section2 } from './section-2';
```

---

## ❌ Pièges à Éviter

- ❌ Sur-modulariser
- ❌ Noms génériques
- ❌ Dépendances circulaires
- ❌ Oublier les tests
- ❌ Dupliquer le code

---

## 📊 Priorités Actuelles

1. ✅ page.tsx (complété)
2. ⏸️ dashboard (22KB - CRITIQUE)
3. ⏸️ map-feed (21KB - CRITIQUE)
4. ⏸️ map-page (19KB - HAUTE)
5. ⏸️ gamification (18KB - HAUTE)

---

## 🤖 Prompt Auto

```
Je modularise [FICHIER] :

1. Analyse : [X] lignes, [Y] responsabilités
2. Plan : [structure]
3. Extraction : [liste fichiers]
4. Intégration : imports + refacto
5. Validation : lint + test + build

Objectif : [X] → [Y] lignes (-Z%)
```

---

## 📚 Docs Complètes

- `AI_MODULARIZATION_GUIDE.md` - Guide complet IA
- `MODULARIZATION_PLAN.md` - Stratégie
- `MODULARIZATION_GUIDE.md` - Méthodologie
- `MODULARIZATION_QUICK_REF.md` - Référence
- `MODULARIZATION_PROGRESS.md` - Suivi

---

**Version** : 1.0.0  
**Usage** : Référence rapide pendant la modularisation
