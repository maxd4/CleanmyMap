# Gemini Flash - Aide-Mémoire ESLint

**⚡ Consultation Ultra-Rapide - 30 secondes**

---

## 🚨 LES 7 COMMANDEMENTS (À NE JAMAIS ENFREINDRE)

### 1️⃣ JAMAIS `any`
```typescript
❌ data: any
✅ data: { id: string; value: number }
```

### 2️⃣ TOUJOURS échapper `'` et `"`
```jsx
❌ <p>L'action s'est passée</p>
✅ <p>L&apos;action s&apos;est passée</p>
```

### 3️⃣ JAMAIS setState dans useEffect
```typescript
❌ useEffect(() => { setState(x); }, []);
✅ useEffect(() => { const fn = () => setState(x); fn(); }, []);
```

### 4️⃣ TOUJOURS Next.js Image
```jsx
❌ <img src="/photo.jpg" />
✅ <Image src="/photo.jpg" width={300} height={200} />
```

### 5️⃣ SUPPRIMER imports inutiles
```typescript
❌ import { unused } from 'lib';
✅ // Importer seulement ce qui est utilisé
```

### 6️⃣ FERMER toutes les balises
```jsx
❌ <TooltipProvider><Tooltip>...</Tooltip></div>
✅ <TooltipProvider><Tooltip>...</Tooltip></TooltipProvider>
```

### 7️⃣ LISTER toutes les dépendances
```typescript
❌ useEffect(() => { fetch(id); }, []);
✅ useEffect(() => { fetch(id); }, [id]);
```

---

## ✅ CHECKLIST AVANT SOUMISSION (10 secondes)

```
□ Aucun `any`
□ Aucun `'` ou `"` dans JSX
□ Aucun setState dans useEffect
□ Aucun <img>
□ Aucun import inutile
□ Toutes balises fermées
□ Toutes dépendances listées
□ < 500 lignes
```

---

## 🎯 TEMPLATE COMPOSANT PARFAIT

```typescript
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface MyProps {
  id: string;
  name: string;
}

export function MyComponent({ id, name }: MyProps) {
  const [data, setData] = useState<string | null>(null);
  
  useEffect(() => {
    const load = async () => {
      const result = await fetch(`/api/${id}`);
      setData(await result.text());
    };
    load();
  }, [id]);
  
  return (
    <div>
      <Image src="/img.jpg" alt={name} width={100} height={100} />
      <p>{name} : {data}</p>
    </div>
  );
}
```

---

## 🔥 ERREURS LES PLUS FRÉQUENTES

| Erreur | Solution Rapide |
|--------|-----------------|
| `any` | Créer une interface |
| `'` dans JSX | Remplacer par `&apos;` |
| setState dans useEffect | Wrapper dans callback |
| `<img>` | Utiliser `<Image>` |
| Import inutile | Supprimer |
| Balise non fermée | Compter ouvertures/fermetures |
| Dépendance manquante | Ajouter au tableau [] |

---

## 💡 EN CAS DE DOUTE

1. **Consulte** : `GEMINI_FLASH_QUALITY_GUIDE.md` (guide complet)
2. **Demande** : À Claude de vérifier ton code
3. **Teste** : `npm run lint` avant de soumettre

---

**Rappel** : Ces règles existent pour t'aider, pas pour te ralentir. Avec la pratique, elles deviendront automatiques ! 🚀