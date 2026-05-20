import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("env configuration", () => {
  it("does not embed production Supabase defaults", () => {
    const source = readFileSync(new URL("./env.ts", import.meta.url), "utf8");

    expect(source).not.toContain("https://mgvmuambbxmmkrjjlryo.supabase.co");
    expect(source).not.toContain("sb_publishable_2ZvYS31hhXeWkIGVaaPyMA_qzdutOI4");
  });
});
