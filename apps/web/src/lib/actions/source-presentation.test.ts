import { describe, expect, it } from "vitest";
import {
  formatActionSourceLabel,
  normalizeActionSourceForPresentation,
} from "./source-presentation";

describe("action source presentation", () => {
  it.each([
    ["actions", "Actions terrain"],
    ["spots", "Signalements"],
    ["trash_spotter_spots", "Signalements"],
    ["local", "Import local"],
  ])("formats %s as %s", (source, expected) => {
    expect(formatActionSourceLabel(source, "fr")).toBe(expected);
  });

  it("keeps an unknown provenance explicit", () => {
    expect(normalizeActionSourceForPresentation("google_sheet")).toBe("unknown");
    expect(formatActionSourceLabel("google_sheet", "fr")).toBe("google_sheet");
  });
});
