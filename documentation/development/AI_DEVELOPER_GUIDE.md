# AI Developer Guide — CleanMyMap

Ce guide complète les fichiers de gouvernance à la racine du dépôt. Ils restent
les sources canoniques pour les règles transversales d'exécution, de sécurité,
de Git, de validation et de collaboration. Ce document ne les duplique pas ;
il fournit uniquement les repères propres au développement de CleanMyMap.

## 1. Vocabulaire métier canonique

Le vocabulaire d'autorisation est défini par
`apps/web/src/lib/domain-language.ts` et `apps/web/src/lib/profiles.ts`.

- **Role** : `benevole`, `coordinateur`, `scientifique`, `entreprise`, `elu`,
  `admin`, `max`.
- **SessionRole** : un `Role` ou l'état de session non connecté `anonymous`.
- **Parcours** : la projection de navigation d'un `Role` ; actuellement
  `Parcours = Role`.

`anonymous` est un état de session, pas un rôle métier. Ne modifie pas ces
contrats sans vérifier leurs consommateurs et les règles canoniques du dépôt.

## 2. Architecture actuelle

CleanMyMap est un monorepo avec deux applications déployables :

- `apps/web` : application web Next.js `16.3.1` avec App Router ;
- `apps/mobile` : application Expo / React Native du même produit.

Les deux applications partagent les contrats nécessaires, Clerk et Supabase,
mais restent des surfaces déployables distinctes. Les versions exactes sont
définies par les manifestes, en particulier `apps/web/package.json`.

Dans `apps/web` :

- `src/app/` contient les pages, layouts et routes API ;
- `src/components/` contient l'UI ;
- `src/lib/` contient le domaine, les services et les contrats ;
- `src/lib/sections-registry/config.ts` est le registre canonique des rubriques.

Clerk reste l'identité principale. Supabase fournit la persistence et les
services de données ; les frontières serveur/client et les droits effectifs
restent ceux du code courant.

## 3. Documentation spécialisée à consulter

Consulte uniquement la documentation réellement concernée par le changement :

- [Architecture](../architecture/README.md) pour les décisions et frontières ;
- [Gouvernance des données](../architecture/data-governance.md) pour les
  contrats de données et l'ingestion ;
- [Standard API](./api-standard.md) pour les contrats HTTP et les invariants
  de sécurité ;
- [Testing](./TESTING.md) pour les validations de développement ;
- [Design system](../design-system/README.md) pour une modification UI.

Ne crée pas de copie locale d'une règle déjà portée par les fichiers de
gouvernance à la racine ou une source documentaire spécialisée. Si deux
documents semblent prescrire des règles différentes, vérifie le code et les
sources canoniques avant de modifier l'un d'eux.

## 4. Repères de développement

Les décisions générales ne sont pas recopiées ici. Pour une tâche donnée,
identifie le contrat ou le module réellement concerné, conserve ses
consommateurs, puis applique les validations proportionnées définies par la
gouvernance du dépôt.

Les scripts Python de maintenance vivent sous `maintenance/python/` et restent
hors du runtime web. Toute modification de cette zone doit rester explicitement
dans son propre périmètre.
