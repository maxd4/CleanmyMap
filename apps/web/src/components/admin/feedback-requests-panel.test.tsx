import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  buildFeedbackStatusUpdatePayload,
  FeedbackRequestsPanel,
} from "./feedback-requests-panel";

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

const item = {
  id: "report-1",
  createdAt: "2026-08-27T09:00:00.000Z",
  submittedByUserId: "user-1",
  submittedByDisplayName: "display-name",
  submittedByEmail: null,
  submittedByRole: "benevole",
  reportType: "bug" as const,
  title: "Titre",
  description: "Description suffisamment longue.",
  pagePath: "/feedback",
  source: "feedback_section" as const,
  status: "open" as const,
  creatorState: "new" as const,
};

describe("FeedbackRequestsPanel reason flow", () => {
  it("trims reason in the PATCH payload", () => {
    expect(
      buildFeedbackStatusUpdatePayload({
        reportId: "report-1",
        status: "treated",
        reason: "  Motif de décision  ",
      }),
    ).toEqual({
      reportId: "report-1",
      status: "treated",
      reason: "Motif de décision",
    });
  });

  it("renders a required bounded reason field and disabled decision buttons initially", () => {
    const markup = renderToStaticMarkup(<FeedbackRequestsPanel initialItems={[item]} />);

    expect(markup).toContain("Motif de décision");
    expect(markup).toContain('minLength="5"');
    expect(markup).toContain('maxLength="500"');
    expect(markup).toMatch(/disabled[^>]*>Marquer traité/);
    expect(markup).toMatch(/disabled[^>]*>Archiver/);
  });
});
