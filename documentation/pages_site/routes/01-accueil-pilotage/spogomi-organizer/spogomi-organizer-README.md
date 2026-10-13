# Espace organisateur SPOGOMI

## Fiche canonique

- **Route** : `/dashboard/spogomi`
- **Source** : `apps/web/src/app/(app)/dashboard/spogomi/page.tsx`
- **Type fonctionnel** : cockpit privé de création et de préparation
- **Famille / bloc fonctionnel** : Agir
- **Accès / SEO** : `protected` ; `NOINDEX`, `INTERNAL_ONLY`, `NONE`
- **Autorisation** : la page transmet uniquement les événements acceptés par `canManageEvent`, les relations `action_organizers` et les contrôles d'identité existants ; un rôle ou un identifiant client isolé ne suffit pas
- **Création** : le formulaire appelle exclusivement `POST /api/spogomi/events`, conserve la même clé d'idempotence et le même payload pour une nouvelle tentative de la même intention jusqu'à confirmation du serveur, réinitialise le formulaire uniquement après succès, transmet les dates saisies par l'utilisateur et laisse l'événement privé par défaut côté serveur
- **Catalogue** : les comptes ordinaires sont recherchés par créateur et relations `action_organizers`, avec déduplication, pagination bornée et vérification finale `canManageEvent` ; `ACTIVE_ROLE=admin|max` conserve le catalogue global paginé
- **Navigation** : « Gérer cette compétition » est affiché seulement pour les événements autorisés ; « Voir la page publique » seulement pour un événement effectivement publié ; le retour vers `/spogomi` reste disponible
- **Confidentialité** : les brouillons et événements privés ne sont jamais énumérés sur `/spogomi` ; les liens temporaires de saisie équipe restent dans le cockpit de gestion et utilisent la session HttpOnly existante
- **Limites** : aucune publication automatique, aucun changement RLS/AuthZ, aucune date éditoriale inventée et aucun token de saisie équipe n'est ajouté au catalogue public
