import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261030000029_action_public_visibility_timestamps.sql"),
  "utf8",
);

describe("community digest visibility SQL contract", () => {
  it("persists separate first visibility timestamps without historical result backfill", () => {
    expect(migration).toContain("add column if not exists public_visibility_started_at timestamptz");
    expect(migration).toContain("add column if not exists results_published_at timestamptz");
    expect(migration).toContain("new.results_published_at := old.results_published_at");
    expect(migration).toContain("new.public_visibility_started_at := old.public_visibility_started_at");
    expect(migration).not.toMatch(/update\s+public\.actions[\s\S]*results_published_at\s*=/i);
    expect(migration).not.toMatch(/results_published_at\s*=\s*published_at/i);
  });

  it("captures only an actual public transition and protects the trigger boundary", () => {
    expect(migration).toContain("and (tg_op = 'INSERT' or not v_old_public)");
    expect(migration).toContain("and (tg_op = 'INSERT' or not v_old_result_public)");
    expect(migration).toContain("drop trigger if exists zz_capture_action_public_visibility_timestamps");
    expect(migration).toContain("revoke all on function public.capture_action_public_visibility_timestamps() from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.capture_action_public_visibility_timestamps() to service_role");
  });
});
