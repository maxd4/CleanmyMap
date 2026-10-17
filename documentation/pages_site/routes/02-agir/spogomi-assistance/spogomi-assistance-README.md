# Assistance de rattachement SPOGOMI

## Fiche canonique

- **Route canonique** : `/spogomi/assistance`
- **Source** : `apps/web/src/app/(app)/spogomi/assistance/page.tsx`
- **Type fonctionnel** : parcours privé d'assistance sur invitation
- **Famille / bloc fonctionnel** : Agir
- **Statut** : CURRENT — rattachement d'une identité à une participation sur invitation
- **Accès / SEO** : `protected` ; `NOINDEX`, `INTERNAL_ONLY`, `NONE` ; la présence d'un `eventId` ou d'un token dans l'URL ne constitue pas une autorisation
- **Parcours** : la page transmet l'invitation bornée au composant d'assistance, qui réutilise les contrôles de session, de token et d'autorisation du contrat SPOGOMI côté serveur
- **Données** : identifiant d'événement et token d'invitation fournis par le parcours d'invitation ; aucune liste publique de participants n'est exposée
- **Limites** : la route ne crée pas de nouvelle identité, ne contourne pas l'AuthN/AuthZ et ne transforme pas un paramètre d'URL en preuve d'accès ; les demandes et leur état restent gouvernés par les routes API dédiées

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
