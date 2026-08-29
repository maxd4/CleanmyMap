import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("env configuration", () => {
  it("does not embed production Supabase defaults", () => {
    const source = readFileSync(new URL("./env.ts", import.meta.url), "utf8");

    expect(source).not.toContain("https://mgvmuambbxmmkrjjlryo.supabase.co");
    expect(source).not.toContain("sb_publishable_2ZvYS31hhXeWkIGVaaPyMA_qzdutOI4");
  });

  it("does not embed a fallback Clerk publishable key", () => {
    const source = readFileSync(new URL("./env.ts", import.meta.url), "utf8");

    expect(source).not.toContain("LOCAL_DEV_CLERK_PUBLISHABLE_KEY");
    expect(source).not.toMatch(/pk_(?:test|live)_[A-Za-z0-9_-]{20,}/);
  });
});
