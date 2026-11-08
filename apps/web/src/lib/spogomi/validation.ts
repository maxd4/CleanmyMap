import type {
  SpogomiCategoryRule,
  SpogomiEventMode,
  SpogomiParticipantState,
  SpogomiRegulation,
  SpogomiResultItemInput,
  SpogomiSubmissionStatus,
} from "./types";

export type SpogomiValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

const invalid = (reason: string): SpogomiValidationResult => ({ ok: false, reason });

function validateCategory(category: SpogomiCategoryRule, codes: Set<string>): SpogomiValidationResult {
  if (!category.code.trim() || !category.label.trim()) return invalid("category_identity_required");
  if (codes.has(category.code)) return invalid("category_code_must_be_unique");
  codes.add(category.code);
  if (!category.unit.trim()) return invalid("category_unit_required");
  if (category.coefficientStatus === "confirmed" && category.coefficient === null) return invalid("confirmed_coefficient_required");
  if (category.coefficient !== null && !Number.isFinite(category.coefficient)) return invalid("coefficient_must_be_finite");
  return { ok: true };
}

function validateCategories(categories: SpogomiCategoryRule[]): SpogomiValidationResult {
  const codes = new Set<string>();
  for (const category of categories) {
    const result = validateCategory(category, codes);
    if (!result.ok) return result;
  }
  return { ok: true };
}

function validateRounding(regulation: SpogomiRegulation): SpogomiValidationResult {
  if (regulation.rounding) {
    if (!Number.isInteger(regulation.rounding.decimals) || regulation.rounding.decimals < 0 || regulation.rounding.decimals > 6) return invalid("rounding_precision_invalid");
    if (!["half_up", "down", "up"].includes(regulation.rounding.mode)) return invalid("rounding_mode_invalid");
  }
  return { ok: true };
}

function validateEligibility(regulation: SpogomiRegulation): SpogomiValidationResult {
  if (regulation.eligibility) {
    const minimum = regulation.eligibility.minimumPresentParticipants;
    if (minimum !== null && (!Number.isInteger(minimum) || minimum < 0)) return invalid("minimum_present_participants_invalid");
    if (typeof regulation.eligibility.requiresAllCategories !== "boolean") return invalid("requires_all_categories_invalid");
  }
  return { ok: true };
}

function validateTiebreakers(regulation: SpogomiRegulation): SpogomiValidationResult {
  if (regulation.tiebreakers) {
    if (regulation.tiebreakers.length === 0) return { ok: true };
    if (new Set(regulation.tiebreakers).size !== regulation.tiebreakers.length) return invalid("tiebreakers_must_be_unique");
    if (regulation.tiebreakers.some((tiebreaker) => !["sporting_score", "mass_grams", "counted_objects"].includes(tiebreaker))) return invalid("tiebreaker_invalid");
  }
  return { ok: true };
}

function validatePenalties(regulation: SpogomiRegulation): SpogomiValidationResult {
  for (const penalty of regulation.penalties ?? []) {
    if (!penalty.code.trim() || !penalty.label.trim() || !Number.isFinite(penalty.points)) return invalid("penalty_invalid");
  }
  return { ok: true };
}

function validateTeamSizeConfig(regulation: SpogomiRegulation): SpogomiValidationResult {
  const { minMembers, maxMembers } = regulation.teamSize.casual;
  if (minMembers !== null && (!Number.isInteger(minMembers) || minMembers < 1)) return invalid("casual_min_members_invalid");
  if (maxMembers !== null && (!Number.isInteger(maxMembers) || maxMembers < 1)) return invalid("casual_max_members_invalid");
  if (minMembers !== null && maxMembers !== null && minMembers > maxMembers) return invalid("casual_team_bounds_invalid");
  return { ok: true };
}

function validateEnvironmentMappings(regulation: SpogomiRegulation): SpogomiValidationResult {
  if (!regulation.environmentMappings) return { ok: true };
  const categoriesByCode = new Map(regulation.categories.map((category) => [category.code, category]));
  const seen = new Set<string>();
  for (const mapping of regulation.environmentMappings) {
    const category = categoriesByCode.get(mapping.categoryCode);
    if (!category) return invalid("mapping_category_unknown");
    if (seen.has(mapping.categoryCode)) return invalid("mapping_category_must_be_unique");
    seen.add(mapping.categoryCode);
    if (!mapping.sourceUnit.trim()) return invalid("mapping_source_unit_required");
    if (mapping.mappingStatus === "mapped") {
      if (!mapping.environmentalCategorySlug?.trim() || !mapping.sourceField || !mapping.targetUnit || mapping.unitFactorToTarget === null || !Number.isFinite(mapping.unitFactorToTarget) || mapping.unitFactorToTarget <= 0) return invalid("mapped_environment_mapping_incomplete");
      if (mapping.environmentalCategorySlug !== category.environmentalCategorySlug) return invalid("mapping_environmental_category_mismatch");
      if (mapping.isMegots !== (mapping.environmentalCategorySlug === "cigarette_butt")) return invalid("mapping_megots_classification_mismatch");
    }
    if (mapping.mappingStatus !== "mapped" && !mapping.exclusionReason?.trim()) return invalid("unmapped_environment_mapping_requires_reason");
  }
  return { ok: true };
}

function validateCompleteRegulation(regulation: SpogomiRegulation): SpogomiValidationResult {
  if (!regulation.sourceReference?.trim()) return invalid("complete_source_reference_required");
  if (!regulation.rounding) return invalid("complete_rounding_required");
  if (!regulation.eligibility) return invalid("complete_eligibility_required");
  if (!regulation.tiebreakers?.length) return invalid("complete_tiebreakers_required");
  if (regulation.categories.some((category) =>
    !category.isComplete ||
    category.coefficientStatus !== "confirmed" ||
    category.coefficient === null ||
    !Number.isFinite(category.coefficient) ||
    !category.environmentalCategorySlug?.trim(),
  )) {
    return invalid("complete_categories_require_confirmed_coefficients_and_environment_mapping");
  }
  if (!regulation.environmentMappings || regulation.environmentMappings.length !== regulation.categories.length) {
    return invalid("complete_environment_mappings_required");
  }
  const mappingByCode = new Map(regulation.environmentMappings.map((mapping) => [mapping.categoryCode, mapping]));
  if (regulation.categories.some((category) => mappingByCode.get(category.code)?.mappingStatus !== "mapped")) {
    return invalid("complete_environment_mappings_must_be_mapped");
  }
  return { ok: true };
}

export function validateSpogomiRegulation(regulation: SpogomiRegulation): SpogomiValidationResult {
  if (!regulation.version.trim()) return invalid("regulation_version_required");
  if (regulation.status === "complete" && regulation.categories.length === 0) return invalid("categories_required");
  for (const result of [
    validateTeamSizeConfig(regulation),
    validateCategories(regulation.categories),
    validateRounding(regulation),
    validateEligibility(regulation),
    validateTiebreakers(regulation),
    validatePenalties(regulation),
    validateEnvironmentMappings(regulation),
  ]) {
    if (!result.ok) return result;
  }
  if (regulation.status === "complete") {
    const completeValidation = validateCompleteRegulation(regulation);
    if (!completeValidation.ok) return completeValidation;
  }
  return { ok: true };
}

export const validateRegulation = validateSpogomiRegulation;

export function isRegulationReadyForCertification(
  regulation: SpogomiRegulation,
): boolean {
  return regulation.status === "complete" && validateSpogomiRegulation(regulation).ok;
}

export function validateTeamComposition(
  mode: SpogomiEventMode,
  memberCount: number,
  teamSize: SpogomiRegulation["teamSize"],
): SpogomiValidationResult {
  const memberValidation = validateMemberCount(mode, memberCount);
  if (!memberValidation.ok) return memberValidation;
  return mode === "casual" ? validateCasualTeamBounds(memberCount, teamSize.casual) : { ok: true };
}

function validateMemberCount(mode: SpogomiEventMode, memberCount: number): SpogomiValidationResult {
  if (!Number.isInteger(memberCount) || memberCount < 0) return invalid("member_count_must_be_a_non_negative_integer");
  if (mode === "world_cup" && memberCount !== 3) return invalid("world_cup_requires_exactly_three_members");
  return { ok: true };
}

function validateCasualTeamBounds(
  memberCount: number,
  bounds: SpogomiRegulation["teamSize"]["casual"],
): SpogomiValidationResult {
  const { minMembers, maxMembers } = bounds;
  if (minMembers !== null && (!Number.isInteger(minMembers) || minMembers < 1)) return invalid("casual_min_members_invalid");
  if (maxMembers !== null && (!Number.isInteger(maxMembers) || maxMembers < 1)) return invalid("casual_max_members_invalid");
  if (minMembers !== null && maxMembers !== null && minMembers > maxMembers) return invalid("casual_team_bounds_invalid");
  if (minMembers !== null && memberCount < minMembers) return invalid("casual_team_below_minimum");
  if (maxMembers !== null && memberCount > maxMembers) return invalid("casual_team_above_maximum");
  return { ok: true };
}

export function validateParticipantState(
  participant: SpogomiParticipantState,
): SpogomiValidationResult {
  if (participant.accountLinkStatus === "verified" && !participant.clerkId?.trim()) {
    return invalid("verified_account_link_requires_clerk_id");
  }
  if (participant.accountLinkStatus !== "verified" && participant.clerkId !== null) {
    return invalid("unverified_account_link_cannot_have_clerk_id");
  }
  return { ok: true };
}

export function validateResultItem(
  item: SpogomiResultItemInput,
  category: Pick<SpogomiCategoryRule, "measurementKind" | "unit">,
): SpogomiValidationResult {
  if (item.measurementKind !== category.measurementKind) {
    return invalid("measurement_kind_must_match_category");
  }
  if (item.unit !== category.unit) return invalid("measurement_unit_must_match_category");
  const valueValidation = validateQuantity(item.quantity, item.measurementKind);
  if (!valueValidation.ok) return valueValidation;
  if (!item.provenance.trim()) return invalid("measurement_provenance_required");
  return validateOptionalMeasurementFields(item);
}

function validateQuantity(quantity: number | null, measurementKind: SpogomiResultItemInput["measurementKind"]): SpogomiValidationResult {
  if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0 || quantity > 1_000_000_000_000)) return invalid("quantity_must_be_a_non_negative_finite_number");
  if (measurementKind === "count" && quantity !== null && !Number.isSafeInteger(quantity)) return invalid("count_must_be_an_integer");
  return { ok: true };
}

function validateOptionalMeasurementFields(item: SpogomiResultItemInput): SpogomiValidationResult {
  if (item.massGrams !== undefined && item.massGrams !== null && (!Number.isFinite(item.massGrams) || item.massGrams < 0 || item.massGrams > 1_000_000_000)) return invalid("mass_grams_must_be_non_negative_and_bounded");
  if (item.objectCount !== undefined && item.objectCount !== null && (!Number.isSafeInteger(item.objectCount) || item.objectCount < 0)) return invalid("object_count_must_be_a_non_negative_integer");
  if (item.measurementMethod !== undefined && item.measurementMethod !== null && !item.measurementMethod.trim()) return invalid("measurement_method_required_when_provided");
  return { ok: true };
}

export function validateSubmissionCertification(input: {
  status: SpogomiSubmissionStatus;
  previousStatus?: SpogomiSubmissionStatus | null;
  regulation: SpogomiRegulation;
  certifiedByClerkId: string | null;
  certifiedAt: string | null;
}): SpogomiValidationResult {
  if (input.status !== "certified") return { ok: true };
  if (
    input.previousStatus === "provisional" ||
    input.previousStatus === "rejected" ||
    input.previousStatus === "superseded"
  ) {
    return invalid("non_certifiable_previous_status");
  }
  if (!isRegulationReadyForCertification(input.regulation)) {
    return invalid("incomplete_regulation_blocks_certification");
  }
  if (!input.certifiedByClerkId?.trim() || !input.certifiedAt) {
    return invalid("certification_reviewer_and_timestamp_required");
  }
  return { ok: true };
}
