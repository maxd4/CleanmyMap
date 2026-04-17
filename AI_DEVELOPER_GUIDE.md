# AI Developer Guide - CleanmyMap

Ce projet utilise une architecture très structurée (Next.js 15, React Server Components/Client Components, Supabase, Clerk) et un vocabulaire d'entreprise très strict (Domain Language). Si tu es un agent IA (Claude, Copilot, Cursor), **lis attentivement ce fichier avant de modifier du code.**

## 1. Domain Language (Vocabulaire Critique)
Toute l'application repose sur `apps/web/src/lib/domain-language.ts` et `apps/web/src/lib/profiles.ts`.
Ne confonds jamais ces 3 concepts d'autorisation :
- **Role** : L'attribution métier d'un utilisateur dans la base (`benevole`, `coordinateur`, `scientifique`, `elu`, `admin`).
- **SessionRole** : Le `Role` + l'état déconnecté (`anonymous`).
- **Parcours** : Lens de navigation (UX) appliquée à un rôle. Actuellement, `Parcours = Role`.

Ne modifie jamais le typage de ces éléments sans autorisation formelle du lead developer. 
Pour vérifier les accès côté serveur, utilise `getEffectiveAccessForSessionRole` dans `lib/domain-language.ts` ou la surcouche Clerk dans `lib/authz.ts`.

## 2. Architecture de la Plateforme (`apps/web/src`)

- `/app` : App Router Next.js 15. Contient les routes publiques (`/`), les routes membres `(app)/` et les webhooks.
- `/components/ui/` : Composants génériques et réutilisables (Boutons, Modals, Wrappers).
- `/components/actions/` : Tout le flux de collecte terrain (Formulaires de déclaration, Cartes des déchets).
- `/components/sections/rubriques/` : Le cœur de l'UI. Chaque "rubrique" (ex: Annuaire, Météo, Classement) est un composant isolé ici. Ne mets pas de logique globale dans ces fichiers.
- `/lib/sections-registry.ts` : Registre central de toutes les vues `Rubriques`. Si tu crées un nouveau module dans le site, tu **dois** l'enregistrer ici pour qu'il apparaisse dans le routeur et la navigation.

## 3. Données et Intégration (Supabase + Clerk)
- Clerk gère l'authentification. Les métadonnées rôles sont sur `publicMetadata.role`. 
- Supabase gère la donnée applicative métier (Actions terrain, déchets).
- Ne fais jamais de requêtes SQL brutes. L'application utilise typiquement le client Supabase `createClient()` ou des helpers dans `lib/actions/http.ts`.

## 4. Règles d'Architecture
1. **Pas de logique lourde en Client Components** : Isole la data-fetching côté serveur (Server Actions ou API routes) ou utilise `SWR` sur client de manière restreinte.
2. **Dynamic Imports pour Leaflet** : Toute utilisation de `react-leaflet` doit se faire dans des composants avec `"use client"` et `next/dynamic({ ssr: false })` (ex: `ActionDrawingMap`, `AnnuaireMapCanvas`). Leaflet plante sur l'environnement Node.js.
3. **Icons Lucide-React** : Utilise uniquement `lucide-react` (déjà installé) pour les icônes.
4. **TailwindCSS Intégré** : N'ajoute pas de fichiers CSS isolés, utilise les utilitaires Tailwind existants.

## 5. Scripts et Automatisation
Les scripts Python de migration/legacy ou d'import de données (ex: Google Sheets) sont situés dans `/scripts/` et `/legacy/`. Ne casse pas ces routines car certaines sont appelées par des CRONs externes.
