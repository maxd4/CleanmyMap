# Guide de Modularisation pour Agents IA

Instructions complètes et réutilisables pour modulariser efficacement les fichiers du projet CleanMyMap.

---

## 📋 Table des Matières

1. [Instructions](#instructions)
2. [Processus en 5 Étapes](#processus)
3. [Règles Strictes](#règles)
4. [Patterns Réutilisables](#patterns)
5. [Templates de Code](#templates)
6. [Ressources](#ressources)

---

## 🤖 Instructions pour l'Agent IA {#instructions}

### Quand Modulariser ?

Modulariser un fichier quand :
- L'utilisateur demande explicitement de modulariser
- Un fichier dépasse 300 lignes
- Un fichier a plusieurs responsabilités distinctes
- Le code est difficile à maintenir

### Workflow Automatique

```
1. ANALYSER → 2. PLANIFIER → 3. EXTRAIRE → 4. INTÉGRER → 5. VALIDER
```

### Checklist Systématique

Avant de commencer, **TOUJOURS** :

```bash
# 1. Analyser les fichiers volumineux
npm run analyze:heavy-files

# 2. Consulter le plan
# Voir: AI_MODULARIZATION_PLAN.md

# 3. Consulter les diagrammes si besoin
# Voir: AI_MODULARIZATION_DIAGRAMS.md
```

---

## 🎯 Processus Étape par Étape {#processus}

### ÉTAPE 1 : ANALYSER (5 min)

**Actions** :
1. Lire le fichier cible en entier
2. Identifier les blocs de code distincts
3. Repérer les responsabilités multiples
4. Noter les dépendances

**Questions à se poser** :
- Quelles sont les responsabilités distinctes ?
- Quel code est réutilisable ailleurs ?
- Quelle logique peut être extraite dans un hook ?
- Quelle configuration peut être externalisée ?

**Output attendu** :
```
Fichier: apps/web/src/app/page.tsx
Responsabilités identifiées:
1. Configuration des métriques (100 lignes)
2. Configuration des piliers (150 lignes)
3. Configuration des bénéfices (120 lignes)
4. Orchestration du rendu (50 lignes)
```

---

### ÉTAPE 2 : PLANIFIER (5 min)

**Actions** :
1. Définir la structure de dossiers cible
2. Nommer les nouveaux fichiers
3. Définir les interfaces/types
4. Estimer la taille finale

**Template de structure** :
```
feature/
├── index.ts              # Exports centralisés
├── feature-main.tsx      # Composant principal
├── feature-section-1.tsx # Sous-composant 1
├── feature-section-2.tsx # Sous-composant 2
├── use-feature-data.ts   # Hook de logique
├── config.ts             # Configuration
└── types.ts              # Types TypeScript
```

**Output attendu** :
```
Structure cible:
lib/home/
├── config.ts (types + builders + constantes)
components/home/
├── index.ts (exports)
app/
└── page.tsx (orchestrateur simplifié)
```

---

### ÉTAPE 3 : EXTRAIRE (20-40 min)

**Actions par type d'extraction** :

#### A. Extraire Configuration

```typescript
// CRÉER: lib/feature/config.ts

// 1. Définir les types
export interface FeatureConfig {
  key: string;
  value: string;
}

// 2. Exporter les constantes
export const FEATURE_CONFIG: FeatureConfig[] = [
  { key: 'a', value: 'A' },
  // ...
];

// 3. Exporter les builders
export function buildFeatureData(input: Input): Output {
  // logique de transformation
  return output;
}
```

#### B. Extraire Hook de Logique

```typescript
// CRÉER: hooks/use-feature-data.ts

import { useState, useEffect, useMemo } from 'react';

export function useFeatureData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // logique de chargement
  }, []);
  
  const processed = useMemo(() => {
    // logique de transformation
  }, [data]);
  
  return { data: processed, loading };
}
```

#### C. Extraire Composant

```typescript
// CRÉER: components/feature/feature-section.tsx

interface FeatureSectionProps {
  title: string;
  items: Item[];
}

export function FeatureSection({ title, items }: FeatureSectionProps) {
  return (
    <section>
      <h2>{title}</h2>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </section>
  );
}
```

#### D. Créer Fichier d'Exports

```typescript
// CRÉER: components/feature/index.ts

export { FeatureMain } from './feature-main';
export { FeatureSection } from './feature-section';
export { FeatureHeader } from './feature-header';
export type { FeatureProps, FeatureSectionProps } from './types';
```

---

### ÉTAPE 4 : INTÉGRER (10 min)

**Actions** :
1. Mettre à jour les imports du fichier original
2. Remplacer le code inline par les nouveaux composants
3. Passer les props nécessaires
4. Supprimer le code dupliqué

**Template de refactorisation** :

```typescript
// AVANT
import { Icon1, Icon2, Icon3 } from 'lucide-react';

function Component() {
  const config = [/* 100 lignes */];
  const data = [/* 150 lignes */];
  
  return (
    <div>
      {/* 400 lignes de JSX */}
    </div>
  );
}

// APRÈS
import { Section1, Section2, Section3 } from '@/components/feature';
import { useFeatureData } from '@/hooks/use-feature-data';
import { FEATURE_CONFIG } from '@/lib/feature/config';

function Component() {
  const { data, loading } = useFeatureData();
  
  return (
    <div>
      <Section1 config={FEATURE_CONFIG} />
      <Section2 data={data} loading={loading} />
      <Section3 />
    </div>
  );
}
```

---

### ÉTAPE 5 : VALIDER (5 min)

**Actions obligatoires** :

```bash
# 1. Vérifier la syntaxe
npm run lint

# 2. Lancer les tests
npm run test

# 3. Vérifier le build
npm run build

# 4. Vérifier les types
npm run typecheck
```

**Si erreurs** :
- Corriger les imports manquants
- Ajuster les types TypeScript
- Vérifier les props passées
- Résoudre les dépendances circulaires

---

## 🎯 Règles Strictes pour l'IA {#règles}

### ✅ TOUJOURS FAIRE

1. **Lire le plan** avant de commencer
   ```
   Fichier: AI_MODULARIZATION_PLAN.md
   Section: Chercher le fichier cible
   ```

2. **Créer les types TypeScript** en premier
   ```typescript
   // Toujours définir les interfaces
   export interface ComponentProps {
     title: string;
     items: Item[];
   }
   ```

3. **Créer index.ts** pour les exports
   ```typescript
   // Centraliser tous les exports
   export { Component1 } from './component-1';
   export { Component2 } from './component-2';
   ```

4. **Extraire la configuration** avant les composants
   ```typescript
   // Séparer données et logique
   export const CONFIG = [...];
   ```

5. **Valider après chaque extraction**
   ```bash
   npm run lint && npm run test
   ```

6. **Documenter les changements**
   ```bash
   npm run modularize:report <fichier>
   ```

7. **Mettre à jour la progression**
   ```
   Fichier: AI_MODULARIZATION_PROGRESS.md
   Marquer: ✅ Complété
   ```

### ❌ NE JAMAIS FAIRE

1. **Ne pas sur-modulariser**
   ```
   ❌ Un fichier par ligne de code
   ✅ Regroupement logique par responsabilité
   ```

2. **Ne pas créer de dépendances circulaires**
   ```
   ❌ A importe B, B importe A
   ✅ Architecture unidirectionnelle
   ```

3. **Ne pas utiliser de noms génériques**
   ```
   ❌ Card, Item, Component
   ✅ UserProfileCard, ActionItem, DashboardHeader
   ```

4. **Ne pas dupliquer le code**
   ```
   ❌ Copier-coller sans factoriser
   ✅ Extraire dans un composant réutilisable
   ```

5. **Ne pas oublier les tests**
   ```
   ❌ Modulariser sans tester
   ✅ Valider avec npm run test
   ```

6. **Ne pas modifier sans backup**
   ```
   ❌ Supprimer l'ancien code immédiatement
   ✅ Commenter l'ancien code jusqu'à validation
   ```

---

## 📊 Objectifs de Taille (Strictement Respecter)

| Type de Fichier | Taille Max | Lignes Max |
|-----------------|-----------|-----------|
| Page (app/) | 5 KB | 200 lignes |
| Composant Complexe | 10 KB | 300 lignes |
| Composant Simple | 5 KB | 150 lignes |
| Hook | 5 KB | 200 lignes |
| Config/Utils | 3 KB | 100 lignes |

**Si dépassement** : Continuer à modulariser !

---

## 🔄 Patterns Réutilisables {#patterns}

### Pattern 1 : Page Monolithique → Modulaire

```typescript
// IDENTIFIER dans le fichier original:
// - Configuration (const DATA = [...])
// - Logique (useEffect, useState)
// - Rendu (JSX)

// CRÉER:
// 1. lib/feature/config.ts → Configuration
// 2. hooks/use-feature.ts → Logique
// 3. components/feature/*.tsx → Composants
// 4. components/feature/index.ts → Exports

// REFACTORISER le fichier original:
// - Importer depuis les nouveaux fichiers
// - Remplacer le code inline
// - Réduire à < 200 lignes
```

### Pattern 2 : Composant Complexe → Sous-Composants

```typescript
// IDENTIFIER les sections distinctes:
// - Header (titre, actions)
// - Content (contenu principal)
// - Footer (actions secondaires)

// CRÉER:
// 1. feature-header.tsx
// 2. feature-content.tsx
// 3. feature-footer.tsx
// 4. index.ts

// REFACTORISER:
function Feature() {
  return (
    <>
      <FeatureHeader />
      <FeatureContent />
      <FeatureFooter />
    </>
  );
}
```

### Pattern 3 : Logique Métier → Hook

```typescript
// IDENTIFIER la logique:
// - useState, useEffect
// - Calculs, transformations
// - Appels API

// CRÉER: hooks/use-feature-logic.ts
export function useFeatureLogic() {
  // Toute la logique ici
  return { data, loading, error, actions };
}

// UTILISER:
function Feature() {
  const { data, loading } = useFeatureLogic();
  return <div>{/* rendu */}</div>;
}
```

---

## 📝 Templates de Code {#templates}

### Template : Configuration

```typescript
// lib/feature/config.ts

// Types
export interface FeatureItem {
  id: string;
  name: string;
  value: number;
}

// Constantes
export const FEATURE_ITEMS: FeatureItem[] = [
  { id: '1', name: 'Item 1', value: 100 },
  { id: '2', name: 'Item 2', value: 200 },
];

// Builders
export function buildFeatureData(raw: RawData): FeatureItem[] {
  return raw.map(item => ({
    id: item.id,
    name: item.name,
    value: item.value * 2,
  }));
}
```

### Template : Hook

```typescript
// hooks/use-feature-data.ts

import { useState, useEffect } from 'react';

export function useFeatureData() {
  const [data, setData] = useState<FeatureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/feature');
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return { data, loading, error };
}
```

### Template : Composant

```typescript
// components/feature/feature-card.tsx

interface FeatureCardProps {
  title: string;
  description: string;
  onClick?: () => void;
}

export function FeatureCard({ title, description, onClick }: FeatureCardProps) {
  return (
    <div className="cmm-card" onClick={onClick}>
      <h3 className="cmm-text-h3">{title}</h3>
      <p className="cmm-text-body">{description}</p>
    </div>
  );
}
```

### Template : Index

```typescript
// components/feature/index.ts

export { FeatureMain } from './feature-main';
export { FeatureCard } from './feature-card';
export { FeatureHeader } from './feature-header';
export { FeatureFooter } from './feature-footer';

export type { FeatureMainProps } from './feature-main';
export type { FeatureCardProps } from './feature-card';
```

---

## 📝 Checklist de Validation Finale

Avant de considérer la modularisation terminée :

```
□ Fichier original < objectif de taille
□ Tous les nouveaux fichiers créés
□ Fichier index.ts avec exports
□ Types TypeScript définis
□ Imports mis à jour
□ Aucune duplication de code
□ npm run lint → ✓
□ npm run test → ✓
□ npm run build → ✓
□ npm run typecheck → ✓
□ Rapport généré (npm run modularize:report)
□ AI_MODULARIZATION_PROGRESS.md mis à jour
□ Documentation complétée
```

---

## 🤖 Prompt Template pour l'IA

Quand l'utilisateur demande de modulariser, utiliser ce template :

```
Je vais modulariser le fichier [FICHIER] en suivant le processus standard :

1. ANALYSE
   - Taille actuelle : [X] lignes / [Y] KB
   - Responsabilités identifiées : [liste]
   - Fichiers à créer : [liste]

2. PLAN
   [Structure de dossiers]

3. EXTRACTION
   - Création de [fichier1]
   - Création de [fichier2]
   - ...

4. INTÉGRATION
   - Mise à jour des imports
   - Refactorisation du fichier original

5. VALIDATION
   - npm run lint ✓
   - npm run test ✓
   - npm run build ✓

Résultat attendu : [X] → [Y] lignes (-Z%)
```

---

## 📚 Ressources {#ressources}

### Documents à Consulter

1. **Avant de commencer** :
   - `AI_MODULARIZATION_PLAN.md` → Plan des 15 fichiers
   - `AI_MODULARIZATION_PROGRESS.md` → État actuel

2. **Pendant la modularisation** :
   - `AI_MODULARIZATION_GUIDE.md` → Ce guide
   - `AI_MODULARIZATION_CHEATSHEET.md` → Référence rapide
   - `AI_MODULARIZATION_DIAGRAMS.md` → Diagrammes visuels

### Commandes Essentielles

```bash
# Analyse
npm run analyze:heavy-files

# Validation
npm run lint
npm run test
npm run build
npm run typecheck

# Documentation
npm run modularize:report <fichier>
```

---

## 🚀 Démarrage Rapide

### Scénario : L'utilisateur dit "Modularise le dashboard"

**Réponse de l'IA** :

```
Je vais modulariser le dashboard en suivant le plan établi.

1. ANALYSE
   Fichier: apps/web/src/app/(app)/dashboard/page.tsx
   Taille: 22545 octets (priorité #2 - CRITIQUE)
   
2. CONSULTATION DU PLAN
   [Lire AI_MODULARIZATION_PLAN.md section #2]
   
3. STRUCTURE CIBLE
   components/dashboard/
   ├── index.ts
   ├── dashboard-layout.tsx
   ├── dashboard-header.tsx
   └── [panels existants]
   
   hooks/
   └── use-dashboard-data.ts

4. EXTRACTION
   [Créer les fichiers un par un]

5. VALIDATION
   [Lancer les tests]

Objectif: 22545 → <5000 octets
```

---

## 💡 Conseils Spécifiques pour l'IA

### Gestion de la Complexité

1. **Fichiers > 20KB** : Modulariser en 2 sessions
   - Session 1 : Extraire configuration + hooks
   - Session 2 : Extraire composants

2. **Fichiers 10-20KB** : Modulariser en 1 session
   - Tout extraire d'un coup

3. **Fichiers < 10KB** : Évaluer si nécessaire
   - Peut-être juste extraire la config

### Priorisation Automatique

```
SI taille > 20KB ALORS priorité = CRITIQUE
SI taille > 15KB ALORS priorité = HAUTE
SI taille > 10KB ALORS priorité = MOYENNE
SINON priorité = BASSE
```

### Gestion des Erreurs

```
SI npm run lint échoue ALORS
  - Vérifier les imports
  - Vérifier les exports
  - Vérifier les types

SI npm run test échoue ALORS
  - Vérifier les mocks
  - Vérifier les props
  - Vérifier la logique

SI npm run build échoue ALORS
  - Vérifier les dépendances circulaires
  - Vérifier les chemins d'import
  - Vérifier les types TypeScript
```

---

## 🎯 Objectif Final

**Pour l'IA** : Être capable de modulariser n'importe quel fichier du projet de manière autonome, reproductible et conforme aux standards établis.

**Critères de succès** :
- ✅ Réduction de taille > 50%
- ✅ Tous les tests passent
- ✅ Build réussit
- ✅ Documentation complète
- ✅ Progression mise à jour

---

**Version** : 3.0.0  
**Dernière mise à jour** : 28/04/2026  
**Statut** : ✅ Guide modulaire optimisé pour agents IA
