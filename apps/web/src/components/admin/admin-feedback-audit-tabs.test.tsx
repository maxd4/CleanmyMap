import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./creator-inbox-panel", () => ({
  CreatorInboxPanel: () => <div>creator-inbox-panel</div>,
}));

import { AdminFeedbackAuditTabs } from "./admin-feedback-audit-tabs";

describe("AdminFeedbackAuditTabs", () => {
  it("exposes the two administrative surfaces as tabs", () => {
    const markup = renderToStaticMarkup(
      <AdminFeedbackAuditTabs feedbackItems={[]} auditEntries={[]} />,
    );

    expect(markup).toContain("Retours utilisateurs");
    expect(markup).toContain("Journal administrateurs");
    expect(markup).toContain("creator-inbox-panel");
    expect(markup).toContain('role="tablist"');
  });
});
