import { beforeEach, describe, expect, it, vi } from "vitest";

const loadSnapshotMock = vi.hoisted(() => vi.fn());
const insertNotificationMock = vi.hoisted(() => vi.fn());
const notificationRows = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock("./participation/group-participation-read", () => ({
  loadActionParticipantImpactSnapshot: loadSnapshotMock,
}));

vi.mock("@/lib/logging/failure-log", () => ({
  logFailure: vi.fn(),
}));

function attribution(wasteKg: number | null) {
  return {
    wasteKg,
    wasteKind: wasteKg === null ? "unavailable" : "quote_part",
    wasteEquivalentSecKg: null,
    wasteMohsValue: wasteKg,
    wasteMohsSource: wasteKg === null ? null : "quote_part_collective_raw",
    cigaretteButts: 4,
    cigaretteButtsKind: "quote_part",
    cigaretteButtsProvenance: null,
    wasteInconsistent: false,
    cigaretteButtsInconsistent: false,
    wasteMohsEligible: wasteKg !== null,
    cigaretteButtsMohsEligible: true,
  } as const;
}

function snapshot(
  attributions: Map<string, ReturnType<typeof attribution>>,
  revision = "revision-1",
) {
  return { available: true, revision, attributions };
}

function createSupabaseMock() {
  const query = {
    select: vi.fn(() => query),
    in: vi.fn(() => query),
    eq: vi.fn(() => query),
    filter: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => ({ data: [...notificationRows], error: null })),
    insert: insertNotificationMock,
  };
  return { from: vi.fn(() => query) };
}

describe("action participant impact notifications", () => {
  beforeEach(() => {
    loadSnapshotMock.mockReset();
    insertNotificationMock.mockReset();
    notificationRows.length = 0;
    insertNotificationMock.mockImplementation(async (payload: Record<string, unknown>) => {
      const eventKey = (payload.payload as Record<string, unknown>).eventKey;
      if (notificationRows.some((row) => (row.payload as Record<string, unknown>).eventKey === eventKey)) {
        return { error: { code: "23505" } };
      }
      notificationRows.push({
        user_id: payload.user_id,
        payload: payload.payload,
        created_at: new Date().toISOString(),
      });
      return { error: null };
    });
  });

  it("notifies only an effective change for an already-confirmed participant", async () => {
    const previous = snapshot(new Map([["user-1", attribution(5)]]));
    loadSnapshotMock.mockResolvedValue(snapshot(new Map([["user-1", attribution(6)]])));
    const { emitActionParticipantImpactNotifications } = await import("./action-participant-impact-notifications");

    await expect(emitActionParticipantImpactNotifications({
      supabase: createSupabaseMock() as never,
      actionId: "action-1",
      previousSnapshot: previous,
    })).resolves.toBe(true);
    expect(insertNotificationMock).toHaveBeenCalledTimes(1);
    expect(insertNotificationMock.mock.calls[0][0]).toMatchObject({
      user_id: "user-1",
      type: "action_event",
      title: "Attribution personnelle mise à jour",
      payload: {
        subtype: "action_result_impact",
        actionId: "action-1",
        href: "/sections/rejoindre-une-action?tab=past&actionId=action-1",
      },
    });
  });

  it("deduplicates an identical recalculation and ignores a newly confirmed participant", async () => {
    const previous = snapshot(new Map([["user-1", attribution(5)]]));
    const current = snapshot(new Map([
      ["user-1", attribution(6)],
      ["new-user", attribution(3)],
    ]));
    loadSnapshotMock.mockResolvedValue(current);
    const { emitActionParticipantImpactNotifications } = await import("./action-participant-impact-notifications");
    const supabase = createSupabaseMock() as never;

    await emitActionParticipantImpactNotifications({ supabase, actionId: "action-1", previousSnapshot: previous });
    await emitActionParticipantImpactNotifications({ supabase, actionId: "action-1", previousSnapshot: previous });

    expect(insertNotificationMock).toHaveBeenCalledTimes(2);
    expect(notificationRows).toHaveLength(1);
    expect(insertNotificationMock.mock.calls[0][0].user_id).toBe("user-1");
  });

  it("does not emit a definitive attribution when the projection is unavailable", async () => {
    loadSnapshotMock.mockResolvedValue({ available: false, revision: null, attributions: new Map() });
    const { emitActionParticipantImpactNotifications } = await import("./action-participant-impact-notifications");

    await expect(emitActionParticipantImpactNotifications({
      supabase: createSupabaseMock() as never,
      actionId: "action-1",
      previousSnapshot: snapshot(new Map([["user-1", attribution(5)]])),
    })).resolves.toBe(false);
    expect(insertNotificationMock).not.toHaveBeenCalled();
  });

  it("keeps the same fingerprint distinct when persisted revisions move A to B to C to B", async () => {
    const { emitActionParticipantImpactNotifications } = await import("./action-participant-impact-notifications");
    const supabase = createSupabaseMock() as never;
    const transitions = [
      { previousValue: 5, value: 6, revision: "revision-b" },
      { previousValue: 6, value: 7, revision: "revision-c" },
      { previousValue: 7, value: 6, revision: "revision-d" },
    ];
    for (const transition of transitions) {
      loadSnapshotMock.mockResolvedValueOnce(snapshot(new Map([["user-1", attribution(transition.value)]]), transition.revision));
      await expect(emitActionParticipantImpactNotifications({
        supabase,
        actionId: "action-1",
        previousSnapshot: snapshot(new Map([["user-1", attribution(transition.previousValue)]]), `previous-${transition.revision}`),
      })).resolves.toBe(true);
    }

    expect(insertNotificationMock).toHaveBeenCalledTimes(3);
    expect(new Set(notificationRows.map((row) => (row.payload as Record<string, unknown>).eventKey)).size).toBe(3);
    const fingerprints = notificationRows.map(
      (row) => (row.payload as Record<string, unknown>).attributionFingerprint,
    );
    expect(fingerprints[0]).not.toBe(fingerprints[1]);
    expect(fingerprints[0]).toBe(fingerprints[2]);
  });

  it("does not lose concurrent transitions with distinct persisted revisions", async () => {
    const { emitActionParticipantImpactNotifications } = await import("./action-participant-impact-notifications");
    const supabase = createSupabaseMock() as never;
    loadSnapshotMock
      .mockResolvedValueOnce(snapshot(new Map([["user-1", attribution(6)]]), "revision-concurrent-a"))
      .mockResolvedValueOnce(snapshot(new Map([["user-1", attribution(7)]]), "revision-concurrent-b"));

    await Promise.all([
      emitActionParticipantImpactNotifications({
        supabase,
        actionId: "action-1",
        previousSnapshot: snapshot(new Map([["user-1", attribution(5)]]), "previous-a"),
      }),
      emitActionParticipantImpactNotifications({
        supabase,
        actionId: "action-1",
        previousSnapshot: snapshot(new Map([["user-1", attribution(6)]]), "previous-b"),
      }),
    ]);

    expect(insertNotificationMock).toHaveBeenCalledTimes(2);
    expect(new Set(notificationRows.map((row) => (row.payload as Record<string, unknown>).eventKey)).size).toBe(2);
  });

  it("treats a unique conflict as an idempotent retry", async () => {
    insertNotificationMock.mockResolvedValueOnce({ error: { code: "23505" } });
    const { emitActionParticipantImpactNotifications } = await import("./action-participant-impact-notifications");

    await expect(emitActionParticipantImpactNotifications({
      supabase: createSupabaseMock() as never,
      actionId: "action-1",
      previousSnapshot: snapshot(new Map([["user-1", attribution(5)]])),
    })).resolves.toBe(false);
  });
});
