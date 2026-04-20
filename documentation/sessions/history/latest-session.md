# Latest Session

Updated: 2026-04-20

## Done
- **Messagerie PRO** : Implémentation du `ChatShell` (DMs, Mentions `@user`, Salons Régionaux par voisinage).
- **Notifications In-App** : Création de la "Centrale App" (`NotificationBell`) intégrant tous les types d'alertes et supprimant les emails automatiques (Sobriété Numérique).
- **Retour Haptique** : Ajout de vibrations (standards et succès majeurs) pour améliorer l'expérience mobile-first.
- **Sécurité Hardening** : API rate-limiting (quotas de messages), standardisation des erreurs 401/403 et isolation des rôles (Admins, Élus, Coordinateurs).
- **Rétention de Données** : Procédure SQL de purge automatique (messages 6 mois, médias 1 mois).
- **Newsletter** : Table de souscription Supabase et API opt-in fonctionnelle.
- **Gamification** : Logique de détection de "Level Up" et notifications d'engagement automatiques.
- **Profils** : Synchronisation des `@handle` uniques depuis Clerk vers Supabase avec support de modification.

## In Progress
- Intégration API Cleanwalk.org (Message type envoyé, en attente de réponse).

## Next
- Finaliser le Dashboard de pilotage Administrateur avec les vues "Gouvernance".
- Enrichir le mode "Science" avec les formules de calcul d'impact affichées en tooltips.
- Validation finale du parcours utilisateur "Mobilisation" avec les nouveaux outils de chat.

## Risks
- Aucun risque identifié ; l'architecture de messagerie respecte les quotas de la base gratuite grâce au système de pruning.
