# Démonstration SPOGOMI Cachan

## Fiche canonique

- **Route** : `/spogomi/demonstration/cachan`
- **Source** : `apps/web/src/app/(app)/spogomi/demonstration/cachan/page.tsx`
- **Type fonctionnel** : démonstration publique en lecture seule
- **Famille / bloc fonctionnel** : Agir
- **Statut** : CURRENT — fixture documentaire mixed Cachan
- **Accès / SEO** : `public-visible` ; `NOINDEX`, `INTERNAL_ONLY`, `NONE`
- **Provenance** : la page lit le manifeste historique `scenario_cachan_cleanmymap_mixed.json` et son extension additive `scenario_cachan_cleanmymap_mixed_closure_SYNTHETIQUE.json` via la projection typée `apps/web/src/lib/spogomi/cachan-closure.ts`. Elle affiche deux divisions, onze équipes, 37 places, une chronologie fictive, des classements indépendants et un bilan environnemental dérivé avec le marqueur `DEMONSTRATION / NON OFFICIEL`.
- **Limites** : aucun événement, action, participant, mesure, statistique environnementale, classement officiel, gamification ou historique Supabase n'est créé ou consulté. Les présences, résultats, comptages directs de mégots et mesures ajoutées sont synthétiques ; les scores affichés sont des résultats de calcul de simulation et non des résultats sportifs certifiés.
- **Sécurité** : la route est publique parce qu'elle ne contient aucune donnée personnelle ni donnée persistée ; elle ne remplace ni le catalogue des éditions publiées ni le parcours privé organisateur.

Le contrat métier est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
