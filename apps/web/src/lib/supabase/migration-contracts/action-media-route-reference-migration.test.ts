import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = new URL("../../../../supabase/migrations/20261123000008_action_media_route_reference.sql", import.meta.url);

describe("action media route-reference migration static contract", () => {
  it("keeps route references purpose-scoped, private and separately quota-limited", async () => {
    const migration = await readFile(migrationPath, "utf8");
    expect(migration).toContain("add column if not exists purpose text not null default 'report_photo'");
    expect(migration).toContain("check (purpose in ('report_photo', 'route_reference'))");
    expect(migration).toContain("(action_id, created_by_clerk_id, purpose, client_upload_id)");
    expect(migration).toContain("case new.purpose when 'route_reference' then 2 else 3 end");
    expect(migration).toContain("pg_advisory_xact_lock(hashtextextended(new.action_id::text, 0))");
    expect(migration).not.toContain("public = true");
  });
});
