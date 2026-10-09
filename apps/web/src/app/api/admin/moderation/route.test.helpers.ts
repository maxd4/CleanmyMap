import { vi } from "vitest";

export function createActionSupabaseHarness(
  initialStatus: "pending" | "approved" | "rejected" = "pending",
  options: { creatorReadError?: string } = {},
) {
  let row: Record<string, unknown> = {
    id: "action-1",
    updated_at: "revision-1",
    status: initialStatus,
    moderation_visibility: "visible",
    created_by_clerk_id: "creator-1",
    action_date: "2026-08-20",
    location_label: "Lieu interne",
    latitude: null,
    longitude: null,
    waste_kg: 1,
    cigarette_butts: 2,
    volunteers_count: 3,
    duration_minutes: 30,
    actor_name: "Auteur interne",
    notes: null,
  };

  const selectMock = vi.fn((columns: string) => ({
    eq: vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue({
        data:
          options.creatorReadError && columns === "created_by_clerk_id"
            ? null
            : columns === "id"
            ? { id: row.id }
            : columns.includes("moderation_visibility") &&
                !columns.startsWith("status, moderation_visibility")
              ? {
                  moderation_visibility: row.moderation_visibility,
                  hidden_at: row.hidden_at ?? null,
                  hidden_by_clerk_id: row.hidden_by_clerk_id ?? null,
                  hidden_reason: row.hidden_reason ?? null,
                }
              : row,
        error:
          options.creatorReadError && columns === "created_by_clerk_id"
            ? { message: options.creatorReadError }
            : null,
      }),
    })),
  }));

  const updateMock = vi.fn((updates: Record<string, unknown>) => {
    row = { ...row, ...updates };
    return {
      eq: vi.fn(() => ({
        select: vi.fn((columns: string) => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: columns.includes("moderation_visibility")
              ? {
                  moderation_visibility: row.moderation_visibility,
                  hidden_at: row.hidden_at ?? null,
                  hidden_by_clerk_id: row.hidden_by_clerk_id ?? null,
                  hidden_reason: row.hidden_reason ?? null,
                }
              : columns.includes("updated_at")
                ? { id: row.id, updated_at: row.updated_at }
                : { id: row.id },
            error: null,
          }),
        })),
      })),
    };
  });

  return {
    from: vi.fn((table: string) => {
      if (table !== "actions") {
        throw new Error(`Unexpected table ${table}`);
      }
      return { select: selectMock, update: updateMock };
    }),
    updateMock,
  };
}
