import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminOperationsAuditPanel } from "./admin-operations-audit-panel";

describe("AdminOperationsAuditPanel", () => {
  it("renders a read-only operation journal without message content", () => {
    const markup = renderToStaticMarkup(
      <AdminOperationsAuditPanel
        entries={[
          {
            operationId: "operation-1",
            at: "2026-09-15T12:00:00.000Z",
            actorUserId: "admin-1",
            actorLabel: "Admin",
            operationType: "admin_operation",
            outcome: "success",
            targetId: "feedback-1",
            details: {
              operation: "feedback_private_reply_sent",
              targetUserId: "user-1",
              messageSent: true,
            },
          },
        ]}
      />,
    );

    expect(markup).toContain("Journal administrateurs");
    expect(markup).toContain("feedback_private_reply_sent");
    expect(markup).toContain("feedback-1");
    expect(markup).not.toContain("content");
    expect(markup).not.toContain("textarea");
  });
});
