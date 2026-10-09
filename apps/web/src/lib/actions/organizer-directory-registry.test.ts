import { describe, expect, it, vi } from "vitest";
import {
  createActionOrganizer,
  getStaticOrganizerSuggestions,
  normalizeOrganizerName,
  resolveCanonicalCreateActionPayload,
  resolveActionOrganizer,
} from "./organizer-directory-registry";

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

  it("rejects names that normalize to an empty value before touching the catalog", async () => {
    const supabase = { from: () => { throw new Error("catalog must not be accessed"); } } as never;

    await expect(resolveActionOrganizer({
      supabase,
      organizerType: "association",
      organizerName: "•••",
    })).rejects.toThrow(/validation/i);
  });

  it("rejects an unknown organizer without inserting it during action resolution", async () => {
    const insert = vi.fn();
    const supabase = {
      from() {
        return {
          select() { return this; },
          eq() { return this; },
          maybeSingle: async () => ({ data: null, error: null }),
          insert,
        };
      },
    } as never;

    await expect(resolveActionOrganizer({
      supabase,
      organizerType: "association",
      organizerName: "Collectif Inconnu",
    })).rejects.toThrow(/structure existante/i);
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects an unknown organizer before the canonical action insert", async () => {
    const insert = vi.fn();
    const supabase = {
      from() {
        return {
          select() { return this; },
          eq() { return this; },
          maybeSingle: async () => ({ data: null, error: null }),
          insert,
        };
      },
    } as never;

    await expect(resolveCanonicalCreateActionPayload({
      supabase,
      payload: {
        organizerType: "association",
        organizerId: null,
        organizerName: "Structure forgée",
      } as never,
    })).rejects.toThrow(/structure existante/i);
    expect(insert).not.toHaveBeenCalled();
  });

  it("creates a normal user-entered organizer only through the explicit command", async () => {
    const inserted: Record<string, unknown>[] = [];
    const created = {
      id: "created-association",
      name: "Collectif Rivière",
      normalized_name: "collectif riviere",
      organizer_type: "association",
    };
    const selectChain = {
      select() { return this; },
      eq() { return this; },
      maybeSingle: async () => ({ data: null, error: null }),
    };
    const insertChain = {
      insert(value: Record<string, unknown>) { inserted.push(value); return this; },
      select() { return this; },
      single: async () => ({ data: created, error: null }),
    };
    let calls = 0;
    const supabase = {
      from() {
        calls += 1;
        return calls === 1 ? selectChain : insertChain;
      },
    } as never;

    await expect(createActionOrganizer({
      supabase,
      organizerType: "association",
      organizerName: "Collectif Rivière",
      createdByClerkId: "clerk-1",
    })).resolves.toMatchObject({ organizerId: "created-association", organizerName: "Collectif Rivière" });
    expect(inserted[0]).toMatchObject({
      name: "Collectif Rivière",
      normalized_name: "collectif riviere",
      organizer_type: "association",
      created_by_clerk_id: "clerk-1",
    });
  });

  it("reuses the exact persisted organizer without rewriting it", async () => {
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
    })).resolves.toMatchObject({ organizerId: "persisted-association", organizerName: "École des Ponts" });
    expect(calls).toEqual(["organizer_directory_entries"]);
  });

  it("re-reads the canonical row after a concurrent unique violation", async () => {
    const canonical = {
      id: "canonical-association",
      name: "Collectif Rivière",
      normalized_name: "collectif riviere",
      organizer_type: "association",
      created_by_clerk_id: "original-creator",
    };
    const inserted: Record<string, unknown>[] = [];
    const selectChain = (data: unknown) => ({
      select() { return this; },
      eq() { return this; },
      maybeSingle: async () => ({ data, error: null }),
    });
    const insertChain = {
      insert(value: Record<string, unknown>) { inserted.push(value); return this; },
      select() { return this; },
      single: async () => ({ data: null, error: { code: "23505", message: "duplicate key" } }),
    };
    let calls = 0;
    const supabase = {
      from() {
        calls += 1;
        if (calls === 1) return selectChain(null);
        if (calls === 2) return insertChain;
        return selectChain(canonical);
      },
    } as never;

    await expect(createActionOrganizer({
      supabase,
      organizerType: "association",
      organizerName: "Collectif Rivière",
      createdByClerkId: "racing-creator",
    })).resolves.toEqual({
      organizerId: "canonical-association",
      organizerName: "Collectif Rivière",
      legacyAssociationName: "Collectif Rivière",
    });
    expect(inserted[0]).toMatchObject({ created_by_clerk_id: "racing-creator" });
  });

  it("keeps spontaneous referents out of the structure directory", async () => {
    const supabase = { from: () => { throw new Error("catalog must not be accessed"); } } as never;

    await expect(resolveActionOrganizer({
      supabase,
      organizerType: "spontaneous",
      organizerName: "Alice",
      actorName: "Alice",
    })).resolves.toEqual({
      organizerId: null,
      organizerName: "Alice",
      legacyAssociationName: "Action spontanée",
    });
  });
});
