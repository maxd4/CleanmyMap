# TypeScript Anti-Errors Playbook

Ce playbook sert à une IA ou un développeur pour corriger les erreurs TypeScript sans dégrader la logique.

## Objectif

Quand une erreur TypeScript apparaît, la correction doit:

1. améliorer la forme des données;
2. réduire les zones dynamiques;
3. renforcer le contrat métier;
4. éviter les casts décoratifs;
5. ajouter un test si la correction touche un parseur, un store, une API ou un hook.

## Règles générales

- `any` est un dernier recours, pas une solution.
- Un cast ne remplace jamais une validation.
- `Record<string, unknown>` n'est acceptable que pour une frontière brute.
- Tout accès dynamique doit être normalisé avant d'entrer dans la logique métier.
- Si une donnée est stable, elle mérite un type nommé.

## Protocole de diagnostic TypeScript

Quand il faut diagnostiquer des erreurs TypeScript, utiliser un vrai check `noEmit` plutôt qu'un outil qui s'arrête trop tôt sur un cas isolé.

Commande de base:

- `npm run typecheck`
- ou `npx tsc --noEmit --pretty false`

Quand on veut conserver toute la sortie dans un fichier:

- `npx tsc --noEmit --pretty false > typescript-errors.txt`

Si la sortie semble tronquée par le terminal, le script ou Codex:

- `npx tsc --noEmit --pretty false --noErrorTruncation > typescript-errors.txt`

Méthode de correction:

1. lire `typescript-errors.txt` en entier;
2. regrouper les erreurs par cause racine;
3. corriger d'abord les erreurs bloquantes communes;
4. relancer `npm run typecheck`;
5. ne revenir au build qu'après un typecheck propre ou après avoir confirmé qu'une erreur est externe au code.

Règle pratique:

- si TypeScript affiche plusieurs erreurs dans plusieurs fichiers, ne corrige pas fichier par fichier au hasard;
- corrige la source commune, puis relance le check complet.

## Codes fréquents

### `TS4111` - propriété issue d'un index signature

**Ce que ça signifie**
- L'objet est trop générique pour un accès par point.

**Cause racine**
- L'IA a laissé un objet ouvert là où un type explicite existait.

**Correction à privilégier**
- Convertir l'objet brut en type nommé.
- Ajouter un helper de normalisation ou un parseur métier.
- Garder l'accès dynamique dans une seule frontière.

**À éviter**
- Remplacer `obj.foo` par `obj["foo"]` partout sans normaliser.
- Laisser `Record<string, unknown>` au cœur du métier.

**Règle pour l'IA**
- Si la donnée revient souvent, elle doit avoir un type stable.

### `TS2532` / `TS18048` - valeur possiblement `undefined`

**Ce que ça signifie**
- Une valeur est utilisée avant d'être prouvée.

**Cause racine**
- Indexation de tableau, réponse réseau ou propriété optionnelle non vérifiée.

**Correction à privilégier**
- Ajouter un guard clause.
- Retourner tôt si la donnée est absente.
- Encapsuler le calcul dans un helper qui gère le cas vide.

**À éviter**
- Ajouter `!` sans preuve.
- Forcer la valeur avec un fallback arbitraire qui change le sens métier.

**Règle pour l'IA**
- Si la donnée peut manquer, le code doit montrer clairement comment il réagit.

### `TS2322` - assignation incompatible

**Ce que ça signifie**
- La valeur construite ne respecte pas le contrat attendu.

**Cause racine**
- Objet partiellement construit, spread sur une source trop large, ou union mal affinée.

**Correction à privilégier**
- Construire le résultat par étapes.
- Isoler la normalisation dans un helper.
- Nommer les champs obligatoires et optionnels.

**À éviter**
- Camoufler l'écart avec un cast.
- Rendre le type cible plus permissif juste pour compiler.

**Règle pour l'IA**
- Si une assignation échoue, le contrat est probablement mal modélisé ou la donnée est trop floue.

### `TS2345` - argument incompatible

**Ce que ça signifie**
- Une fonction reçoit une valeur qui n'a pas encore été validée.

**Cause racine**
- La valeur n'a pas été narrowée avant l'appel.

**Correction à privilégier**
- Valider avant l'appel.
- Créer un adaptateur ou une fonction de conversion.

**À éviter**
- Passer un cast aveugle à l'appelant.

**Règle pour l'IA**
- Une fonction doit recevoir une donnée déjà sûre, pas un espoir.

### `TS2488` - déstructuration ou itération sur une valeur non garantie

**Ce que ça signifie**
- Le code suppose qu'une structure iterable existe toujours.

**Cause racine**
- Déstructuration prématurée ou cardinalité implicite non vérifiée.

**Correction à privilégier**
- Vérifier la présence des éléments.
- Encapsuler la structure dans un type plus précis.

**À éviter**
- Utiliser `!` pour forcer l'accès.

**Règle pour l'IA**
- Toute paire, tuple ou collection partielle doit être prouvée avant usage.

## Priorité de remédiation

1. Corriger le runtime et les API.
2. Corriger les frontières de données.
3. Corriger les types grossiers (`any`, `Record<string, unknown>`).
4. Nettoyer les warnings de surface et de style.

## Checklist IA avant correction

- La donnée vient-elle d'une frontière externe ?
- Un type nommé existe-t-il déjà ?
- Puis-je créer un helper de normalisation ?
- Le cast est-il réellement prouvé ?
- La correction garde-t-elle la logique métier intacte ?
- Ai-je ajouté ou mis à jour un test ?

## Version courte

Si tu veux une séquence ultra-courte pour une IA de maintenance, utilise plutôt la checklist dédiée:

- [TypeScript Anti-Errors Checklist](./typescript-anti-errors-checklist.md)

## Références

- [TypeScript Precision Policy](./typescript-precision-policy.md)
- [AI Mindset Kaizen](./AI_MINDSET_KAIZEN.md)
- [TypeScript strict - rapport priorisé](./typescript-strict-priority-report.md)
