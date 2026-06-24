# Audit des `any` - CleanMyMap

**Date** : 2026-06-23  
**Périmètre** : fichiers de code suivis par Git (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`), hors `node_modules` et hors fichiers Markdown de documentation.  
**Méthode** : recherche des motifs `: any`, `as any`, `<any>` et `any[]`.

## Résumé

- **Critiques** : 0
- **Moyens** : 0
- **Faibles** : 0

Le dépôt ne contient plus de `any` applicatif dans les zones critiques visées par ce tri.

## 1. Critiques

Concerne les surfaces suivantes :

- routes API ;
- Supabase ;
- auth ;
- formulaires ;
- données terrain ;
- calculs d'impact.

### Résultat

- Aucun `any` trouvé dans cette catégorie.

## 2. Moyens

Concerne les surfaces suivantes :

- composants partagés ;
- hooks ;
- helpers.

### Résultat

- Aucun `any` trouvé dans cette catégorie.

## 3. Faibles

Concerne les surfaces suivantes :

- tests ;
- mocks ;
- scripts ;
- wrappers externes.

| Fichier | Ligne | Contexte | Lecture |
|---|---:|---|---|
| Aucun | - | - | - |

## Note de lecture

Les fichiers Markdown de documentation contiennent encore quelques occurrences de `any` dans des exemples ou des guides de correction. Je ne les ai pas comptés comme dette applicative, car ils servent de documentation et non de surface d'exécution.

## Conclusion

Le stock de `any` applicatif est désormais nul dans le code suivi par Git.
