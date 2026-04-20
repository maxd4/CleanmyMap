# Architecture et Conventions CleanMyMap

Ce document synthétise les principes techniques et structurels figés lors de la refonte V2 de CleanMyMap afin de garantir une maintenance et une évolution saines.

## 1. Philosophie Front-End ("Cockpit-First")
- **Pleine Largeur & Densité :** L'application privilégie des interfaces "Edge-to-Edge" denses en data. Tout margin/padding superflu a été retiré.
- **Le Split-Screen :** La règle d'or pour toute nouvelle rubrique est l'usage du layout en grille `grid-cols-1 lg:grid-cols-[1fr_1.5fr]`. Ce composant sépare l'analyse (gauche) de l'exploration métier (droite) pour éliminer le scroll vertical excessif.
- **Composants Stateless :** Les rubriques (ex: `ClimateSection`, `CompareSection`) n'ont pas la responsabilité du routage. La "Tour de Contrôle" parente injecte les filtres (ex: fenêtres temporelles).

## 2. Accès et Sécurité (Guard Roles)
- **Zero-Trust Backend :** Même si un composant frontend est masqué, aucune donnée n'est envoyée au client sans un passage par `requireAppAccess()` ou `requireAdminAccess()` défini dans `lib/authz.ts`.
- **Rôle stocké vs Droits effectifs :** Clerk gère le rôle officiel de l'utilisateur (Metadata). Ce rôle est traduit en droits de lecture/écriture au moment du rendu serveur (SSR). Les endpoints APIs appliquent la même vérification stricte.

## 3. Data & Performance (Supabase + SWR)
- **Source de Vérité Unique :** Supabase sert de réplique en temps réel. Pas de jointures massives en frontend.
- **SWR au Client :** `useSWR` est le standard de récupération des données côté client pour assurer une expérience réactive, la gestion des erreurs locales (limite le crash à un seul composant) et un cache robuste sans dépendre de lourds SDKs centraux.

## 4. Exports et Livrables
- **Print-to-PDF Natif :** Le `globals.css` gère nativement le support d'impression papier/PDF sans librairie serveur lourde (`@media print` avec le masquage des navigations).
- **Hardening CSV :** Les WebServices d'audit (comme `api/community/funnel.csv`) bloquent systématiquement les requêtes non-admin.

> "Agir. Cartographier. Préserver."
