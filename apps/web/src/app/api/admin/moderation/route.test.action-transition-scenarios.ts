import { expect, it, vi } from "vitest";
import { createActionSupabaseHarness } from "./route.test.helpers";

export type ModerationScenarioMocks = Record<string, ReturnType<typeof vi.fn>>;

export function registerActionTransitionScenarios({
  mocks,
}: {
  mocks: ModerationScenarioMocks;
}) {
  const {
    getSupabaseAdminClientMock,
    trackActionValidationBonusMock,
    trackActionRejectionMock,
    notifyActionValidationMock,
    notifyActionRejectionMock,
  } = mocks;

  it("runs approval progression and notification once on a real transition", async () => {
    getSupabaseAdminClientMock.mockReturnValue(createActionSupabaseHarness());

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "action",
          id: "action-1",
          status: "approved",
          confirmPhrase: "CONFIRMER MODERATION",
          edits: {},
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(trackActionValidationBonusMock).toHaveBeenCalledTimes(1);
    expect(trackActionValidationBonusMock).toHaveBeenCalledWith(
      expect.anything(),
      { actionId: "action-1" },
    );
    expect(notifyActionValidationMock).toHaveBeenCalledTimes(1);
    expect(notifyActionValidationMock).toHaveBeenCalledWith(
      expect.anything(),
      { actionId: "action-1", userId: "creator-1", revision: "revision-1" },
    );
  });

  it("does not replay approval effects when the action is already approved", async () => {
    getSupabaseAdminClientMock.mockReturnValue(
      createActionSupabaseHarness("approved"),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "action",
          id: "action-1",
          status: "approved",
          confirmPhrase: "CONFIRMER MODERATION",
          edits: {},
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(trackActionValidationBonusMock).not.toHaveBeenCalled();
    expect(notifyActionValidationMock).not.toHaveBeenCalled();
  });

  it("runs rejection progression once on a pending-to-rejected transition", async () => {
    getSupabaseAdminClientMock.mockReturnValue(createActionSupabaseHarness());

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "action",
          id: "action-1",
          status: "rejected",
          confirmPhrase: "CONFIRMER MODERATION",
          reason: "Dossier incomplet à vérifier.",
          edits: {},
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(trackActionRejectionMock).toHaveBeenCalledTimes(1);
    expect(trackActionRejectionMock).toHaveBeenCalledWith(
      expect.anything(),
      { actionId: "action-1" },
    );
    expect(notifyActionRejectionMock).toHaveBeenCalledTimes(1);
    expect(notifyActionRejectionMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        actionId: "action-1",
        userId: "creator-1",
        reason: "Dossier incomplet à vérifier.",
        revision: "revision-1",
      },
    );
    expect(notifyActionValidationMock).not.toHaveBeenCalled();
  });

  it("keeps the moderation mutation successful when approval side-effects fail", async () => {
    trackActionValidationBonusMock.mockRejectedValueOnce(
      new Error("progression unavailable"),
    );
    notifyActionValidationMock.mockRejectedValueOnce(
      new Error("notification unavailable"),
    );
    getSupabaseAdminClientMock.mockReturnValue(createActionSupabaseHarness());

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "action",
          id: "action-1",
          status: "approved",
          confirmPhrase: "CONFIRMER MODERATION",
          edits: {},
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(trackActionValidationBonusMock).toHaveBeenCalledTimes(1);
    expect(notifyActionValidationMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    { status: "approved" as const, progressionMock: "trackActionValidationBonusMock", notificationMock: "notifyActionValidationMock" },
    { status: "rejected" as const, progressionMock: "trackActionRejectionMock", notificationMock: "notifyActionRejectionMock" },
  ])(
    "keeps a persisted $status decision successful when the creator lookup fails",
    async ({ status, progressionMock, notificationMock }) => {
      getSupabaseAdminClientMock.mockReturnValue(
        createActionSupabaseHarness("pending", {
          creatorReadError: "creator lookup unavailable",
        }),
      );

      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/admin/moderation", {
          method: "POST",
          body: JSON.stringify({
            entityType: "action",
            id: "action-1",
            status,
            confirmPhrase: "CONFIRMER MODERATION",
            ...(status === "rejected" ? { reason: "Dossier interne." } : {}),
            edits: {},
          }),
        }),
      );

      expect(response.status).toBe(200);
      expect(mocks[progressionMock]).toHaveBeenCalledTimes(1);
      expect(mocks[notificationMock]).not.toHaveBeenCalled();
    },
  );
}
