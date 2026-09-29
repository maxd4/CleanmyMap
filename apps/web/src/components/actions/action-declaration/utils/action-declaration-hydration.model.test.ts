import { describe, expect, it } from "vitest";
import type { ActionEditorRecord } from "@/lib/actions/http";
import { resolveRouteTargetDistance } from "@/lib/actions/route-target-distance";
import { createInitialFormState } from "../payload";
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
      },
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 20,
        cigaretteButtsMassKg: 0.3,
        cigaretteButtsVolumeLiters: 2,
        cigaretteButtsCondition: "humide",
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
      action,
    );

    expect(result.loadedActionPhase).toBe("post_action_complete");
    expect(result.form.wasteRecyclablesKg).toBe("1.5");
    expect(result.form.wasteMegotsKg).toBe("0.3");
    expect(result.form.childrenCount).toBe("1");
    expect(result.form.adultCount).toBe("2");
    expect(result.form.retiredCount).toBe("1");
    expect(result.form.eventStartTime).toBe("09:00");
    expect(result.form.eventEndTime).toBe("11:00");
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
});
