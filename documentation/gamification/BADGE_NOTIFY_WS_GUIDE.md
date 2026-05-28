Guide: Ajouter un badge, émettre NOTIFY et intégrer WS relay

1) Définir le badge
- Ajouter une entrée dans le badge list API (`apps/web/src/app/api/gamification/badges/list/route.ts`).
- Utiliser une structure extensible: { id, name/label, description, threshold, iconVariant, visualVariant, tooltip }

2) Attribuer XP
- Lorsque le badge est franchi, insérer une ligne dans `progression_events` (best-effort) et appeler `auditXpAttribution(supabase, userId, actorId, reason, xpChange, source_table, source_id, metadata)` pour garder un journal.
- Mettre `xp_base` et `xp_awarded` à la valeur voulue (ici 1 par palier).
- Pour éviter doublons en cas de race, la migration `20260528000100_add_unique_progression_event_source.sql` ajoute un index unique sur (user_id, source_table, source_id).

3) Emettre NOTIFY
- Créer la fonction RPC `notify_gamification` (migrations/20260528000101_add_notify_function.sql).
- Appeler `supabase.rpc('notify_gamification', { channel: 'gamification', payload: JSON.stringify(payload) })` après insertion pour prévenir les listeners.

4) WebSocket relay
- Fournir un petit service Node.js `apps/web/tools/gamification-ws-server.js` qui se connecte à la DB et exécute `LISTEN gamification` et broadcast via WebSocket.
- Alternativement, utiliser Supabase Realtime if available.

5) Frontend
- Hook `src/hooks/useGamificationRealtime.tsx` et component `src/components/gamification/GamificationToast.tsx` montrent des toasts.

6) Tests
- Ajouter tests unitaires pour: badge unlocking logic, audit writing, and NOTIFY emission (mocking supabase rpc).

7) Déploiement
- Déployer migrations d'abord, puis lancer le relay sur un petit service capable d'ouvrir une connexion persistante à la DB.

Notes
- Keep notifications best-effort: do not block user-facing API on audit/rpc failures.
- Use RLS and service_role for writes to progression_events and xp_audit.
