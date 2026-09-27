import type {
  ActionFormality,
  FormalitiesOfficialSource,
  FormalityRequirementStatus,
} from "./formalities-qualification";
import type {
  AdministrativeFormalityRule,
  AdministrativeRuleContract,
} from "./formalities-rules";

const NATIONAL_FORMALITIES_RULESET_VERSION =
  "national-administrative-framework-fallback-2026-09-17" as const;
const NATIONAL_FORMALITIES_RULE_ID = "national-formalities-fallback" as const;

function buildNationalUnknownFormality(
  source: FormalitiesOfficialSource,
): ActionFormality {
  return {
    id: NATIONAL_FORMALITIES_RULE_ID,
    requirementStatus: "unknown",
    procedureKind: "unknown",
    competentAuthority: {
      kind: "unknown",
      label: "Autorité compétente à identifier",
    },
    recipient: null,
    source,
    supportingSources: [],
    scope: "Cadre national français — règle locale à vérifier",
    justification:
      "Le cadre national officiel est disponible, mais CleanMyMap ne dispose pas encore d’une règle locale suffisamment vérifiée pour cette action.",
    deadline: null,
    officialChannel: null,
    requestedInformation: [],
    requestedDocuments: [],
  };
}

export function createNationalFormalitiesRule(params: {
  source: FormalitiesOfficialSource;
  verifiedOn: string;
}): AdministrativeFormalityRule {
  const contract: AdministrativeRuleContract = {
    authority: {
      kind: "unknown",
      label: "Autorité compétente à identifier localement",
    },
    requirementStatus: "unknown" satisfies FormalityRequirementStatus,
    procedureKind: "unknown",
    officialSource: params.source,
    verifiedAt: params.verifiedOn,
    deadline: null,
    destination: null,
    requiredInformation: [],
  };

  return {
    id: NATIONAL_FORMALITIES_RULE_ID,
    scope: { kind: "national", countryCode: "FR" },
    rulesetVersion: NATIONAL_FORMALITIES_RULESET_VERSION,
    contract,
    isFallback: true,
    qualifies: () => ({
      formalities: [buildNationalUnknownFormality(params.source)],
      unresolvedQuestions: ["règle locale applicable sur le territoire"],
    }),
  };
}
