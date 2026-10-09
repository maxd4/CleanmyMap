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
    })).rejects.toThrow(/structure existante/i);
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
});
