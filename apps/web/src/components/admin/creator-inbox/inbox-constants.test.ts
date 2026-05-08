import { describe, expect, it } from "vitest";
import type { CreatorInboxItem } from "@/lib/community/creator-inbox";
import { refreshList } from "./inbox-constants";

function buildItem(overrides: Partial<CreatorInboxItem> = {}): CreatorInboxItem {
  return {
    id: "item-1",
    source: "feedback",
    sourceLabel: "Feedback",
    sourceRecordId: "record-1",
    title: "Item",
    subtitle: null,
    authorName: "Alice",
    authorEmail: null,
    authorRole: null,
    createdAt: "2026-05-07T10:00:00.000Z",
    pagePath: null,
    status: "new",
    sourceStatus: "open",
    priority: "normal",
    context: "Context",
    details: [],
    canDelete: true,
    canReview: false,
    hasReplyTarget: false,
    ...overrides,
  };
}

describe("creator inbox constants", () => {
  it("refreshes the item matching source and record id", () => {
    const items = [buildItem(), buildItem({ id: "item-2", sourceRecordId: "record-2" })];
    const updated = buildItem({ status: "accepted", sourceStatus: "accepted" });

    const next = refreshList(items, updated);

    expect(next[0]?.status).toBe("accepted");
    expect(next[1]?.status).toBe("new");
  });

  it("removes an item by deleted id", () => {
    const items = [buildItem(), buildItem({ id: "item-2", sourceRecordId: "record-2" })];

    const next = refreshList(items, null, "record-2");

    expect(next).toHaveLength(1);
    expect(next[0]?.sourceRecordId).toBe("record-1");
  });
});
