# Organisations entreprise — CURRENT

État de réception au 28 novembre 2026 : le code décrit dans les deux premiers paragraphes est un candidat local non publié. La migration `20261128000002` n’est pas appliquée au projet Supabase lié; les preuves pgTAP et navigateur éphémères restent en attente. Ne pas interpréter ce document comme preuve de disponibilité en production.

## Accès et parcours

Un compte Clerk avec une adhésion active ou une invitation valide voit l’accès « Espace entreprise » depuis `/dashboard` et l’onglet organisation de `/sponsor-portal`, quel que soit son rôle actif. Ce rôle reste une préférence de parcours; l’autorisation vient de l’adhésion serveur. Les routes `/api/organizations` et `/api/reports/organization` dérivent l’acteur de la session, refusent les scopes étrangers et retournent des réponses privées `no-store`.

Le bootstrap d’organisation reste réservé à l’administration. La page privée `/admin/organizations` présente les demandes acceptées non encore activées, le compte déposant et l’identité légale déclarée; l’administrateur confirme le contrôle du mandat et saisit la référence d’organisateur. L’API résout cette référence dans l’annuaire, exige l’égalité exacte avec `legal_identity` et l’existence du compte Clerk avant d’attribuer le premier rôle owner. La file SQL est bornée, sans accès navigateur, et ne transmet pas d’identifiant Clerk brut à l’interface.

## Équipe et opérations disponibles

Les membres actifs autorisés voient une projection minimisée de l’équipe. La route leur sert uniquement le roster et l’identité minimale de leur propre adhésion; elle ne leur ouvre ni actions, sites, campagnes ou bilans réservés aux autres rôles. Cette voie passe par la nouvelle RPC serveur, pas par la RPC workspace qui refuse le rôle `member`. Le roster n’expose aucun identifiant Clerk brut; le owner voit aussi ses invitations non expirées. L’invitation part d’une adresse email vérifiée et est résolue côté serveur après vérification du rôle owner; le navigateur ne fournit jamais l’identifiant Clerk à la RPC. Un membre peut accepter/refuser sa propre invitation et quitter l’organisation. Les actions et bilans restent réservés aux rôles explicitement autorisés par leurs RPC existantes. Le owner peut inviter/révoquer, transférer la responsabilité à un gestionnaire actif et gérer les sites/campagnes. Le dernier owner ne peut ni transférer sa responsabilité sans successeur valide ni quitter l’organisation.

Un gestionnaire de site reste limité à son site. Les actions restent gérées par leur créateur/organisateur; le rattachement exige la référence d’organisateur exacte et ne rend pas publique une action privée. Les campagnes référencent les actions existantes sans les copier. Le bilan privé conserve ses scopes serveur, son plafond de 500 actions, ses agrégats à couverture explicite et son CSV minimal; aucun PDF privé, historique privé ou certificat n’est exposé.

## Limites de cycle de vie et preuves

- Les comptes Clerk supprimés sont signalés comme indisponibles dans l’interface de revue du mandat et ne peuvent pas être activés. Les identités d’adhésions existantes qui changent après bootstrap ne sont pas encore réconciliées automatiquement; les propriétaires peuvent révoquer une adhésion affichée.
- Une organisation suspendue est refusée par les lectures et mutations métier; une surface administrateur pour visualiser l’état suspendu et réactiver une organisation n’est pas disponible.
- La correction/déconnexion auditée d’une action, l’annulation d’association campagne-action, l’historique et le PDF privé ne sont pas disponibles.
- Les challenges restent `PLAN` tant qu’un besoin distinct des campagnes et une décision produit ne sont pas établis. Les extensions commerciales, la certification ESG et le reporting CSRD automatique restent hors périmètre.
- Les tests API/Vitest et la preuve PostgreSQL éphémère de cette intégration sont documentés par leurs SHA et nombres d’assertions uniquement après exécution du candidat publié. Aucun test mutatif n’est lancé sur la base liée ou en production.
