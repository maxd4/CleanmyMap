import { beforeEach, describe, expect, it } from "vitest";
import { buildSubmitPayload, createActionMock, expectCreatedActionResponse, postSubmitPayload, resolveActionOrganizersMock, resolveActionParticipantsMock, resolveDefaultActionOrganizerIdsMock, resetSubmitRouteMocks } from "./route.submit.test.harness";

describe("POST /api/actions — participants et organisateurs", () => {
  beforeEach(() => {
    resetSubmitRouteMocks();
  });

  it("falls back to the admin organizer when no organizer is provided", async () => {
    const payload = buildSubmitPayload({
      associationName: "Association Sans Murs Paris 15",
      organizerType: "association",
    });

    const response = await postSubmitPayload(payload);

    await expectCreatedActionResponse(response);
    expect(resolveDefaultActionOrganizerIdsMock).toHaveBeenCalledWith({
      creatorUserId: "user-test-1",
      creatorIsGlobalAdmin: false,
    });
    expect(resolveActionOrganizersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizerAccounts: ["user-admin-default"],
      }),
    );
    expect(createActionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "pending",
      }),
    );
  }, 15000);

  it("passes manual participant accounts to the creation pipeline", async () => {
    resolveActionParticipantsMock.mockResolvedValueOnce({
      participants: [
        {
          userId: "user-manual-1",
          displayName: "Participant manuel",
          handle: "manual",
          sourceToken: "user-manual-1",
        },
      ],
      unresolvedTokens: [],
    });

    const payload = buildSubmitPayload({
      participantAccounts: ["user-manual-1"],
    });

    const response = await postSubmitPayload(payload);

    await expectCreatedActionResponse(response);
    expect(createActionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        manualParticipants: [
          {
            userId: "user-manual-1",
            displayName: "Participant manuel",
            handle: "manual",
            sourceToken: "user-manual-1",
          },
        ],
      }),
    );
  }, 15000);

  it("rejects unknown manual participant accounts", async () => {
    resolveActionParticipantsMock.mockResolvedValueOnce({
      participants: [],
      unresolvedTokens: ["missing-user"],
    });

    const payload = buildSubmitPayload({
      participantAccounts: ["missing-user"],
    });

    const response = await postSubmitPayload(payload);

    const body = (await response.json()) as {
      details?: { participantAccounts?: string[] };
    };
    expect(response.status).toBe(422);
    expect(body.details?.participantAccounts?.[0]).toContain("Comptes participants introuvables");
    expect(createActionMock).not.toHaveBeenCalled();
  }, 15000);
});
