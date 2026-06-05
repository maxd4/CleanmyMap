import { describe, expect, it } from "vitest";

import { normalizeLearnProgressState } from "./learn-progress";

describe("learn progress migration", () => {
  it("maps legacy hub and resources pages to the current learn pages", () => {
    const state = normalizeLearnProgressState({
      lastPage: "ressources",
      visitedPages: ["hub", "comprendre", "ressources"],
      lastUpdatedAt: "2026-06-05T12:00:00.000Z",
    });

    expect(state).toEqual({
      lastPage: "bonnes-pratiques",
      visitedPages: ["comprendre", "bonnes-pratiques"],
      lastUpdatedAt: "2026-06-05T12:00:00.000Z",
    });
  });

  it("keeps an empty legacy state anchored on the first actual page", () => {
    const state = normalizeLearnProgressState({
      lastPage: "hub",
      visitedPages: ["hub"],
      lastUpdatedAt: "2026-06-05T12:00:00.000Z",
    });

    expect(state).toEqual({
      lastPage: "comprendre",
      visitedPages: ["comprendre"],
      lastUpdatedAt: "2026-06-05T12:00:00.000Z",
    });
  });
});
