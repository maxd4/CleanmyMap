import { describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const listSnapshotsMock = vi.hoisted(() =>
  vi.fn(async () => [
    {
      id: "codex-2026-05-12",
      snapshotKey: "cleanmymap-codex-usage",
      weekStart: "2026-05-12",
      weekEnd: "2026-05-18",
      generatedAt: "2026-05-19T08:00:00.000Z",
      version: "environmental-impact-estimator-2026.05-v1",
      source: "manual",
      sessionCount: 4,
      conversationCount: 8,
      turnCount: 32,
      toolCallCount: 10,
      shellCommandCount: 12,
      fileTouchCount: 18,
      testRunCount: 4,
      changedLineCount: 480,
      activeMinutes: 210,
      estimatedKgCo2eProxy: 0.42,
      confidencePercent: 88,
      uncertaintyPercent: 12,
      notes: ["Semaine test"],
      meta: {},
    },
  ]),
);
const buildSnapshotMock = vi.hoisted(() =>
  vi.fn(() => ({
    id: "codex-2026-05-19",
    snapshotKey: "cleanmymap-codex-usage",
    weekStart: "2026-05-19",
    weekEnd: "2026-05-25",
    generatedAt: "2026-05-26T08:00:00.000Z",
    version: "environmental-impact-estimator-2026.05-v1",
    source: "manual",
    sessionCount: 5,
    conversationCount: 9,
    turnCount: 36,
    toolCallCount: 12,
    shellCommandCount: 14,
    fileTouchCount: 20,
    testRunCount: 5,
    changedLineCount: 520,
    activeMinutes: 240,
    estimatedKgCo2eProxy: 0.51,
    confidencePercent: 90,
    uncertaintyPercent: 10,
    notes: ["Semaine enregistrée"],
    meta: {},
  })),
);
const upsertSnapshotMock = vi.hoisted(() => vi.fn(async () => undefined));
const buildMonthlyMock = vi.hoisted(() =>
  vi.fn((snapshots: Array<{ estimatedKgCo2eProxy: number }>) => ({
    generatedAt: "2026-05-26T08:00:00.000Z",
    windowWeeks: 4,
    source: "manual",
    weekCount: snapshots.length,
    sessionCount: 9,
    conversationCount: 17,
    turnCount: 68,
    toolCallCount: 22,
    shellCommandCount: 26,
    fileTouchCount: 38,
    testRunCount: 9,
    changedLineCount: 1000,
    activeMinutes: 450,
    monthlyEquivalent: {
      sessionCount: 9,
      conversationCount: 17,
      turnCount: 68,
      toolCallCount: 22,
      shellCommandCount: 26,
      fileTouchCount: 38,
      testRunCount: 9,
      changedLineCount: 1000,
      activeMinutes: 450,
      estimatedKgCo2eProxy: 1.19,
    },
    estimatedKgCo2eProxy: 1.19,
    confidencePercent: 89,
    uncertaintyPercent: 11,
    notes: ["Agrégation test"],
    weeklySnapshots: snapshots,
  })),
);

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  adminAccessErrorJsonResponse: () => new Response("forbidden", { status: 403 }),
}));

vi.mock("@/lib/environmental-impact-estimator", () => ({
  buildCodexUsageWeeklySnapshot: buildSnapshotMock,
  listCodexUsageWeeklySnapshots: listSnapshotsMock,
  upsertCodexUsageWeeklySnapshot: upsertSnapshotMock,
  buildCodexMonthlyUsageEstimate: buildMonthlyMock,
}));

import { GET, POST } from "./route";

describe("admin codex usage route", () => {
  it("rejects non-admin access", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" });

    const response = await GET(new Request("http://localhost/api/admin/codex-usage"));

    expect(response.status).toBe(403);
    expect(listSnapshotsMock).not.toHaveBeenCalled();
  });

  it("returns the current codex history for admins", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({ ok: true, userId: "admin_1" });

    const response = await GET(
      new Request("http://localhost/api/admin/codex-usage?historyLimit=6"),
    );
    const payload = (await response.json()) as {
      status: string;
      aggregate: { estimatedKgCo2eProxy: number };
      snapshots: Array<{ weekStart: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
    expect(payload.aggregate.estimatedKgCo2eProxy).toBe(1.19);
    expect(payload.snapshots).toHaveLength(1);
    expect(listSnapshotsMock).toHaveBeenCalledWith(6);
  });

  it("stores a manual weekly codex snapshot", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({ ok: true, userId: "admin_1" });

    const response = await POST(
      new Request("http://localhost/api/admin/codex-usage?historyLimit=6", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: "2026-05-19",
          weekEnd: "2026-05-25",
          sessionCount: 5,
          conversationCount: 9,
          turnCount: 36,
          toolCallCount: 12,
          shellCommandCount: 14,
          fileTouchCount: 20,
          testRunCount: 5,
          changedLineCount: 520,
          activeMinutes: 240,
          source: "manual",
          notes: ["Semaine enregistrée"],
        }),
      }),
    );
    const payload = (await response.json()) as {
      status: string;
      triggeredBy: string;
      snapshot: { weekStart: string; estimatedKgCo2eProxy: number };
      aggregate: { estimatedKgCo2eProxy: number };
    };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
    expect(payload.triggeredBy).toBe("admin-manual");
    expect(payload.snapshot.weekStart).toBe("2026-05-19");
    expect(payload.aggregate.estimatedKgCo2eProxy).toBe(1.19);
    expect(buildSnapshotMock).toHaveBeenCalled();
    expect(upsertSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        weekStart: "2026-05-19",
        sessionCount: 5,
        estimatedKgCo2eProxy: 0.51,
      }),
    );
  });
});
