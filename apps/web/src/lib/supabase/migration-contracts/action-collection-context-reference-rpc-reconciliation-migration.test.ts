import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261107000006_reconcile_context_reference_rpc.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("contextual reference RPC reconciliation migration STATIC_CONTRACT", () => {
  it("uses one controlled public wrapper over the dated implementation", () => {
    expect(migration).toMatch(/create or replace function public\.action_collection_context_reference_averages_v1\(\)/i);
    expect(migration).toMatch(/security definer/i);
    expect(migration).toMatch(/set search_path = pg_catalog, public/i);
    expect(migration).toMatch(/from public\.action_collection_context_reference_averages_v1\(current_date\)/i);
    expect(migration).toMatch(/alter function public\.action_collection_context_reference_averages_v1\(\)\s+owner to postgres/i);
    expect(migration).not.toMatch(/from public\.action_statistical_versions/i);
  });

  it("preserves the public grant without widening the service-only dated overload", () => {
    expect(migration).toMatch(/revoke all on function public\.action_collection_context_reference_averages_v1\(\)/i);
    expect(migration).toMatch(/grant execute on function public\.action_collection_context_reference_averages_v1\(\)\s+to anon, authenticated/i);
    expect(migration).not.toMatch(/grant execute on function public\.action_collection_context_reference_averages_v1\(date\)/i);
  });
});
