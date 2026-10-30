import { describe, expect, it } from "vitest";
import { isAssociationActionReviewRequired } from "./association-action-review";

describe("association action review contract", () => {
  it.each([
    ["association", "pre_action", true],
    ["student_association", "pre_action", true],
    ["company", "pre_action", false],
    ["association", "post_action_complete", false],
    [null, "pre_action", false],
  ] as const)("classifies %s/%s as %s", (organizerType, phase, expected) => {
    expect(isAssociationActionReviewRequired({ organizer_type: organizerType, action_phase: phase })).toBe(expected);
  });
});
