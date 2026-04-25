# AI Developer Guide - CleanmyMap

Ce projet utilise une architecture très structurée (Next.js 15, React Server Components/Client Components, Supabase, Clerk) et un vocabulaire d'entreprise très strict (Domain Language). Si tu es un agent de développement (coding assistant, LLM, ou automation tool), **lis attentivement ce fichier avant de modifier du code.**

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
- Données sensibles & Gouvernance : Toute modification sur le **Profil** (`profile`), les modules **Open Data** (`open-data`) ou les flux de **Financement** (`funding`) doit respecter scrupuleusement les contrats de données établis.
- Ne fais jamais de requêtes SQL brutes. L'application utilise typiquement le client Supabase `createClient()` ou des helpers dans `lib/actions/http.ts`.

## 4. Règles d'Architecture & Gouvernance
1. **Gouvernance Globale** : Avant toute modification structurale, consulte la couche de gouvernance dans `documentation/repo-docs/` :
   - [Design System](./documentation/repo-docs/design-system.md) (Règles visuelles Premium).
   - [Data Governance](./documentation/repo-docs/data-governance.md) (Contrats et Ingestion).
   - [API Standard](./documentation/repo-docs/api-standard.md) (Erreurs et Sécurité).
3. **Nomenclature Utilisateur** : Utilise toujours les noms engageants pour les rubriques FR (ex: "Signalement Déchets" au lieu de "Trash Spotter", "Mon Profil & Impact" au lieu de "Compte", "Entraide Locale" au lieu de "Discussion").
4. **Pas de logique lourde en Client Components** : Isole la data-fetching côté serveur.
5. **Dynamic Imports pour Leaflet** : Obligatoire pour éviter les crashs SSR.
6. **Icons Lucide-React** : Standard unique pour les icônes.
7. **Styling Mixte** : Tailwind pour le layout, Vanilla CSS/Variables pour l'esthétique Premium (voir Design System).

## 5. Scripts et Automatisation
Les scripts Python legacy sont dans `/legacy/`. Ne casse pas ces routines car elles sont critiques pour l'historique des données.

## 6. Encodage et Accents Français (CRITIQUE)
- **Tous les fichiers doivent être encodés en UTF-8 sans BOM.** Le `.editorconfig` à la racine l'impose.
- **Utilise systématiquement les vrais caractères accentués français** dans les strings visibles : `é`, `è`, `ê`, `à`, `ù`, `ç`, `ô`, `î`, etc.
- **Interdit** : omettre les accents (ex: "Declarer" au lieu de "Déclarer") ou insérer des séquences mojibake (ex: "DÃ©clarer").
- **Vérification** : avant tout commit contenant du texte français, lancer `Select-String -Recurse -Pattern "\xC3" apps/web/src` (PowerShell) ou `grep -rn "Ã" apps/web/src` (bash). Zéro résultat = OK.
- **Règle i18n** : ne jamais utiliser `.label.fr` ou `.description.fr` en dur. Toujours passer par `label[locale]` avec la locale récupérée via `getServerLocale()` (Server) ou `useSitePreferences()` (Client).
