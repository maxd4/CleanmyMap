# Gestion SPOGOMI

## Fiche canonique

- **Route** : `/spogomi/[eventSlug]/gestion`
- **Source** : `apps/web/src/app/(app)/spogomi/[eventSlug]/gestion/page.tsx`
- **Type fonctionnel** : cockpit privé de préparation
- **Famille / bloc fonctionnel** : Agir
- **Statut** : CURRENT — lot 5, prolongement des services des lots 2 à 4
- **Accès / SEO** : `protected` ; session puis relation organisateur canonique vérifiée côté serveur ; `NOINDEX`, `INTERNAL_ONLY`, `NONE`
- **Parcours réutilisés** : consultation/publication de l'événement, import CSV/XLSX, composition et verrouillage des équipes, liens de saisie révocables par équipe, revue et certification des versions, consultation et rattachement du GPX officiel, aperçu et publication explicite du bilan environnemental dans l'action cible
- **Confidentialité** : roster et opérations restent dans les routes API protégées ; aucun rôle global ni paramètre client ne suffit
- **Limites** : aucune création d'action par équipe, aucun transfert vers `public.forms` ou la gamification, aucune publication automatique de l'action ; l'aperçu bloque les catégories ou mesures sans correspondance et les règles sportives restent bloquées tant que le règlement n'est pas complet

La route serveur `GET|POST /api/spogomi/events/[eventId]/consolidation` est
réservée à l'organisateur authentifié, limitée en débit et sépare l'aperçu de
la publication. La publication exige le hash de l'aperçu courant. Elle écrit
une projection versionnée dans l'action déjà liée à l'événement ; une
correction remplace la projection courante et conserve la version précédente.

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
