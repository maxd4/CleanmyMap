import { describe, expect, it } from "vitest";
import {
  createActionInterventionMode,
  normalizeActionInterventionMode,
} from "./intervention-mode";

describe("action intervention mode contract", () => {
  it("versionne les trois organizer choices", () => {
    expect(createActionInterventionMode("multi_zone")).toEqual({
      version: "intervention-mode-v1",
      mode: "multi_zone",
    });
  });

  it("rejects an unknown version instead of guessing a mode", () => {
    expect(normalizeActionInterventionMode({ version: "legacy", mode: "itinerary" })).toBeUndefined();
    expect(normalizeActionInterventionMode(undefined)).toBeUndefined();
  });
});
