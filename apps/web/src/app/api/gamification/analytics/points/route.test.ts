import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("gamification points analytics route", () => {
  it("uses named scopes and exposes the resolved label", () => {
    const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

    expect(source).toContain("resolveTimeScopeFromRequest");
    expect(source).toContain("getTimeScopeFloorDate(scope)");
    expect(source).toContain("scopeLabel: getTimeScopeLabel(scope)");
    expect(source).toContain('scope: searchParams.get("scope")');
  });
});
