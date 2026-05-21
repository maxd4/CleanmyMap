import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readMigration(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("Supabase function permissions", () => {
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

  it("keeps profile helper functions executable without public access", () => {
    const migration = readMigration("../../../supabase/migrations/20260428000020_chat_channels_profiles.sql");

    expect(migration).toContain("security invoker");
    expect(migration).toContain("revoke all on function public.current_profile_role_label() from public;");
    expect(migration).toContain("grant execute on function public.current_profile_role_label() to authenticated, service_role;");
    expect(migration).toContain("revoke all on function public.current_profile_arrondissement() from public;");
    expect(migration).toContain("revoke all on function public.can_view_territory_message(integer) from public;");
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
});
