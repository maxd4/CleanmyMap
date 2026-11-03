# Composants web — composition des surfaces

`src/components/` contient la composition React des surfaces web : navigation, layout, rubriques, Actions, cartes, rapports, apprentissage et composants transverses. Les dossiers de capacité peuvent avoir leur propre README ; celui-ci donne le routage général.

## Sous-domaines

- `navigation/`, `layout/` et `ui/` composent le chrome, les primitives et les états d’interface.
- `actions/`, `map/`, `sections/`, `reports/`, `learn/`, `pilotage/`, `profil/` et `gamification/` rendent les capacités de leurs domaines respectifs.
- `auth/`, `account/`, `admin/`, `chat/`, `notifications/`, `partners/` et `waste/` portent les surfaces spécialisées correspondantes.

## Direction des dépendances

Les composants présentent et orchestrent l’interface ; les contrats, calculs, autorisations et accès aux données restent dans `apps/web/src/lib/`, l’API ou Supabase. `components/ui/` ne doit pas devenir un registre métier. La navigation suit `lib/navigation.ts` et `lib/sections-registry/`, pas un second tableau de routes.

Les sources canoniques pour les frontières sont [`master-architecture.md`](../../../../documentation/architecture/master-architecture.md), [`section-ownership-boundaries.md`](../../../../documentation/architecture/section-ownership-boundaries.md) et l’index du [`design-system`](../../../../documentation/design-system/README.md). Les tests restent près du composant ou de la capacité qu’ils prouvent ; les contrats détaillés restent dans leur owner.
