import { describe, expect, it } from "vitest";
import {
  buildInclusiveThroughFilter,
  buildStrictBeforeFilter,
  getChatScrollTopAfterPrepend,
  parseChatHistoryCursor,
} from "./chat-pagination";

const cursor = {
  createdAt: "2026-05-01T10:00:00.000Z",
  id: "11111111-1111-4111-8111-111111111111",
};

describe("chat history pagination", () => {
  it("parses only complete, stable cursors", () => {
    expect(parseChatHistoryCursor(cursor.createdAt, cursor.id)).toEqual(cursor);
    expect(parseChatHistoryCursor(cursor.createdAt, null)).toBeNull();
    expect(parseChatHistoryCursor("not-a-date", cursor.id)).toBeNull();
  });

  it("uses a strict boundary for older pages and an inclusive boundary for targets", () => {
    expect(buildStrictBeforeFilter(cursor)).toContain("id.lt.");
    expect(buildInclusiveThroughFilter(cursor)).toContain("id.lte.");
  });

  it("keeps the visible message anchored after a prepend", () => {
    expect(getChatScrollTopAfterPrepend(120, 800, 1_100)).toBe(420);
    expect(getChatScrollTopAfterPrepend(120, 800, 780)).toBe(120);
  });
});
