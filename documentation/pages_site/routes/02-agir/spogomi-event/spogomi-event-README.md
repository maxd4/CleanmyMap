# Événement SPOGOMI

## Fiche canonique

- **Route** : `/spogomi/[eventSlug]`
- **Source** : `apps/web/src/app/(app)/spogomi/[eventSlug]/page.tsx`
- **Type fonctionnel** : fiche publique d'événement
- **Famille / bloc fonctionnel** : Agir
- **Statut** : CURRENT — lot 3
- **Accès / SEO** : `public-visible` uniquement pour une publication explicite ; un slug privé ou absent est indistinguable et non indexé
- **Identifiant** : `spogomi_events.event_slug`, stable, normalisé et unique ; il n'est pas régénéré lors d'un changement de nom
- **Données** : informations pratiques publiées, noms publics d'équipe, parcours `official_reference`, deux projections de classement indépendantes lorsqu'elles sont publiées, bilan environnemental certifié si l'action cible est publiée et lien vers cette action si disponible
- **Confidentialité** : aucune ligne nominative, email, token, liaison de compte ou mesure privée
- **Publication des résultats** : `spogomi_events.public_results_visibility` borne la vue publique (`hidden`, `provisional`, `certified`). Le classement sportif exige un règlement complet et une projection officielle ; le classement mégots utilise uniquement les comptages directs et les présences vérifiées. Une masse seule reste non comparable.
- **Rafraîchissement** : la fiche charge une projection serveur bornée et son bloc de résultats peut être actualisé manuellement ou au plus toutes les 60 secondes ; aucun roster nominatif ne quitte le serveur.

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
