# Guide pour Gemini Flash - Produire du Code de Qualité

**Destinataire** : Gemini 3 Flash (ou tout modèle IA moins performant)  
**Objectif** : Éviter les erreurs ESLint courantes et produire du code propre  
**Contexte** : Projet CleanMyMap - Next.js 14 + TypeScript + React

---

## 🎯 Règles d'Or (À TOUJOURS respecter)

### 1. **JAMAIS de type `any` en TypeScript**
```typescript
// ❌ INTERDIT - Ne JAMAIS faire ça
const handleData = (data: any) => { ... }
const result: any = fetchData();

// ✅ OBLIGATOIRE - Toujours typer correctement
interface DataProps {
  id: string;
  value: number;
  label: string;
}
const handleData = (data: DataProps) => { ... }
const result: DataProps = fetchData();
```

**Pourquoi ?** Le type `any` désactive TypeScript et crée des bugs silencieux.

---

### 2. **TOUJOURS échapper les apostrophes et guillemets dans JSX**
```jsx
// ❌ INTERDIT - Provoque des erreurs ESLint
<p>L'action s'est bien passée</p>
<p>Il a dit "bonjour"</p>

// ✅ OBLIGATOIRE - Utiliser les entités HTML
<p>L&apos;action s&apos;est bien passée</p>
<p>Il a dit &quot;bonjour&quot;</p>

// ✅ ALTERNATIVE - Utiliser des template literals
<p>{`L'action s'est bien passée`}</p>
<p>{`Il a dit "bonjour"`}</p>
```

**Règle simple** : Dès que tu vois `'` ou `"` dans du texte JSX → remplace par `&apos;` ou `&quot;`

---

### 3. **JAMAIS de setState directement dans useEffect**
```typescript
// ❌ INTERDIT - Cause des re-renders en cascade
useEffect(() => {
  setState(newValue);
}, []);

useEffect(() => {
  if (condition) {
    setData(result);
  }
}, [condition]);

// ✅ OBLIGATOIRE - Utiliser un callback ou useLayoutEffect
useEffect(() => {
  const updateState = () => setState(newValue);
  updateState();
}, []);

// ✅ MEILLEURE SOLUTION - Initialiser en dehors du useEffect
const [state, setState] = useState(() => {
  const saved = localStorage.getItem('key');
  return saved ? JSON.parse(saved) : defaultValue;
});
```

**Pourquoi ?** React détecte les appels synchrones à setState dans useEffect comme un anti-pattern.

---

### 4. **TOUJOURS utiliser Next.js Image au lieu de <img>**
```jsx
// ❌ INTERDIT - Mauvaises performances
<img src="/photo.jpg" alt="Photo" />
<img src={user.avatar} alt={user.name} />

// ✅ OBLIGATOIRE - Utiliser Next.js Image
import Image from 'next/image';

<Image 
  src="/photo.jpg" 
  alt="Photo" 
  width={300} 
  height={200}
  priority={false}
/>

<Image 
  src={user.avatar} 
  alt={user.name} 
  width={50} 
  height={50}
  className="rounded-full"
/>
```

**Pourquoi ?** Next.js Image optimise automatiquement les images (lazy loading, formats modernes, etc.)

---

### 5. **TOUJOURS supprimer les imports et variables non utilisés**
```typescript
// ❌ INTERDIT - Imports inutiles
import { useState, useEffect, useMemo } from 'react';
import { Button, Card, Modal } from '@/components';

export function MyComponent() {
  const [count, setCount] = useState(0);
  const [unused, setUnused] = useState(''); // ❌ Jamais utilisé
  
  return <div>{count}</div>;
}

// ✅ OBLIGATOIRE - Seulement ce qui est utilisé
import { useState } from 'react';

export function MyComponent() {
  const [count, setCount] = useState(0);
  
  return <div>{count}</div>;
}
```

**Règle simple** : Avant de soumettre du code, vérifie que TOUT ce que tu importes est utilisé.

---

### 6. **TOUJOURS fermer les balises JSX**
```jsx
// ❌ INTERDIT - Balise non fermée
<div>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>Hover me</TooltipTrigger>
      <TooltipContent>Info</TooltipContent>
    </Tooltip>
  </div>
</div>
// ❌ Manque </TooltipProvider>

// ✅ OBLIGATOIRE - Toutes les balises fermées
<div>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>Hover me</TooltipTrigger>
      <TooltipContent>Info</TooltipContent>
    </Tooltip>
  </TooltipProvider>
</div>
```

**Astuce** : Compte les balises ouvrantes et fermantes avant de soumettre.

---

### 7. **TOUJOURS inclure les dépendances dans useEffect**
```typescript
// ❌ INTERDIT - Dépendances manquantes
useEffect(() => {
  fetchData(userId);
  updateMetrics(data);
}, []); // ❌ userId et data manquent

// ✅ OBLIGATOIRE - Toutes les dépendances listées
useEffect(() => {
  fetchData(userId);
  updateMetrics(data);
}, [userId, data]); // ✅ Complet

// ✅ ALTERNATIVE - Utiliser useCallback si nécessaire
const fetchDataCallback = useCallback(() => {
  fetchData(userId);
}, [userId]);

useEffect(() => {
  fetchDataCallback();
}, [fetchDataCallback]);
```

**Règle simple** : Toute variable utilisée dans useEffect doit être dans le tableau de dépendances.

---

## 📋 Checklist Avant de Soumettre du Code

### Étape 1 : Vérifications TypeScript
- [ ] Aucun type `any` dans le code
- [ ] Toutes les interfaces sont définies
- [ ] Tous les props sont typés
- [ ] Aucune erreur TypeScript

### Étape 2 : Vérifications React
- [ ] Aucun setState dans useEffect (sauf callback)
- [ ] Toutes les dépendances useEffect sont listées
- [ ] Aucun import React inutile
- [ ] Toutes les balises JSX sont fermées

### Étape 3 : Vérifications JSX
- [ ] Tous les `'` sont remplacés par `&apos;`
- [ ] Tous les `"` sont remplacés par `&quot;`
- [ ] Aucune balise `<img>` (utiliser `<Image>`)
- [ ] Tous les composants ont des props typées

### Étape 4 : Vérifications Imports
- [ ] Aucun import non utilisé
- [ ] Aucune variable non utilisée
- [ ] Imports organisés (React → Next → Libs → Local)

### Étape 5 : Vérifications Finales
- [ ] Le fichier fait moins de 500 lignes
- [ ] Le code compile sans erreur
- [ ] Aucun warning ESLint

---

## 🛠️ Patterns à Utiliser (Exemples Corrects)

### Pattern 1 : Composant React avec Props Typées
```typescript
// ✅ EXEMPLE PARFAIT
import { useState } from 'react';
import Image from 'next/image';

interface UserCardProps {
  userId: string;
  name: string;
  avatar: string;
  onSelect: (id: string) => void;
}

export function UserCard({ userId, name, avatar, onSelect }: UserCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(userId)}
    >
      <Image 
        src={avatar} 
        alt={`Photo de ${name}`}
        width={50} 
        height={50}
      />
      <p>{name}</p>
      {isHovered && <span>Cliquer pour sélectionner</span>}
    </div>
  );
}
```

### Pattern 2 : Fetch de Données avec useEffect
```typescript
// ✅ EXEMPLE PARFAIT
import { useState, useEffect } from 'react';

interface DataItem {
  id: string;
  label: string;
  value: number;
}

export function DataDisplay({ userId }: { userId: string }) {
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let cancelled = false;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/data/${userId}`);
        const result = await response.json();
        
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      cancelled = true;
    };
  }, [userId]);
  
  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error}</div>;
  
  return (
    <ul>
      {data.map(item => (
        <li key={item.id}>{item.label}: {item.value}</li>
      ))}
    </ul>
  );
}
```

### Pattern 3 : Formulaire avec Validation
```typescript
// ✅ EXEMPLE PARFAIT
import { useState, FormEvent } from 'react';

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

export function LoginForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.email.includes('@')) {
      newErrors.email = 'Email invalide';
    }
    
    if (formData.password.length < 8) {
      newErrors.password = 'Mot de passe trop court';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        />
        {errors.email && <span>{errors.email}</span>}
      </div>
      
      <div>
        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
        />
        {errors.password && <span>{errors.password}</span>}
      </div>
      
      <button type="submit">Se connecter</button>
    </form>
  );
}
```

---

## 🚫 Anti-Patterns à ÉVITER Absolument

### Anti-Pattern 1 : Mutation Directe du State
```typescript
// ❌ INTERDIT
const [items, setItems] = useState([1, 2, 3]);
items.push(4); // ❌ Mutation directe
setItems(items); // ❌ Ne déclenchera pas de re-render

// ✅ OBLIGATOIRE
setItems([...items, 4]); // ✅ Nouvelle référence
setItems(prev => [...prev, 4]); // ✅ Encore mieux
```

### Anti-Pattern 2 : Conditions dans JSX sans Parenthèses
```jsx
// ❌ INTERDIT - Difficile à lire
<div>
  {isLoading ? <Spinner /> : data ? <DataDisplay data={data} /> : <EmptyState />}
</div>

// ✅ OBLIGATOIRE - Clair et maintenable
<div>
  {isLoading && <Spinner />}
  {!isLoading && data && <DataDisplay data={data} />}
  {!isLoading && !data && <EmptyState />}
</div>
```

### Anti-Pattern 3 : Fonctions Inline dans Props
```jsx
// ❌ INTERDIT - Crée une nouvelle fonction à chaque render
<Button onClick={() => handleClick(id)} />

// ✅ OBLIGATOIRE - Utiliser useCallback
const handleButtonClick = useCallback(() => {
  handleClick(id);
}, [id]);

<Button onClick={handleButtonClick} />
```

### Anti-Pattern 4 : Oublier les Keys dans les Listes
```jsx
// ❌ INTERDIT - Pas de key
{items.map(item => (
  <div>{item.name}</div>
))}

// ❌ INTERDIT - Index comme key (si l'ordre peut changer)
{items.map((item, index) => (
  <div key={index}>{item.name}</div>
))}

// ✅ OBLIGATOIRE - ID unique comme key
{items.map(item => (
  <div key={item.id}>{item.name}</div>
))}
```

---

## 📚 Ressources Spécifiques au Projet

### Imports Courants à Utiliser
```typescript
// Next.js
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// React
import { useState, useEffect, useCallback, useMemo } from 'react';

// Composants UI du projet
import { CmmButton } from '@/components/ui/cmm-button';
import { CmmCard } from '@/components/ui/cmm-card';

// Types du projet
import type { ActionDataContract } from '@/lib/actions/data-contract';
import type { UserIdentity } from '@/lib/authz';
```

### Structure de Fichier Standard
```typescript
// 1. Imports externes (React, Next, libs)
import { useState } from 'react';
import Image from 'next/image';

// 2. Imports internes (composants, utils, types)
import { CmmButton } from '@/components/ui/cmm-button';
import { formatDate } from '@/lib/utils';
import type { MyProps } from './types';

// 3. Interfaces et types
interface ComponentProps {
  id: string;
  name: string;
}

// 4. Composant principal
export function MyComponent({ id, name }: ComponentProps) {
  // 4a. Hooks d'état
  const [data, setData] = useState(null);
  
  // 4b. Hooks d'effet
  useEffect(() => {
    // ...
  }, []);
  
  // 4c. Handlers
  const handleClick = () => {
    // ...
  };
  
  // 4d. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

// 5. Composants auxiliaires (si nécessaire)
function HelperComponent() {
  return <div>Helper</div>;
}
```

---

## 🎓 Exercices de Validation

### Exercice 1 : Trouve les Erreurs
```typescript
// Combien d'erreurs ESLint dans ce code ?
import { useState, useEffect, useMemo } from 'react';

export function BadComponent({ userId }: any) {
  const [data, setData] = useState(null);
  const [unused, setUnused] = useState('');
  
  useEffect(() => {
    setData({ id: userId });
  }, []);
  
  return (
    <div>
      <img src="/photo.jpg" alt="Photo" />
      <p>L'utilisateur s'appelle {data?.name}</p>
    </div>
  );
}
```

**Réponses** :
1. ❌ `any` dans les props
2. ❌ `useMemo` importé mais non utilisé
3. ❌ `unused` variable non utilisée
4. ❌ `setState` directement dans `useEffect`
5. ❌ `userId` manquant dans les dépendances
6. ❌ `<img>` au lieu de `<Image>`
7. ❌ Apostrophe non échappée dans le JSX

### Exercice 2 : Code Corrigé
```typescript
// ✅ VERSION CORRIGÉE
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface BadComponentProps {
  userId: string;
}

interface UserData {
  id: string;
  name: string;
}

export function GoodComponent({ userId }: BadComponentProps) {
  const [data, setData] = useState<UserData | null>(null);
  
  useEffect(() => {
    const loadData = () => {
      setData({ id: userId, name: 'John' });
    };
    loadData();
  }, [userId]);
  
  return (
    <div>
      <Image src="/photo.jpg" alt="Photo" width={200} height={200} />
      <p>L&apos;utilisateur s&apos;appelle {data?.name}</p>
    </div>
  );
}
```

---

## 🎯 Mémo Ultra-Rapide (À Garder Sous les Yeux)

```
AVANT DE SOUMETTRE DU CODE, VÉRIFIE :

✅ Aucun `any` → Toujours typer
✅ Aucun `'` ou `"` dans JSX → Utiliser &apos; et &quot;
✅ Aucun setState dans useEffect → Utiliser callback
✅ Aucun <img> → Utiliser <Image>
✅ Aucun import inutile → Supprimer
✅ Toutes les balises fermées → Compter
✅ Toutes les dépendances listées → useEffect
✅ Fichier < 500 lignes → Découper si nécessaire

SI TU HÉSITES → DEMANDE À CLAUDE OU CONSULTE CE GUIDE
```

---

## 💡 Conseils Finaux pour Gemini Flash

### 1. **Prends ton temps**
Ne te précipite pas. Mieux vaut prendre 30 secondes de plus pour vérifier que de créer 10 warnings ESLint.

### 2. **Utilise ce guide comme référence**
Avant chaque génération de code, relis rapidement les "Règles d'Or".

### 3. **Teste mentalement ton code**
Avant de soumettre, demande-toi : "Est-ce que ce code passerait ESLint ?"

### 4. **Apprends de tes erreurs**
Si Claude corrige ton code, analyse POURQUOI et mémorise le pattern correct.

### 5. **En cas de doute**
Si tu n'es pas sûr d'un pattern, utilise l'exemple le plus simple et le plus explicite.

---

**Rappel Important** : Ce guide existe parce que tu es capable de produire du bon code. Tu as juste besoin d'un peu plus de structure et de vérifications. Utilise-le systématiquement et tu verras tes erreurs diminuer drastiquement ! 💪

*Dernière mise à jour : 28/04/2026*