# Guide De Refactorisation Lint

Ce guide sert à éviter de recréer les warnings ESLint les plus fréquents dans CleanMyMap.
L'objectif n'est pas de "faire passer le lint" à tout prix, mais de corriger la cause racine sans toucher à l'UX ni au métier.

---

## Règle De Base

- Ne pas remplacer un problème de typage par un cast décoratif.
- Ne pas déplacer un calcul pur dans un effet React.
- Ne pas conserver une fonction trop complexe en la "silenciant" avec un `eslint-disable`.
- Normaliser les données au bord du système, pas au milieu de la logique métier.

---

## Remplacer `any` Proprement

Quand une donnée arrive d'une source externe, utiliser cet ordre :

1. `unknown`
2. garde de type ou parseur local
3. type métier explicite
4. `as` seulement après validation réelle

### À faire

```ts
function parsePayload(value: unknown): Payload | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record["id"] !== "string") {
    return null;
  }
  return { id: record["id"] };
}
```

### À éviter

- `any` à la place d'une vraie validation.
- `as unknown as SomeType`.
- Typage trop large qui cache les erreurs réelles.

### Cas recommandés

- API routes
- Supabase
- auth
- formulaires
- données terrain
- calculs d'impact

---

## Réduire La Complexité Sans Changer Le Comportement

Quand une fonction devient trop complexe, extraire :

- la normalisation des champs ;
- les règles de décision ;
- les mappages répétitifs ;
- les cas spéciaux dans des helpers dédiés.

### Signes Qu'il Faut Découper

- trop de `if` en chaîne ;
- plusieurs branches qui retournent des objets presque identiques ;
- logique de validation mélangée avec la construction de réponse ;
- parsing JSON, validation et transformation dans la même fonction.

### Patron Recommandé

```ts
function normalizeFoo(raw: unknown): Foo | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  return {
    id: typeof record["id"] === "string" ? record["id"] : "",
  };
}

function buildFooResponse(foo: Foo): ResponseDto {
  return {
    id: foo.id,
  };
}
```

Ce découpage garde la fonction publique lisible et limite les régressions.

---

## Hooks React

Si une valeur peut être calculée pendant le rendu, ne pas utiliser `useEffect` pour la remplir dans le state.

### Correct

- dériver la valeur avec un calcul pur ;
- utiliser `useMemo` seulement si le calcul est réellement coûteux ;
- réserver `useEffect` aux effets de bord réels.

### Incorrect

- `setState` dans un `useEffect` juste pour synchroniser une donnée dérivée ;
- dépendances manquantes pour "faire taire" le warning ;
- logique métier cachée dans un effet de montage.

---

## Parsing De Réponse Réseau

Pour les réponses JSON, utiliser une séquence stable :

- lire la réponse ;
- parser de manière sûre ;
- valider la forme ;
- transformer vers un type précis ;
- lever une erreur métier explicite si la forme est invalide.

### Exemple De Structure

```ts
const body = await parseJsonSafely(response);
if (!response.ok) {
  throw new ApiError(...);
}
if (!isExpectedBody(body)) {
  throw new ApiError(...);
}
return buildResponse(body);
```

Cela évite les accès dynamiques dispersés et les cast inutiles.

---

## Normalisation Des Stockages Locaux

Dans les stores JSON ou les adaptateurs de persistance :

- valider les champs obligatoires ;
- convertir les valeurs optionnelles en `null` ou en valeur par défaut ;
- sortir les helpers de normalisation dans des fonctions courtes ;
- garder l'objet métier final stable.

Ce pattern s'applique bien aux :

- stores communautaires ;
- stores de contact ;
- caches locaux ;
- synchronisations Supabase mirror.

---

## Priorité De Correction

Quand plusieurs warnings existent dans un même fichier, corriger dans cet ordre :

- `react-hooks/set-state-in-effect`
- `react-hooks/exhaustive-deps`
- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-unused-vars`
- `complexity`
- `max-lines-per-function`
- `max-lines`

Ce tri garde la priorité sur les risques de comportement, puis sur la maintenabilité.

---

## Checklist Avant De Valider Un Refactor

- Le comportement visible est inchangé.
- Les données externes sont validées au bord du système.
- Aucun `any` nouveau n'a été introduit.
- Aucun `as unknown as` n'a été ajouté.
- Les effets React ne contiennent que des effets de bord réels.
- La fonction publique est plus simple qu'avant.
- Le lint ciblé passe sur les fichiers modifiés.

---

## Références

- [Checklist de correction ESLint](./LINT_CORRECTION_CHECKLIST.md)
- [Priorité des warnings ESLint restants](./LINT_WARNING_PRIORITY.md)
- [TypeScript Precision Policy](./typescript-precision-policy.md)
