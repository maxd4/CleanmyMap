import { beforeEach, describe, expect, it } from "vitest";
import { toContractCreatePayload } from "@/lib/actions/data-contract";
import { createActionMock, createSignalementMock, getSupabaseServerClientMock, postSubmitPayload, resetSubmitRouteMocks } from "./route.submit.test.harness";

describe("POST /api/actions — Quick Signalement", () => {
  beforeEach(() => {
    resetSubmitRouteMocks();
  });

  it("routes Quick Signalement spot creation to the canonical source", async () => {
    getSupabaseServerClientMock.mockReturnValue({});

    const payload = toContractCreatePayload({
      recordType: "spot",
      actorName: "Test User",
      associationName: "Action spontanée",
      actionDate: "2026-04-22",
      locationLabel: "Signalement test",
      latitude: 48.8566,
      longitude: 2.3522,
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 1,
      durationMinutes: 0,
      notes: "signalement",
      preparationData: {
        expectedWasteCategories: ["plastic", "broken_glass"],
      },
      submissionMode: "quick",
    });

    const response = await postSubmitPayload(payload);

    const body = (await response.json()) as { id?: string; source?: string };
    expect(response.status).toBe(201);
    expect(body.id).toBe("spot-test-1");
    expect(body.source).toBe("trash_spotter_spots");
    expect(createSignalementMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user-test-1",
        type: "spot",
        label: "Signalement test",
        latitude: 48.8566,
        longitude: 2.3522,
        wasteCategories: ["plastic", "broken_glass"],
        actorName: "Test User",
        consentGranted: true,
      }),
    );
    expect(createActionMock).not.toHaveBeenCalled();
  }, 15000);

  it("routes Quick Signalement clean_place without Waste categories", async () => {
    getSupabaseServerClientMock.mockReturnValue({});

    const payload = toContractCreatePayload({
      recordType: "clean_place",
      actorName: "Test User",
      associationName: "Action spontanée",
      actionDate: "2026-04-22",
      locationLabel: "Lieu propre test",
      latitude: 48.8566,
      longitude: 2.3522,
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 1,
      durationMinutes: 0,
      notes: "Preuve visuelle jointe",
      preparationData: null,
      submissionMode: "quick",
    });

    const response = await postSubmitPayload(payload);

    expect(response.status).toBe(201);
    expect(createSignalementMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user-test-1",
        type: "clean_place",
        label: "Lieu propre test",
        latitude: 48.8566,
        longitude: 2.3522,
      }),
    );
    const signalementParams = createSignalementMock.mock.calls.at(-1)?.[1];
    expect(signalementParams?.wasteCategories).toBeUndefined();
    expect(signalementParams?.notes).toBe("Preuve visuelle jointe");
    expect(createActionMock).not.toHaveBeenCalled();
  }, 15000);
});
