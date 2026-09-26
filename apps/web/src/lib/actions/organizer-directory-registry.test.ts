import { describe, expect, it } from "vitest";
import { getStaticOrganizerSuggestions, normalizeOrganizerName, resolveActionOrganizer } from "./organizer-directory-registry";

describe("organizer directory registry", () => {
  it("filters suggestions by the selected type, including the distinct student association type", () => {
    const associations = getStaticOrganizerSuggestions("association", "");
    const studentAssociations = getStaticOrganizerSuggestions("student_association", "");

    expect(associations.length).toBeGreaterThan(0);
    expect(studentAssociations.length).toBeGreaterThan(0);
    expect(associations.every((entry) => entry.organizerType === "association")).toBe(true);
    expect(studentAssociations.every((entry) => entry.organizerType === "student_association")).toBe(true);
    expect(new Set(associations.map((entry) => entry.id))).not.toEqual(new Set(studentAssociations.map((entry) => entry.id)));
  });

  it("normalizes names without merging across organizer types", async () => {
    expect(normalizeOrganizerName("  École  des  Ponts  ")).toBe("ecole des ponts");

    const calls: string[] = [];
    const existing = {
      id: "persisted-association",
      name: "École des Ponts",
      normalized_name: "ecole des ponts",
      organizer_type: "association",
    };
    const supabase = {
      from(table: string) {
        calls.push(table);
        return {
          select() { return this; },
          eq() { return this; },
          maybeSingle: async () => ({ data: existing, error: null }),
        };
      },
    } as never;

    await expect(resolveActionOrganizer({
      supabase,
      organizerType: "association",
      organizerName: " Ecole des Ponts ",
      createdByClerkId: "clerk-1",
    })).resolves.toMatchObject({ organizerId: "persisted-association", organizerName: "École des Ponts" });
    expect(calls).toEqual(["organizer_directory_entries"]);
  });

  it("keeps spontaneous referents out of the structure directory", async () => {
    const supabase = { from: () => { throw new Error("catalog must not be accessed"); } } as never;

    await expect(resolveActionOrganizer({
      supabase,
      organizerType: "spontaneous",
      organizerName: "Alice",
      actorName: "Alice",
      createdByClerkId: "clerk-1",
    })).resolves.toEqual({
      organizerId: null,
      organizerName: "Alice",
      legacyAssociationName: "Action spontanée",
    });
  });
});
