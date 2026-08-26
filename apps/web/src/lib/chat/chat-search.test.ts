import { describe, expect, it } from "vitest";
import {
  buildChatMessageExcerpt,
  getChatSearchQueryError,
  normalizeChatSearchQuery,
} from "./chat-search";

describe("chat search contract", () => {
  it("normalizes and validates the bounded query", () => {
    expect(normalizeChatSearchQuery("  rivière  ")).toBe("rivière");
    expect(getChatSearchQueryError("a")).toContain("2 caractères");
    expect(getChatSearchQueryError("a".repeat(121))).toContain("120 caractères");
    expect(getChatSearchQueryError("ok")).toBeNull();
  });

  it("keeps a compact excerpt around the match", () => {
    const content = `${"avant ".repeat(20)}recherche importante${" après".repeat(20)}`;
    const excerpt = buildChatMessageExcerpt(content, "importante", 80);
    expect(excerpt).toContain("importante");
    expect(excerpt.length).toBeLessThanOrEqual(80);
  });
});
