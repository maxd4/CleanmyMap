# Guide pour Gemini Flash - Produire du Code de Qualité

**Destinataire** : Gemini 3 Flash, ou tout modèle qui a besoin d'un cadre plus strict
**Objectif** : Réduire les erreurs de logique, les warnings ESLint et les régressions silencieuses
**Contexte** : CleanMyMap - Next.js 14, TypeScript, React

---

## 1. Protocole De Travail

Avant d'écrire du code :

1. Lire le fichier concerné et les types déjà en place.
2. Identifier la source de vérité : API, hook, composant, utilitaire, ou schéma.
3. Vérifier les warnings existants pour ne pas en ajouter.
4. Choisir la correction la plus simple qui préserve le comportement.
5. Si un point est ambigu, signaler l'hypothèse ou demander une précision.
6. Valider lint, types et cas limites avant de répondre.

Règle centrale : ne pas inventer de type, de chemin, d'API ou de composant non lus dans le dépôt.

---

## 2. Règles D'Or

### 2.1 Jamais `any` si une forme de données existe
```typescript
// ❌
function handleData(data: any) {
  return data.value;
}

// ✅
interface DataProps {
  id: string;
  value: number;
}

function handleData(data: DataProps) {
  return data.value;
}

// ✅ si la forme n'est pas encore connue
function handleUnknown(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: number }).value;
  }
  return null;
}
```

### 2.2 Échapper le texte JSX
```jsx
// ❌
<p>L'action s'est bien passée</p>

// ✅
<p>L&apos;action s&apos;est bien passée</p>
```

### 2.3 Ne pas utiliser `useEffect` pour calculer un état dérivé
```typescript
// ❌
useEffect(() => {
  setFilteredItems(items.filter(item => item.active));
}, [items]);

// ✅
const filteredItems = useMemo(
  () => items.filter(item => item.active),
  [items]
);

// ✅ si la valeur dépend seulement du premier rendu
const [state] = useState(() => initialValue);
```

`useEffect` doit servir aux effets de bord réels : fetch, abonnement, synchronisation externe, nettoyage.

### 2.4 Utiliser `Image` pour les images rendues
```jsx
// ❌
<img src="/photo.jpg" alt="Photo" />

// ✅
import Image from 'next/image';

<Image src="/photo.jpg" alt="Photo" width={300} height={200} />
```

### 2.5 Supprimer imports et variables inutilisés
```typescript
// ❌
import { useState, useMemo } from 'react';
const unused = 1;

// ✅
import { useState } from 'react';
```

### 2.6 Fermer toutes les balises JSX
```jsx
// ❌
<TooltipProvider><Tooltip>...</div>

// ✅
<TooltipProvider>
  <Tooltip>...</Tooltip>
</TooltipProvider>
```

### 2.7 Lister toutes les dépendances des hooks
```typescript
// ❌
useEffect(() => {
  fetchData(userId);
}, []);

// ✅
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

---

## 3. Carte Interactive : Flux Et Invariants

Quand tu travailles sur la rubrique `/actions/map`, considère la carte comme un petit système complet, pas comme un simple composant visuel.

### 3.1 Ordre De Lecture Recommandé
1. `apps/web/src/app/(app)/actions/map/page.tsx`
2. `apps/web/src/components/actions/actions-map-feed.tsx`
3. `apps/web/src/components/actions/actions-map-canvas.tsx`
4. `apps/web/src/components/actions/map/map-layers.tsx`
5. `apps/web/src/components/actions/map/map-controls.tsx`
6. `apps/web/src/components/actions/map/use-actions-map-filters.ts`
7. `apps/web/src/components/actions/map/actions-map-geometry.utils.ts`
8. `apps/web/src/lib/geo/greater-paris.ts`
9. `apps/web/src/lib/actions/route-geometry.ts`

### 3.2 Flux De Données
- `page.tsx` pilote les filtres globaux, les KPI, le journal et le rail latéral.
- `ActionsMapFeed` charge les données via `/api/actions/map` et applique les filtres de catégorie.
- `ActionsMapCanvas` rend la carte Leaflet et les couches principales.
- `map-layers.tsx` transforme les items en points, tracés, popups et infrastructures.
- `map-controls.tsx` gère la recherche géographique et le recentrage.
- `route-geometry.ts` construit les aperçus automatiques et les géométries dérivées en amont.
- `actions-map-geometry.utils.ts` normalise les tracés et fournit les métriques visuelles.
- `greater-paris.ts` centralise le périmètre Paris + proche banlieue.

### 3.3 Invariants À Préserver
- Ne pas réintroduire de géométrie simulée comme source principale d’affichage.
- Ne pas modifier le contrat public `/api/actions/map`.
- Ne pas laisser un lien de popup pointer vers `lat=null&lng=null`.
- Ne pas faire diverger la carte, le journal, les KPI et les filtres globaux.
- Ne pas utiliser `useEffect` pour calculer un état dérivé qui peut être calculé pendant le rendu.
- Ne pas accepter un résultat Nominatim hors périmètre `GREATER_PARIS_BOUNDS`.

### 3.4 Fichiers Sensibles
- `actions-map-feed.tsx` pour la sélection des données affichées.
- `actions-map-canvas.tsx` pour les couches et le recentrage.
- `map-layers.tsx` pour le rendu des points et tracés.
- `action-popup-content.tsx` pour les liens et états de popup.
- `action-drawing-map.tsx` pour la validation des tracés saisis.

### 3.5 Règle De Sécurité
Si une modification touche la carte et qu’elle change le périmètre, la géométrie ou les filtres, valide toujours:
- la carte visuelle
- le journal
- les KPI
- les tests `greater-paris`, `map-controls`, `map-geometry`, `route-geometry`
- le lint ciblé sur les fichiers modifiés

### 3.6 Fonctionnalités Carte Déjà En Place
Avant d’ajouter une nouvelle logique carte, vérifier que les capacités suivantes restent intactes:
- contour `Paris + proche banlieue` visible dans le canvas
- bouton de recentrage sur le périmètre projet
- toggles locaux `Points`, `Tracés`, `Infras`
- sélection d’une action depuis le journal avec surlignage visuel
- fiche compacte de l’action sélectionnée dans le rail
- export CSV de la vue filtrée
- indicateur de fraîcheur des données issu de SWR
- synchronisation carte / KPI / journal / filtres / sélection

---

## 4. Quand Un Warning ESLint Apparaît

| Warning | Cause fréquente | Correction à privilégier |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | Type inconnu ou raccourci trop rapide | `unknown`, interface, union, ou garde de type |
| `@typescript-eslint/no-unused-vars` | Code mort ou import inutile | Supprimer |
| `react-hooks/exhaustive-deps` | Dépendance oubliée ou logique mal placée | Ajouter la dépendance ou sortir la logique de l'effet |
| `react-hooks/set-state-in-effect` | État calculable sans effet | Calculer pendant le rendu ou utiliser un état initial |
| `react/no-unescaped-entities` | Texte JSX brut | `&apos;`, `&quot;`, ou template string |
| `@next/next/no-img-element` | Image non optimisée | `next/image` |
| `react/jsx-no-undef` | Composant non importé ou nom faux | Corriger l'import ou le nom |

Règle simple : ne pas masquer le warning si la cause racine reste présente.

---

## 5. Patterns Sûrs

### 4.1 Fetch de données avec annulation
```typescript
import { useEffect, useState } from 'react';

interface Item {
  id: string;
  label: string;
}

export function DataDisplay({ userId }: { userId: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch(`/api/items/${userId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result: Item[] = await response.json();
        setItems(result);
        setError(null);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : 'Erreur inconnue');
        }
      }
    };

    load();

    return () => controller.abort();
  }, [userId]);

  if (error) return <div>Erreur : {error}</div>;
  if (!items) return <div>Chargement...</div>;

  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.label}</li>
      ))}
    </ul>
  );
}
```

### 4.2 Formulaire avec validation explicite
```typescript
import { FormEvent, useState } from 'react';

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
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!formData.email.includes('@')) {
      nextErrors.email = 'Email invalide';
    }

    if (formData.password.length < 8) {
      nextErrors.password = 'Mot de passe trop court';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (validate()) onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={formData.email}
        onChange={event => setFormData(prev => ({ ...prev, email: event.target.value }))}
      />
      {errors.email && <span>{errors.email}</span>}

      <label htmlFor="password">Mot de passe</label>
      <input
        id="password"
        type="password"
        value={formData.password}
        onChange={event => setFormData(prev => ({ ...prev, password: event.target.value }))}
      />
      {errors.password && <span>{errors.password}</span>}

      <button type="submit">Se connecter</button>
    </form>
  );
}
```

### 4.3 Typage sûr d'une réponse inconnue
```typescript
interface ApiResponse {
  id: string;
  name: string;
}

function isApiResponse(value: unknown): value is ApiResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  );
}
```

---

## 6. Anti-Patterns À Éviter

### 5.1 Mutation directe du state
```typescript
// ❌
items.push(newItem);
setItems(items);

// ✅
setItems(prev => [...prev, newItem]);
```

### 5.2 Cacher une dépendance pour faire disparaître un warning
```typescript
// ❌
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  load(userId);
}, []);

// ✅
useEffect(() => {
  load(userId);
}, [load, userId]);
```

### 5.3 Fonctions inline sans besoin réel
```jsx
// ✅ acceptable si simple et local
<Button onClick={() => onSelect(id)} />

// ✅ mieux si la fonction est réutilisée ou coûteuse
const handleSelect = () => onSelect(id);
<Button onClick={handleSelect} />
```

### 5.4 Utiliser un index comme key quand l'ordre change
```jsx
// ❌
{items.map((item, index) => (
  <div key={index}>{item.name}</div>
))}

// ✅
{items.map(item => (
  <div key={item.id}>{item.name}</div>
))}
```

---

## 7. Checklist Avant Soumission

```
□ Aucun `any` inutile
□ Aucun import non utilisé
□ Aucun state dérivé calculé dans `useEffect`
□ Toutes les dépendances des hooks sont listées
□ Toutes les balises JSX sont fermées
□ Aucun `<img>` évitable
□ Le texte JSX est correctement échappé
□ Les cas `null`, `undefined` et tableau vide sont traités
□ Aucune hypothèse d'API non vérifiée
□ `npm run lint` passe
```

---

## 8. Template De Composant Fiable

```typescript
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Props {
  id: string;
  title: string;
}

interface CardData {
  id: string;
  label: string;
}

export function Card({ id, title }: Props) {
  const [data, setData] = useState<CardData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch(`/api/cards/${id}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result: CardData[] = await response.json();
        setData(result);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : 'Erreur inconnue');
        }
      }
    };

    load();

    return () => controller.abort();
  }, [id]);

  if (error) return <div>Erreur : {error}</div>;
  if (!data) return <div>Chargement...</div>;

  return (
    <article>
      <Image src="/card.jpg" alt={title} width={120} height={120} />
      <h2>{title}</h2>
      <ul>
        {data.map(item => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>
    </article>
  );
}
```

---

## 9. Cas Limites À Vérifier

- Réponse réseau vide
- Réponse réseau non `ok`
- Tableau vide
- Valeur `null` ou `undefined`
- Donnée incomplète ou partiellement typée
- Effet annulé avant retour de la requête

---

## 10. Mémo Final

```
✅ Toujours typer ce qui est connu
✅ Utiliser `unknown` si la donnée n'est pas encore sûre
✅ Déduire l'état au lieu de le recalculer dans un effet
✅ Garder les effets pour les effets de bord
✅ Ne pas masquer un warning sans justification
✅ Corriger la cause racine
✅ Tester les cas limites
```

Si une règle semble forcer une mauvaise architecture, la bonne réponse est de restructurer le code, pas de contourner le lint.
