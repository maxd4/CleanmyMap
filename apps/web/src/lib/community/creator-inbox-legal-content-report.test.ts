import { describe, expect, it } from "vitest";
import { buildLegalContentReportInboxItem, formatCreatorInboxSourceLabel } from "./creator-inbox";

describe("creator inbox legal content reports", () => {
  it("maps the dedicated report without copying third-party content", () => {
    const item = buildLegalContentReportInboxItem({
      id: "report-1",
      createdAt: "2026-08-27T10:00:00.000Z",
      submittedByUserId: null,
      notifierName: null,
      notifierEmail: null,
      identityExceptionReason: "exception",
      contentUrl: "https://cleanmymap.fr/content/1",
      contentType: "publication",
      contentId: "content-1",
      allegationReason: "Le motif circonstancié est conservé ici, pas la copie brute.",
      goodFaithConfirmed: true,
      status: "open",
      creatorState: "new",
      latestDecision: {
        id: "decision-1",
        reportId: "report-1",
        createdAt: "2026-08-27T10:01:00.000Z",
        actorAdminUserId: "admin-1",
        action: "content_removed",
        origin: "received_notification",
        reason: "Motif administratif suffisamment détaillé.",
        automatedMeansUsed: false,
        legalBasis: "Article 16 DSA",
        termsBasis: null,
        contentUrl: "https://cleanmymap.fr/content/1",
        contentId: "content-1",
        beforeState: {},
        afterState: {},
        executionStatus: "failed",
        executionErrorCode: "content_not_found",
        auditOperationId: "audit-1",
        notifierNotificationStatus: "sent",
        authorNotificationStatus: "not_requested",
        notificationError: null,
      },
    });

    expect(item.source).toBe("legal_content_report");
    expect(item.canReview).toBe(true);
    expect(item.canDelete).toBe(false);
    expect(item.details).toContainEqual({ label: "URL du contenu", value: "https://cleanmymap.fr/content/1" });
    expect(item.context).not.toContain("copie brute du contenu tiers");
    expect(item.details).toContainEqual({ label: "État d'exécution", value: "Échec d'exécution" });
    expect(item.details).toContainEqual({ label: "Code d'exécution", value: "content_not_found" });
    expect(formatCreatorInboxSourceLabel(item.source, "fr")).toBe("Notification de contenu illicite");
  });
});
