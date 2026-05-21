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
          meta: {
            source: "route_tracker",
            kind: "pageview",
            pagePath: "/profil",
          },
          step: "page_view",
          mode: "complete",
        },
        {
          at: subDays(now, 9).toISOString(),
          user_id: otherUserId,
          session_id: "session-2",
          meta: {
            source: "route_tracker",
            kind: "pageview",
            pagePath: "/community",
          },
          step: "page_view",
          mode: "complete",
        },
        {
          at: subDays(now, 8).toISOString(),
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
      communityEvents: [
        {
          id: "event-1",
          created_at: subDays(now, 18).toISOString(),
          organizer_clerk_id: userId,
          title: "Ramassage",
          event_date: subDays(now, 12).toISOString(),
          location_label: "Paris 11",
          description: "Test",
        },
      ],
      eventRsvps: [
        {
          event_id: "event-1",
          participant_clerk_id: userId,
          status: "yes" as const,
          updated_at: subDays(now, 17).toISOString(),
        },
        {
          event_id: "event-1",
          participant_clerk_id: otherUserId,
          status: "maybe" as const,
          updated_at: subDays(now, 16).toISOString(),
        },
      ],
      appNotifications: [
        {
          id: "notif-1",
          user_id: userId,
          type: "community",
          title: "Nouveau message",
          content: "Un nouvel événement a été créé",
          read_at: null,
          created_at: subDays(now, 6).toISOString(),
        },
        {
          id: "notif-2",
          user_id: otherUserId,
          type: "system",
          title: "Mise à jour",
          content: "Test",
          read_at: subDays(now, 5).toISOString(),
          created_at: subDays(now, 5).toISOString(),
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
    expect(signals.infrastructureInput.usage?.monthlyPageViews).toBe(2);
    expect(signals.infrastructureInput.usage?.monthlyEmailsSent).toBe(1);
    expect(signals.infrastructureInput.usage?.monthlyPdfExports).toBe(1);
    expect(signals.infrastructureInput.usage?.monthlyRealtimeEvents).toBeGreaterThan(0);
    expect(signals.codexUsage?.weekCount).toBe(0);
    expect(signals.signalBreakdown?.traffic.pageViewEvents).toBe(2);
    expect(signals.signalBreakdown?.traffic.legacyPageViewEvents).toBe(2);
    expect(signals.signalBreakdown?.traffic.distinctRoutes).toBe(2);
    expect(signals.signalBreakdown?.traffic.topRoutes[0]?.path).toBe("/community");
    expect(signals.signalBreakdown?.community.events).toBe(1);
    expect(signals.signalBreakdown?.community.notifications).toBe(2);
    expect(signals.signalBreakdown?.community.unreadNotifications).toBe(1);
    expect(signals.signalBreakdown?.communication.emailsSent).toBe(2);
    expect(signals.signalBreakdown?.communication.pdfExports).toBe(1);
    expect(signals.highlights.some((item) => item.label === "Pages vues CleanMyMap")).toBe(true);
    expect(signals.highlights.some((item) => item.label === "Événements communauté")).toBe(true);
    expect(signals.highlights.some((item) => item.label === "Notifications non lues")).toBe(true);
    expect(signals.highlights.some((item) => item.label === "Routes distinctes")).toBe(true);
    expect(signals.notes[0]).toContain("tables opérationnelles CleanMyMap");
    expect(signals.notes.some((note) => note.includes("page_view"))).toBe(true);
  });
});
