import { describe, expect, it } from "vitest";
import { OTHER_VOLUNTEER_ASSOCIATION_VALUE, createInitialFormState } from "../payload";
import {
  getActionDeclarationSubmissionIssues,
  getStepOneValidationIssues,
  normalizeActionDeclarationFormBeforeSubmit,
} from "./action-declaration-submission.model";
import { buildCreateActionPayload } from "../payload";
import { ACTION_MEASUREMENT_MAX_KG } from "@/lib/waste/measurement";
import { MAX_CIGARETTE_BUTTS_COUNT } from "@/lib/waste/cigarette-butts";

function buildValidCompleteDeclaration() {
  return {
    ...createInitialFormState("Alex", "action"),
    organizerType: "association" as const,
    associationName: "Association locale",
    actionDate: "2026-10-09",
    locationLabel: "Quai nord",
    departureLocationLabel: "Quai nord",
    volunteersCount: "1",
    childrenCount: "0",
    retiredCount: "0",
    wasteKg: "1",
    durationMinutes: "60",
  };
}

function getCompleteDeclarationIssues(form: ReturnType<typeof buildValidCompleteDeclaration>) {
  return getActionDeclarationSubmissionIssues({
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
  });
}

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

  it.each([
    ["below zero", "-1"],
    ["above the maximum", String(ACTION_MEASUREMENT_MAX_KG + 1)],
  ])("rejects waste mass %s before confirmation", (_label, value) => {
    const form = buildValidCompleteDeclaration();
    form.wasteKg = value;

    expect(getCompleteDeclarationIssues(form)).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "wasteKg" }),
    ]));
  });

  it("accepts zero as an explicitly measured waste mass", () => {
    const form = buildValidCompleteDeclaration();
    form.wasteKg = "0";

    expect(getCompleteDeclarationIssues(form)).toEqual([]);
  });

  it.each([
    ["negative", "-1"],
    ["fractional", "1.5"],
    ["above the maximum", String(MAX_CIGARETTE_BUTTS_COUNT + 1)],
  ])("rejects %s cigarette-butt count", (_label, value) => {
    const form = buildValidCompleteDeclaration();
    form.wasteKg = "";
    form.cigaretteButtsCount = value;

    expect(getCompleteDeclarationIssues(form)).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "cigaretteButtsCount" }),
    ]));
  });

  it("rejects out-of-range cigarette-butt mass, volume and detailed breakdown", () => {
    const form = buildValidCompleteDeclaration();
    form.wasteKg = "";
    form.wasteMegotsKg = "-1";
    form.cigaretteButtsVolumeLiters = String(ACTION_MEASUREMENT_MAX_KG + 1);
    form.wasteRecyclablesKg = "-1";
    form.wasteGlassKg = String(ACTION_MEASUREMENT_MAX_KG + 1);

    const fields = getCompleteDeclarationIssues(form).map((issue) => issue.field);
    expect(fields).toEqual(expect.arrayContaining([
      "wasteMegotsKg",
      "cigaretteButtsVolumeLiters",
      "wasteRecyclablesKg",
      "wasteGlassKg",
    ]));
  });

  it("keeps optional measurements absent and accepts valid detailed measurements", () => {
    const absent = buildValidCompleteDeclaration();
    absent.wasteKg = "0";
    expect(getCompleteDeclarationIssues(absent)).toEqual([]);

    const measured = buildValidCompleteDeclaration();
    measured.wasteKg = "12.5";
    measured.wasteMegotsKg = "0.25";
    measured.cigaretteButtsCount = "2500";
    measured.cigaretteButtsVolumeLiters = "1.5";
    measured.wasteRecyclablesKg = "4.0";
    measured.wasteGlassKg = "2.0";
    measured.wasteHouseholdKg = "3.0";
    measured.wasteOtherKg = "3.5";

    expect(getCompleteDeclarationIssues(measured)).toEqual([]);
  });

  it("does not silently treat a non-numeric measurement as absent", () => {
    const form = buildValidCompleteDeclaration();
    form.wasteKg = "not-a-number";

    expect(getCompleteDeclarationIssues(form)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        field: "wasteKg",
        message: "Saisissez une mesure numérique valide ou laissez ce champ vide.",
      }),
    ]));
  });
});
