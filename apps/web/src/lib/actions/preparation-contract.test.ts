import { describe, expect, it } from "vitest";
import {
  ACTION_PREPARATION_CHECKLIST_DEFAULTS,
  normalizeActionPreparationContract,
  normalizeActionOrganizationalRelations,
  normalizeEquipmentInventory,
  normalizeRefreshmentsProvided,
  normalizePreparationChecklist,
  normalizeSuggestedMaterials,
} from "./preparation-contract";

describe("ActionPreparationData preparation extensions", () => {
  it("keeps the default checklist explicit and entirely unchecked", () => {
    expect(ACTION_PREPARATION_CHECKLIST_DEFAULTS).toHaveLength(4);
    expect(ACTION_PREPARATION_CHECKLIST_DEFAULTS.every((item) => !item.checked)).toBe(true);
  });

  it("normalizes declared organizational relations without granting identity", () => {
    expect(normalizeActionOrganizationalRelations({
      initiator: { kind: "external_structure", organizerType: "school", name: " Université Exemple " },
      partners: [{ organizerType: "local_authority", name: " Ville Exemple ", role: "funding" }, { organizerType: "school", name: "", role: "other" }],
      participantOrigins: [{ category: " Lycée " }, { category: " Lycée " }, { category: "" }],
    })).toEqual({
      initiator: { kind: "external_structure", organizerType: "school", name: "Université Exemple" },
      partners: [{ organizerType: "local_authority", name: "Ville Exemple", role: "funding" }],
      participantOrigins: [{ category: "Lycée" }],
    });
    expect(normalizeActionPreparationContract({ organizationalRelations: { partners: [{ organizerType: "school", name: "École", role: "admin" }] } })).toEqual({});
  });

  it("bounds and deduplicates structured checklist items without converting prose", () => {
    expect(normalizePreparationChecklist([
      { key: "materials_checked", label: " Matériel vérifié ", checked: false },
      { key: "materials_checked", label: "Doublon", checked: true },
      { key: "bad", label: "", checked: true },
      { key: "custom_1", label: "Élément libre", checked: true },
    ])).toEqual([
      { key: "materials_checked", label: "Matériel vérifié", checked: false },
      { key: "custom_1", label: "Élément libre", checked: true },
    ]);
    expect(normalizePreparationChecklist("Matériel vérifié")).toBeUndefined();
  });

  it("accepts only the bounded material suggestion vocabulary", () => {
    expect(normalizeSuggestedMaterials(["gloves", "gloves", "unknown", 1])).toEqual(["gloves"]);
  });

  it("keeps absent quantities absent while preserving zero and independent booleans", () => {
    const saved = normalizeEquipmentInventory({ glovesPairs: 0, garbageBags: undefined, firstAidKitAvailable: false, unknown: 4 });
    expect(saved).toEqual({
      glovesPairs: 0,
      firstAidKitAvailable: false,
    });
    expect(normalizeEquipmentInventory(saved)).toEqual(saved);
    expect(normalizeRefreshmentsProvided({ waterDuringAction: true, drinksAfterAction: false })).toEqual({
      waterDuringAction: true,
      drinksAfterAction: false,
    });
  });

  it("removes invalid structured values at the server normalization boundary", () => {
    expect(normalizeActionPreparationContract({
      interventionMode: { version: "unknown", mode: "itinerary" },
      accessibilityStatus: "certified_pmr",
      suggestedMaterials: ["unknown"],
      equipmentInventory: { glovesPairs: -1, unknown: 1 },
      refreshmentsProvided: { waterDuringAction: "yes" },
      preparationChecklist: [{ key: "x", label: "ok", checked: false }],
      checklistBeforeDeparture: "Matériel vérifié",
    })).toEqual({
      preparationChecklist: [{ key: "x", label: "ok", checked: false }],
      checklistBeforeDeparture: "Matériel vérifié",
    });
  });

  it("bounds inclusive day-of plans and drops invalid source dates without inventing observations", () => {
    expect(normalizeActionPreparationContract({
      accessibilityPausePlan: "  Pause près du point de rendez-vous  ",
      accessibilityEarlyDeparturePlan: "Sortie convenue avec le référent",
      accessibilityAlternativeMissions: ["Tri", "Tri", " ", "x".repeat(121)],
      accessibilityConditionsSource: "Service municipal",
      accessibilityConditionsVerifiedAt: "2026-11-21",
    })).toEqual({
      accessibilityPausePlan: "Pause près du point de rendez-vous",
      accessibilityEarlyDeparturePlan: "Sortie convenue avec le référent",
      accessibilityAlternativeMissions: ["Tri"],
      accessibilityConditionsSource: "Service municipal",
      accessibilityConditionsVerifiedAt: "2026-11-21",
    });
    expect(normalizeActionPreparationContract({ accessibilityConditionsVerifiedAt: "hier" })).toEqual({});
    expect(normalizeActionPreparationContract({ accessibilityConditionsVerifiedAt: "2026-02-31" })).toEqual({});
  });

  it("retains only bounded server observations with a non-future date and definition fingerprint", () => {
    const hash = "d".repeat(64);
    expect(normalizeActionPreparationContract({ accessibilityObservedMeasures: [
      { key: "pause-plan", definitionHash: hash, label: "Pause", evidenceKind: "organizer_observation", observedAt: new Date().toISOString().slice(0, 10) },
      { key: "future", definitionHash: hash, label: "Future", evidenceKind: "participant_feedback", observedAt: "2999-01-01" },
      { key: "legacy", label: "No version", evidenceKind: "organizer_observation", observedAt: "2026-11-22" },
    ] })).toEqual({ accessibilityObservedMeasures: [
      { key: "pause-plan", definitionHash: hash, label: "Pause", evidenceKind: "organizer_observation", observedAt: new Date().toISOString().slice(0, 10) },
    ] });
  });
});
