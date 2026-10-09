import { beforeEach, describe, expect, it } from "vitest";
import { buildSubmitPayload, createActionMock, expectPendingActionCreation, getCurrentUserIdentityMock, pickTraceableActorNameMock, postSubmitPayload, requireAuthenticatedAccessMock, resetSubmitRouteMocks } from "./route.submit.test.harness";

describe("POST /api/actions — rôles et modération", () => {
  beforeEach(() => {
    resetSubmitRouteMocks();
  });

  it("does not persist a forged validated administrative state on HTTP creation", async () => {
    const response = await postSubmitPayload({
          associationName: "Action spontanée",
          organizerType: "spontaneous",
          actionDate: "2999-01-01",
          eventStartTime: "09:00",
          eventEndTime: "10:00",
          locationLabel: "Parc futur",
          actionPhase: "pre_action",
          organizerAccounts: ["user-test-1"],
          preparationData: {
            actionTitle: "Pré-action forgée",
            administrativeRequirements: {
              status: "validated",
              validatedAt: "2026-09-15T10:00:00.000Z",
              validatedByUserId: "attacker",
            },
          },
    });

    expect(response.status).toBe(201);
    expect(createActionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        payload: expect.objectContaining({
          actionPhase: "pre_action",
          preparationData: expect.not.objectContaining({
            administrativeRequirements: expect.anything(),
          }),
        }),
      }),
    );
  }, 15000);

  it("accepts a localhost max bypass through the central auth helper", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({
      ok: true,
      userId: "dev-max",
    });
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "dev-max",
      displayName: "Max local",
      firstName: null,
      username: "max-local",
      currentLevel: 1,
      actorNameOptions: ["Max local"],
      role: "max",
      activeRole: "max",
      badges: [],
    });
    pickTraceableActorNameMock.mockReturnValueOnce("Max local");

    const payload = buildSubmitPayload({
      actorName: "Max local",
      locationLabel: "Lieu max local",
      notes: "Bypass localhost explicite.",
      submissionMode: "complete",
    });

    const response = await postSubmitPayload(payload);

    expect(response.status).toBe(201);
    expectPendingActionCreation();
  }, 15000);

  it("does not auto-approve an elected account after switching to active admin", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-test-1",
      displayName: "Élu test",
      firstName: "Élu",
      username: "elu@example.org",
      currentLevel: 1,
      actorNameOptions: ["Élu test"],
      role: "elu",
      activeRole: "admin",
      badges: [],
    });

    const payload = buildSubmitPayload({
      actorName: "Élu test",
      locationLabel: "Lieu élu",
      notes: "Création normale malgré le rôle actif admin.",
      submissionMode: "complete",
    });

    const response = await postSubmitPayload(payload);

    expect(response.status).toBe(201);
    expectPendingActionCreation();
  }, 15000);

  it("keeps an elected account in the normal pending flow while active as elected", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "elu-1",
      displayName: "Élu test",
      firstName: "Élu",
      username: "elu@example.org",
      currentLevel: 1,
      actorNameOptions: ["Élu test"],
      role: "elu",
      activeRole: "elu",
      badges: [],
    });
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: true, userId: "elu-1" });

    const payload = buildSubmitPayload({
      actorName: "Élu test",
      locationLabel: "Lieu élu",
      notes: "Création normale avec le rôle actif élu.",
      submissionMode: "complete",
    });

    const response = await postSubmitPayload(payload);

    expect(response.status).toBe(201);
    expectPendingActionCreation();
  }, 15000);

  it("rejects unauthenticated submissions", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    const response = await postSubmitPayload({
          type: "action",
    });

    const body = (await response.json()) as { error?: string };
    expect(response.status).toBe(401);
    expect(body.error).toBe("Vous devez vous reconnecter pour continuer.");
  });
});
