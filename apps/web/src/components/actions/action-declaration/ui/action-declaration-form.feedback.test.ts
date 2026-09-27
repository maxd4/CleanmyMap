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
        groupJoinHref: "/sections/rejoindre-une-action?actionId=action-123",
        showGroupInvite: true,
      }),
    );

    expect(markup).toContain("Créer un formulaire");
    expect(markup).toContain("Cette action pourra être rejointe après validation.");
    expect(markup).toContain("/sections/rejoindre-une-action?actionId=action-123");
    expect(markup).toContain("Copier le lien");
    expect(markup).toContain("Aucun impact ou bonus n&#x27;est affiché sans preuve enregistrée.");
  });

  it("keeps the group invite in the normal validation flow", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionDeclarationFormFeedback, {
        submissionState: "success",
        createdId: "action-123",
        errorMessage: null,
        hasAttemptedSubmit: false,
        validationIssues: [],
        retentionLoop: null,
        groupJoinHref: "/sections/rejoindre-une-action?actionId=action-123",
        showGroupInvite: true,
      }),
    );

    expect(markup).toContain("En attente de validation par un administrateur.");
    expect(markup).toContain("Prêt à partager");
    expect(markup).toContain("Après publication");
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

  it("rounds only the displayed duration to the nearest quarter hour", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionDeclarationFormFeedback, {
        submissionState: "success",
        createdId: "action-123",
        errorMessage: null,
        hasAttemptedSubmit: false,
        validationIssues: [],
        retentionLoop: null,
        recordedAction: { ...recordedAction, durationMinutes: 68 },
      }),
    );

    expect(markup).toContain(">75 min</p>");
    expect(markup).not.toContain(">68 min</p>");
  });
});
