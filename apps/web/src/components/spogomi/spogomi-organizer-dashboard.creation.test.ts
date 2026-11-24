import { describe, expect, it, vi } from "vitest";
import {
  reuseOrCreateSpogomiCreationAttempt,
  type SpogomiCreationPayload,
} from "./spogomi-organizer-dashboard.creation";

const payload: SpogomiCreationPayload = {
  name: "Compétition test",
  locationLabel: "Paris",
  latitude: 48.8566,
  longitude: 2.3522,
  mode: "casual",
  startsAt: "2026-10-13T10:00:00.000Z",
  endsAt: null,
};

describe("SPOGOMI organizer creation attempts", () => {
  it("reuses the key for the same intention and creates one for a changed intention", () => {
    const createRandomId = vi
      .fn()
      .mockReturnValueOnce("first-id")
      .mockReturnValueOnce("second-id")
      .mockReturnValueOnce("third-id");
    const first = reuseOrCreateSpogomiCreationAttempt(null, payload, createRandomId);
    const retry = reuseOrCreateSpogomiCreationAttempt(first, { ...payload }, createRandomId);
    const changed = reuseOrCreateSpogomiCreationAttempt(
      retry,
      { ...payload, name: "Nouvelle compétition" },
      createRandomId,
    );
    const changedCoordinates = reuseOrCreateSpogomiCreationAttempt(
      changed,
      { ...payload, name: "Nouvelle compétition", locationLabel: "Point choisi sur la carte (48.85000, 2.35000)", latitude: 48.85, longitude: 2.35 },
      createRandomId,
    );

    expect(retry).toBe(first);
    expect(first.idempotencyKey).toBe("spogomi-first-id");
    expect(changed.idempotencyKey).toBe("spogomi-second-id");
    expect(changedCoordinates.idempotencyKey).not.toBe(changed.idempotencyKey);
    expect(createRandomId).toHaveBeenCalledTimes(3);
  });
});
