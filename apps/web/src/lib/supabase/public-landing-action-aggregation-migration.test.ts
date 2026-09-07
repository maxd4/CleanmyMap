import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260907000001_public_landing_action_aggregation.sql",
    import.meta.url,
  ),
  "utf8",
);

it("extends the bounded landing RPC with canonical participant and duration aggregates", () => {
  expect(migration).toContain(
    "drop function if exists public.load_public_landing_action_summary(date);",
  );
  expect(migration).toContain("returns table (");
  expect(migration).toContain("participants_total bigint");
  expect(migration).toContain("total_duration_minutes bigint");
  expect(migration).toContain("action_distribution jsonb");
  expect(migration).toContain("classification_warnings jsonb");
  expect(migration).toContain("a.status = 'approved'");
  expect(migration).toContain("coalesce(a.moderation_visibility, 'visible') = 'visible'");
  expect(migration).toContain("a.action_date >= p_floor_date");
  expect(migration).toContain("a.marker_text not like '%test%'");
  expect(migration).toContain("a.marker_text not like '%demo%'");
  expect(migration).toContain("sum(duration_minutes)");
  expect(migration).toContain("'spontaneous:' || a.volunteers::text");
  expect(migration).toContain("'Association étudiante'");
  expect(migration).toContain("'invalid_organizer_type'");
  expect(migration).not.toContain("association_name");
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
});
