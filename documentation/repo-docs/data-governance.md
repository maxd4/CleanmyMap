# Gouvernance des Données & Contrats : CleanMyMap

Ce document définit comment la donnée doit être structurée, validée et synchronisée pour protéger la "Source de Vérité".

---

## 1. Source de Vérité (SSOT)
La source de vérité pour le schéma est **Supabase**. Les types TypeScript doivent être générés ou alignés sur la structure du Schéma Public.

## 2. Mapping Domaine -> Code
Toute donnée métier doit être normalisée via les types définis dans `apps/web/src/lib/domain-language.ts`.

| Entité | Mapping Supabase | Type TypeScript |
| :--- | :--- | :--- |
| **Action** | `public.actions` | `Action` |
| **Spot** | `public.spots` | `Spot` |
| **Utilisateur** | `public.profiles` | `Profile` |

## 3. États de l'Action (Cycle de Vie)
Toute action terrain doit suivre les états de modération définis :
*   `pending` : Saisie par le bénévole, en attente de vérification.
*   `validated` : Confirmée par un admin ou un expert scientifique. Apparaît sur la carte publique.
*   `rejected` : Donnée invalide ou spam.

## 4. Règles de Validation (Input)
Toute API modifiant de la donnée métier **doit** utiliser un validateur de schéma (ex: Zod) pour s'assurer qu'aucun champ sensible n'est corrompu.
*   **Localisation** : Doit toujours être au format GeoJSON ou Point (Lat/Long).
*   **Volume** : Les unités doivent être normalisées (kg, litres, m³).

## 5. Ingestion Multi-Sources
Le module `apps/web/src/lib/actions/unified-source.ts` est l'unique point d'entrée pour la normalisation des données externes (Google Sheets, APIs partenaires). Aucun autre script ne doit écrire directement dans la table `actions` sans passer par ce contrat de normalisation.
