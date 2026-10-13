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
    if (regulation.tiebreakers.length === 0) return invalid("tiebreakers_required");
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

function validateRegulation(regulation: SpogomiRegulation): SpogomiValidationResult {
  if (!regulation.version.trim()) return invalid("regulation_version_required");
  if (regulation.categories.length === 0) return invalid("categories_required");
  for (const result of [
    validateCategories(regulation.categories),
    validateRounding(regulation),
    validateEligibility(regulation),
    validateTiebreakers(regulation),
    validatePenalties(regulation),
  ]) {
    if (!result.ok) return result;
  }
  return { ok: true };
}

export function isRegulationReadyForCertification(
  regulation: SpogomiRegulation,
): boolean {
  return (
    regulation.status === "complete" &&
    validateRegulation(regulation).ok &&
    Boolean(regulation.sourceReference?.trim()) &&
    Boolean(regulation.rounding) &&
    Boolean(regulation.eligibility) &&
    Boolean(regulation.tiebreakers?.length) &&
    regulation.categories.every((category) =>
      category.isComplete &&
      category.coefficientStatus === "confirmed" &&
      category.coefficient !== null &&
      Number.isFinite(category.coefficient),
    )
  );
}

export function validateTeamComposition(
  mode: SpogomiEventMode,
  memberCount: number,
  teamSize: SpogomiRegulation["teamSize"],
): SpogomiValidationResult {
  if (!Number.isInteger(memberCount) || memberCount < 0) {
    return invalid("member_count_must_be_a_non_negative_integer");
  }
  if (mode === "world_cup" && memberCount !== 3) {
    return invalid("world_cup_requires_exactly_three_members");
  }

  const { minMembers, maxMembers } = teamSize.casual;
  if (mode === "casual") {
    if (minMembers !== null && (!Number.isInteger(minMembers) || minMembers < 1)) {
      return invalid("casual_min_members_invalid");
    }
    if (maxMembers !== null && (!Number.isInteger(maxMembers) || maxMembers < 1)) {
      return invalid("casual_max_members_invalid");
    }
    if (minMembers !== null && maxMembers !== null && minMembers > maxMembers) {
      return invalid("casual_team_bounds_invalid");
    }
    if (minMembers !== null && memberCount < minMembers) {
      return invalid("casual_team_below_minimum");
    }
    if (maxMembers !== null && memberCount > maxMembers) {
      return invalid("casual_team_above_maximum");
    }
  }

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
  if (item.quantity !== null && (!Number.isFinite(item.quantity) || item.quantity < 0 || item.quantity > 1_000_000_000_000)) {
    return invalid("quantity_must_be_a_non_negative_finite_number");
  }
  if (item.measurementKind === "count" && item.quantity !== null && !Number.isSafeInteger(item.quantity)) {
    return invalid("count_must_be_an_integer");
  }
  if (!item.provenance.trim()) return invalid("measurement_provenance_required");
  if (item.massGrams !== undefined && item.massGrams !== null && (!Number.isFinite(item.massGrams) || item.massGrams < 0 || item.massGrams > 1_000_000_000)) {
    return invalid("mass_grams_must_be_non_negative_and_bounded");
  }
  if (item.objectCount !== undefined && item.objectCount !== null && (!Number.isSafeInteger(item.objectCount) || item.objectCount < 0)) {
    return invalid("object_count_must_be_a_non_negative_integer");
  }
  if (item.measurementMethod !== undefined && item.measurementMethod !== null && !item.measurementMethod.trim()) {
    return invalid("measurement_method_required_when_provided");
  }
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
