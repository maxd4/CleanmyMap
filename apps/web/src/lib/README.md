# Bibliothèque web — domaines et contrats

`src/lib/` porte les domaines, contrats, services et transformations réutilisés par les routes et les composants web. Une règle métier durable y garde un owner unique ; ce README sert uniquement à trouver cet owner.

## Parcours rapides

- `actions/`, `community/`, `gamification/`, `reports/`, `route/` et `waste/` regroupent les domaines métier et leurs tests.
- `auth/`, `authz.ts`, `profiles.ts` et `security/` portent l’identité, les gardes et les frontières de sécurité ; la politique applicable est dans `documentation/security/`.
- `navigation.ts`, `sections-registry/` et `accueil/` relient registre, navigation et surfaces publiques.
- `supabase/`, `persistence/`, `storage/`, `http/` et `services/` portent les accès techniques ; ils ne remplacent pas les contrats des domaines appelants.
- Les sous-domaines ayant leur propre README (`actions/`, `learning/`, `reports/`, `route/`, `supabase/`, etc.) sont les points d’entrée les plus précis.

## Frontières et sources canoniques

Les composants et routes consomment `lib/` ; `lib/` ne doit pas recréer une règle déjà possédée par l’API, Supabase ou le design system. Pour orienter une modification, lire [`apps/web/README.md`](../../../../README.md), [`master-architecture.md`](../../../../documentation/architecture/master-architecture.md), [`section-ownership-boundaries.md`](../../../../documentation/architecture/section-ownership-boundaries.md) et [`TESTING.md`](../../../../documentation/development/TESTING.md). Le module source, ses callers et ses tests restent la vérité opérationnelle ; ce fichier ne recopie pas leurs contrats.
