# SQL injection hardening audit

Ce document resume le gros travail de durcissement realise sur les routes API, les filtres et les usages Supabase du projet.

## Perimetre audite

- Formulaires publics et routes associees
  - newsletter
  - contact / envoi d'email
  - onboarding partenaire
  - bug reports
  - promotion requests
  - community events et RSVPs
- Espace membre et profil
  - handle
  - display name mode
  - notifications
  - chat users
- Espace admin / creator
  - moderation
  - operations
  - creator inbox
  - partner published directory
- Recherche, filtres et exports
  - actions
  - actions/map
  - pilotage overview
  - reports CSV / JSON
  - community funnel CSV
- Services techniques
  - health
  - cron routes
  - Stripe webhook
  - documentation downloads

## Constat

- Aucun SQL brut concatene a partir d'une entree utilisateur n'a ete trouve dans les routes auditees.
- Les appels Supabase utilisaient deja le query builder typise, donc les valeurs utilisateur passaient comme donnees et non comme commandes.
- Le risque principal etait ailleurs:
  - messages d'erreur bruts renvoyes au client
  - parametres de recherche trop libres
  - quelques filtres/paginations sans bornage explicite
  - sorties diagnostiques trop bavardes

## Corrections appliquees

- Remplacement des retours `error.message` par des erreurs utilisateur neutres sur les routes exposees.
- Sanitisation des exports et diagnostics pour eviter les fuites de structure DB ou d'infra.
- Bornage de quelques parametres d'URL:
  - `q` tronque sur `chat/users`
  - `q` tronque sur `admin/role-accounts`
  - `limit` borne sur `partners/onboarding-requests`
- Verification des schemas serveur Zod sur les routes qui recoivent du JSON.
- Confirmation que les routes sensibles utilisent des helpers Supabase server-side:
  - `getSupabaseServerClient()`
  - `getSupabaseAdminClient()`
  - `getSupabaseClerkRlsClient()`

## Fichiers modifies

- [apps/web/src/app/api/chat/users/route.ts](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/api/chat/users/route.ts)
- [apps/web/src/app/api/community/rsvps/route.ts](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/api/community/rsvps/route.ts)
- [apps/web/src/app/api/admin/moderation/route.ts](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/api/admin/moderation/route.ts)
- [apps/web/src/app/api/send/route.ts](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/api/send/route.ts)
- [apps/web/src/app/api/health/route.ts](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/api/health/route.ts)
- [apps/web/src/app/api/stripe/webhook/route.ts](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/api/stripe/webhook/route.ts)
- [apps/web/src/app/api/reports/actions.csv/route.ts](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/api/reports/actions.csv/route.ts)
- [apps/web/src/app/api/reports/actions.json/route.ts](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/api/reports/actions.json/route.ts)
- [apps/web/src/app/api/reports/elus-dossier/route.ts](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/api/reports/elus-dossier/route.ts)
- [apps/web/src/lib/http/api-errors.ts](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/http/api-errors.ts)
- [apps/web/src/lib/supabase/server.ts](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/supabase/server.ts)

## Tests et verification

- `npm run typecheck`
- `npm run build`
- `npm run test -- src/app/api/chat/users/route.test.ts src/app/api/community/rsvps/route.test.ts src/app/api/admin/moderation/route.test.ts`
- `npm run test -- src/app/api/public-form-security.test.ts src/app/api/send/route.test.ts`

## Requetes surees confirmees

- Les requetes utilisent le query builder Supabase, pas des chaines SQL construites a la main.
- Les filtres dynamiques restent limites a des valeurs autorisees:
  - status
  - scope
  - type
  - limit
  - days
- Les recherches passent par `ilike()` avec une valeur echappee pour le pattern, jamais par une colonne ou clause libre fournie par l'utilisateur.
- Les webhooks et exports renvoient maintenant des erreurs neutres cote client.

## Erreurs utilisateur

- Les payloads invalides repondent avec une erreur controlee.
- Les messages exposees au navigateur ne contiennent plus:
  - schema SQL
  - nom de table
  - nom de colonne
  - stack trace
  - secret ou message d'infra brut

## Points a surveiller

- Les logs serveur conservent encore les details techniques pour le debug.
- Certains endpoints de diagnostic restent volontairement plus verbeux cote serveur.
- Si une nouvelle route introduit un tri dynamique, il faut imposer une whitelist explicite avant le merge.
- Si un nouveau flux admin utilise le service role Supabase, il faut verifier le chemin RLS et la portee du token avant publication.
