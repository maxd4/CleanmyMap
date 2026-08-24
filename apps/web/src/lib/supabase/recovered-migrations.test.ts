import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readMigration(filename: string): string {
  return readFileSync(new URL(`../../../supabase/migrations/${filename}`, import.meta.url), "utf8");
}

describe("recovered Supabase migrations", () => {
  it("keeps the action phase columns required by current routes and stores", () => {
    const migration = readMigration("20260706000001_actions_phase_preparation_data.sql");

    expect(migration).toContain("add column if not exists action_phase");
    expect(migration).toContain("add column if not exists preparation_data");
    expect(migration).toContain("default 'post_action_complete'");
    expect(migration).toContain("default '{}'::jsonb");
  });

  it("scopes avatar writes to the authenticated profile path", () => {
    const migration = readMigration("20260626000001_create_profile_avatars_bucket.sql");

    expect(migration).toContain("values (");
    expect(migration).toContain("'avatars'");
    expect(migration).toContain("using (bucket_id = 'avatars')");
    expect(migration).toContain("storage.foldername(name)");
    expect(migration).toContain("(storage.foldername(name))[1] = 'profiles'");
    expect(migration).not.toMatch(/auth\.role\(\)\s*=\s*'service_role'/i);
  });

  it("keeps reports private and server-only", () => {
    const migration = readMigration("20260626000002_create_reports_bucket.sql");

    expect(migration).toContain("false,");
    expect(migration).toContain("Reports are private");
    expect(migration).not.toMatch(/create policy/i);
    expect(migration).not.toMatch(/auth\.role\(\)\s*=\s*'service_role'/i);
  });

  it("keeps only the territory compatibility data backfill", () => {
    const migration = readMigration("20260625000005_territory_metadata_compatibility.sql");

    expect(migration).toContain("update public.profiles");
    expect(migration).toContain("public.extract_arrondissement_from_label");
    expect(migration).not.toContain("create or replace function public.current_profile_arrondissement");
    expect(migration).not.toContain("create or replace function public.can_profile_view_territory_message");
    expect(migration).not.toContain("create or replace function public.create_chat_notifications_for_message");
  });
});
