import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261121000001_action_collection_integrity.sql", import.meta.url),
  "utf8",
);

describe("action collection integrity migration STATIC_CONTRACT", () => {
  it("serializes collection writes through the action row", () => {
    expect(migration).toMatch(/before insert or update or delete on public\.action_participants/i);
    expect(migration).toMatch(/from public\.actions where id = v_action_id for update/i);
  });

  it("checks individual-status and aggregate-count contradictions at transaction end", () => {
    expect(migration).toMatch(/collection_status = 'not_collected'[\s\S]*individual_waste_kg, 0\) > 0/i);
    expect(migration).toMatch(/v_confirmed_collectors > v_collectors_count/i);
    expect(migration).toMatch(/deferrable initially deferred/i);
    expect(migration).toMatch(/using errcode = '23514'/i);
  });

  it("keeps the migration additive and does not collapse unknown into zero", () => {
    expect(migration).not.toMatch(/coalesce\(collectors_count,\s*0\)/i);
    expect(migration).not.toMatch(/drop\s+(column|table)/i);
  });
});
