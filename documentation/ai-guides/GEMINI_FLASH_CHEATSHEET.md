# Gemini Flash - Aide-Mémoire de Fiabilité

**Consultation ultra-rapide - 30 secondes**

---

## Protocole Express

1. Identifier le fichier source et la règle ESLint concernée.
2. Vérifier les types, les imports et les dépendances avant de modifier quoi que ce soit.
3. Corriger la cause racine, pas seulement le warning visible.
4. Valider avec `npm run lint` et, si le code a changé, avec les tests ciblés.

---

## 7 Règles Qui Évitent La Plupart Des Erreurs

### 1. Ne jamais utiliser `any`
```typescript
❌ data: any
✅ data: unknown
✅ data: { id: string; value: number }
```

### 2. Échapper le texte JSX
```jsx
❌ <p>L'action s'est passée</p>
✅ <p>L&apos;action s&apos;est passée</p>
```

### 3. Ne pas dériver l'état dans `useEffect`
```typescript
❌ useEffect(() => { setState(value); }, [value]);
✅ const derived = useMemo(() => compute(value), [value]);
✅ const [state] = useState(() => initialValue);
```

### 4. Utiliser `Image` au lieu de `<img>`
```jsx
❌ <img src="/photo.jpg" />
✅ <Image src="/photo.jpg" width={300} height={200} alt="Photo" />
```

### 5. Supprimer les imports et variables inutiles
```typescript
❌ import { unused } from 'lib';
✅ import { used } from 'lib';
```

### 6. Fermer toutes les balises JSX
```jsx
❌ <TooltipProvider><Tooltip>...</div>
✅ <TooltipProvider><Tooltip>...</Tooltip></TooltipProvider>
```

### 7. Lister toutes les dépendances des hooks
```typescript
❌ useEffect(() => { fetch(id); }, []);
✅ useEffect(() => { fetch(id); }, [id]);
```

---

## Quand Un Warning ESLint Apparaît

| Warning | Correction à privilégier | Piège à éviter |
|--------|---------------------------|----------------|
| `@typescript-eslint/no-explicit-any` | Remplacer par `unknown`, une interface ou un type union | Masquer le problème avec un cast inutile |
| `@typescript-eslint/no-unused-vars` | Supprimer la variable ou l'import | Garder le code en commentaire |
| `react-hooks/exhaustive-deps` | Ajouter la dépendance ou déplacer la logique hors de l'effet | Couper la dépendance pour faire disparaître le warning |
| `react-hooks/set-state-in-effect` | Calculer pendant le rendu, utiliser un état initial, ou déclencher le `setState` depuis un callback async | Dériver un état synchrone dans `useEffect` |
| `react/no-unescaped-entities` | Utiliser `&apos;`, `&quot;` ou une template string | Ignorer l'erreur |
| `@next/next/no-img-element` | Passer à `next/image` | Garder `<img>` sans justification |
| `react/jsx-no-undef` | Importer le composant ou corriger le nom | Laisser le composant non résolu |

---

## Checklist Finale

```
□ Le type est précis ou validé au runtime
□ Les imports sont tous utilisés
□ Aucun `eslint-disable` n'a été ajouté sans raison documentée
□ Aucun `any` inutile
□ Aucun effet ne sert à calculer un état dérivé
□ Tous les hooks ont leurs dépendances
□ Toutes les balises JSX sont fermées
□ Aucun `<img>` évitable
□ Les cas limites ont été vérifiés
□ `npm run lint` passe
```

---

## Template Sûr Pour Un Composant

```typescript
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface MyProps {
  id: string;
  name: string;
}

interface DataItem {
  label: string;
  value: number;
}

export function MyComponent({ id, name }: MyProps) {
  const [data, setData] = useState<DataItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch(`/api/${id}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result: DataItem[] = await response.json();
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
    <div>
      <Image src="/img.jpg" alt={name} width={100} height={100} />
      <p>{name}</p>
      <ul>
        {data.map(item => (
          <li key={item.label}>
            {item.label}: {item.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Stop Conditions

Si une consigne est ambiguë, le bon réflexe est de demander une précision ou de signaler l'hypothèse, pas d'inventer un type, une API ou un chemin de fichier.

---

**Rappel** : une correction correcte est plus importante qu'une correction rapide. Si un warning disparaît mais que la logique devient fragile, la correction est mauvaise.
