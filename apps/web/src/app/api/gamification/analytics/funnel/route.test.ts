import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("gamification funnel route", () => {
  it("uses head-only count queries without selecting all columns", () => {
    const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

    expect(source).toContain('.select("total_points", { count: "exact", head: true })');
    expect(source).not.toContain('.select("*", { count: "exact", head: true })');
  });
});

