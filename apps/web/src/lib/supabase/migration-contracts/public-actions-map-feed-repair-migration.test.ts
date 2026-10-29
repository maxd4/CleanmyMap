import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261030000003_repair_public_actions_map_feed.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("public actions map feed repair migration", () => {
  it("restores one invoker-safe canonical RPC with the school filter before limiting", () => {
    expect(migration).toContain("create or replace function public.actions_map_feed(");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("set search_path = public, pg_catalog");
    expect(migration).toContain("grant execute on function public.actions_map_feed");
    expect(migration).toContain("to anon, authenticated, service_role");
    expect(migration).toContain("drop function public.actions_map_feed_context_projection(");
    expect(migration).not.toContain("from public.actions_map_feed_context_projection(");
    expect(migration).not.toContain("security definer");

    const actionRows = migration.slice(
      migration.indexOf("), action_rows as ("),
      migration.indexOf("), spot_rows as ("),
    );
    const schoolPredicate = actionRows.indexOf(
      "coalesce(a.action_context, '') = 'school'",
    );
    const orderBy = migration.indexOf("order by observed_at desc, created_at desc");

    expect(schoolPredicate).toBeGreaterThanOrEqual(0);
    expect(orderBy).toBeGreaterThan(migration.indexOf("), spot_rows as ("));
    expect(migration.indexOf("limit (select value from effective_limit)")).toBeGreaterThan(
      orderBy,
    );
  });

  it("keeps the public projection shape and privacy boundaries", () => {
    expect(migration).toMatch(/returns table \([\s\S]+public_preparation_data jsonb[\s\S]*\)/i);
    expect(migration).toContain("public.public_action_map_preparation(a.preparation_data)");
    expect(migration).toContain("a.preparation_data -> 'observedCoverage'");
    expect(migration).toContain("s.status in ('validated', 'cleaned')");
    expect(migration).not.toContain("created_by_clerk_id");
    expect(migration).not.toContain("action_geometry_contributions");
    expect(migration).not.toContain("drop policy");
    expect(migration).not.toContain("disable row level security");
  });
});
