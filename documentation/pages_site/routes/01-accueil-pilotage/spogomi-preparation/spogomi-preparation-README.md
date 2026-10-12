# Préparation SPOGOMI

## Fiche canonique

- **Route** : `/spogomi`
- **Fichiers source** :
  - `apps/web/src/app/(app)/spogomi/page.tsx`
  - `apps/web/src/app/(app)/spogomi/[eventId]/page.tsx`
  - `apps/web/src/components/spogomi/`
- **Type fonctionnel** : préparation événementielle privée
- **Famille / bloc fonctionnel** : Accueil & Pilotage
- **Statut** : CURRENT — lot 2, sans résultats ni classement
- **Accès** : `protected` ; la page et chaque API vérifient une session puis la relation organisateur portée par l’action liée
- **Objectif** : créer un brouillon SPOGOMI, importer un roster minimal, prévisualiser/corriger les équipes, verrouiller la composition et rattacher un GPX officiel
- **Données affichées** : roster nominatif, groupes, équipes, état de composition et parcours officiel ; jamais exposés sur une surface publique
- **Provenance GPX** : `official_reference`, distance calculée de référence uniquement ; aucune assimilation à une trace terrain observée
- **États et erreurs** : événement introuvable, accès refusé, fichier malformé/trop volumineux, colonnes obligatoires manquantes, doublons probables, équipes incomplètes et verrouillage refusé
- **Limites** : pas de formulaire sportif, barème, arbitrage, consolidation, export final ou gamification dans ce lot

La source métier détaillée reste [`documentation/features/spogomi.md`](../../../../features/spogomi.md) ; les contrats AuthN/AuthZ et Supabase restent dans leurs domaines spécialisés.
