# Notification de contenu potentiellement illicite

## Fiche canonique

- **Route** : `/signaler-contenu-illicite`
- **Fichier(s) source(s)** :
  - `apps/web/src/app/signaler-contenu-illicite/page.tsx`
  - `apps/web/src/components/sections/rubriques/legal-content-report-form.tsx`
  - `apps/web/src/app/api/legal-content-reports/route.ts`
- **Type fonctionnel** : légale
- **Famille / bloc fonctionnel** : Institutionnel & Légal (hors bloc)
- **Statut** : légal
- **Objectif utilisateur principal** : transmettre une notification électronique suffisamment circonstanciée à partir de l'URL exacte d'un contenu.
- **Action principale attendue** : envoyer la notification et conserver l'identifiant de suivi.
- **Palette attendue** : slate / gris clair, avec accent amber pour l'accès depuis les surfaces juridiques.
- **Scope** : DSA-01 — domaine dédié `legal-content-report` intégré en lecture au creator inbox.

## Parcours et règles

- L'URL électronique exacte et le motif circonstancié sont obligatoires.
- Le type de contenu et l'identifiant technique sont facultatifs.
- Le nom et l'email sont requis sauf exception déclarée pour les faits susceptibles de relever des articles 3 à 7 de la directive 2011/93/UE.
- La déclaration de bonne foi confirmant l'exactitude et le caractère complet des informations est obligatoire.
- Aucun compte CleanMyMap, document d'identité ou fichier joint n'est requis.
- BotID, rate limit, validation Zod et honeypot protègent l'envoi.
- Le signalement est persisté avant toute tentative d'email. Un email fourni déclenche un accusé de réception ; le signalement reste conservé si l'email échoue.
- La notification est visible uniquement dans le creator inbox authentifié, en lecture seule, et n'est jamais publiée avec le contenu signalé.

## Position juridique publique

Le dispositif est présenté comme compatible avec la réception d'une
notification électronique prévue par l'article 16 du DSA. La page ne qualifie
pas CleanMyMap de fournisseur d'hébergement au sens du DSA et ne demande pas au
déclarant de qualifier juridiquement parfaitement les faits.

## Validation attendue

- tests de contrat de la route POST et de la validation du formulaire ;
- tests de persistance avant notification et de tolérance à une panne email ;
- tests de lecture creator inbox et d'absence de mutation publique ;
- migration Supabase avec RLS service-only et audit de sécurité.
