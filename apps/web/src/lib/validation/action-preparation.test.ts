import { buildCreateActionPayload, createInitialFormState } from "@/components/actions/action-declaration/payload";
import { toContractCreatePayload } from "@/lib/actions/contracts/contract-builders";
import { describe, expect, it } from "vitest";
import { createActionSchema, updateActionSchema } from "./action";
import { basePayload } from "./tests/action-base-payload";

describe("HTTP preparation data contract", () => {
  it("accepts the new form defaults on both creation contracts", () => {
    const form = createInitialFormState("Alice");
    form.actionDate = "2026-04-22";
    form.locationLabel = "Canal Saint-Martin";
    form.organizerType = "spontaneous";
    form.organizerName = "Alice";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });
    const legacy = createActionSchema.safeParse(payload);

    expect(legacy.success).toBe(true);
    if (!legacy.success) return;
    expect(legacy.data.preparationData?.accessibilityStatus).toBe("not_evaluated");
    expect(legacy.data.preparationData?.preparationChecklist).toHaveLength(4);

    const contract = createActionSchema.safeParse(toContractCreatePayload(payload));
    expect(contract.success).toBe(true);
    if (contract.success) {
      expect(contract.data.preparationData?.accessibilityStatus).toBe("not_evaluated");
      expect(contract.data.preparationData?.preparationChecklist).toHaveLength(4);
    }
  });

  it("accepts preparation edits and keeps old payloads compatible", () => {
    const update = updateActionSchema.safeParse({
      preparationData: {
        accessibilityStatus: "conditions_reported",
        materialsProvided: "Sacs disponibles au départ.",
        suggestedMaterials: ["gloves", "bags"],
        equipmentInventory: { glovesPairs: 0, grabbers: 3, firstAidKitAvailable: true },
        refreshmentsProvided: { waterDuringAction: true, snackAfterAction: false },
        preparationChecklist: [
          { key: "materials_checked", label: "Matériel vérifié", checked: true },
        ],
      },
    });

    expect(update.success).toBe(true);
    if (update.success) {
      expect(update.data.preparationData).toMatchObject({
        accessibilityStatus: "conditions_reported",
        materialsProvided: "Sacs disponibles au départ.",
        suggestedMaterials: ["gloves", "bags"],
        equipmentInventory: { glovesPairs: 0, grabbers: 3, firstAidKitAvailable: true },
        refreshmentsProvided: { waterDuringAction: true, snackAfterAction: false },
        preparationChecklist: [{ key: "materials_checked", checked: true }],
      });
    }
    expect(createActionSchema.safeParse(basePayload).success).toBe(true);
    expect(updateActionSchema.safeParse({ preparationData: { safetyInstructions: "Rester en binôme." } }).success).toBe(true);
  });

  it("validates provenance, bounded inclusion plans and dated evidence", () => {
    const valid = updateActionSchema.safeParse({ preparationData: {
      accessibilityConditionsSource: "Gestionnaire du parc",
      accessibilityConditionsVerifiedAt: "2026-11-21",
      accessibilityPausePlan: "Pause au point de rendez-vous",
      accessibilityEarlyDeparturePlan: "Sortie convenue avec le référent",
      accessibilityAlternativeMissions: ["Tri manuel"],
      accessibilityObservedMeasures: [{ key: "pause-plan", label: "Pause proposée", evidenceKind: "organizer_observation", observedAt: "2026-11-22" }],
    } });
    expect(valid.success).toBe(true);
    expect(updateActionSchema.safeParse({ preparationData: { accessibilityConditionsVerifiedAt: "hier" } }).success).toBe(false);
    expect(updateActionSchema.safeParse({ preparationData: { accessibilityAlternativeMissions: ["x".repeat(121)] } }).success).toBe(false);
    expect(updateActionSchema.safeParse({ preparationData: { accessibilityObservedMeasures: [{ key: "bad key", label: "Non", evidenceKind: "medical_record", observedAt: "2026-11-22" }] } }).success).toBe(false);
  });

  it("accepts bounded declarative organizational relations on create and PATCH", () => {
    const relations = {
      initiator: { kind: "external_structure", organizerType: "school", name: "Université Exemple" },
      partners: [{ organizerType: "local_authority", name: "Ville Exemple", role: "participants" }],
      participantOrigins: [{ category: "Étudiants volontaires" }],
    };
    expect(createActionSchema.safeParse({ ...basePayload, organizerType: "school", organizerName: "École Exemple", organizerId: null, preparationData: { organizationalRelations: relations } }).success).toBe(true);
    expect(updateActionSchema.safeParse({ preparationData: { organizationalRelations: relations } }).success).toBe(true);
    expect(updateActionSchema.safeParse({ preparationData: { organizationalRelations: { partners: [{ organizerType: "school", name: "École", role: "admin" }] } } }).success).toBe(false);
    expect(updateActionSchema.safeParse({ preparationData: { organizationalRelations: { partners: Array.from({ length: 11 }, () => ({ organizerType: "school", name: "École", role: "other" })) } } }).success).toBe(false);
  });

  it("rejects unknown values, duplicates, overlong arrays and invalid labels", () => {
    const valid = {
      ...basePayload,
      preparationData: {
        accessibilityStatus: "to_confirm",
        materialsProvided: "Pinces sur place.",
        suggestedMaterials: ["grabbers"],
        preparationChecklist: [{ key: "briefing", label: "Briefing sécurité", checked: false }],
      },
    };

    expect(createActionSchema.safeParse({ ...valid, preparationData: { ...valid.preparationData, accessibilityStatus: "certified_pmr" } }).success).toBe(false);
    expect(createActionSchema.safeParse({ ...valid, preparationData: { ...valid.preparationData, suggestedMaterials: ["unknown"] } }).success).toBe(false);
    expect(createActionSchema.safeParse({
      ...valid,
      preparationData: {
        ...valid.preparationData,
        preparationChecklist: Array.from({ length: 13 }, (_, index) => ({
          key: `item-${index}`,
          label: `Élément ${index}`,
          checked: false,
        })),
      },
    }).success).toBe(false);
    expect(createActionSchema.safeParse({
      ...valid,
      preparationData: {
        ...valid.preparationData,
        preparationChecklist: [
          { key: "briefing", label: "Briefing sécurité", checked: false },
          { key: "briefing", label: "Autre libellé", checked: true },
        ],
      },
    }).success).toBe(false);
    expect(createActionSchema.safeParse({
      ...valid,
      preparationData: { ...valid.preparationData, preparationChecklist: [{ key: " ", label: "Briefing sécurité", checked: false }] },
    }).success).toBe(false);
    expect(createActionSchema.safeParse({
      ...valid,
      preparationData: { ...valid.preparationData, preparationChecklist: [{ key: "briefing", label: "x".repeat(121), checked: false }] },
    }).success).toBe(false);
    expect(createActionSchema.safeParse({
      ...valid,
      preparationData: { ...valid.preparationData, materialsProvided: "x".repeat(2001) },
    }).success).toBe(false);
    expect(createActionSchema.safeParse({
      ...valid,
      preparationData: { ...valid.preparationData, preparationChecklist: [{ key: "briefing", label: "Briefing sécurité" }] },
    }).success).toBe(false);
  });

  it("distinguishes unknown quantities from explicit zero and rejects invalid bounds", () => {
    const valid = { ...basePayload, preparationData: {} };
    expect(createActionSchema.safeParse({
      ...valid,
      preparationData: {
        equipmentInventory: { glovesPairs: 0, garbageBags: 10_000 },
        refreshmentsProvided: { waterDuringAction: false, drinksAfterAction: true },
      },
    }).success).toBe(true);
    expect(createActionSchema.safeParse({ ...valid, preparationData: { equipmentInventory: { glovesPairs: -1 } } }).success).toBe(false);
    expect(createActionSchema.safeParse({ ...valid, preparationData: { equipmentInventory: { glovesPairs: 10_001 } } }).success).toBe(false);
    expect(createActionSchema.safeParse({ ...valid, preparationData: { equipmentInventory: { glovesPairs: 1.5 } } }).success).toBe(false);
    expect(createActionSchema.safeParse({ ...valid, preparationData: { equipmentInventory: { glovesPairs: null } } }).success).toBe(false);
    expect(createActionSchema.safeParse({ ...valid, preparationData: { equipmentInventory: { glovesPairs: 2, unknownItem: 1 } } }).success).toBe(false);
    expect(createActionSchema.safeParse({ ...valid, preparationData: { refreshmentsProvided: { waterDuringAction: true, drinksAfterAction: false } } }).success).toBe(true);
  });

  it("validates pending field-role intentions without turning them into assignments", () => {
    const valid = { ...basePayload, preparationData: {} };
    expect(createActionSchema.safeParse({
      ...valid,
      preparationData: {
        fieldRoleIntentions: [{ userId: "user-1", roleCodes: ["coorganizer", "glass_bag_lead"], status: "pending" }],
      },
    }).success).toBe(true);
    expect(createActionSchema.safeParse({
      ...valid,
      preparationData: {
        fieldRoleIntentions: [{ userId: "user-1", roleCodes: ["not-a-role"], status: "pending" }],
      },
    }).success).toBe(false);
  });

  it("keeps derived route targets versioned and manual targets unversioned", () => {
    const derivedWithoutPolicy = createActionSchema.safeParse({
      ...basePayload,
      preparationData: {
        routeTargetDistanceSource: "derived",
      },
    });
    expect(derivedWithoutPolicy.success).toBe(false);
    if (!derivedWithoutPolicy.success) {
      expect(derivedWithoutPolicy.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["preparationData", "routeTargetDistancePolicyVersion"],
          }),
        ]),
      );
    }

    const manualWithPolicy = createActionSchema.safeParse({
      ...basePayload,
      preparationData: {
        routeTargetDistanceSource: "manual",
        routeTargetDistancePolicyVersion: "route-policy-v1",
      },
    });
    expect(manualWithPolicy.success).toBe(false);
    if (!manualWithPolicy.success) {
      expect(manualWithPolicy.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["preparationData", "routeTargetDistancePolicyVersion"],
          }),
        ]),
      );
    }
  });
});
