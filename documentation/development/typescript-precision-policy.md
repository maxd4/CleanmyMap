# TypeScript Precision Policy

## Objet

Ce document définit le contrat durable de précision TypeScript pour CleanMyMap.
Il ne maintient aucun backlog d'erreurs ni aucun état daté du `typecheck`.

Les erreurs et warnings courants sont traités avec
[`lint-refactor-playbook.md`](./lint-refactor-playbook.md). Les commandes et
niveaux de validation restent définis dans [`TESTING.md`](./TESTING.md).

## Principes

- `any` est interdit par défaut.
- `unknown` est préférable lorsqu'une forme n'est pas encore prouvée.
- Un cast ne remplace jamais une validation.
- `Record<string, unknown>` reste une représentation de frontière, pas un type métier.
- Un accès dynamique doit être normalisé avant d'entrer dans la logique métier.
- Une valeur potentiellement absente doit être explicitement traitée.
- Les types internes stables doivent exprimer le contrat réellement attendu.

## Frontières externes

Traiter comme non fiables tant qu'elles ne sont pas validées : JSON réseau,
payloads API, métadonnées Clerk/Supabase non garanties, storage/cache hérités,
paramètres externes, réponses tierces et données importées.

```text
unknown
→ validation / garde / parseur
→ type métier explicite
→ logique métier
```

`Record<string, unknown>` peut servir temporairement à inspecter une structure
brute, mais ne doit pas se propager dans les services ou composants lorsque la
forme est connue.

## `any`

Préférer une interface, une union, un générique borné, `unknown`, une garde ou
un parseur. Un `any` n'est acceptable que si une contrainte externe l'impose
réellement et qu'il reste limité à la plus petite frontière possible.

Ne pas remplacer un `any` par `value as unknown as DomainType`.

## Casts et assertions

Un cast est acceptable lorsque la forme a déjà été prouvée par un validateur,
une garde, un contrat de bibliothèque fiable ou une normalisation centralisée.

Refuser un cast qui masque une propriété potentiellement absente, contourne une
erreur d'assignation, élargit le contrat ou laisse entrer une donnée brute dans
le cœur métier.

L'assertion non-null `!` suit la même règle : si la donnée peut réellement
manquer, le code doit traiter ce cas explicitement.

## Accès dynamiques et indexation

Pour une donnée non garantie :

```text
payload brut
→ isRecord / parseur métier
→ extraction contrôlée
→ type stable
```

Éviter de multiplier les accès `obj["foo"]` dans la logique métier. Les
centraliser dans un parseur ou adaptateur.

`noUncheckedIndexedAccess` n'est pas activé par défaut. Son activation nécessite
un lot dédié avec audit des usages et correction sémantique des accès
incertains. Ne pas la préparer en ajoutant mécaniquement des `!`.

## Erreurs TypeScript fréquentes

### `TS4111`

Le type est trop ouvert. Préférer type nommé, parseur ou accès dynamique borné
à une frontière.

### `TS2532` / `TS18048`

Traiter explicitement `undefined` avec guard clause, retour anticipé ou branche
métier. Ne pas utiliser `!` sans preuve.

### `TS2322`

Vérifier objet partiel, union mal affinée, donnée brute propagée trop loin ou
type cible mal modélisé. Ne pas rendre le type artificiellement permissif.

### `TS2345`

Valider ou convertir avant l'appel. Une fonction métier doit recevoir une
donnée déjà compatible avec son contrat.

### `TS2488`

Prouver présence et cardinalité avant déstructuration ou itération.

## Stores, API et persistence

Lorsqu'une correction touche un parseur, un store, une route API ou une
persistence :

- valider les champs obligatoires à la frontière ;
- normaliser les champs optionnels ;
- préserver les distinctions métier utiles (`null`, absent, valeur par défaut) ;
- ne pas transformer une donnée invalide en donnée plausible ;
- ajouter ou adapter un test lorsque le contrat change.

## React

- typer précisément props et retours publics ;
- dériver les valeurs pures pendant le rendu lorsque possible ;
- ne pas contourner une mauvaise modélisation d'état par un cast ;
- normaliser les payloads externes avant le rendu.

Les règles d'effets React et de lint sont dans
[`lint-refactor-playbook.md`](./lint-refactor-playbook.md).

## Méthode de correction

1. Identifier le code d'erreur et la frontière concernée.
2. Déterminer la forme réelle de la donnée.
3. Chercher un type, helper ou parseur existant.
4. Corriger la cause commune avant les symptômes locaux.
5. Ajouter une validation ou un type explicite si nécessaire.
6. Préserver le comportement métier.
7. Relancer le contrôle ciblé puis les validations proportionnées au risque.

## Critères de sortie

- forme des données plus explicite ;
- aucune assertion aveugle ajoutée ;
- frontières non fiables bornées ;
- contrat métier non élargi sans décision ;
- cas d'absence traités selon leur sémantique ;
- tests pertinents et typecheck applicable verts.

## Références

- [`lint-refactor-playbook.md`](./lint-refactor-playbook.md)
- [`TESTING.md`](./TESTING.md)
- [`repo-quality-rules.md`](./repo-quality-rules.md)
- [`kaizen/PRINCIPLES.md`](./kaizen/PRINCIPLES.md)
