import { describe, expect, it } from "vitest";
import {
  FORMALITIES_RULE_VERIFIED_ON,
  qualifyActionFormalities,
  type ActionFormalitiesFacts,
} from "./formalities-qualification";
import type { AdministrativeFormalityRule } from "./formalities-rules";

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

function testRule(params: {
  id: string;
  scope: AdministrativeFormalityRule["scope"];
  formalityId: string;
  supersedesRuleIds?: string[];
}): AdministrativeFormalityRule {
  return {
    id: params.id,
    scope: params.scope,
    rulesetVersion: `test-${params.id}`,
    supersedesRuleIds: params.supersedesRuleIds,
    contract: {
      authority: { kind: "unknown", label: "À identifier" },
      requirementStatus: "recommended",
      procedureKind: "information_only",
      officialSource: null,
      verifiedAt: FORMALITIES_RULE_VERIFIED_ON,
      deadline: null,
      destination: null,
      requiredInformation: [],
    },
    qualifies: () => ({
      formalities: [
        {
          id: params.formalityId,
          requirementStatus: "recommended",
          procedureKind: "information_only",
          competentAuthority: { kind: "unknown", label: "À identifier" },
          recipient: null,
          source: null,
          supportingSources: [],
          scope: "Test territorial",
          justification: "Règle de test",
          deadline: null,
          officialChannel: null,
          requestedInformation: [],
          requestedDocuments: [],
        },
      ],
      unresolvedQuestions: [],
    }),
  };
}

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
    expect(result.unresolvedQuestions).toEqual([]);
  });

  it("requires a municipal AOT for physical occupation even without an installation", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      requiresPhysicalOccupation: true,
    });

    expect(result.formalities[0]).toMatchObject({
      requirementStatus: "required",
      procedureKind: "city_aot",
    });
  });

  it("requires a police declaration for a public-roadway activity on its own", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      isPublicRoadwayActivity: true,
    });

    expect(result.formalities[0]).toMatchObject({
      requirementStatus: "required",
      procedureKind: "police_declaration",
    });
  });

  it("requires a police declaration for a claiming activity on its own", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      isClaiming: true,
    });

    expect(result.formalities[0].procedureKind).toBe("police_declaration");
  });

  it("does not infer a police manifestation from itinerancy when an installation is present", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      isItinerant: true,
      hasInstallations: true,
    });

    expect(result.formalities.some((item) => item.procedureKind === "city_aot")).toBe(true);
    expect(result.formalities.some((item) => item.procedureKind === "police_declaration")).toBe(false);
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

  it("keeps unresolved facts visible when a qualified formalities path still has unknown inputs", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      hasInstallations: true,
      isPublicRoadwayActivity: "unknown",
    });

    expect(result.formalities.some((item) => item.requirementStatus === "required")).toBe(true);
    expect(result.unresolvedQuestions).toContain(
      "faits manquants sur le lieu, l'installation ou la manifestation",
    );
  });

  it("keeps installation uncertainty visible when the police path is otherwise qualified", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      isPublicRoadwayActivity: true,
      hasInstallations: "unknown",
    });

    expect(result.formalities[0].procedureKind).toBe("police_declaration");
    expect(result.unresolvedQuestions).toEqual([
      "faits manquants sur le lieu, l'installation ou la manifestation",
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

  it("qualifies physical occupation for a non-municipal manager without requiring an installation", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      manager: { kind: "sncf", label: "Gestionnaire de la gare" },
      requiresPhysicalOccupation: true,
    });

    expect(result.formalities[0]).toMatchObject({
      requirementStatus: "recommended",
      procedureKind: "information_only",
    });
  });

  it("does not recommend a non-municipal manager when no occupation fact is present", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      manager: { kind: "sncf", label: "Gestionnaire de la gare" },
    });

    expect(result.formalities.some((item) => item.procedureKind === "other_manager")).toBe(false);
    expect(result.formalities[0].procedureKind).toBe("unknown");
  });

  it("does not classify an unknown manager as a known non-municipal manager", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      manager: { kind: "unknown", label: null },
      hasInstallations: true,
    });

    expect(result.formalities.some((item) => item.procedureKind === "other_manager")).toBe(false);
    expect(result.formalities.map((item) => item.procedureKind)).toEqual([
      "information_only",
      "unknown",
    ]);
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
    expect(result.unresolvedQuestions).toEqual(["forme et occupation exacte de l'action"]);
  });

  it("does not extend the public-space exemption to an insufficiently scoped private site", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      publicSpace: "private_domain",
      localCustomaryUse: true,
    });

    expect(result.formalities[0].requirementStatus).toBe("unknown");
    expect(result.formalities[0].procedureKind).toBe("unknown");
    expect(result.formalities[0]).toMatchObject({
      id: "paris-formality-scope-undetermined",
      source: null,
      scope: "Cleanwalk parisienne sans installation dont la forme juridique et l'occupation effective ne sont pas suffisamment caractérisées.",
      justification: "Les sources officielles consultées ne créent pas une AOT automatique pour une simple cleanwalk et ne suffisent pas, sans autres faits, à conclure à une exemption ou à une déclaration précise.",
    });
  });

  it("uses the generic unknown explanation for a non-cleanwalk outside the covered scope", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      publicSpace: "private_domain",
      isCleanwalk: false,
    });

    expect(result.formalities[0]).toMatchObject({
      id: "paris-formality-scope-undetermined",
      source: null,
      scope: "Action parisienne dont les faits ne permettent pas encore de sélectionner une formalité.",
      justification: "Aucune règle officielle suffisamment précise n'est applicable aux faits fournis.",
    });
  });

  it("does not generalize Paris rules to another territory", () => {
    const result = qualifyActionFormalities({
      ...parisFacts,
      territory: { countryCode: "FR", code: "FR-69", label: "Lyon" },
    });

    expect(result.rulesetVersion).toBe("national-administrative-framework-fallback-2026-09-17");
    expect(result.formalities[0]).toMatchObject({
      id: "national-formalities-fallback",
      requirementStatus: "unknown",
      procedureKind: "unknown",
      source: expect.objectContaining({ authorityLevel: "national" }),
      ruleScope: { kind: "national" },
      justification: expect.stringContaining("règle locale suffisamment vérifiée"),
    });
    expect(result.formalities[0].scope).toBe(
      "Cadre national français — règle locale à vérifier",
    );
    expect(result.unresolvedQuestions).toEqual(["règle locale applicable sur le territoire"]);
  });

  it("keeps the national fallback unknown and non-blocking when no local rule exists", () => {
    const facts = {
      ...parisFacts,
      territory: {
        countryCode: "FR" as const,
        code: "FR-69",
        label: "Lyon",
        department: { code: "69", label: "Rhône" },
      },
    };
    const result = qualifyActionFormalities(facts);

    expect(result.formalities[0]).toMatchObject({
      requirementStatus: "unknown",
      competentAuthority: { kind: "unknown" },
      source: { url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F21899" },
    });
    expect(result.formalities[0].justification).toContain("règle locale");
  });

  it("exposes Paris as a specialized rule scope without leaking it to Lyon", () => {
    const paris = qualifyActionFormalities(parisFacts);
    const lyon = qualifyActionFormalities({
      ...parisFacts,
      territory: {
        countryCode: "FR",
        code: "FR-69",
        label: "Lyon",
        department: { code: "69", label: "Rhône" },
      },
    });

    expect(paris.formalities[0]).toMatchObject({
      ruleId: "paris-public-space-formalities",
      ruleScope: { kind: "special_territory", code: "FR-PARIS" },
    });
    expect(lyon.formalities[0]).not.toHaveProperty("ruleId", "paris-public-space-formalities");
  });

  it("uses the commune rule before a department rule only when the rule says it supersedes it", () => {
    const departmentRule = testRule({
      id: "department-69",
      scope: { kind: "department", countryCode: "FR", departmentCode: "69" },
      formalityId: "department-formality",
    });
    const communeRule = testRule({
      id: "commune-69123",
      scope: { kind: "commune", countryCode: "FR", codeInsee: "69123" },
      formalityId: "commune-formality",
      supersedesRuleIds: ["department-69"],
    });
    const result = qualifyActionFormalities(
      {
        ...parisFacts,
        territory: {
          countryCode: "FR",
          code: "FR-69",
          label: "Lyon",
          commune: { codeInsee: "69123", label: "Lyon" },
          department: { code: "69", label: "Rhône" },
        },
      },
      [departmentRule, communeRule],
    );

    expect(result.formalities.map((item) => item.id)).toEqual(["commune-formality"]);
    expect(result.formalities[0]?.ruleScope).toEqual(communeRule.scope);
  });

  it("keeps compatible department formalities together and does not invent a national fallback", () => {
    const first = testRule({
      id: "department-69-first",
      scope: { kind: "department", countryCode: "FR", departmentCode: "69" },
      formalityId: "department-first",
    });
    const second = testRule({
      id: "department-69-second",
      scope: { kind: "department", countryCode: "FR", departmentCode: "69" },
      formalityId: "department-second",
    });
    const result = qualifyActionFormalities(
      {
        ...parisFacts,
        territory: {
          countryCode: "FR",
          code: "FR-69",
          label: "Rhône",
          department: { code: "69", label: "Rhône" },
        },
      },
      [first, second],
    );

    expect(result.formalities.map((item) => item.id)).toEqual([
      "department-first",
      "department-second",
    ]);
  });

  it("lets a more precise local rule replace the national fallback", () => {
    const fallback = testRule({
      id: "national-fallback-test",
      scope: { kind: "national", countryCode: "FR" },
      formalityId: "national-fallback-formality",
    });
    const local = testRule({
      id: "commune-69123",
      scope: { kind: "commune", countryCode: "FR", codeInsee: "69123" },
      formalityId: "commune-formality",
    });
    const result = qualifyActionFormalities(
      {
        ...parisFacts,
        territory: {
          countryCode: "FR",
          code: "FR-69",
          label: "Lyon",
          commune: { codeInsee: "69123", label: "Lyon" },
          department: { code: "69", label: "Rhône" },
        },
      },
      [{ ...fallback, isFallback: true }, local],
    );

    expect(result.formalities.map((item) => item.id)).toEqual(["commune-formality"]);
  });

  it("keeps an explicit unknown without a source when no rule is available", () => {
    const result = qualifyActionFormalities(
      { ...parisFacts, territory: { countryCode: "FR", code: "FR-69", label: "Lyon" } },
      [],
    );

    expect(result.formalities[0]).toMatchObject({
      requirementStatus: "unknown",
      source: null,
      competentAuthority: { kind: "unknown" },
    });
    expect(result.unresolvedQuestions).toEqual(["règles officielles du territoire"]);
  });
});
