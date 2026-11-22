import { describe, expect, it } from "vitest";
import type { ActionUpdateInput } from "./action-update-audit";
import { resolveActionUpdateOrganizer } from "./action-update-organizer";

function historicalCurrent() {
  return {
    organizer_type: "association" as const,
    organizer_id: null,
    organizer_name: "Structure historique",
    actor_name: "Alice",
    created_by_clerk_id: "creator-1",
    preparation_data: {},
  };
}

describe("resolveActionUpdateOrganizer", () => {
  it("preserves a historical display-only organizer when the organizer is unchanged", async () => {
    const supabase = {
      from: () => {
        throw new Error("directory must not be queried for an unchanged historical organizer");
      },
    } as never;

    const body = {
      organizerType: "association",
      organizerName: "Structure historique",
    } as ActionUpdateInput;

    await expect(resolveActionUpdateOrganizer({
      supabase,
      body,
      current: historicalCurrent(),
    })).resolves.toBe(body);
  });

  it("preserves historical provenance and other preparation edits without inferring a new status", async () => {
    const supabase = { from: () => { throw new Error("unchanged historical organizer must not be resolved"); } } as never;
    await expect(resolveActionUpdateOrganizer({
      supabase,
      body: {
        preparationData: { organizerReferenceStatus: "referenced", safetyInstructions: "Gants" },
      } as ActionUpdateInput,
      current: { ...historicalCurrent(), preparation_data: {} },
    })).resolves.toMatchObject({ preparationData: { safetyInstructions: "Gants" } });
  });

  it("preserves a known historical provenance when other preparation fields change", async () => {
    const supabase = { from: () => { throw new Error("unchanged organizer must not be resolved"); } } as never;
    await expect(resolveActionUpdateOrganizer({
      supabase,
      body: { preparationData: { organizerReferenceStatus: "declared_unreferenced", safetyInstructions: "Gants" } } as ActionUpdateInput,
      current: { ...historicalCurrent(), preparation_data: { organizerReferenceStatus: "declared_unreferenced" } },
    })).resolves.toMatchObject({ preparationData: { organizerReferenceStatus: "declared_unreferenced", safetyInstructions: "Gants" } });
  });

  it("derives spontaneous provenance from resolved account count, ignoring submitted provenance", async () => {
    const supabase = { from: () => { throw new Error("spontaneous identity must not query the directory"); } } as never;
    const body = {
      organizerType: "spontaneous",
      organizerName: "Pseudo descriptif",
      preparationData: { organizerReferenceStatus: "referenced" },
    } as ActionUpdateInput;
    await expect(resolveActionUpdateOrganizer({
      supabase,
      body,
      current: { ...historicalCurrent(), organizer_type: "spontaneous", organizer_name: "Ancien pseudo" },
      resolvedOrganizerAccountCount: 0,
    })).resolves.toMatchObject({ preparationData: { organizerReferenceStatus: "declared_unreferenced" } });
    await expect(resolveActionUpdateOrganizer({
      supabase,
      body,
      current: { ...historicalCurrent(), organizer_type: "spontaneous", organizer_name: "Ancien pseudo" },
      resolvedOrganizerAccountCount: 1,
    })).resolves.toMatchObject({ preparationData: { organizerReferenceStatus: "referenced" } });
  });

  it("rejects a forged unknown organizer without inserting it", async () => {
    let insertCalled = false;
    const supabase = {
      from: () => ({
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: null, error: null }),
        insert() { insertCalled = true; return this; },
      }),
    } as never;

    await expect(resolveActionUpdateOrganizer({
      supabase,
      body: {
        organizerType: "association",
        organizerName: "Structure forgée",
      } as ActionUpdateInput,
      current: historicalCurrent(),
    })).rejects.toThrow(/référencée|déclarée/i);
    expect(insertCalled).toBe(false);
  });

  it("resolves an existing persisted organizer when a PATCH selects it", async () => {
    const supabase = {
      from: () => ({
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({
          data: {
            id: "directory-association",
            name: "Association locale",
            normalized_name: "association locale",
            organizer_type: "association",
          },
          error: null,
        }),
      }),
    } as never;

    await expect(resolveActionUpdateOrganizer({
      supabase,
      body: {
        organizerType: "association",
        organizerId: "directory-association",
        organizerName: "Association locale",
      } as ActionUpdateInput,
      current: historicalCurrent(),
    })).resolves.toMatchObject({
      organizerType: "association",
      organizerId: "directory-association",
      organizerName: "Association locale",
      associationName: "Association locale",
    });
  });

  it("accepts a declared organizer in PATCH and persists its provenance without an id", async () => {
    const supabase = { from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: null, error: null }) }) } as never;
    await expect(resolveActionUpdateOrganizer({
      supabase,
      body: { organizerType: "company", organizerId: null, organizerName: "Société locale", preparationData: { organizerReferenceStatus: "declared_unreferenced" } } as ActionUpdateInput,
      current: historicalCurrent(),
    })).resolves.toMatchObject({ organizerId: null, organizerName: "Société locale", preparationData: { organizerReferenceStatus: "declared_unreferenced" } });
  });

  it("does not reuse the previous organizer id when the organizer type changes", async () => {
    const calls: Array<{ field: string; value: string }> = [];
    const supabase = {
      from: () => ({
        select() { return this; },
        eq(field: string, value: string) { calls.push({ field, value }); return this; },
        maybeSingle: async () => ({
          data: {
            id: "directory-student-association",
            name: "Association étudiante locale",
            normalized_name: "association etudiante locale",
            organizer_type: "student_association",
          },
          error: null,
        }),
      }),
    } as never;

    await expect(resolveActionUpdateOrganizer({
      supabase,
      body: {
        organizerType: "student_association",
        organizerName: "Association étudiante locale",
      } as ActionUpdateInput,
      current: historicalCurrent(),
    })).resolves.toMatchObject({
      organizerType: "student_association",
      organizerId: "directory-student-association",
    });
    expect(calls).not.toContainEqual({ field: "id", value: "directory-association" });
    expect(calls).toContainEqual({ field: "organizer_type", value: "student_association" });
  });
});
