import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("SPOGOMI team public-name route STATIC_CONTRACT", () => {
  it("keeps authentication, organizer ownership and server validation at the API boundary", () => {
    expect(route).toContain("requireAuthenticatedAccess");
    expect(route).toContain("loadSpogomiEventForOrganizer");
    expect(route).toContain("renameSpogomiTeam");
    expect(route).toContain("parseJsonBodyWithValidation");
    expect(route).toContain("expectedPublicName");
    expect(route).toContain("publicName");
    expect(route).toContain("forbiddenJsonResponse");
    expect(route).not.toContain("getSupabaseAdminClient");
  });
});
