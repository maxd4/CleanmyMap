import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

function readMigration(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

it("restricts mission distance computation to the service role", () => {
  const migration = readMigration("../../../supabase/migrations/20260506000024_companion_gps_schema.sql");

  expect(migration).toContain("security invoker");
  expect(migration).toContain("revoke all on function public.compute_mission_distance(uuid) from public;");
  expect(migration).toContain("grant execute on function public.compute_mission_distance(uuid) to service_role;");
});

it("limits chat notification RPCs to the service role", () => {
  const migration = readMigration("../../../supabase/migrations/20260507000025_chat_notifications_rpc.sql");

  expect(migration).toContain("security invoker");
  expect(migration).toContain(
    "revoke all on function public.create_chat_notifications_for_message(uuid) from public;",
  );
  expect(migration).toContain(
    "grant execute on function public.create_chat_notifications_for_message(uuid) to service_role;",
  );
  expect(migration).toContain(
    "revoke all on function public.can_profile_view_territory_message(text, integer) from public;",
  );
});

it("keeps the discussion quota RPC on invoker permissions", () => {
  const migration = readMigration("../../../supabase/migrations/20260419000004_community_rate_limit.sql");

  expect(migration).toContain("security invoker");
  expect(migration).toContain(
    "revoke all on function public.reserve_community_message_slot(text, text) from public;",
  );
  expect(migration).toContain(
    "grant execute on function public.reserve_community_message_slot(text, text) to service_role;",
  );
});

it("keeps community event notification selection on restricted RPC permissions", () => {
  const migration = readMigration("../../../supabase/migrations/20260625000002_optimize_community_event_profile_notifications.sql");

  expect(migration).toContain("create index if not exists idx_profiles_zone_name_normalized");
  expect(migration).toContain("create or replace function public.load_community_event_notification_profiles(");
  expect(migration).toContain("security invoker");
  expect(migration).toContain("set search_path = pg_catalog");
  expect(migration).toContain(
    "revoke all on function public.load_community_event_notification_profiles(text, integer[], text[]) from public;",
  );
  expect(migration).toContain(
    "grant execute on function public.load_community_event_notification_profiles(text, integer[], text[]) to service_role;",
  );
});

it("keeps community participation summary RPCs restricted to the service role", () => {
  const migration = readMigration("../../../supabase/migrations/20260627000005_community_participation_summary_rpcs.sql");

  expect(migration).toContain("create or replace function public.load_community_event_rsvp_summaries(");
  expect(migration).toContain("create or replace function public.load_action_participant_summaries(");
  expect(migration).toContain("security invoker");
  expect(migration).toContain("set search_path = pg_catalog");
  expect(migration).toContain(
    "revoke all on function public.load_community_event_rsvp_summaries(uuid[], text) from public;",
  );
  expect(migration).toContain(
    "grant execute on function public.load_community_event_rsvp_summaries(uuid[], text) to service_role;",
  );
  expect(migration).toContain(
    "revoke all on function public.load_action_participant_summaries(uuid[], text) from public;",
  );
  expect(migration).toContain(
    "grant execute on function public.load_action_participant_summaries(uuid[], text) to service_role;",
  );
});

it("keeps profile helper functions executable without public access", () => {
  const migration = readMigration("../../../supabase/migrations/20260428000020_chat_channels_profiles.sql");

  expect(migration).toContain("security invoker");
  expect(migration).toContain("revoke all on function public.current_profile_role_label() from public;");
  expect(migration).toContain("grant execute on function public.current_profile_role_label() to authenticated, service_role;");
  expect(migration).toContain("revoke all on function public.current_profile_arrondissement() from public;");
  expect(migration).toContain("revoke all on function public.can_view_territory_message(integer) from public;");
});

it("exposes pollution score references through a public read-only RPC", () => {
  const migration = readMigration("../../../supabase/migrations/20260602000001_action_pollution_score_references_rpc.sql");

  expect(migration).toContain("create or replace function public.action_pollution_score_references()");
  expect(migration).toContain("returns table (");
  expect(migration).toContain("security invoker");
  expect(migration).toContain("set search_path = pg_catalog");
  expect(migration).toContain("revoke all on function public.action_pollution_score_references() from public;");
  expect(migration).toContain("grant execute on function public.action_pollution_score_references() to public;");
});

it("enables RLS on xp_audit and restricts it to the service role", () => {
  const migration = readMigration("../../../supabase/migrations/20260601000001_harden_xp_audit_rls.sql");

  expect(migration).toContain("alter table public.xp_audit enable row level security;");
  expect(migration).toContain("drop policy if exists xp_audit_service_only on public.xp_audit;");
  expect(migration).toContain("create policy xp_audit_service_only on public.xp_audit");
  expect(migration).toContain("using (auth.role() = 'service_role')");
  expect(migration).toContain("with check (auth.role() = 'service_role')");
});

it("hardens user_roles to server-only access", () => {
  const migration = readMigration("../../../supabase/migrations/20260603000001_harden_user_roles_rls.sql");

  expect(migration).toContain("alter table if exists public.user_roles");
  expect(migration).toContain("enable row level security;");
  expect(migration).toContain("drop policy if exists system_can_manage_roles on public.user_roles;");
  expect(migration).toContain("drop policy if exists user_roles_service_only on public.user_roles;");
  expect(migration).toContain("create policy user_roles_service_only on public.user_roles");
  expect(migration).toContain("for select");
  expect(migration).toContain("using (auth.role() = 'service_role')");
  expect(migration).toContain("revoke all on table public.user_roles from anon, authenticated;");
  expect(migration).toContain("grant select, insert, update, delete on table public.user_roles to service_role;");
});

it("creates user_roles with Clerk-compatible text identifiers", () => {
  const migration = readMigration("../../../supabase/migrations/20260529000000_add_user_roles.sql");

  expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.user_roles");
  expect(migration).toContain("user_id TEXT NOT NULL UNIQUE");
  expect(migration).not.toContain("REFERENCES auth.users");
  expect(migration).toContain("ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;");
});

it("removes legacy neighborhood helpers and pins trigger search paths", () => {
  const legacyChatMigration = readMigration("../../../supabase/migrations/20260420000015_advanced_chat_core.sql");
  const communityRateLimitMigration = readMigration("../../../supabase/migrations/20260419000004_community_rate_limit.sql");
  const bootstrapMigration = readMigration("../../../supabase/migrations/20260402000001_initial_modern_schema.sql");
  const profilesMigration = readMigration("../../../supabase/migrations/20260428000020_chat_channels_profiles.sql");
  const quizMigration = readMigration("../../../supabase/migrations/20260427000019_quiz_srs.sql");
  const missionMigration = readMigration("../../../supabase/migrations/20260506000024_companion_gps_schema.sql");
  const chatNotificationsMigration = readMigration("../../../supabase/migrations/20260507000025_chat_notifications_rpc.sql");
  const cleanupMigration = readMigration("../../../supabase/migrations/20260519211805_harden_remaining_supabase_advisories.sql");

  expect(legacyChatMigration).toMatch(/security invoker/i);
  expect(legacyChatMigration).toMatch(/set search_path = pg_catalog/i);
  expect(legacyChatMigration).toMatch(/revoke all on function public\.can_view_neighborhood_message\(integer\) from public;/i);
  expect(legacyChatMigration).toMatch(
    /grant execute on function public\.can_view_neighborhood_message\(integer\) to authenticated, service_role;/i,
  );
  expect(legacyChatMigration).toMatch(/revoke all on function public\.prune_old_messages\(\) from public;/i);
  expect(legacyChatMigration).toMatch(/grant execute on function public\.prune_old_messages\(\) to service_role;/i);

  expect(communityRateLimitMigration).toMatch(/security invoker/i);
  expect(communityRateLimitMigration).toMatch(/set search_path = pg_catalog/i);

  expect(bootstrapMigration).toMatch(/security invoker/i);
  expect(bootstrapMigration).toMatch(/set search_path = pg_catalog/i);

  expect(profilesMigration).toMatch(/security invoker/i);
  expect(profilesMigration).toMatch(/set search_path = pg_catalog/i);

  expect(quizMigration).toMatch(/security invoker/i);
  expect(quizMigration).toMatch(/set search_path = pg_catalog/i);

  expect(missionMigration).toMatch(/security invoker/i);
  expect(missionMigration).toMatch(/set search_path = pg_catalog/i);

  expect(chatNotificationsMigration).toMatch(/security invoker/i);
  expect(chatNotificationsMigration).toMatch(/set search_path = pg_catalog/i);

  expect(cleanupMigration).toContain('drop policy if exists "Allow neighborhood visibility" on public.app_messages;');
  expect(cleanupMigration).toContain("drop function if exists public.prune_old_messages();");
  expect(cleanupMigration).toContain("drop function if exists public.can_view_neighborhood_message(integer);");
});

it("applies the corrective migration for the linked project drift", () => {
  const hardeningMigration = readMigration("../../../supabase/migrations/20260520200207_apply_remaining_supabase_advisory_hardening.sql");

  expect(hardeningMigration).toContain("create or replace function public.set_updated_at()");
  expect(hardeningMigration).toContain("create or replace function public.handle_updated_at()");
  expect(hardeningMigration).toContain("alter function public.reserve_community_message_slot(text, text) security invoker;");
  expect(hardeningMigration).toContain("set search_path = pg_catalog");
  expect(hardeningMigration).toContain("revoke all on function public.compute_mission_distance(uuid) from public;");
  expect(hardeningMigration).toContain("grant execute on function public.create_chat_notifications_for_message(uuid) to service_role;");
});
