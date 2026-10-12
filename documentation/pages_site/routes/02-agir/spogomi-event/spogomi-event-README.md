# Événement SPOGOMI

## Fiche canonique

- **Route** : `/spogomi/[eventSlug]`
- **Source** : `apps/web/src/app/(app)/spogomi/[eventSlug]/page.tsx`
- **Type fonctionnel** : fiche publique d'événement
- **Famille / bloc fonctionnel** : Agir
- **Statut** : CURRENT — lot 3
- **Accès / SEO** : `public-visible` uniquement pour une publication explicite ; un slug privé ou absent est indistinguable et non indexé
- **Identifiant** : `spogomi_events.event_slug`, stable, normalisé et unique ; il n'est pas régénéré lors d'un changement de nom
- **Données** : informations pratiques publiées, noms publics d'équipe, parcours `official_reference` et lien vers l'action CleanMyMap publiée si disponible
- **Confidentialité** : aucune ligne nominative, email, token, liaison de compte ou mesure privée
- **Limites** : les classements, résultats, mégots par participant et consolidations restent réservés aux lots suivants

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
