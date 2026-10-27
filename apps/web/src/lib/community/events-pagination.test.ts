import { describe, expect, it } from "vitest";
import {
  buildCommunityEventsPageCursor,
  parseCommunityEventsPageCursor,
} from "./events-pagination";

describe("community event pagination cursor", () => {
  it("round-trips both ordering phases and stable tie-breakers", () => {
    const cursor = buildCommunityEventsPageCursor({
      phase: "past",
      eventDate: "2026-01-01",
      createdAt: "2026-01-01T10:20:30.000Z",
      id: "event-1",
    });

    expect(parseCommunityEventsPageCursor(cursor)).toEqual({
      version: 1,
      phase: "past",
      eventDate: "2026-01-01",
      createdAt: "2026-01-01T10:20:30.000Z",
      id: "event-1",
    });
  });

  it.each([null, "", "v2|past|2026-01-01|2026-01-01T00%3A00%3A00.000Z|event-1", "v1|other|2026-01-01|2026-01-01T00%3A00%3A00.000Z|event-1", "v1|past|not-a-date|2026-01-01T00%3A00%3A00.000Z|event-1", "v1|past|2026-01-01|2026-01-01T00%3A00%3A00.000Z|event%2C-injection"]) (
    "rejects an invalid cursor %s",
    (value) => {
      expect(parseCommunityEventsPageCursor(value)).toBeNull();
    },
  );
});
