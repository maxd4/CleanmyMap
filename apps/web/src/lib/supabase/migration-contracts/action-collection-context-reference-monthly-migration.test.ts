import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261106000003_action_collection_context_reference_monthly_snapshot.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("monthly contextual collection reference migration STATIC_CONTRACT", () => {
  it("adds an as-of boundary without changing the contextual arithmetic", () => {
    expect(migration).toMatch(/action_collection_context_reference_averages_v1\(\s*p_as_of_date date\s*\)/i);
    expect(migration).toMatch(/a\.action_date <= least\(coalesce\(p_as_of_date, current_date\), current_date\)/i);
    expect(migration).toMatch(/avg\(waste_kg \/ nullif\(waste_units, 0\)\)/i);
    expect(migration).toMatch(/avg\(cigarette_butts::numeric \/ nullif\(butts_units, 0\)\)/i);
    expect(migration).toMatch(/case when waste_count >= 2 then waste_average else null end/i);
    expect(migration).toMatch(/case when butts_count >= 2 then butts_average else null end/i);
    expect(migration).toMatch(/coalesce\(a\.access_mode, 'public'\) = 'public'/i);
  });

  it("keeps the legacy zero-argument read public and the dated read service-only", () => {
    expect(migration).toMatch(/grant execute on function public\.action_collection_context_reference_averages_v1\(date\)\s+to service_role/i);
    expect(migration).toMatch(/grant execute on function public\.action_collection_context_reference_averages_v1\(\)\s+to anon, authenticated/i);
    expect(migration).toMatch(/from public\.action_collection_context_reference_averages_v1\(current_date\)/i);
  });

  it("does not introduce a second persistence table or a second cron", () => {
    expect(migration).not.toMatch(/create table/i);
    expect(migration).not.toMatch(/cron/i);
  });
});
