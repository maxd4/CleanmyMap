import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("SPOGOMI consolidation route STATIC_CONTRACT", () => {
  it("requires authenticated organizer access and applies endpoint rate limits", () => {
    expect(route).toContain("requireAuthenticatedAccess");
    expect(route).toContain("loadSpogomiEventForOrganizer");
    expect(route).toContain("enforceServerRateLimitForAuthenticatedUser");
  });

  it("separates preview from explicit publication and requires the preview hash", () => {
    expect(route).toContain('action: z.enum(["preview", "publish"])');
    expect(route).toContain("expectedSourceHash");
    expect(route).toContain("publishSpogomiConsolidation");
    expect(route).toContain("sourceHash");
  });
});
