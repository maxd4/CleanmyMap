import { expect, it, vi } from "vitest";

export type ModerationScenarioMocks = Record<string, ReturnType<typeof vi.fn>>;

export function registerActionFormScenario({
  mocks,
}: {
  mocks: ModerationScenarioMocks;
}) {
  const {
    getSupabaseAdminClientMock,
    appendAdminOperationAuditMock,
    loadActionOrganizerIdsForActionMock,
    refreshProgressionProfileMock,
    syncUserActionProgressionMock,
    invalidatePublicSurfaceSnapshotsByRouteMock,
  } = mocks;

  it("updates action form fields and status in one admin operation", async () => {
    let currentImpact: {
      status: "pending" | "approved" | "rejected";
      moderation_visibility: "visible" | "hidden";
      created_by_clerk_id: string;
      waste_kg: number;
      cigarette_butts: number;
      volunteers_count: number;
      duration_minutes: number;
      notes: string | null;
    } = {
      status: "pending",
      moderation_visibility: "visible",
      created_by_clerk_id: "creator-1",
      waste_kg: 1,
      cigarette_butts: 0,
      volunteers_count: 1,
      duration_minutes: 30,
      notes: null,
    };
    const updateMock = vi.fn((updates: Record<string, unknown>) => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "action-1" },
            error: null,
          }),
        })),
      })),
      updates,
    }));
    const fromMock = vi.fn((table: string) => {
      if (table !== "actions") {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        select: vi.fn((columns: string) => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: columns.includes("created_by_clerk_id")
                ? currentImpact
                : {
                    action_date: "2026-04-20",
                    location_label: "Ancien lieu",
                    latitude: null,
                    longitude: null,
                    waste_kg: 1,
                    cigarette_butts: 0,
                    volunteers_count: 1,
                    duration_minutes: 30,
                    actor_name: "Ancien auteur",
                    notes: "Ancienne note",
                  },
              error: null,
            }),
          })),
        })),
        update: vi.fn((updates: Record<string, unknown>) => {
          currentImpact = {
            status: updates["status"] as "pending" | "approved" | "rejected",
            moderation_visibility: "visible",
            created_by_clerk_id: "creator-1",
            waste_kg: updates["waste_kg"] as number,
            cigarette_butts: updates["cigarette_butts"] as number,
            volunteers_count: updates["volunteers_count"] as number,
            duration_minutes: updates["duration_minutes"] as number,
            notes: updates["notes"] as string,
          };
          return updateMock(updates);
        }),
      };
    });
    getSupabaseAdminClientMock.mockReturnValue({ from: fromMock });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "action",
          id: "action-1",
          status: "pending",
          confirmPhrase: "CONFIRMER MODERATION",
          reason: "Correction des données terrain validée.",
          edits: {
            actorName: "Marie Admin",
            associationName: "Action spontanée",
            actionDate: "2026-04-22",
            locationLabel: "Canal Saint-Martin",
            wasteKg: 3.2,
            cigaretteButts: 120,
            volunteersCount: 4,
            durationMinutes: 75,
            notes: "Corrigé par admin",
            wasteBreakdown: {
              megotsKg: 0.4,
              megotsCondition: "humide",
              triQuality: "moyenne",
            },
          },
        }),
      }),
    );

    const body = (await response.json()) as { status?: string };
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
        actor_name: "Marie Admin",
        action_date: "2026-04-22",
        location_label: "Canal Saint-Martin",
        waste_kg: 3.2,
        cigarette_butts: 120,
        volunteers_count: 4,
        duration_minutes: 75,
      }),
    );
    expect(updateMock.mock.calls[0]?.[0]["notes"]).toContain("Corrigé par admin");
    expect(updateMock.mock.calls[0]?.[0]["notes"]).toContain("[cmm-meta]");
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "success",
        targetId: "action-1",
        details: expect.objectContaining({
          operation: "correct_impact",
          reason: "Correction des données terrain validée.",
          previousValue: expect.objectContaining({
            status: "pending",
            moderationVisibility: "visible",
            wasteKg: 1,
            cigaretteButts: 0,
            volunteersCount: 1,
            durationMinutes: 30,
            wasteBreakdownPresent: false,
          }),
          newValue: expect.objectContaining({
            status: "pending",
            moderationVisibility: "visible",
            wasteKg: 3.2,
            cigaretteButts: 120,
            volunteersCount: 4,
            durationMinutes: 75,
            wasteBreakdownPresent: true,
          }),
          refreshedProgressionUserIds: ["creator-1", "organizer-1"],
          publicSurfaceSnapshotsInvalidated: true,
        }),
      }),
    );
    expect(loadActionOrganizerIdsForActionMock).toHaveBeenCalledWith(
      expect.anything(),
      "action-1",
      "creator-1",
    );
    expect(syncUserActionProgressionMock).toHaveBeenCalledTimes(2);
    expect(refreshProgressionProfileMock).toHaveBeenCalledTimes(2);
    expect(invalidatePublicSurfaceSnapshotsByRouteMock).toHaveBeenCalledWith([
      "api/actions",
      "api/actions/map",
    ]);
  });

}
