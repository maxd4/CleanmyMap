import type {
  ActionFormalitiesFacts,
  ActionFormalitiesQualification,
  ActionFormality,
  FormalitiesOfficialSource,
  FormalitiesTerritory,
  FormalityProcedureKind,
  FormalityRequirementStatus,
  FormalitiesAuthorityKind,
} from "./formalities-qualification";

export type FormalityRuleScope =
  | {
      kind: "national";
      countryCode: "FR";
    }
  | {
      kind: "department";
      countryCode: "FR";
      departmentCode: string;
    }
  | {
      kind: "commune";
      countryCode: "FR";
      codeInsee: string;
    }
  | {
      kind: "special_territory";
      countryCode: "FR";
      code: string;
    };

export type AdministrativeRuleContract = {
  authority: {
    kind: FormalitiesAuthorityKind;
    label: string;
  };
  requirementStatus: FormalityRequirementStatus;
  procedureKind: FormalityProcedureKind;
  officialSource: FormalitiesOfficialSource | null;
  verifiedAt: string | null;
  deadline: {
    minimumValue: number;
    unit: "days" | "months";
    note: string;
  } | null;
  destination: string | null;
  requiredInformation: string[];
};

export type AdministrativeFormalityRule = {
  id: string;
  scope: FormalityRuleScope;
  rulesetVersion: string | null;
  contract: AdministrativeRuleContract;
  qualifies: (
    facts: ActionFormalitiesFacts,
  ) => Pick<ActionFormalitiesQualification, "formalities" | "unresolvedQuestions">;
  /** Only explicitly listed compatible rules are replaced. */
  supersedesRuleIds?: readonly string[];
  /** A fallback is shown only when no more precise territorial rule applies. */
  isFallback?: boolean;
};

function scopeSpecificity(scope: FormalityRuleScope): number {
  switch (scope.kind) {
    case "commune":
    case "special_territory":
      return 3;
    case "department":
      return 2;
    case "national":
      return 1;
  }
}

function scopeMatchesTerritory(
  scope: FormalityRuleScope,
  territory: FormalitiesTerritory,
): boolean {
  if (scope.countryCode !== territory.countryCode) {
    return false;
  }

  switch (scope.kind) {
    case "national":
      return true;
    case "department":
      return territory.department?.code === scope.departmentCode;
    case "commune":
      return territory.commune?.codeInsee === scope.codeInsee;
    case "special_territory":
      return (
        territory.specialTerritory?.code === scope.code ||
        (scope.code === "FR-PARIS" && territory.code === "FR-75")
      );
  }
}

function selectApplicableAdministrativeRules(
  facts: ActionFormalitiesFacts,
  rules: readonly AdministrativeFormalityRule[],
): AdministrativeFormalityRule[] {
  const compatible = rules
    .filter((rule) => scopeMatchesTerritory(rule.scope, facts.territory))
    .sort((left, right) => {
      const specificityDifference =
        scopeSpecificity(right.scope) - scopeSpecificity(left.scope);
      return specificityDifference || left.id.localeCompare(right.id);
    });
  const supersededRuleIds = new Set(
    compatible.flatMap((rule) => rule.supersedesRuleIds ?? []),
  );
  const hasSpecificRule = compatible.some((rule) => scopeSpecificity(rule.scope) > 1);

  return compatible.filter(
    (rule) =>
      !supersededRuleIds.has(rule.id) &&
      !(hasSpecificRule && rule.isFallback === true),
  );
}

export function buildFormalitiesTerritoryFingerprint(
  territory: FormalitiesTerritory,
): string {
  return [
    territory.countryCode,
    territory.specialTerritory?.code ?? "",
    territory.commune?.codeInsee ?? "",
    territory.department?.code ?? territory.code,
    territory.region?.code ?? "",
  ].join("|");
}

function attachRuleMetadata(
  formality: ActionFormality,
  rule: AdministrativeFormalityRule,
): ActionFormality {
  return {
    ...formality,
    ruleId: rule.id,
    ruleScope: rule.scope,
  };
}

export function qualifyWithAdministrativeRules(params: {
  facts: ActionFormalitiesFacts;
  rules: readonly AdministrativeFormalityRule[];
  schemaVersion: ActionFormalitiesQualification["schemaVersion"];
  fallbackFormality: ActionFormality;
  fallbackQuestion: string;
}): ActionFormalitiesQualification {
  const applicableRules = selectApplicableAdministrativeRules(params.facts, params.rules);
  if (applicableRules.length === 0) {
    return {
      schemaVersion: params.schemaVersion,
      rulesetVersion: null,
      territory: params.facts.territory,
      formalities: [params.fallbackFormality],
      unresolvedQuestions: [params.fallbackQuestion],
    };
  }

  const qualified = applicableRules.map((rule) => ({
    rule,
    result: rule.qualifies(params.facts),
  }));
  const versions = [...new Set(
    applicableRules
      .map((rule) => rule.rulesetVersion)
      .filter((version): version is string => Boolean(version)),
  )];
  return {
    schemaVersion: params.schemaVersion,
    rulesetVersion: versions.join("+") || null,
    territory: params.facts.territory,
    formalities: qualified.flatMap(({ rule, result }) =>
      result.formalities.map((formality) => attachRuleMetadata(formality, rule)),
    ),
    unresolvedQuestions: [
      ...new Set(qualified.flatMap(({ result }) => result.unresolvedQuestions)),
    ],
  };
}
