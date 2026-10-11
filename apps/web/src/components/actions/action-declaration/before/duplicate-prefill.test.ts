import { describe, expect, it } from "vitest";
import { applyDuplicatePrefillToForm } from "./duplicate-prefill";
import { initialState } from "../model";
import type { ActionDuplicatePrefill } from "@/lib/actions/action-duplication";

const prefill = {
  title: "Action réutilisée",
  shortDescription: "Description",
  locationLabel: "Parc",
  communeZoneLabel: "Paris",
  meetingPoint: "Entrée nord",
  departureLocationLabel: "Entrée nord",
  midRouteLocationLabel: "",
  arrivalLocationLabel: "",
  latitude: 48.8,
  longitude: 2.3,
  arrivalCoordinates: null,
  midRouteCoordinates: null,
  interventionMode: { mode: "fixed_area", version: "intervention-mode-v1" },
  routeTopology: undefined,
  routeTargetDistanceKm: null,
  routeTargetDistanceSource: undefined,
  plannedObjective: "nettoyage",
  placeType: "parc",
  estimatedDifficulty: "facile",
  accessibility: "Accès plat",
  accessibilityStatus: "conditions_reported",
  safetyInstructions: "Rester en binôme",
  recommendedMaterials: "Gants",
  materialsProvided: "Sacs",
  suggestedMaterials: ["gloves"],
  participantMessage: "Rendez-vous visible",
  logisticsNotes: "Note logistique",
  expectedWasteCategories: ["plastic"],
  operationalRoute: null,
  routeCalibrationContext: null,
  organizerType: "association",
  organizerId: "org-1",
  organizerName: "Association",
  associationName: "Association",
} as unknown as ActionDuplicatePrefill;

describe("duplicate prefill form mapping", () => {
  it("clears dates, participation and checked checklist state", () => {
    const result = applyDuplicatePrefillToForm(initialState, prefill);
    expect(result.actionTitle).toBe("Action réutilisée");
    expect(result.actionDate).toBe("");
    expect(result.meetingTime).toBe("");
    expect(result.groupJoinEnabled).toBe(false);
    expect(result.participantAccounts).toEqual([]);
    expect(result.formalitiesContext).toBeNull();
    expect(result.preparationChecklist.every((item) => item.checked === false)).toBe(true);
  });
});
