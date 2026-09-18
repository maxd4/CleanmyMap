import { describe, expect, it } from "vitest";
import {
  FORMALITIES_RULE_VERIFIED_ON,
  qualifyActionFormalities,
  type ActionFormalitiesFacts,
} from "./formalities-qualification";

const parisFacts: ActionFormalitiesFacts = {
  territory: { countryCode: "FR", code: "FR-75", label: "Paris" },
  publicSpace: "public_domain",
  manager: { kind: "paris_city", label: "Ville de Paris" },
  isCleanwalk: true,
  isPublicRoadwayActivity: false,
  isItinerant: false,
  isClaiming: false,
  hasInstallations: false,
  requiresPhysicalOccupation: false,
  localCustomaryUse: false,
  largeCrowdOrComplexInstallations: false,
};

describe("action formalities qualification", () => {
  it("qualifies a municipal public-space installation as a Ville de Paris AOT", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      hasInstallations: true,
    });
    const city = result.formalities.find(
      (formality) => formality.procedureKind === "city_aot",
    );

    expect(city?.requirementStatus).toBe("required");
    expect(city?.competentAuthority.kind).toBe("paris_city");
    expect(city?.deadline).toMatchObject({ minimumValue: 2, unit: "months" });
    expect(city?.source?.verifiedOn).toBe(FORMALITIES_RULE_VERIFIED_ON);
    expect(city?.officialChannel?.url).toContain("paris.fr");
  });

  it("qualifies an itinerant cleanwalk without installation for police declaration, not AOT", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      isItinerant: true,
    });
    const police = result.formalities.find(
      (formality) => formality.procedureKind === "police_declaration",
    );

    expect(police?.requirementStatus).toBe("required");
    expect(police?.competentAuthority.kind).toBe("police_prefecture");
    expect(result.formalities.some((item) => item.procedureKind === "city_aot")).toBe(false);
    expect(police?.deadline).toMatchObject({ minimumValue: 1, unit: "months" });
    expect(police?.officialChannel?.url).toBe("https://declaration-manifestations.gouv.fr/");
  });

  it("keeps the three-month police deadline source-driven when the facts state a large or complex event", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      isPublicRoadwayActivity: true,
      largeCrowdOrComplexInstallations: true,
    });

    expect(result.formalities[0].deadline).toMatchObject({
      minimumValue: 3,
      unit: "months",
    });
  });

  it("combines city and police formalities when both domains require them", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      hasInstallations: true,
      isPublicRoadwayActivity: true,
    });

    expect(result.formalities.map((item) => item.procedureKind)).toEqual([
      "city_aot",
      "police_declaration",
    ]);
  });

  it("qualifies an explicitly non-municipal managed site separately", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      manager: { kind: "sncf", label: "Gestionnaire de la gare" },
      hasInstallations: true,
    });
    const manager = result.formalities[0];

    expect(manager.requirementStatus).toBe("recommended");
    expect(manager.procedureKind).toBe("information_only");
    expect(manager.competentAuthority.kind).toBe("other_manager");
    expect(manager.recipient).toBe("Gestionnaire de la gare");
    expect(manager.officialChannel?.kind).toBe("manager_to_confirm");
    expect(manager.deadline).toBeNull();
  });

  it.each(["state", "sncf", "haropa", "other_public", "private"] as const)(
    "does not invent a required procedure for a non-municipal manager (%s)",
    (managerKind) => {
      const result = qualifyActionFormalities({
        ...parisFacts,
        manager: { kind: managerKind, label: "Gestionnaire à confirmer" },
        hasInstallations: true,
        isPublicRoadwayActivity: false,
      });

      expect(result.formalities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            requirementStatus: "recommended",
            procedureKind: "information_only",
          }),
        ]),
      );
      expect(result.formalities.some((item) => item.requirementStatus === "required")).toBe(false);
    },
  );

  it("keeps a simple insufficiently qualified cleanwalk unknown", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      publicSpace: "unknown",
      manager: { kind: "unknown", label: null },
      isItinerant: "unknown",
      hasInstallations: "unknown",
      requiresPhysicalOccupation: "unknown",
    });

    expect(result.formalities.some((item) => item.requirementStatus === "required")).toBe(false);
    expect(result.formalities.some((item) => item.requirementStatus === "unknown")).toBe(true);
  });

  it("keeps the official local-customary-use exception as not required", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      isCleanwalk: false,
      localCustomaryUse: true,
    });

    expect(result.formalities).toHaveLength(1);
    expect(result.formalities[0]).toMatchObject({
      requirementStatus: "not_required",
      procedureKind: "none",
    });
    expect(result.formalities[0].source?.verifiedOn).toBe(FORMALITIES_RULE_VERIFIED_ON);
  });

  it("returns recommended manager identification and unknown legal scope when ownership is missing", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      manager: { kind: "unknown", label: null },
    });

    expect(result.formalities.map((item) => item.requirementStatus)).toEqual([
      "recommended",
      "unknown",
    ]);
    expect(result.unresolvedQuestions).toContain("gestionnaire effectif du lieu");
    expect(result.formalities[0].source?.url).toContain("paris.fr");
  });

  it("does not turn a simple cleanwalk without installation into an AOT or a police declaration", () => {
    const result = qualifyActionFormalities(parisFacts);

    expect(result.formalities).toHaveLength(1);
    expect(result.formalities[0].requirementStatus).toBe("unknown");
    expect(result.formalities[0].procedureKind).toBe("unknown");
    expect(result.formalities[0].source?.verifiedOn).toBe(FORMALITIES_RULE_VERIFIED_ON);
  });

  it("does not extend the public-space exemption to an insufficiently scoped private site", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      publicSpace: "private_domain",
      localCustomaryUse: true,
    });

    expect(result.formalities[0].requirementStatus).toBe("unknown");
    expect(result.formalities[0].procedureKind).toBe("unknown");
  });

  it("does not generalize Paris rules to another territory", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      territory: { countryCode: "FR", code: "FR-69", label: "Lyon" },
    });

    expect(result.rulesetVersion).toBeNull();
    expect(result.formalities[0]).toMatchObject({
      requirementStatus: "unknown",
      procedureKind: "unknown",
      source: null,
    });
  });
});
