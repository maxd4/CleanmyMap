import { beforeEach, describe, expect, it } from "vitest";
import { toContractCreatePayload } from "@/lib/actions/data-contract";
import {
  createInitialFormState,
} from "@/components/actions/action-declaration/payload";
import {
  buildPostActionRetentionLoopMock,
  buildQuickPreActionPayload,
  createActionMock,
  invalidateSnapshotsMock,
  mockAdminIdentity,
  postSubmitPayload,
  resolveActionOrganizersMock,
  resolveActionParticipantsMock,
  trackActionCreatedMock,
  trackServerEventMock,
  resetSubmitRouteMocks,
} from "./route.submit.test.harness";

describe("POST /api/actions — création standard et pré-action", () => {
  beforeEach(() => {
    resetSubmitRouteMocks();
  });

  it("creates an action from the dashboard form payload", async () => {
    const { POST } = await import("./route");

    const form = createInitialFormState("Test User");
    form.organizerType = "spontaneous";
    form.locationLabel = "Test lieu action";
    form.recordType = "action";
    form.wasteKg = "2.5";
    form.volunteersCount = "4";
    form.durationMinutes = "45";
    form.notes = "Formulaire bénévole de test";
    form.actionDate = "2026-04-22";

    const payload = toContractCreatePayload({
      actorName: "Test User",
      associationName: "Action spontanée",
      organizerType: "spontaneous",
      actionDate: form.actionDate,
      locationLabel: form.locationLabel,
      wasteKg: Number(form.wasteKg),
      cigaretteButts: 0,
      volunteersCount: Number(form.volunteersCount),
      durationMinutes: Number(form.durationMinutes),
      notes: form.notes,
      submissionMode: "quick",
    });

    const response = await POST(
      new Request("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    const body = (await response.json()) as {
      id?: string;
      error?: string;
      retentionLoop?: { badge: string | null; xpAwarded: number };
    };
    expect(response.status).toBe(201);
    expect(body.id).toBe("action-test-1");
    expect(body.retentionLoop).toMatchObject({ badge: null, xpAwarded: 0 });
    expect(createActionMock).toHaveBeenCalledTimes(1);
    expect(invalidateSnapshotsMock).toHaveBeenCalledWith(["api/actions", "api/actions/map"]);
    expect(createActionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "pending",
      }),
    );
    expect(resolveActionOrganizersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizerAccounts: [],
      }),
    );
    expect(resolveActionParticipantsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        participantAccounts: undefined,
        organizerIds: ["user-test-1"],
      }),
    );
    expect(trackActionCreatedMock).toHaveBeenCalledWith(expect.anything(), {
      actionId: "action-test-1",
      userId: "user-test-1",
    });
    expect(buildPostActionRetentionLoopMock).toHaveBeenCalledWith({}, {
      userId: "user-test-1",
      actionId: "action-test-1",
    });
    expect(trackServerEventMock).not.toHaveBeenCalled();
  }, 15000);

  it("keeps an admin complete action in the normal moderation flow", async () => {
    mockAdminIdentity({ activeRole: "admin" });
    const { POST } = await import("./route");

    const payload = toContractCreatePayload({
      actorName: "Test User",
      associationName: "Action spontanée",
      organizerType: "spontaneous",
      actionDate: "2026-04-22",
      locationLabel: "Test lieu action",
      wasteKg: 2.5,
      cigaretteButts: 0,
      volunteersCount: 4,
      durationMinutes: 45,
      notes: "Formulaire bénévole de test",
      submissionMode: "complete",
    });

    const response = await POST(
      new Request("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(201);
    expect(createActionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "pending",
      }),
    );
  }, 15000);

  it("keeps a normal future pre-action pending while publishing it through the map boundary", async () => {
    const { POST } = await import("./route");

    const payload = toContractCreatePayload({
      actorName: "Test User",
      associationName: "Action spontanée",
      organizerType: "spontaneous",
      actionDate: "2999-01-01",
      actionPhase: "pre_action",
      locationLabel: "Parc futur",
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 3,
      durationMinutes: 30,
      notes: "Préparation de l'action future",
      submissionMode: "quick",
    });

    const response = await POST(
      new Request("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(201);
    expect(createActionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "pending",
        payload: expect.objectContaining({
          actionDate: "2999-01-01",
          actionPhase: "pre_action",
        }),
      }),
    );
    expect(invalidateSnapshotsMock).toHaveBeenCalledWith(["api/actions", "api/actions/map"]);
  }, 15000);

  it("accepts quick pre-action submissions without waste and keeps them pending", async () => {
    const payload = buildQuickPreActionPayload();
    const response = await postSubmitPayload(payload);

    const body = (await response.json()) as { id?: string; error?: string };
    expect(response.status).toBe(201);
    expect(body.id).toBe("action-test-1");
    expect(createActionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "pending",
      }),
    );
  }, 15000);

  it("keeps an admin pre-action in the normal moderation flow", async () => {
    mockAdminIdentity({ activeRole: "admin" });

    const payload = buildQuickPreActionPayload();
    const response = await postSubmitPayload(payload);

    expect(response.status).toBe(201);
    expect(createActionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "pending",
      }),
    );
  }, 15000);

  it("keeps an admin-like draft action pending instead of submitting it for validation", async () => {
    mockAdminIdentity();
    const { POST } = await import("./route");

    const payload = toContractCreatePayload({
      actorName: "Test User",
      associationName: "Action spontanée",
      organizerType: "spontaneous",
      actionDate: "2026-04-22",
      actionPhase: "post_action_draft",
      locationLabel: "Test lieu action",
      wasteKg: 2.5,
      cigaretteButts: 0,
      volunteersCount: 4,
      durationMinutes: 45,
      notes: "Brouillon admin de test",
      submissionMode: "complete",
      recordType: "action",
    });

    const response = await POST(
      new Request("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(201);
    expect(createActionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "pending",
        payload: expect.objectContaining({
          actionPhase: "post_action_draft",
        }),
      }),
    );
  }, 15000);
});
