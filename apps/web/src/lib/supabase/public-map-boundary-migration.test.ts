import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../../../supabase/migrations/20260826060000_harden_public_map_boundary.sql",
  import.meta.url,
);

describe("public map Supabase boundary migration", () => {
  it("makes the RPC approved/visible and validated/cleaned only", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toMatch(/language\s+sql[\s\S]+security\s+invoker/i);
    expect(sql).toMatch(/a\.status\s*=\s*'approved'/i);
    expect(sql).toMatch(/coalesce\(a\.moderation_visibility,\s*'visible'\)\s*=\s*'visible'/i);
    expect(sql).toMatch(/s\.status\s+in\s*\(\s*'validated'\s*,\s*'cleaned'\s*\)/i);
    expect(sql).not.toMatch(/p_status\s+is\s+null/i);
    expect(sql).not.toMatch(/s\.status\s*=\s*'new'/i);
  });

  it("removes direct anonymous/authenticated reads of new spots", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toMatch(
      /create\s+policy\s+trash_spotter_spots_public_read[\s\S]+using\s*\(\s*status\s+in\s*\(\s*'validated'\s*,\s*'cleaned'\s*\)\s*\)/i,
    );
    expect(sql).toMatch(/grant\s+execute\s+on\s+function[\s\S]+to\s+anon,\s*authenticated,\s*service_role/i);
  });
});
