# ADR-001 : Choix de Clerk pour l'authentification

*   **Statut** : Accepté
*   **Date** : 20 avril 2026

## Contexte
L'application CleanMyMap nécessite une gestion d'identité robuste incluant :
- Authentification sociale (Google, GitHub).
- Gestion des sessions sécurisée (JWT, rotation).
- Composants UI prédéfinis pour le profil et l'onboarding.
- Possibilité d'évolution vers une gestion par organisations (Collectivités, Entreprises).

## Décision
Nous avons choisi **Clerk** comme fournisseur d'identité principal plutôt que Supabase Auth ou NextAuth.

**Raisonnement :**
1.  **DX (Developer Experience)** : Les composants UI de Clerk (`<UserButton />`, `<SignIn />`) permettent d'économiser des semaines de développement.
2.  **Modularité** : Clerk gère l'identité (AuthN), tandis que Supabase gère les données. Cette séparation évite le verrouillage complet sur l'écosystème Supabase.
3.  **Sécurité** : Clerk offre une protection native contre les attaques par force brute et une gestion fine des tokens.

## Conséquences
- **Synchronisation** : Nécessité de synchroniser les métadonnées utilisateurs vers une table `profiles` dans Supabase pour permettre les jointures SQL performantes (implémenté via `syncClerkUserToSupabase`).
- **Coût** : Dépendance à un service SaaS tiers payant au-delà du free tier.
- **Middleware** : Utilisation obligatoire de `clerkMiddleware()` pour protéger les routes.
