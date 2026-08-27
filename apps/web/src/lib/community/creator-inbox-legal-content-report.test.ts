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
    });

    expect(item.source).toBe("legal_content_report");
    expect(item.canReview).toBe(false);
    expect(item.canDelete).toBe(false);
    expect(item.details).toContainEqual({ label: "URL du contenu", value: "https://cleanmymap.fr/content/1" });
    expect(item.context).not.toContain("copie brute du contenu tiers");
    expect(formatCreatorInboxSourceLabel(item.source, "fr")).toBe("Notification de contenu illicite");
  });
});
