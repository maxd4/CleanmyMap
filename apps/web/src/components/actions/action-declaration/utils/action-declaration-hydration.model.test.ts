import { describe, expect, it } from "vitest";
import type { ActionEditorRecord } from "@/lib/actions/http";
import { resolveRouteTargetDistance } from "@/lib/actions/route-target-distance";
import { buildCreateActionPayload, createInitialFormState } from "../payload";
import {
  buildActionDeclarationHydration,
  buildActionEditorFormState,
} from "./action-declaration-hydration.model";

function createEditorRecord(
  overrides: Partial<ActionEditorRecord> = {},
): ActionEditorRecord {
  return {
    id: "action-42",
    createdAt: "2026-09-27T10:00:00.000Z",
    status: "published",
    actionPhase: "post_action_complete",
    preparationData: null,
    createdByClerkId: "user-42",
    actorName: "Alex",
    actionDate: "2026-09-27",
    locationLabel: "Parc central",
    latitude: 48.85,
    longitude: 2.35,
    wasteKg: 3.2,
    cigaretteButts: 120,
    volunteersCount: 4,
    durationMinutes: 90,
    notes: "Notes conservées",
    submissionMode: "complete",
    associationName: "Collectif local",
    groupJoinEnabled: false,
    participantAccounts: ["@lea"],
    placeType: "parc",
    departureLocationLabel: "Entrée nord",
    arrivalLocationLabel: "Sortie sud",
    routeStyle: "souple",
    routeAdjustmentMessage: null,
    ...overrides,
  } as ActionEditorRecord;
}

describe("action declaration hydration model", () => {
  it.each([
    ["pre_action", "pré-action"],
    ["post_action_draft", "brouillon post-action"],
  ] as const)("clears post-action measurements for %s", (...args) => {
    const [actionPhase] = args;
    const action = createEditorRecord({
      actionPhase,
      wasteBreakdown: {
        recyclablesKg: 1,
        unusualObjects: "pile",
      },
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 20,
        cigaretteButtsMassKg: 0.2,
        cigaretteButtsVolumeLiters: 1,
        cigaretteButtsCondition: "propre",
      } as ActionEditorRecord["cigaretteButtsMeasurements"],
    });

    const form = buildActionEditorFormState(
      createInitialFormState("Alex", "action"),
      action,
    );

    expect(form.wasteKg).toBe("");
    expect(form.wasteRecyclablesKg).toBe("");
    expect(form.cigaretteButtsCount).toBe("");
    expect(form.wasteMegotsKg).toBe("");
    expect(form.cigaretteButtsCountProvenance).toBe("unknown");
    expect(form.cigaretteButtsMassProvenance).toBe("unknown");
    expect(form.cigaretteButtsVolumeProvenance).toBe("unknown");
  });

  it("preserves legacy measurements, participation and derived route target", () => {
    const action = createEditorRecord({
      durationMinutes: 120,
      wasteBreakdown: {
        recyclablesKg: 1.5,
        glassKg: 0.25,
        householdWasteKg: 0.75,
        otherWasteKg: 0.1,
        megotsKg: 0.4,
        unusualObjects: "pneu",
        specialHandlingWaste: "batterie",
        characterizationKg: {
          plastic: 2.5,
          glass: 0,
          metal: null,
        },
      },
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 20,
        cigaretteButtsMassKg: 0.3,
        cigaretteButtsVolumeLiters: 2,
        cigaretteButtsCondition: "humide",
        cigaretteButtsCountProvenance: "weight_converted",
        cigaretteButtsMassProvenance: "measured",
      } as ActionEditorRecord["cigaretteButtsMeasurements"],
      volunteerParticipation: {
        childrenCount: 1,
        adultCount: 2,
        retiredCount: 1,
      } as ActionEditorRecord["volunteerParticipation"],
      eventStartTime: "09:00",
      eventEndTime: "11:00",
    });

    const result = buildActionDeclarationHydration(
      createInitialFormState("Alex", "action"),
      {
        ...action,
        manualInvitationStatuses: [{ userId: "@lea", status: "accepted" }],
        registrationStatuses: [{ userId: "@lea", status: "confirmed", source: "manual_add", cancellationReason: null }],
        confirmedParticipantAccounts: ["user-confirmed"],
      },
    );

    expect(result.loadedActionPhase).toBe("post_action_complete");
    expect(result.form.wasteRecyclablesKg).toBe("1.5");
    expect(result.form.wasteCharacterizationKg).toEqual({
      plastic: "2.5",
      glass: "0",
      metal: "",
    });
    const resubmitted = buildCreateActionPayload({
      form: result.form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });
    expect(resubmitted.wasteBreakdown?.characterizationKg).toEqual({
      plastic: 2.5,
      glass: 0,
      metal: null,
    });
    expect(result.form.wasteMegotsKg).toBe("0.3");
    expect(result.form.cigaretteButtsInputSource).toBe("mass");
    expect(result.form.cigaretteButtsCountProvenance).toBe("weight_converted");
    expect(result.form.cigaretteButtsMassProvenance).toBe("measured");
    expect(result.form.cigaretteButtsVolumeProvenance).toBe("unknown");
    expect(result.form.cigaretteButtsConversionFormulaVersion).toBeNull();
    expect(result.form.cigaretteButtsCondition).toBe("humide");
    expect(result.form.wasteMegotsCondition).toBe("humide");
    expect(result.form.childrenCount).toBe("1");
    expect(result.form.adultCount).toBe("2");
    expect(result.form.retiredCount).toBe("1");
    expect(result.form.eventStartTime).toBe("09:00");
    expect(result.form.eventEndTime).toBe("11:00");
    expect(result.manualInvitationStatuses).toEqual([{ userId: "@lea", status: "accepted" }]);
    expect(result.registrationStatuses).toEqual([{ userId: "@lea", status: "confirmed", source: "manual_add", cancellationReason: null }]);
    expect(result.confirmedParticipantAccounts).toEqual(["user-confirmed"]);
    expect(result.form.routeTargetDistanceKm).toBe(
      String(
        resolveRouteTargetDistance({
          durationMinutes: 120,
          routeTargetDistanceSource: "derived",
        }).distanceKm,
      ),
    );
    expect(result.form.routeTargetDistanceKmManuallySet).toBe(false);
  });

  it("rehydrates an absent duration as empty and keeps the default derived target", () => {
    const result = buildActionEditorFormState(
      createInitialFormState("Alex", "action"),
      createEditorRecord({
        durationMinutes: 0,
        preparationData: { durationMinutesDeclared: false },
      }),
    );

    expect(result.durationMinutes).toBe("");
    expect(result.routeTargetDistanceKm).toBe("1");
  });

  it("rehydrates the persisted volume source without promoting a derived field", () => {
    const result = buildActionEditorFormState(
      createInitialFormState("Alex", "action"),
      createEditorRecord({
        cigaretteButts: 1_750,
        cigaretteButtsMeasurements: {
          cigaretteButtsCount: 1_750,
          cigaretteButtsMassKg: 0.875,
          cigaretteButtsVolumeLiters: 2.5,
          cigaretteButtsCondition: "humide",
          cigaretteButtsCountProvenance: "volume_converted",
          cigaretteButtsMassProvenance: "weight_converted",
          cigaretteButtsVolumeProvenance: "measured",
          cigaretteButtsInputSource: "volume_l",
          cigaretteButtsVolumeConversionFormulaVersion: "cleanmymap-butts-volume-v2",
        } as ActionEditorRecord["cigaretteButtsMeasurements"],
      }),
    );

    expect(result.cigaretteButtsInputSource).toBe("volume_l");
    expect(result.cigaretteButtsVolumeLiters).toBe("2.5");
    expect(result.cigaretteButtsCount).toBe("1750");
    expect(result.wasteMegotsKg).toBe("0.875");
    expect(result.cigaretteButtsVolumeProvenance).toBe("measured");
    expect(result.cigaretteButtsVolumeConversionFormulaVersion).toBe(
      "cleanmymap-butts-volume-v2",
    );
  });

  it("keeps explicit zero, positive durations, historical compatibility and manual targets", () => {
    const explicitZero = buildActionEditorFormState(
      createInitialFormState("Alex", "action"),
      createEditorRecord({
        durationMinutes: 0,
        preparationData: { durationMinutesDeclared: true },
      }),
    );
    const positive = buildActionEditorFormState(
      createInitialFormState("Alex", "action"),
      createEditorRecord({
        durationMinutes: 60,
        preparationData: { durationMinutesDeclared: true },
      }),
    );
    const historical = buildActionEditorFormState(
      createInitialFormState("Alex", "action"),
      createEditorRecord({ durationMinutes: 0, preparationData: null }),
    );
    const manual = buildActionEditorFormState(
      createInitialFormState("Alex", "action"),
      createEditorRecord({
        durationMinutes: 0,
        preparationData: {
          durationMinutesDeclared: false,
          routeTargetDistanceKm: 2.25,
          routeTargetDistanceSource: "manual",
        },
      }),
    );

    expect(explicitZero.durationMinutes).toBe("0");
    expect(explicitZero.routeTargetDistanceKm).toBe("0");
    expect(positive.durationMinutes).toBe("60");
    expect(positive.routeTargetDistanceKm).toBe("1");
    expect(historical.durationMinutes).toBe("0");
    expect(manual.durationMinutes).toBe("");
    expect(manual.routeTargetDistanceKm).toBe("2.25");
    expect(manual.routeTargetDistanceKmManuallySet).toBe(true);
  });

  it("keeps a historical total readable without inferring categories", () => {
    const action = createEditorRecord({
      volunteersCount: 7,
      volunteerParticipation: null,
    });

    const result = buildActionEditorFormState(
      createInitialFormState("Alex", "action"),
      action,
    );

    expect(result.volunteersCount).toBe("7");
    expect(result.childrenCount).toBe("");
    expect(result.adultCount).toBe("");
    expect(result.retiredCount).toBe("");
  });

  it("marks independent historical measurements as source-unknown", () => {
    const result = buildActionEditorFormState(
      createInitialFormState("Alex", "action"),
      createEditorRecord({
        cigaretteButtsMeasurements: {
          cigaretteButtsCount: 1_700,
          cigaretteButtsMassKg: 1,
          cigaretteButtsVolumeLiters: null,
          cigaretteButtsCondition: "humide",
          cigaretteButtsCountProvenance: "counted",
          cigaretteButtsMassProvenance: "measured",
        } as ActionEditorRecord["cigaretteButtsMeasurements"],
      }),
    );

    expect(result.cigaretteButtsInputSource).toBe("unknown");
    expect(result.cigaretteButtsCountProvenance).toBe("counted");
    expect(result.cigaretteButtsMassProvenance).toBe("measured");
  });

  it("hydrates explicit cigarette-butt lots without collapsing their sources", () => {
    const result = buildActionEditorFormState(
      createInitialFormState("Alex", "action"),
      createEditorRecord({
        cigaretteButtsMeasurements: {
          cigaretteButtsLots: [
            { id: "lot-count", source: "count", value: 12, condition: "propre" },
            { id: "lot-mass", source: "mass_kg", value: 0.4, condition: "humide" },
            { id: "lot-volume", source: "volume_l", value: 0, condition: "mouille" },
          ],
        } as ActionEditorRecord["cigaretteButtsMeasurements"],
      }),
    );

    expect(result.cigaretteButtsLots).toEqual([
      { id: "lot-count", source: "count", value: "12", condition: "propre" },
      { id: "lot-mass", source: "mass_kg", value: "0.4", condition: "humide" },
      { id: "lot-volume", source: "volume_l", value: "0", condition: "mouille" },
    ]);
  });
});
