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
    expect(markup).toContain("Comment ça marche ?");
    expect(markup).toContain("Le retour est transmis à CleanMyMap pour examen.");
    expect(markup).toContain("Connecte-toi pour envoyer ce questionnaire.");
    expect(markup).toContain("/sign-in?redirect_url=%2Fsections%2Ffeedback%23idea");
    expect(markup).toContain('id="bug"');
    expect(markup).toContain('id="idea"');
    expect(markup).toContain('id="improvement"');
    expect(markup).toContain('id="collaboration"');
    expect(markup).toContain("Idée");
    expect(markup).not.toContain("Avis reçus");
    expect(markup).not.toContain("Actions réalisées");
    expect(markup).not.toContain("Note moyenne");
    expect(markup).not.toContain("Membres engagés");
    expect(markup).not.toContain("Suivi des retours");
    expect(markup).not.toContain("feuille de route");
    expect(markup).not.toContain("48h");
    expect(markup).not.toContain("capture d&#x27;écran");
    expect(markup).not.toContain("Devenir contributeur");
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
    expect(markup).toContain("Soutenir le projet");
    expect(markup).toContain("Choisir un type de retour");
    expect(markup).toContain("/sections/feedback?type=bug&amp;source=feedback_discussion#bug");
    expect(markup).toContain("/sections/feedback?type=idea&amp;source=feedback_discussion#idea");
    expect(markup).toContain("/sections/feedback?type=improvement&amp;source=feedback_discussion#improvement");
    expect(markup).toContain("/sections/feedback?type=collaboration&amp;source=feedback_discussion#collaboration");
    expect(markup).not.toContain("Connecte-toi pour envoyer ce questionnaire.");
    expect(markup).not.toContain("Avis reçus");
    expect(markup).not.toContain("Actions réalisées");
    expect(markup).not.toContain("Note moyenne");
    expect(markup).not.toContain("Membres engagés");
    expect(markup).not.toContain("Réponse garantie sous 48h");
    expect(markup).not.toContain("100% des retours sont analysés");
  });
});
