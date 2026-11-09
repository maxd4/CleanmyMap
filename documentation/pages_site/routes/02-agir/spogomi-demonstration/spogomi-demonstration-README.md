# Démonstration SPOGOMI Cachan

## Fiche canonique

- **Route** : `/spogomi/demonstration/cachan`
- **Source** : `apps/web/src/app/(app)/spogomi/demonstration/cachan/page.tsx`
- **Type fonctionnel** : démonstration publique en lecture seule
- **Famille / bloc fonctionnel** : Agir
- **Statut** : CURRENT — fixture documentaire mixed Cachan
- **Accès / SEO** : `public-visible` ; `NOINDEX`, `INTERNAL_ONLY`, `NONE`
- **Provenance** : la page lit `documentation/features/spogomi-references/fixtures/scenario_cachan_cleanmymap_mixed.json`, source unique du scénario. Elle affiche deux divisions, onze équipes et 37 places avec le marqueur `DEMONSTRATION / NON OFFICIEL`.
- **Limites** : aucun événement, action, participant, mesure, statistique environnementale, classement officiel, gamification ou historique Supabase n'est créé ou consulté. Les scores affichés sont des valeurs attendues de simulation et non des résultats sportifs.
- **Sécurité** : la route est publique parce qu'elle ne contient aucune donnée personnelle ni donnée persistée ; elle ne remplace ni le catalogue des éditions publiées ni le parcours privé organisateur.

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
