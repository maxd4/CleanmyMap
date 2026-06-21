import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("gamification funnel route", () => {
  it("relies on the Supabase counter helper", () => {
    const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
    const helperSource = readFileSync(
      new URL("../../../../../lib/gamification/counters.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain('loadGamificationFunnelCounts');
    expect(helperSource).toContain('load_gamification_funnel_counts');
    expect(helperSource).toContain('supabase.rpc("load_gamification_funnel_counts"');
  });
});
