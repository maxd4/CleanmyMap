import { subDays } from "date-fns";
import { describe, expect, it } from "vitest";
import { buildEnvironmentalImpactProjectSignals } from "./project-signals";

describe("environmental impact project signals", () => {
  it("builds project-specific site, user and monthly usage inputs", () => {
    const now = new Date();
    const userId = "user_1";
    const otherUserId = "user_2";

    const rows = {
      profiles: [{ id: userId, created_at: subDays(now, 100).toISOString() }],
      actions: [
        {
          id: "action-1",
          created_at: subDays(now, 12).toISOString(),
          created_by_clerk_id: userId,
          latitude: 48.8566,
          longitude: 2.3522,
          status: "approved",
        },
        {
          id: "action-2",
          created_at: subDays(now, 42).toISOString(),
          created_by_clerk_id: otherUserId,
          latitude: null,
          longitude: null,
          status: "pending",
        },
      ],
      spots: [
        {
          created_at: subDays(now, 20).toISOString(),
          created_by_clerk_id: userId,
          latitude: 48.85,
          longitude: 2.34,
          status: "validated",
        },
      ],
      funnelEvents: [
        {
          at: subDays(now, 10).toISOString(),
          user_id: userId,
          session_id: "session-1",
          step: "view_new",
          mode: "complete",
        },
        {
          at: subDays(now, 40).toISOString(),
          user_id: otherUserId,
          session_id: "session-2",
          step: "view_new",
          mode: "quick",
        },
      ],
      progressionEvents: [
        {
          created_at: subDays(now, 8).toISOString(),
          user_id: userId,
          event_type: "spot_created",
          status_phase: "validated",
        },
      ],
      reports: [
        {
          created_at: subDays(now, 15).toISOString(),
          owner_clerk_id: userId,
          file_kind: "pdf",
        },
        {
          created_at: subDays(now, 45).toISOString(),
          owner_clerk_id: otherUserId,
          file_kind: "csv",
        },
      ],
      trainingExamples: [
        {
          action_id: "action-1",
          created_at: subDays(now, 9).toISOString(),
          photos: [{ size: 1_500_000 }, { size: 500_000 }],
          status: "labelled",
        },
        {
          action_id: "action-2",
          created_at: subDays(now, 50).toISOString(),
          photos: [{ size: 2_000_000 }],
          status: "pending_label",
        },
      ],
      serviceEmails: [
        {
          created_at: subDays(now, 7).toISOString(),
          actor_user_id: userId,
          recipient_count: 2,
          status: "sent",
        },
        {
          created_at: subDays(now, 35).toISOString(),
          actor_user_id: otherUserId,
          recipient_count: 1,
          status: "sent",
        },
      ],
    };

    const signals = buildEnvironmentalImpactProjectSignals(rows, {
      generatedAt: now.toISOString(),
      userId,
    });

    expect(signals.launchedAt).toBeDefined();
    expect(signals.accountCreatedAt).toBeDefined();
    expect(signals.siteInput.pageViews).toBe(2);
    expect(signals.userInput.pageViews).toBe(1);
    expect(signals.siteInput.pdfExports).toBe(1);
    expect(signals.userInput.pdfExports).toBe(1);
    expect(signals.siteInput.aiCalls).toBe(2);
    expect(signals.userInput.aiCalls).toBe(1);
    expect(signals.infrastructureInput.usage?.monthlyPageViews).toBe(1);
    expect(signals.infrastructureInput.usage?.monthlyEmailsSent).toBe(1);
    expect(signals.infrastructureInput.usage?.monthlyPdfExports).toBe(1);
    expect(signals.highlights.some((item) => item.label === "Pages vues CleanMyMap")).toBe(true);
    expect(signals.notes[0]).toContain("tables opérationnelles CleanMyMap");
  });
});
