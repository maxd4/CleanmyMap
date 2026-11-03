import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20261103000002_territorial_legends.sql", import.meta.url), "utf8");

describe("territorial legends consent migration", () => {
  it("keeps the consent private, disabled by default, and owner-scoped", () => {
    expect(migration).toContain("create table if not exists public.territorial_legend_consents");
    expect(migration).toContain("enabled boolean not null default false");
    expect(migration).toContain("activated_at timestamptz");
    expect(migration).toContain("alter table public.territorial_legend_consents enable row level security");
    expect(migration).toContain("revoke all on table public.territorial_legend_consents from public, anon");
    expect(migration).toContain("territorial_legend_consents_owner_select");
    expect(migration).toContain("user_id = coalesce((select auth.jwt()) ->> 'sub', '')");
  });

  it("does not touch the existing XP leaderboard or progression tables", () => {
    expect(migration).not.toMatch(/progression_profiles|progression_events|leaderboard_public_opt_in/);
  });
});
