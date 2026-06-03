# Mémoire de non-régression `page-families`

Cette note fige les corrections récentes pour éviter de recréer les mêmes ambiguïtés entre le runtime, le générateur documentaire et les guides de navigation.

## Règles à ne pas casser

- Une route canonique = une seule vérité.
- `/` reste la seule homepage canonique.
- `/accueil` ne doit pas revenir comme alias caché.
- Le registre canonique des familles vit dans `apps/web/src/lib/ui/page-families/families/registry.ts`.
- La source de métadonnées partagée vit dans `apps/web/src/lib/ui/page-families/page-families.manifest.json`.
- Le générateur documentaire lit le même manifeste que le runtime.
- Les fichiers de compatibilité supprimés ne doivent pas être recréés sans besoin explicite.
- Les identifiants techniques de famille restent stables et alignés sur le manifeste.
- Les exceptions restent explicites dans `exceptions.ts` et dans `resolve-page-family.ts`.

## Fichiers de référence

- [README pages_site](./README.md)
- [Guide développement `PAGE_FAMILIES`](../development/PAGE_FAMILIES.md)
- [Plan `PAGE_FAMILIES`](./PAGE_FAMILIES_PLAN.md)
- [Registre runtime](../../apps/web/src/lib/ui/page-families/families/registry.ts)
- [Manifeste partagé](../../apps/web/src/lib/ui/page-families/page-families.manifest.json)
- [Test de cohérence manifeste / runtime](../../apps/web/src/lib/ui/page-families/registry-manifest.test.ts)

## Ce qui a été corrigé

- Suppression de l'alias de homepage `/accueil`.
- Centralisation du bloc 01 dans un registre unique.
- Remplacement de `defaults.ts` par `registry.ts`.
- Alignement du générateur `generate-canonical-pages.mjs` sur le même manifeste que le runtime.
- Mise en place d'un test de cohérence pour éviter une divergence future.

## Règle de maintenance

Si une nouvelle famille ou une nouvelle exception apparaît, il faut mettre à jour ensemble :

1. le manifeste partagé ;
2. le registre runtime ;
3. le resolver ;
4. le test de cohérence ;
5. la documentation de `pages_site`.
