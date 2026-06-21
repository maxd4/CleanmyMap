import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActionDeclarationFormFeedback } from "./action-declaration-form.feedback";

describe("ActionDeclarationFormFeedback", () => {
  it("renders the post-submit group invite block when a join href is provided", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionDeclarationFormFeedback, {
        submissionState: "success",
        createdId: "action-123",
        errorMessage: null,
        hasAttemptedSubmit: false,
        validationIssues: [],
        retentionLoop: null,
        groupJoinHref: "/sections/rejoindre-un-formulaire?actionId=action-123",
        showGroupInvite: true,
      }),
    );

    expect(markup).toContain("Créer un formulaire");
    expect(markup).toContain("Cette action pourra être rejointe après validation.");
    expect(markup).toContain("/sections/rejoindre-un-formulaire?actionId=action-123");
    expect(markup).toContain("Copier le lien");
  });

  it("renders the immediate publication copy for auto-approved submissions", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionDeclarationFormFeedback, {
        submissionState: "success",
        createdId: "action-123",
        errorMessage: null,
        hasAttemptedSubmit: false,
        validationIssues: [],
        retentionLoop: null,
        groupJoinHref: "/sections/rejoindre-un-formulaire?actionId=action-123",
        showGroupInvite: true,
        isAutoApprovedSubmission: true,
      }),
    );

    expect(markup).toContain(
      "Publiée immédiatement. Elle est déjà visible dans les formulaires de groupe, mais les nouvelles participations restent soumises à validation.",
    );
    expect(markup).toContain("Formulaire publié");
    expect(markup).toContain("Visible maintenant");
    expect(markup).toContain("Cycle public");
    expect(markup).toContain("file d&#x27;attente");
  });
});
