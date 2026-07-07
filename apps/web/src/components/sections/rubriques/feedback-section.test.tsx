import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    isLoaded: true,
    isSignedIn: false,
  }),
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({
    locale: "fr",
  }),
}));

import { FeedbackSection } from "./feedback-section";

const FeedbackSectionComponent = FeedbackSection as React.ComponentType<{
  pagePath?: string;
  source?: "feedback_section" | "feedback_discussion";
}>;

describe("FeedbackSection", () => {
  it("renders the dashboard mode shell", () => {
    const markup = renderToStaticMarkup(
      <FeedbackSectionComponent pagePath="/sections/feedback" />,
    );

    expect(markup).toContain("Retours &amp; Qualité");
    expect(markup).toContain("Suivi des retours");
    expect(markup).toContain("Vos idées, notre feuille de route");
    expect(markup).toContain("Votre avis fait la différence");
  });

  it("renders the discussion mode", () => {
    const markup = renderToStaticMarkup(
      <FeedbackSectionComponent
        pagePath="/sections/feedback"
        source="feedback_discussion"
      />,
    );

    expect(markup).toContain("Besoin d&#x27;un contact direct ?");
    expect(markup).toContain("Centre d&#x27;aide");
    expect(markup).toContain("Connecte-toi pour envoyer ce questionnaire.");
  });
});
