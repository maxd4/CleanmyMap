# Profil engagement

## Fiche canonique

- **Route** : `/profil/engagement`
- **Fichier(s) source(s)** :
  - `apps/web/src/app/(app)/profil/engagement/page.tsx`
  - `apps/web/src/components/profil/engagement/engagement-dossier-page.tsx`
  - `apps/web/src/components/profil/engagement/engagement-dossier-sections.tsx`
  - `apps/web/src/components/profil/engagement/engagement-attestation-pdf-section.tsx`
- **Type fonctionnel** : page de bloc
- **Famille / bloc fonctionnel** : Accueil & Pilotage
- **Statut** : protégé (`protected` via `/profil(.*)`, `robots: noindex, nofollow`)
- **Contexte nécessaire** : Compte connecté (`requireActionRequestAccess`, owner-scoped)
- **Objectif utilisateur principal** : Consulter ses participations bénévoles documentées (éco-citoyenneté et insertion), filtrer par période, sélectionner les engagements retenus et exporter un dossier Markdown privé ou télécharger le modèle d'attestation associative PDF vierge.
- **Action principale attendue** : Télécharger le dossier Markdown privé (`POST /api/account/engagement-proofs/export`) et, le cas échéant, le modèle PDF vierge (`/documents/modele-attestation-benevolat-v2.pdf`) à faire vérifier et signer par chaque structure.
- **Point d’entrée utilisateur** :
  - Principal : `/profil/impact` → « Ouvrir mon dossier d'engagement »
  - Secondaire : `/reports` → bouton « Valoriser mon engagement »
- **Navigation** : surface secondaire contextualisée, volontairement absente du ruban principal.
- **Règle de confidentialité et d'export** : Les lectures (`GET /api/account/engagement-proofs`) et exports (`POST /api/account/engagement-proofs/export`) sont strictement owner-scoped, réévalués à la volée, servis en `Cache-Control: private, no-store`, sans stockage des champs libres ni des dossiers générés, sans appel IA automatique et sans exposition d'identités tierces.
- **Scope** : sélection par période et par action confirmée, distinctions explicites (présences, missions attestées, heures individuelles non documentées, déclarations personnelles non certifiées, résultats collectifs non attribués), modèle PDF vierge A4 à 27 champs sans signature ni validation CleanMyMap.
- **Terminée** : oui pour le périmètre Lots 1 à 3 ; le futur PDF narratif complet du dossier reste au statut `PLAN`.
