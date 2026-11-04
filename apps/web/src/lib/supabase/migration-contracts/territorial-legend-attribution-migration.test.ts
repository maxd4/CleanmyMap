import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261104000003_territorial_legend_action_attribution.sql", import.meta.url),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

describe("territorial legend action attribution migration", () => {
  it("keeps the attribution server-owned and replayable", () => {
    expect(migration).toContain("add column if not exists territorial_legend_attribution jsonb");
    expect(migration).toContain("revoke insert, update (territorial_legend_attribution), delete on public.actions from public, anon, authenticated");
    expect(migration).toContain("grant update (territorial_legend_attribution) on public.actions to service_role");
    expect(migration).toContain("null means not currently verifiable");
    expect(migration).toContain("create trigger trg_invalidate_territorial_legend_attribution");
    expect(migration).toContain("new.territorial_legend_attribution := null");
    expect(migration).toContain("set search_path = pg_catalog, public");
  });
});
