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

export function validateRegulation(regulation: SpogomiRegulation): SpogomiValidationResult {
  if (!regulation.version.trim()) return invalid("regulation_version_required");
  if (regulation.categories.length === 0) return invalid("categories_required");

  const codes = new Set<string>();
  for (const category of regulation.categories) {
    if (!category.code.trim() || !category.label.trim()) {
      return invalid("category_identity_required");
    }
    if (codes.has(category.code)) return invalid("category_code_must_be_unique");
    codes.add(category.code);
    if (!category.unit.trim()) return invalid("category_unit_required");
    if (category.coefficientStatus === "confirmed" && category.coefficient === null) {
      return invalid("confirmed_coefficient_required");
    }
    if (category.coefficient !== null && !Number.isFinite(category.coefficient)) {
      return invalid("coefficient_must_be_finite");
    }
  }

  return { ok: true };
}

export function isRegulationReadyForCertification(
  regulation: SpogomiRegulation,
): boolean {
  return (
    regulation.status === "complete" &&
    validateRegulation(regulation).ok &&
    regulation.categories.every((category) => category.isComplete)
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
  if (!Number.isFinite(item.quantity) || item.quantity < 0) {
    return invalid("quantity_must_be_a_non_negative_finite_number");
  }
  if (item.measurementKind === "count" && !Number.isInteger(item.quantity)) {
    return invalid("count_must_be_an_integer");
  }
  if (!item.provenance.trim()) return invalid("measurement_provenance_required");
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
