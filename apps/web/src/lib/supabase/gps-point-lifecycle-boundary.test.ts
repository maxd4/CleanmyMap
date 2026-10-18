import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const boundaryTest = readFileSync(
  new URL("../../../supabase/tests/gps-point-lifecycle-boundary.pgtap.sql", import.meta.url),
  "utf8",
);

describe("GPS lifecycle pgTAP fixture [STATIC_CONTRACT]", () => {
  it("keeps the 20-assertion plan and grants fixture access to each test role", () => {
    expect(boundaryTest).toMatch(/select plan\(20\);/i);
    expect(boundaryTest).toMatch(
      /grant select on gps_point_lifecycle_fixture to anon, authenticated;/i,
    );
    expect(boundaryTest).toMatch(
      /grant select, insert, delete on gps_point_lifecycle_fixture to service_role;/i,
    );

    const assertionCalls = boundaryTest.match(/\b(?:ok|is|lives_ok|throws_ok)\s*\(/g) ?? [];
    expect(assertionCalls).toHaveLength(20);
  });

  it("captures mission identifiers from the rows inserted by the fixture", () => {
    expect(boundaryTest).toMatch(
      /with inserted_missions as \([\s\S]+?insert into public\.missions[\s\S]+?returning id, label[\s\S]+?\)\s*insert into gps_point_lifecycle_fixture/i,
    );
    expect(boundaryTest).not.toMatch(
      /select id from public\.missions where label = '[^']+' order by created_at desc limit 1/i,
    );
  });
});
