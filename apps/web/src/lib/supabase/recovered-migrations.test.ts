import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readMigration(filename: string): string {
  return readFileSync(new URL(`../../../supabase/migrations/${filename}`, import.meta.url), "utf8");
}

function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\r\n]*/g, "");
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

  it("keeps temporary benchmark extension history as documented no-ops", () => {
    const historicalTemporaryMigrations = [
      "20260819142956_temp_enable_pg_net_for_benchmark_fetch.sql",
      "20260819143518_temp_disable_pg_net_after_benchmark_fetch.sql",
      "20260819154147_temporary_enable_http_for_benchmark_image_bridge.sql",
      "20260825130153_disable_temporary_http_extension.sql",
    ];

    for (const filename of historicalTemporaryMigrations) {
      const migration = readMigration(filename);

      expect(migration).toMatch(/historical no-op/i);
      expect(stripSqlComments(migration).trim()).toBe("");
      expect(migration).not.toMatch(/\b(?:create|drop)\s+extension\b/i);
      expect(migration).not.toMatch(/\bdrop\s+extension\b[^;]*\bcascade\b/i);
    }
  });

  it("retires the temporary benchmark image bridge without cascading", () => {
    const migration = readMigration("20260825190523_drop_benchmark_tmp_image_bridge.sql");
    const executableSql = stripSqlComments(migration);

    expect(executableSql).toMatch(
      /drop\s+table\s+if\s+exists\s+public\.benchmark_tmp_image_bridge\s*;/i,
    );
    expect(executableSql).not.toMatch(/\bcascade\b/i);
  });

  it("hardens the quiz pedagogical metric RPC contract", () => {
    const migration = readMigration("20260825173757_harden_quiz_pedagogical_metric_rpc.sql");
    const executableSql = stripSqlComments(migration);

    expect(executableSql).toMatch(/security\s+definer/i);
    expect(executableSql).toMatch(/set\s+search_path\s*=\s*pg_catalog\s*,\s*public/i);
    expect(executableSql).toMatch(
      /revoke\s+all\s+on\s+function[\s\S]+from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/i,
    );
    expect(executableSql).toMatch(
      /grant\s+execute\s+on\s+function[\s\S]+to\s+service_role/i,
    );
    expect(executableSql).toMatch(/invalid quiz pedagogical metric/i);
  });
});
