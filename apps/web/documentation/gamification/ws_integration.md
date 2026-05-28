How to run the lightweight WebSocket relay

1. Start relay locally:
   - Set env: DATABASE_URL=postgres://... PORT=8080
   - From apps/web: node tools/gamification-ws-server.js

2. Configure frontend:
   - Set NEXT_PUBLIC_GAMIFICATION_WS to ws://localhost:8080
   - Add <UseGamificationRealtime /> at top-level of your app (e.g., in layout) to show toasts.

3. Supabase/production:
   - Deploy relay on a small instance, ensure it can reach your DB.
   - Alternatively wire Supabase Realtime to forward NOTIFY events to your clients.

Client hook:
- src/hooks/useGamificationRealtime.tsx — connects to WS and renders GamificationToast on events.

Server:
- tools/gamification-ws-server.js — simple pg LISTEN + ws broadcast.
