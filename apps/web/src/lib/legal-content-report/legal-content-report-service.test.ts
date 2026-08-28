import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  LegalContentReportDecisionRecord,
  LegalContentReportRecord,
} from "./legal-content-report";

const sendEmailMock = vi.hoisted(() => vi.fn());
const sendCreatorInboxEmailMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/email", () => ({ sendEmail: sendEmailMock }));
vi.mock("@/lib/community/creator-inbox-email", () => ({
  sendCreatorInboxEmail: sendCreatorInboxEmailMock,
}));

const record: LegalContentReportRecord = {
  id: "report_123",
  createdAt: "2026-08-29T10:00:00.000Z",
  submittedByUserId: "user_123",
  notifierName: "Alice",
  notifierEmail: "alice@example.com",
  identityExceptionReason: null,
  contentUrl: "https://cleanmymap.fr/content/123",
  contentType: "commentaire",
  contentId: "123",
  allegationReason: "Un motif circonstancié de test est transmis.",
  goodFaithConfirmed: true,
  status: "open",
  creatorState: "new",
};

const decision: LegalContentReportDecisionRecord = {
  id: "decision_123",
  reportId: record.id,
  createdAt: "2026-08-29T10:01:00.000Z",
  actorAdminUserId: "admin_123",
  action: "content_removed",
  origin: "received_notification",
  reason: "Le contenu viole les règles applicables.",
  automatedMeansUsed: false,
  legalBasis: "Base légale de test",
  termsBasis: null,
  contentUrl: record.contentUrl,
  contentId: record.contentId,
  beforeState: {},
  afterState: {},
  executionStatus: "applied",
  executionErrorCode: null,
  auditOperationId: "audit_123",
  notifierNotificationStatus: "not_requested",
  authorNotificationStatus: "not_requested",
  notificationError: null,
};

describe("legal content report transactional emails", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    sendEmailMock.mockResolvedValue({ id: "email_123", status: "sent" });
    sendCreatorInboxEmailMock.mockResolvedValue(true);
  });

  it("exempts acknowledgement and creator inbox notifications while preserving attribution", async () => {
    const service = await import("./legal-content-report-service");

    await service.sendLegalContentReportAcknowledgement(record);
    await service.sendLegalContentReportCreatorNotification(record);

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user_123",
        quotaPolicy: "none",
        meta: { source: "legal_content_report", notification: "acknowledgement" },
      }),
    );
    expect(sendCreatorInboxEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user_123",
        quotaPolicy: "none",
        meta: { source: "legal_content_report", notification: "creator_inbox" },
      }),
    );
  });

  it("exempts notifier and authorized author decision notifications", async () => {
    const service = await import("./legal-content-report-service");

    await service.sendLegalContentReportDecisionToNotifier({
      record,
      decision,
      actorUserId: "admin_123",
    });
    await service.sendLegalContentReportDecisionToAuthor({
      authorEmail: "author@example.com",
      decision,
      allegationReason: record.allegationReason,
      actorUserId: "admin_123",
    });

    expect(sendEmailMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        actorUserId: "admin_123",
        quotaPolicy: "none",
        meta: { source: "legal_content_report", notification: "decision_notifier" },
      }),
    );
    expect(sendEmailMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        actorUserId: "admin_123",
        quotaPolicy: "none",
        meta: { source: "legal_content_report", notification: "decision_author" },
      }),
    );
  });
});
