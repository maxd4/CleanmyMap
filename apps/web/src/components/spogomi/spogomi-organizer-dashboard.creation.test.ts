import { describe, expect, it, vi } from "vitest";
import {
  reuseOrCreateSpogomiCreationAttempt,
  type SpogomiCreationPayload,
} from "./spogomi-organizer-dashboard.creation";

const payload: SpogomiCreationPayload = {
  name: "Compétition test",
  locationLabel: "Paris",
  mode: "casual",
  startsAt: "2026-10-13T10:00:00.000Z",
  endsAt: null,
};

describe("SPOGOMI organizer creation attempts", () => {
  it("reuses the key for the same intention and creates one for a changed intention", () => {
    const createRandomId = vi
      .fn()
      .mockReturnValueOnce("first-id")
      .mockReturnValueOnce("second-id");
    const first = reuseOrCreateSpogomiCreationAttempt(null, payload, createRandomId);
    const retry = reuseOrCreateSpogomiCreationAttempt(first, { ...payload }, createRandomId);
    const changed = reuseOrCreateSpogomiCreationAttempt(
      retry,
      { ...payload, name: "Nouvelle compétition" },
      createRandomId,
    );

    expect(retry).toBe(first);
    expect(first.idempotencyKey).toBe("spogomi-first-id");
    expect(changed.idempotencyKey).toBe("spogomi-second-id");
    expect(createRandomId).toHaveBeenCalledTimes(2);
  });
});
