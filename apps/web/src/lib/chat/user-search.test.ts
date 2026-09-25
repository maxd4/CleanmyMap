import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("chat users cache boundary", () => {
  it("does not persist userId plus free-text searches in the Vercel data cache", () => {
    const source = readFileSync(new URL("./user-search.ts", import.meta.url), "utf8");

    expect(source).not.toContain("unstable_cache");
    expect(source).not.toContain("CHAT_USERS_CACHE_REVALIDATE_SECONDS");
  });
});
