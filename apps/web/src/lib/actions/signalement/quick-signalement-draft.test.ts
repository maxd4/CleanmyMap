import { describe, expect, it } from "vitest";
import {
  parseQuickSignalementDraft,
  serializeQuickSignalementDraft,
} from "./quick-signalement-draft";

describe("quick signalement draft storage", () => {
  it("serializes only non-sensitive choices", () => {
    const serialized = serializeQuickSignalementDraft({
      recordType: "spot",
      selectedCategories: [],
    });

    expect(serialized).toBe(
      JSON.stringify({ recordType: "spot", selectedCategories: [] }),
    );
    expect(serialized).not.toContain("location");
    expect(serialized).not.toContain("latitude");
    expect(serialized).not.toContain("longitude");
  });

  it("strips coordinates from legacy drafts", () => {
    const parsed = parseQuickSignalementDraft(
      JSON.stringify({
        recordType: "clean_place",
        selectedCategories: [],
        location: { lat: 48.8566, lng: 2.3522 },
      }),
    );

    expect(parsed).toEqual({ recordType: "clean_place", selectedCategories: [] });
    expect(serializeQuickSignalementDraft(parsed!)).not.toContain("48.8566");
    expect(serializeQuickSignalementDraft(parsed!)).not.toContain("2.3522");
  });

  it("rejects malformed or empty drafts", () => {
    expect(parseQuickSignalementDraft("not-json")).toBeNull();
    expect(parseQuickSignalementDraft(JSON.stringify({ location: { lat: 1, lng: 2 } }))).toBeNull();
  });
});
