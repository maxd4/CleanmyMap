import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261022121531_annuaire_primary_channel_privacy_cleanup.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("partner annuaire primary channel privacy migration contract", () => {
  it("removes only nested private URL schemes from public_data", () => {
    expect(migration).toContain("public_data - 'primaryChannel'");
    expect(migration).toContain("public_data #>> '{primaryChannel,url}'");
    expect(migration).toContain("like 'mailto:%'");
    expect(migration).toContain("like 'tel:%'");
    expect(migration).toContain('private_admin_contact is never');
  });
});
