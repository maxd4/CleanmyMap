# Gestion SPOGOMI

## Fiche canonique

- **Route** : `/spogomi/[eventSlug]/gestion`
- **Source** : `apps/web/src/app/(app)/spogomi/[eventSlug]/gestion/page.tsx`
- **Type fonctionnel** : cockpit privé de préparation
- **Famille / bloc fonctionnel** : Agir
- **Statut** : CURRENT — lot 4, prolongement des services des lots 2 et 3
- **Accès / SEO** : `protected` ; session puis relation organisateur canonique vérifiée côté serveur ; `NOINDEX`, `INTERNAL_ONLY`, `NONE`
- **Parcours réutilisés** : consultation/publication de l'événement, import CSV/XLSX, composition et verrouillage des équipes, liens de saisie révocables par équipe, revue et certification des versions, consultation et rattachement du GPX officiel
- **Confidentialité** : roster et opérations restent dans les routes API protégées ; aucun rôle global ni paramètre client ne suffit
- **Limites** : pas de consolidation collective CleanMyMap, projection publique des résultats ni export métier ; les règles sportives restent bloquées tant que le règlement n'est pas complet

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
