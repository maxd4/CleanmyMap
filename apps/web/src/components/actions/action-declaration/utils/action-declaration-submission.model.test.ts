import { describe, expect, it } from "vitest";
import { OTHER_VOLUNTEER_ASSOCIATION_VALUE, createInitialFormState } from "../payload";
import {
  getActionDeclarationSubmissionIssues,
  getStepOneValidationIssues,
  normalizeActionDeclarationFormBeforeSubmit,
} from "./action-declaration-submission.model";
import { buildCreateActionPayload } from "../payload";

describe("action declaration submission model", () => {
  it("keeps the canonical normalized route and spontaneous-action rules", () => {
    const form = {
      ...createInitialFormState("Alex", "action"),
      associationName: OTHER_VOLUNTEER_ASSOCIATION_VALUE,
      organizerAccounts: "@collectif",
      locationLabel: "",
      departureLocationLabel: "Quai nord",
      arrivalLocationLabel: "Arrivée ignorée pour une boucle",
      routeTopology: "loop" as const,
    };

    const result = normalizeActionDeclarationFormBeforeSubmit(form);

    expect(result.associationName).toBe("Action spontanée");
    expect(result.organizerAccounts).toBe("@collectif");
    expect(result.locationLabel).toBe("Quai nord");
    expect(result.arrivalLocationLabel).toBe("");
    expect(result.routeStyle).toBe("souple");
  });

  it("reports each missing step-one guard without changing the form", () => {
    const form = {
      ...createInitialFormState("Alex", "action"),
      organizerType: "" as const,
      associationName: "",
      actionDate: "",
      routeTopology: "point_to_point" as const,
      arrivalLocationLabel: "",
      eventStartTime: "10:00",
      eventEndTime: "09:00",
    };

    const issues = getStepOneValidationIssues(form);

    expect(issues.map((issue) => issue.field)).toEqual([
      "organizerType",
      "associationName",
      "actionDate",
      "arrivalLocationLabel",
      "eventStartTime",
    ]);
  });

  it("aggregates errors from identity, participants, measures, and geometry", () => {
    const form = createInitialFormState("Alex", "action");
    form.organizerType = "";
    form.associationName = "";
    form.actionDate = "";
    form.routeTopology = "point_to_point";
    form.arrivalLocationLabel = "";
    form.volunteersCount = "";
    form.wasteKg = "";

    const issues = getActionDeclarationSubmissionIssues({
      form,
      payload: buildCreateActionPayload({
        form,
        declarationMode: "complete",
        effectiveManualDrawingEnabled: false,
        drawingIsValid: false,
        manualDrawing: null,
        isEntrepriseMode: false,
        linkedEventId: undefined,
      }),
      isAuthenticated: true,
      declarationMode: "complete",
      hasValidDrawing: false,
      hasServerRouteInput: false,
      isCleanPlaceMode: false,
      manualDrawingSource: null,
    });

    expect(issues.map((issue) => issue.field)).toEqual(expect.arrayContaining([
      "organizerType",
      "associationName",
      "actionDate",
      "arrivalLocationLabel",
      "volunteersCount",
      "wasteKg",
      "manualDrawing",
    ]));
    expect(new Set(issues.map((issue) => `${issue.field}:${issue.message}`)).size).toBe(issues.length);
  });

  it("keeps authentication outside field validation", () => {
    const form = createInitialFormState("Alex", "action");
    expect(getActionDeclarationSubmissionIssues({
      form,
      payload: {} as never,
      isAuthenticated: false,
      declarationMode: "complete",
      hasValidDrawing: false,
      hasServerRouteInput: false,
      isCleanPlaceMode: false,
      manualDrawingSource: null,
    })).toEqual([]);
  });

  it("requires an explicit total for a post-action declaration", () => {
    const form = createInitialFormState("Alex", "action");
    form.organizerType = "spontaneous";
    form.organizerAccounts = "user-organizer";
    form.associationName = "Action spontanée";
    form.actionDate = "2026-10-09";
    form.locationLabel = "Quai nord";
    form.wasteKg = "0";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    const issues = getActionDeclarationSubmissionIssues({
      form,
      payload,
      isAuthenticated: true,
      declarationMode: "complete",
      hasValidDrawing: true,
      hasServerRouteInput: false,
      isCleanPlaceMode: false,
      manualDrawingSource: null,
    });

    expect(issues).toEqual([
      {
        field: "volunteersCount",
        message: "Renseignez le nombre total de participants présents (un entier de 1 à 500).",
      },
    ]);

    form.volunteersCount = "12";
    expect(getActionDeclarationSubmissionIssues({
      form,
      payload: buildCreateActionPayload({
        form,
        declarationMode: "complete",
        effectiveManualDrawingEnabled: false,
        drawingIsValid: false,
        manualDrawing: null,
        isEntrepriseMode: false,
        linkedEventId: undefined,
      }),
      isAuthenticated: true,
      declarationMode: "complete",
      hasValidDrawing: true,
      hasServerRouteInput: false,
      isCleanPlaceMode: false,
      manualDrawingSource: null,
    })).toEqual([]);

    form.childrenCount = "";
    expect(getActionDeclarationSubmissionIssues({
      form,
      payload: buildCreateActionPayload({
        form,
        declarationMode: "complete",
        effectiveManualDrawingEnabled: false,
        drawingIsValid: false,
        manualDrawing: null,
        isEntrepriseMode: false,
        linkedEventId: undefined,
      }),
      isAuthenticated: true,
      declarationMode: "complete",
      hasValidDrawing: true,
      hasServerRouteInput: false,
      isCleanPlaceMode: false,
      manualDrawingSource: null,
    })).toEqual([
      {
        field: "volunteerParticipation",
        message: "Renseignez les nombres entiers d’enfants et de retraités présents.",
      },
    ]);
  });
});
