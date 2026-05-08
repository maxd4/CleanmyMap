# Principes Pragmatiques de Modularisation

> **Version :** 1.0.0 | **Date :** 2026-05-07  
> **Complément à :** `AI_MODULARIZATION_GUIDE.md`

## Philosophie

**La modularisation est un moyen, pas une fin.** L'objectif est d'améliorer la maintenabilité, pas de créer une architecture parfaite mais complexe.

### Règle d'or : YAGNI (You Aren't Gonna Need It)

N'extraire que ce qui apporte une valeur immédiate :
- Réduction de complexité cognitive
- Réutilisabilité prouvée (3+ usages)
- Testabilité améliorée
- Navigation facilitée

## Seuils révisés basés sur l'expérience

### Fichiers à modulariser en priorité

| Taille | Action | Justification |
|--------|--------|---------------|
| > 600 lignes | **Modulariser immédiatement** | Difficile à maintenir, risque élevé de bugs |
| 400-600 lignes | **Évaluer et planifier** | Peut être acceptable si bien structuré |
| 300-400 lignes | **Surveiller** | OK si responsabilité unique et claire |
| < 300 lignes | **Ne pas toucher** | Sauf si responsabilités multiples évidentes |

### Résultats acceptables après modularisation

**Fichier principal :**
- Idéal : 150-250 lignes
- Acceptable : 250-350 lignes
- Limite : 400 lignes

**Fichiers extraits :**
- Composants UI : 100-250 lignes
- Hooks : 50-200 lignes
- Config/Data : 100-300 lignes (peut être plus si données statiques)

## Patterns de décision

### Pattern 1 : Extraction de données statiques

**EXTRAIRE si :**
```typescript
// Fichier > 500 lignes avec 200+ lignes de données
const HUGE_CONFIG = [
  { id: 1, name: "...", data: {...} }, // 200 lignes
  // ...
];
```

**NE PAS EXTRAIRE si :**
```typescript
// Fichier 300 lignes avec 30 lignes de config
const SMALL_CONFIG = [
  { id: 1, name: "Item 1" },
  { id: 2, name: "Item 2" },
];
```

### Pattern 2 : Extraction de composants UI

**EXTRAIRE si :**
- Le bloc JSX fait > 80 lignes
- Il est réutilisé ailleurs
- Il a sa propre logique d'état

**NE PAS EXTRAIRE si :**
- Le bloc fait < 50 lignes
- Il utilise 5+ variables du composant parent
- L'extraction nécessite 10+ props

### Pattern 3 : Extraction de hooks

**EXTRAIRE si :**
- La logique fait > 100 lignes
- Elle est réutilisable
- Elle peut être testée indépendamment

**NE PAS EXTRAIRE si :**
- La logique fait < 50 lignes
- Elle est spécifique à un seul composant
- Elle nécessite beaucoup de contexte parent

## Anti-patterns à éviter

### ❌ Sur-modularisation

**Mauvais :**
```
feature/
├── feature-title.tsx          (10 lignes)
├── feature-subtitle.tsx       (8 lignes)
├── feature-button.tsx         (12 lignes)
├── feature-icon.tsx           (6 lignes)
└── feature-main.tsx           (50 lignes)
```

**Bon :**
```
feature/
├── feature-header.tsx         (40 lignes - titre + sous-titre + icône)
└── feature-main.tsx           (80 lignes)
```

### ❌ Prop drilling excessif

**Mauvais :**
```typescript
// 15 props passées à travers 3 niveaux
<Parent>
  <Child1 prop1={x} prop2={y} ... prop15={z}>
    <Child2 prop1={x} prop2={y} ... prop15={z}>
      <Child3 prop1={x} prop2={y} ... prop15={z} />
    </Child2>
  </Child1>
</Parent>
```

**Bon :**
```typescript
// Garder ensemble si fortement couplé
<Parent>
  {/* Logique inline si < 100 lignes */}
</Parent>
```

### ❌ Abstractions prématurées

**Mauvais :**
```typescript
// Créer un hook pour 3 lignes de code
function useToggle(initial: boolean) {
  const [value, setValue] = useState(initial);
  return [value, () => setValue(!value)] as const;
}
```

**Bon :**
```typescript
// Utiliser useState directement
const [isOpen, setIsOpen] = useState(false);
```

## Checklist de validation

Avant de valider une modularisation, vérifier :

### ✅ Critères de succès

- [ ] Le fichier principal est plus lisible qu'avant
- [ ] Les responsabilités sont clairement séparées
- [ ] Aucune dépendance circulaire
- [ ] Les tests passent
- [ ] TypeScript compile sans erreur
- [ ] La navigation dans le code est plus facile

### ⚠️ Signaux d'alerte

- [ ] Plus de 10 fichiers créés pour un seul composant
- [ ] Besoin de Context API juste pour éviter prop drilling
- [ ] Difficulté à nommer les fichiers extraits
- [ ] Imports circulaires ou complexes
- [ ] Temps de développement > 2h pour une modularisation simple

## Métriques de qualité

### Bonnes métriques

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| Lignes fichier principal | 650 | 300 | ✅ -54% |
| Nombre de responsabilités | 5 | 1-2 | ✅ Clair |
| Temps pour comprendre | 15 min | 5 min | ✅ -67% |
| Fichiers créés | 0 | 4 | ✅ Raisonnable |

### Métriques problématiques

| Métrique | Avant | Après | Problème |
|----------|-------|-------|----------|
| Lignes fichier principal | 400 | 380 | ❌ Pas d'amélioration |
| Nombre de fichiers | 1 | 15 | ❌ Sur-modularisation |
| Props par composant | 3 | 12 | ❌ Couplage excessif |
| Niveaux d'imbrication | 2 | 5 | ❌ Complexité accrue |

## Exemples du projet

### ✅ Bonne modularisation : PLAN-003 (Creator Inbox)

**Avant :** 696 lignes, tout en un  
**Après :** 80 lignes + 4 composants + 2 fichiers logique

**Pourquoi c'est bon :**
- Réduction significative (88%)
- Séparation claire : Service → Hook → UI
- Chaque fichier a une responsabilité unique
- Facilite les tests et la maintenance

### ✅ Bonne modularisation : PLAN-004 (Annuaire Seed)

**Avant :** 659 lignes, 26 KB de données  
**Après :** 5 fichiers par catégorie + index

**Pourquoi c'est bon :**
- Données divisées par domaine logique
- Validation d'unicité centralisée
- Navigation facilitée
- Prêt pour migration vers DB

### ⚠️ Modularisation acceptable : PLAN-005 (Actions Map)

**Avant :** 506 lignes  
**Après :** 304 lignes + 4 composants

**Pourquoi c'est acceptable :**
- Réduction de 40% (pas 60% mais OK)
- Fichier principal encore lisible
- Composants extraits ont une vraie valeur
- Pas de sur-ingénierie

**Amélioration possible :**
- Pourrait rester à 350 lignes sans extraire davantage
- Les 304 lignes sont déjà maintenables

## Conclusion

**Modulariser intelligemment, pas systématiquement.**

Privilégier :
1. **Lisibilité** sur perfection architecturale
2. **Pragmatisme** sur dogmatisme
3. **Valeur ajoutée** sur métriques arbitraires
4. **Simplicité** sur abstraction prématurée

**Question clé avant toute modularisation :**  
*"Est-ce que cette extraction rendra le code plus facile à comprendre et maintenir, ou juste plus fragmenté ?"*
