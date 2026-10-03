import { beforeEach, describe, expect, it } from "vitest";
import { createActionMock, resolveActionOrganizersMock, resetSubmitRouteMocks } from "./route.submit.test.harness";

describe("POST /api/actions — validation des mesures", () => {
  beforeEach(() => {
    resetSubmitRouteMocks();
  });

  it("requires a structure type for new actions", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify({
          actorName: "Test User",
          associationName: "Action spontanée",
          actionDate: "2026-04-22",
          locationLabel: "Test lieu action",
          wasteKg: 1,
          cigaretteButts: 0,
          volunteersCount: 1,
          durationMinutes: 30,
        }),
      }),
    );

    const body = (await response.json()) as { details?: { organizerType?: string[] } };
    expect(response.status).toBe(422);
    expect(body.details?.organizerType?.[0]).toContain("type de structure");
    expect(createActionMock).not.toHaveBeenCalled();
  });

  it("rejects volunteer actions without a waste or cigarette measurement", async () => {
    const { POST } = await import("./route");

    const payload = {
      type: "action",
      source: "web_form",
      location: {
        label: "Test lieu action",
      },
      dates: {
        observedAt: "2026-04-22",
      },
      metadata: {
        associationName: "Action spontanée",
        organizerType: "spontaneous",
        wasteKg: null,
        cigaretteButts: null,
        volunteersCount: 1,
        durationMinutes: 45,
        notes: "Formulaire bénévole de test",
      },
    };

    const response = await POST(
      new Request("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    const body = (await response.json()) as {
      details?: { wasteKg?: string[] };
    };
    expect(response.status).toBe(422);
    expect(body.details?.wasteKg?.[0]).toContain("une mesure de déchets ou de mégots");
    expect(createActionMock).not.toHaveBeenCalled();
    expect(resolveActionOrganizersMock).not.toHaveBeenCalled();
  }, 15000);
});
