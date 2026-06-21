# Vérification sécurité après optimisations Vercel

Dernière vérification: 2026-06-16

Périmètre contrôlé:
- appels Supabase côté client
- exposition de `service_role`
- permissions des RPC publiques
- protection des routes Clerk / middleware
- auth involontaire sur les pages publiques

## Conclusion

Sur les surfaces modifiées par la réduction Vercel, je n’ai pas identifié de régression de sécurité dans le code relu et les tests ciblés.

## Contrôles et résultats

| Contrôle | Résultat | Preuve |
| --- | --- | --- |
| Appels Supabase côté client | Conforme | Le client navigateur utilise `getSupabaseBrowserClient`, qui prend l’`NEXT_PUBLIC_SUPABASE_ANON_KEY` et non la clé `service_role`. Les appels client observés restent bornés à des fonctions RPC ou à des tables déjà protégées par RLS. |
| `service_role` côté client | Conforme | Aucune lecture de `SUPABASE_SERVICE_ROLE_KEY` n’a été trouvée dans les composants client. Les usages de `getSupabaseServerClient(true)` restent côté serveur ou route protégée. |
| RPC `action_pollution_score_references` | Conforme | La migration définit `security invoker`, `set search_path = pg_catalog`, puis `grant execute ... to public`. La fonction ne renvoie qu’un agrégat sur `public.actions` et ne publie pas de données unitaires. |
| RPC carte `actions_map_feed` | Conforme | La migration garde `security invoker`, limite la requête, et expose `grant execute ... to anon, authenticated, service_role`. Les filtres et la borne restent appliqués dans la fonction. |
| Données privées utilisateur | Conforme | Le stockage local ajouté pour la progression quiz n’écrit que des compteurs par type de question. Les données privées persistées côté serveur restent dans les tables RLS et les routes protégées. |
| Routes protégées | Conforme | Le proxy conserve les route patterns protégés, et les tests valident que `/learn` et `/actions/map` ne font pas partie du matcher protégé. Le header `x-cleanmymap-protected-route` n’est injecté que par le proxy. |
| Pages publiques sans auth inutile | Conforme | Les pages publiques de lecture s’appuient sur `getServerLocale()` / préférences, pas sur `auth()`. L’auth Clerk reste conditionnée aux routes protégées dans `app/layout.tsx`. |

## Fichiers vérifiés

- [apps/web/src/proxy.ts](../../apps/web/src/proxy.ts)
- [apps/web/src/app/layout.tsx](../../apps/web/src/app/layout.tsx)
- [apps/web/src/components/actions/map/action-pollution-score-references-context.tsx](../../apps/web/src/components/actions/map/action-pollution-score-references-context.tsx)
- [apps/web/src/lib/actions/pollution-score-references.ts](../../apps/web/src/lib/actions/pollution-score-references.ts)
- [apps/web/src/lib/supabase/client.ts](../../apps/web/src/lib/supabase/client.ts)
- [apps/web/src/lib/gamification/api.ts](../../apps/web/src/lib/gamification/api.ts)
- [apps/web/src/lib/gamification/quiz-progress-storage.ts](../../apps/web/src/lib/gamification/quiz-progress-storage.ts)
- [apps/web/src/lib/services/quiz-srs-service.ts](../../apps/web/src/lib/services/quiz-srs-service.ts)
- [apps/web/src/app/api/gamification/quiz/progress/route.ts](../../apps/web/src/app/api/gamification/quiz/progress/route.ts)
- [apps/web/supabase/migrations/20260402000001_initial_modern_schema.sql](../../apps/web/supabase/migrations/20260402000001_initial_modern_schema.sql)
- [apps/web/supabase/migrations/20260602000001_action_pollution_score_references_rpc.sql](../../apps/web/supabase/migrations/20260602000001_action_pollution_score_references_rpc.sql)
- [apps/web/supabase/migrations/20260612000002_actions_map_feed_rpc.sql](../../apps/web/supabase/migrations/20260612000002_actions_map_feed_rpc.sql)
- [apps/web/supabase/migrations/20260427000019_quiz_srs.sql](../../apps/web/supabase/migrations/20260427000019_quiz_srs.sql)

## Tests exécutés

- `npm run test -w apps/web -- src/lib/supabase/function-permissions.test.ts src/proxy.protected-routes.test.ts src/proxy.app-shell.test.ts src/lib/actions/pollution-score-references.test.ts src/components/actions/map/action-pollution-score-references-context.test.tsx src/lib/gamification/quiz-progress.test.ts src/app/api/api-boundary.test.ts`

## Notes de maintien

- La RPC de score carte reste publique parce qu’elle est read-only, invoker, et bornée à un agrégat.
- Les données de quiz ajoutées au localStorage ne doivent pas être utilisées comme source d’autorité serveur.
- Si une nouvelle optimisation Vercel ajoute un accès Supabase côté client, il faut vérifier en priorité la policy RLS et le niveau de grant de la RPC.
