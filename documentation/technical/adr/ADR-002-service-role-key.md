# ADR-002 : Utilisation du Service Role Key Supabase côté serveur

*   **Statut** : Accepté
*   **Date** : 20 avril 2026

## Contexte
CleanMyMap effectue des opérations administratives et des synchronisations complexes (ex: Google Sheets vers Supabase, calculs d'impact agrégés) qui nécessitent de manipuler plusieurs tables sans les restrictions imposées par le Row Level Security (RLS) orienté utilisateur final.

## Décision
Utiliser la `SUPABASE_SERVICE_ROLE_KEY` exclusivement sur le serveur (via `getSupabaseServerClient()`).

**Raisonnement :**
1.  **Flexibilité** : Permet d'effectuer des jointures et des écritures complexes sans multiplier les politiques RLS difficiles à tester.
2.  **Sécurité par encapsulation** : La sécurité n'est pas déléguée à la base de données (RLS) mais à la couche applicative (Route Handlers). Le code vérifie l'identité via Clerk avant d'utiliser le client Supabase.
3.  **Isolation** : La clé n'est jamais exposée au navigateur (`NEXT_PUBLIC_`), garantissant qu'aucune manipulation non autorisée ne peut être faite depuis le client.

## Conséquences
- **Audit obligatoire** : Chaque route API doit implémenter ses propres "guards" (`requireAdminAccess`, `requireAuthenticatedAccess`) car la base de données ne bloquera rien.
- **Vigilance** : Risque critique en cas d'injection SQL ou de faille dans la logique de validation. Hardening implémenté via `isSupabaseConfigured` et validations Zod.
