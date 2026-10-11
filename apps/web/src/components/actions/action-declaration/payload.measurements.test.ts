import { describe, expect, it } from "vitest";
import {
  buildCreateActionPayload,
  createInitialFormState,
  toOptionalNumber,
  toRequiredNumber,
} from "./payload";
import { buildBaseForm } from "./payload.test-fixtures";

describe("action declaration payload mesures", () => {
  it("parses optional/required numbers safely", () => {
    expect(toOptionalNumber("")).toBeUndefined();
    expect(toOptionalNumber("12.5")).toBe(12.5);
    expect(toOptionalNumber("abc")).toBeUndefined();

    expect(toRequiredNumber("10", 0)).toBe(10);
    expect(toRequiredNumber("invalid", 3)).toBe(3);
  });

  it("keeps blank post-action measurements unknown and explicit zero measured", () => {
    const blankPayload = buildCreateActionPayload({
      form: createInitialFormState("Alice"),
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(blankPayload.wasteKg).toBeNull();
    expect(blankPayload.cigaretteButts).toBeNull();

    const zeroForm = createInitialFormState("Alice");
    zeroForm.wasteKg = "0";
    zeroForm.cigaretteButtsCount = "0";
    const zeroPayload = buildCreateActionPayload({
      form: zeroForm,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(zeroPayload.wasteKg).toBe(0);
    expect(zeroPayload.cigaretteButts).toBe(0);
  });

  it("keeps synchronized megots count and weight coherent in the payload", () => {
    const form = buildBaseForm();
    form.cigaretteButtsCount = "10000";
    form.wasteMegotsKg = "2.000";
    form.wasteMegotsCondition = "propre";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.cigaretteButts).toBe(10000);
    expect(payload.cigaretteButtsCount).toBe(10000);
    expect(payload.cigaretteButtsKg).toBe(2);
    expect(payload.wasteBreakdown).toMatchObject({
      recyclablesKg: null,
      glassKg: null,
      householdWasteKg: null,
      otherWasteKg: null,
    });
    expect(payload.wasteBreakdown).not.toHaveProperty("megotsKg");
  });

  it("sends raw measurements without client-derived provenance", () => {
    const form = buildBaseForm();
    form.cigaretteButtsCount = "";
    form.wasteMegotsKg = "1.2";
    form.wasteMegotsCondition = "propre";
    form.cigaretteButtsVolumeLiters = "2.5";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.cigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: 1.2,
      cigaretteButtsVolumeLiters: 2.5,
    });
    expect(payload.cigaretteButts).toBeNull();
    expect(payload.cigaretteButtsKg).toBe(1.2);
  });

  it("does not replace a counted value when a raw mass is also present", () => {
    const form = buildBaseForm();
    form.cigaretteButtsCount = "2500";
    form.wasteMegotsKg = "1.2";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.cigaretteButtsMeasurements?.cigaretteButtsCount).toBe(2500);
    expect(payload.cigaretteButtsMeasurements?.cigaretteButtsMassKg).toBe(1.2);
  });
});
