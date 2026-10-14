import { describe, expect, it } from "vitest";
import { buildClerkMetadataPatch } from "./clerk-metadata-patch";

describe("buildClerkMetadataPatch", () => {
  it("changes only the requested metadata and removes explicitly cleared keys", () => {
    const patch = buildClerkMetadataPatch(
      {
        territoryPreferences: { residence: { label: "Paris" } },
        activity_status: "active",
        unrelated: "preserve",
        legacy: true,
      },
      {
        territoryPreferences: { residence: { label: "Lyon" } },
        activity_status: "active",
        unrelated: "preserve",
      },
    );

    expect(patch).toEqual({
      territoryPreferences: { residence: { label: "Lyon" } },
      legacy: null,
    });
    expect(patch).not.toHaveProperty("activity_status");
    expect(patch).not.toHaveProperty("unrelated");
  });

  it("does not treat an unchanged snapshot as a write", () => {
    expect(
      buildClerkMetadataPatch(
        { display_name_mode: "full_name", nested: { enabled: true } },
        { display_name_mode: "full_name", nested: { enabled: true } },
      ),
    ).toEqual({});
  });
});
