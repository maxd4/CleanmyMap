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
    expect(blankPayload.cigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: null,
      cigaretteButtsVolumeLiters: null,
      cigaretteButtsInputSource: null,
    });

    const zeroForm = createInitialFormState("Alice");
    zeroForm.wasteKg = "0";
    zeroForm.cigaretteButtsCount = "0";
    zeroForm.volunteersCount = "1";
    zeroForm.childrenCount = "0";
    zeroForm.adultCount = "1";
    zeroForm.retiredCount = "0";
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
    expect(zeroPayload.volunteersCount).toBe(1);
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
    form.cigaretteButtsCondition = "propre";
    form.cigaretteButtsInputSource = "mass";
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
      cigaretteButtsInputSource: "mass",
    });
    expect(payload.cigaretteButts).toBeNull();
    expect(payload.cigaretteButtsKg).toBe(1.2);
  });

  it("serializes only the requested clear from an independent pair", () => {
    const form = buildBaseForm();
    form.cigaretteButtsCount = "";
    form.wasteMegotsKg = "1";
    form.cigaretteButtsVolumeLiters = "2.5";
    form.cigaretteButtsInputSource = "unknown";
    form.cigaretteButtsCountProvenance = "unknown";
    form.cigaretteButtsMassProvenance = "unknown";
    form.cigaretteButtsVolumeProvenance = "volume_converted";

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
      cigaretteButtsMassKg: 1,
      cigaretteButtsVolumeLiters: 2.5,
      cigaretteButtsInputSource: "unknown",
    });
    expect(payload.cigaretteButtsMeasurements).not.toHaveProperty(
      "cigaretteButtsCountProvenance",
    );
    expect(payload.cigaretteButtsKg).toBe(1);
    expect(payload.cigaretteButts).toBeNull();
  });

  it("does not replace a counted value when a raw mass is also present", () => {
    const form = buildBaseForm();
    form.cigaretteButtsCount = "2500";
    form.wasteMegotsKg = "1.2";
    form.cigaretteButtsInputSource = "unknown";

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

  it("uses one canonical condition in the payload", () => {
    const form = buildBaseForm();
    form.cigaretteButtsCount = "1750";
    form.wasteMegotsKg = "1";
    form.wasteMegotsCondition = "mouille";
    form.cigaretteButtsCondition = "humide";
    form.cigaretteButtsInputSource = "mass";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.cigaretteButtsCondition).toBe("mouille");
    expect(payload.cigaretteButtsMeasurements?.cigaretteButtsCondition).toBe("mouille");
  });

  it("serializes distinct lots as the sole source while retaining legacy mirrors", () => {
    const form = buildBaseForm();
    form.cigaretteButtsLots = [
      { id: "count", source: "count", value: "100", condition: "propre" },
      { id: "mass", source: "mass_kg", value: "1", condition: "humide" },
      { id: "volume", source: "volume_l", value: "0.5", condition: "mouille" },
    ];

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.cigaretteButtsLots).toEqual(form.cigaretteButtsLots.map((lot) => ({
      ...lot,
      value: Number(lot.value),
    })));
    expect(payload.cigaretteButtsMeasurements?.cigaretteButtsLots).toHaveLength(3);
    expect(payload.cigaretteButts).toBeNull();
  });

  it("serializes optional characterization by canonical slug without changing the total", () => {
    const form = buildBaseForm();
    form.wasteKg = "12";
    form.wasteCategories = ["plastic"];
    form.wasteCharacterizationKg = {
      plastic: "2.5",
      glass: "0",
      metal: "",
      cigarette_butt: "9",
    } as typeof form.wasteCharacterizationKg;

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.wasteKg).toBe(12);
    expect(payload.wasteBreakdown?.characterizationKg).toEqual({
      plastic: 2.5,
      glass: 0,
      metal: null,
    });
    expect(payload.wasteBreakdown?.characterizationKg).not.toHaveProperty("cigarette_butt");
  });
});
