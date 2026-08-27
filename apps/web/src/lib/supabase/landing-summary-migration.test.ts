import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260827130000_public_landing_action_summary.sql",
    import.meta.url,
  ),
  "utf8",
);

it("keeps the landing action aggregate server-only and invoker-scoped", () => {
  expect(migration).toContain(
    "create or replace function public.load_public_landing_action_summary(",
  );
  expect(migration).toContain("security invoker");
  expect(migration).toContain("set search_path = pg_catalog, public");
  expect(migration).not.toMatch(/security definer/i);
  expect(migration).toContain(
    "revoke all on function public.load_public_landing_action_summary(date) from anon;",
  );
  expect(migration).toContain(
    "revoke all on function public.load_public_landing_action_summary(date) from authenticated;",
  );
  expect(migration).toContain(
    "grant execute on function public.load_public_landing_action_summary(date) to service_role;",
  );
  expect(migration).toContain("a.status = 'approved'");
  expect(migration).toContain("a.action_date >= p_floor_date");
});
