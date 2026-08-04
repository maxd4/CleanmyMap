import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActionDeclarationFormFeedback } from "./action-declaration-form.feedback";
import type { ActionEditorRecord } from "@/lib/actions/http";

const recordedAction: ActionEditorRecord = {
  id: "action-123",
  createdAt: "2026-08-04T10:00:00.000Z",
  status: "pending",
  actionPhase: "post_action_complete",
  preparationData: null,
  createdByClerkId: "user-1",
  actorName: "Alex",
  actionDate: "2026-08-04",
  locationLabel: "Quai de Loire",
  latitude: 48.89,
  longitude: 2.37,
  wasteKg: 4,
  cigaretteButts: 10,
  volunteersCount: 2,
  durationMinutes: 30,
  notes: "Collecte enregistrée sur le terrain.",
  submissionMode: "complete",
  associationName: "Action spontanée",
  groupJoinEnabled: false,
  participantAccounts: [],
  placeType: "Quai",
  departureLocationLabel: null,
  arrivalLocationLabel: null,
  routeStyle: null,
  routeAdjustmentMessage: null,
  wasteBreakdown: null,
  photos: null,
  visionEstimate: null,
  manualDrawing: null,
  recordType: "action",
};

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
    expect(markup).toContain("Aucun impact ou bonus n&#x27;est affiché sans preuve enregistrée.");
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

  it("renders recorded metrics, transparent impact methodology and safe CTAs", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionDeclarationFormFeedback, {
        submissionState: "success",
        createdId: "action-123",
        errorMessage: null,
        hasAttemptedSubmit: false,
        validationIssues: [],
        retentionLoop: {
          summary: "4 kg collectes",
          badge: null,
          xpAwarded: 0,
          thanksMessage: "Merci.",
          share: { text: "Action", url: "/actions/history" },
          nextActionSuggestion: "Voir une prochaine zone.",
        },
        recordedAction,
      }),
    );

    expect(markup).toContain('data-testid="post-action-confirmation"');
    expect(markup).toContain("Données enregistrées");
    expect(markup).toContain("4 kg");
    expect(markup).toContain("CO₂e évité");
    expect(markup).toContain("Proxy");
    expect(markup).toContain("Confiance des données");
    expect(markup).toContain("Aucun XP attribué à ce stade");
    expect(markup).not.toContain("Badge attribué:");
    expect(markup).toContain("/actions/map");
    expect(markup).toContain("/reports");
    expect(markup).toContain("/actions/new");
  });
});
