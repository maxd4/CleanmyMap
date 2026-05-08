-- 20260501000022_performance_optimization_indexes.sql
-- Index supplémentaires pour optimiser les requêtes fréquentes

-- === PROFILES ===
-- Optimise les requêtes par rôle (admin, elu, coordinador)
-- Utilisé dans role-management.ts: .in("role_label", ["admin", "elu"])
CREATE INDEX IF NOT EXISTS idx_profiles_role_label ON public.profiles(role_label);

-- === ACTIONS ===
-- Optimise les filtres combinés status + date (tableaux de bord)
-- Courant dans les requêtes de pilotage avec status + floorDate
CREATE INDEX IF NOT EXISTS idx_actions_status_date ON public.actions(status, action_date DESC);

-- Optimise les recherches par géométrie (cartes avec filtres)
-- Utilisé dans unified-source.ts pour requireCoordinates=true
CREATE INDEX IF NOT EXISTS idx_actions_derived_geometry_kind ON public.actions(derived_geometry_kind) WHERE derived_geometry_kind IS NOT NULL;

-- === SPOTS ===
-- Optimise les filtres combinés status + date
CREATE INDEX IF NOT EXISTS idx_spots_status_created_at ON public.spots(status, created_at DESC);

-- === APP_MESSAGES ===
-- Optimise les requêtes par type de channel (DM, neighborhood, governance)
-- Utilisé pour les onglets de chat
CREATE INDEX IF NOT EXISTS idx_messages_channel_type ON public.app_messages(channel_type);

-- === COMMUNITY_EVENTS ===
-- Optimise les requêtes par date d'événement
CREATE INDEX IF NOT EXISTS idx_community_events_event_date ON public.community_events(event_date);

-- === PROGRESSION_EVENTS ===
-- Optimise les requêtes de gamification par statut
CREATE INDEX IF NOT EXISTS idx_progression_events_status_phase ON public.progression_events(status_phase) WHERE status_phase = 'validated';

-- === NEWSLETTER ===
-- Optimise les requêtes par statut (active/inactive)
DO $$
BEGIN
  IF to_regclass('public.newsletter_subscriptions') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_newsletter_status ON public.newsletter_subscriptions(status)';
  END IF;
END $$;
