# Saisie équipe SPOGOMI

## Fiche canonique

- **Route** : `/spogomi/[eventSlug]/equipe`
- **Source** : `apps/web/src/app/(app)/spogomi/[eventSlug]/equipe/page.tsx`
- **Type fonctionnel** : formulaire privé partenaire par équipe
- **Famille / bloc fonctionnel** : Agir
- **Statut** : CURRENT — lot 4
- **Accès / SEO** : session établie par lien d'invitation opaque ; `NOINDEX`, sans accès inter-équipe et sans compte CleanMyMap obligatoire
- **Données** : quantité par unité réglementaire, grammes, comptage direct optionnel, méthode, provenance et commentaire d'arbitrage
- **Workflow** : brouillon, soumission, correction versionnée ; la certification reste réservée à la revue organisateur/arbitre
- **Confidentialité** : le token brut n'est pas stocké ; la session HttpOnly est limitée à l'événement et à l'équipe ; révocation et rate limiting sont actifs
- **Limites** : aucun classement officiel sans règlement complet ; aucune conversion masse → mégots ; aucune écriture dans `public.forms`, la gamification ou le bilan collectif

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
