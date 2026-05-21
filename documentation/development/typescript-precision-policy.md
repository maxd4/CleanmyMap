# TypeScript Precision Policy

Ce document définit les règles de précision de typage à appliquer dans le repo.

## Principes

- `any` est interdit par défaut.
- Les casts sont des outils de frontière, pas des outils de confort.
- `Record<string, unknown>` est réservé aux payloads réellement non structurés.
- Tout accès dynamique doit être normalisé avant d'entrer dans la logique métier.

## Règles

### 1. Pas de `any` par défaut

Utilise `unknown`, une interface, une union ou une garde de type.

Autorisé uniquement aux frontières temporaires très locales, avec justification écrite et plan de suppression.

### 2. Casts uniquement si la forme est prouvée

Un cast est acceptable quand:

- la donnée vient d'une frontière externe, puis a été validée;
- le cast est encapsulé dans un helper de normalisation;
- la forme est imposée par l'API tierce et le helper centralise ce contrat.

Un cast est à refuser quand:

- il remplace une vraie modélisation;
- il évite un `unknown` sans validation;
- il masque un accès potentiellement absent.

### 3. `Record<string, unknown>` seulement aux frontières

Cas légitimes:

- JSON brut;
- métadonnées Clerk ou Supabase non garanties;
- payloads réseau ou stockage local hérités;
- objets réellement libres de forme.

Cas à éviter:

- objets internes déjà connus;
- réponses déjà normalisées;
- entités métier du domaine;
- composants qui pourraient recevoir un type nommé.

Si une structure est stable, définis un type dédié et migre l'appelant vers ce type.

### 4. Accès dynamiques normalisés

Tout accès `obj["foo"]` ou `obj.foo` sur un objet non garanti doit passer par:

- un helper `isRecord` / `toRecord`;
- un parseur métier dédié;
- une validation de schéma;
- ou une normalisation centralisée.

Les fonctions métier ne doivent pas dépendre d'objets ouverts tant qu'une forme stable existe.

## Règle de correction

Quand une erreur TypeScript apparaît:

1. Corriger la forme des données.
2. Créer ou réutiliser un type explicite.
3. Normaliser au bord du système.
4. Éviter le contournement par `any` ou par cast aveugle.

## Références

- [AI Mindset Kaizen](./AI_MINDSET_KAIZEN.md)
- [Checklist de correction ESLint](./LINT_CORRECTION_CHECKLIST.md)
- [TypeScript strict - rapport priorisé](./typescript-strict-priority-report.md)
