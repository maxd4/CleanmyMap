import { describe, expect, it } from "vitest";
import { buildChatUsersCacheKey } from "./user-search";

describe("chat users cache key", () => {
  it("keeps the key stable for trimmed queries", () => {
    expect(buildChatUsersCacheKey("user-1", "  Alex  ")).toBe(
      "user:user-1|query:Alex",
    );
  });

  it("uses a dedicated lane for empty queries", () => {
    expect(buildChatUsersCacheKey("user-1", "   ")).toBe(
      "user:user-1|query:empty",
    );
  });
});
