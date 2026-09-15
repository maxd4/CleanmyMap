import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdministrativeRequirementsStatus } from "./administrative-requirements-status";

const baseAction = {
  id: "action-42",
  createdAt: "2026-09-15T10:00:00.000Z",
  status: "pending" as const,
  actionPhase: "pre_action" as const,
  preparationData: {
    administrativeRequirements: {
      status: "pending" as const,
      validatedAt: null,
      validatedByUserId: null,
    },
  },
  createdByClerkId: "creator-1",
  actorName: "Test",
  actionDate: "2026-09-20",
  locationLabel: "Paris",
  latitude: null,
  longitude: null,
  wasteKg: null,
  cigaretteButts: null,
  volunteersCount: 1,
  durationMinutes: 0,
  notes: null,
  submissionMode: "quick" as const,
  associationName: "Action spontanée",
  groupJoinEnabled: false,
  participantAccounts: [],
  placeType: null,
  departureLocationLabel: null,
  arrivalLocationLabel: null,
  routeStyle: null,
  routeAdjustmentMessage: null,
};

describe("AdministrativeRequirementsStatus", () => {
  it("shows only the pending message for an unauthorized user", () => {
    const html = renderToStaticMarkup(
      React.createElement(AdministrativeRequirementsStatus, {
        actionId: "action-42",
        initialAction: { ...baseAction, canValidateAdministrativeRequirements: false },
        surface: "summary",
      }),
    );

    expect(html).toContain("Démarches administratives non validées");
    expect(html).not.toContain("Démarches administratives terminées");
    expect(html).not.toContain("Démarches administratives</a>");
  });

  it("links an authorized pending user to the formalities panel", () => {
    const html = renderToStaticMarkup(
      React.createElement(AdministrativeRequirementsStatus, {
        actionId: "action-42",
        initialAction: { ...baseAction, canValidateAdministrativeRequirements: true },
        surface: "summary",
      }),
    );

    expect(html).toContain("Démarches administratives");
    expect(html).toContain("actionId=action-42&amp;panel=formalites");
  });

  it("renders the validated state without exposing the validator", () => {
    const html = renderToStaticMarkup(
      React.createElement(AdministrativeRequirementsStatus, {
        actionId: "action-42",
        initialAction: {
          ...baseAction,
          canValidateAdministrativeRequirements: false,
          preparationData: {
            administrativeRequirements: {
              status: "validated",
              validatedAt: "2026-09-15T10:00:00.000Z",
              validatedByUserId: "secret-validator-id",
            },
          },
        },
        surface: "formalities",
      }),
    );

    expect(html).toContain("Démarches administratives validées");
    expect(html).not.toContain("secret-validator-id");
    expect(html).not.toContain("Démarches administratives terminées");
  });
});
