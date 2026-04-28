# Checklist De Correction ESLint

Guide de travail pour corriger des warnings ESLint sans introduire de régression.

---

## 1. Avant De Commencer

- Lire l'audit ESLint ou le rapport de la rubrique concernée.
- Identifier si le warning est critique, structurel ou purement cosmétique.
- Corriger la cause racine, pas seulement le symptôme.
- Travailler sur une branche dédiée si la session touche plusieurs fichiers.
- Éviter d'empiler des `eslint-disable` sans justification écrite.

---

## 2. Triage Des Warnings

| Règle ESLint | Cause fréquente | Correction à privilégier | Piège à éviter |
|---|---|---|---|
| `react-hooks/set-state-in-effect` | État calculable sans effet | Calculer pendant le rendu ou initialiser l'état | Déplacer un calcul pur dans `useEffect` |
| `react-hooks/exhaustive-deps` | Dépendance oubliée | Ajouter la dépendance ou restructurer la logique | Retirer la dépendance pour faire taire le warning |
| `@typescript-eslint/no-explicit-any` | Type inconnu ou contournement rapide | `unknown`, interface, union, garde de type | Convertir le `any` en cast aveugle |
| `@typescript-eslint/no-unused-vars` | Code mort | Supprimer l'import ou la variable | Laisser le code commenté |
| `react/no-unescaped-entities` | Texte JSX brut | `&apos;`, `&quot;` ou template string | Ignorer l'erreur |
| `@next/next/no-img-element` | Image non optimisée | `next/image` | Garder `<img>` sans justification |
| `react/jsx-no-undef` | Import manquant ou nom faux | Corriger l'import ou le nom du composant | Laisser un composant non résolu |

---

## 3. Plan De Correction

### Phase A - Stabiliser

- Corriger les warnings qui bloquent la lecture du fichier.
- Retirer les imports inutiles.
- Corriger les composants non résolus.

### Phase B - Corriger La Logique

- Remplacer les `any` par des types précis.
- Remonter les calculs purs hors des effets.
- Ajouter les dépendances manquantes ou extraire la logique vers un utilitaire.

### Phase C - Sécuriser L'UI

- Échapper le texte JSX.
- Remplacer les balises `<img>` par `Image` quand c'est possible.
- Vérifier que les états d'erreur et de chargement existent.

---

## 4. Règles De Réécriture

### 4.1 État dérivé

```typescript
// Avant
useEffect(() => {
  setFilteredItems(items.filter(item => item.active));
}, [items]);

// Après
const filteredItems = useMemo(
  () => items.filter(item => item.active),
  [items]
);
```

### 4.2 Donnée inconnue

```typescript
// Avant
function handleData(data: any) {
  return data.value;
}

// Après
interface DataItem {
  value: number;
}

function handleData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as DataItem).value;
  }
  return null;
}
```

### 4.3 `useEffect` avec fetch

```typescript
useEffect(() => {
  const controller = new AbortController();

  const load = async () => {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setData(await response.json());
  };

  load();

  return () => controller.abort();
}, [url]);
```

### 4.4 Texte JSX

```jsx
// Avant
<p>L'action s'est bien passée</p>

// Après
<p>L&apos;action s&apos;est bien passée</p>
```

### 4.5 Image

```jsx
// Avant
<img src="/photo.jpg" alt="Photo" />

// Après
import Image from 'next/image';

<Image src="/photo.jpg" alt="Photo" width={300} height={200} />
```

---

## 5. Validation

### Automatique

- `npm run lint`
- `npm run typecheck`
- `npm run test` si le projet contient des tests utiles pour la zone touchée

### Fonctionnelle

- Vérifier le comportement nominal.
- Vérifier les cas limites.
- Vérifier les erreurs réseau ou de données.
- Vérifier qu'aucune régression visuelle n'a été introduite.

### Critères de sortie

- Aucun warning critique introduit.
- Aucun `eslint-disable` inutile.
- Le code reste lisible et maintenable.
- La logique métier reste correcte.

---

## 6. Journal De Session

À la fin de la session, consigner :

- la rubrique corrigée,
- les fichiers modifiés,
- les règles ESLint traitées,
- les cas limites vérifiés,
- les risques restants ou les dettes repérées.

Ce journal doit servir à éviter de corriger deux fois le même problème.

---

## 7. Exemple De Session Réussie

1. L'audit montre 8 warnings dans une rubrique.
2. Les imports inutiles sont retirés en premier.
3. Les types `any` sont remplacés par des interfaces ou `unknown`.
4. Les effets sont restructurés pour ne garder que les vrais effets de bord.
5. Les tests de la zone touchée passent.
6. Le nombre de warnings baisse sans régression fonctionnelle.

---

## 8. Rappel Final

Un warning ESLint n'est pas un objectif en soi. L'objectif est un code correct, lisible et stable. Si le warning disparaît mais que la logique est affaiblie, la correction est mauvaise.
