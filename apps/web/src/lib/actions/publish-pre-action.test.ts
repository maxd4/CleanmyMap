import { describe, expect, it, vi } from "vitest";
import { publishPreActionCanonical } from "./publish-pre-action";

const validateFormalities = vi.hoisted(() => vi.fn());
vi.mock("./formalities/publication-validation", () => ({
  validateActionFormalitiesForPublication: validateFormalities,
}));

describe("publishPreActionCanonical association review", () => {
  it("does not submit association review while a required formality is blocked", async () => {
    validateFormalities.mockResolvedValue({
      ok: false,
      blockedFormalityIds: ["national-public-domain-occupation-title"],
    });
    const persistReviewSubmission = vi.fn();

    const result = await publishPreActionCanonical({
      supabase: {} as never,
      current: {
        id: "action-1",
        action_phase: "pre_action",
        organizer_type: "association",
        published_at: null,
        review_state: "pending",
      } as never,
      actionId: "action-1",
      userId: "organizer-1",
      organizerIds: ["organizer-1"],
      persistReviewSubmission,
    });

    expect(result).toEqual({
      status: "formality_blocked",
      blockedFormalityIds: ["national-public-domain-occupation-title"],
    });
    expect(validateFormalities).toHaveBeenCalledTimes(1);
    expect(persistReviewSubmission).not.toHaveBeenCalled();
  });
});
