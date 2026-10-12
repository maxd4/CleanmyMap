# Gestion SPOGOMI

## Fiche canonique

- **Route** : `/spogomi/[eventSlug]/gestion`
- **Source** : `apps/web/src/app/(app)/spogomi/[eventSlug]/gestion/page.tsx`
- **Type fonctionnel** : cockpit privé de préparation
- **Famille / bloc fonctionnel** : Agir
- **Statut** : CURRENT — lot 3, prolongement des services du lot 2
- **Accès / SEO** : `protected` ; session puis relation organisateur canonique vérifiée côté serveur ; `NOINDEX`, `INTERNAL_ONLY`, `NONE`
- **Parcours réutilisés** : consultation/publication de l'événement, import CSV/XLSX, composition et verrouillage des équipes, consultation et rattachement du GPX officiel
- **Confidentialité** : roster et opérations restent dans les routes API protégées ; aucun rôle global ni paramètre client ne suffit
- **Limites** : pas de pesée, arbitrage, certification, consolidation finale ni export métier

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
