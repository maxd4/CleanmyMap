import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mobileAuth: vi.fn(), getSupabase: vi.fn(), loadAction: vi.fn(), identity: vi.fn(), organizers: vi.fn(), canReview: vi.fn(), canOverride: vi.fn(), loadReviews: vi.fn(), review: vi.fn(), audit: vi.fn(), refreshProgression: vi.fn(), rebuildBadges: vi.fn(),
}));
vi.mock("@/lib/auth/mobile-bearer", () => ({ requireMobileAuthenticatedAccess: mocks.mobileAuth }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabase }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: mocks.loadAction }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: mocks.identity }));
vi.mock("@/lib/actions/participation/organizers", () => ({ loadCanonicalActionOrganizerIdsForAction: mocks.organizers }));
vi.mock("@/lib/actions/permissions", () => ({ canReviewActionParticipants: mocks.canReview, canOverrideActionParticipants: mocks.canOverride }));
vi.mock("@/lib/actions/participation/group-participation", () => ({ loadActionParticipationReviews: mocks.loadReviews, reviewActionParticipation: mocks.review, addActionParticipationByAdmin: vi.fn() }));
vi.mock("@/lib/actions/moderation-audit", () => ({ appendActionModerationAudit: mocks.audit }));
vi.mock("@/lib/gamification/progression-tracking", () => ({ refreshProgressionProfile: mocks.refreshProgression }));
vi.mock("@/lib/gamification/badges/rebuild", () => ({ rebuildUserGamificationBadges: mocks.rebuildBadges }));

import { GET, POST } from "./route";

const ctx = { params: Promise.resolve({ actionId: "action-1" }) };
const req = (body?: unknown) => new Request("https://cleanmymap.test/api/mobile/actions/action-1/review", { method: body ? "POST" : "GET", headers: { Authorization: "Bearer native-jwt", "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });

describe("/api/mobile/actions/:actionId/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mobileAuth.mockResolvedValue({ ok: true, userId: "organizer-1" });
    mocks.getSupabase.mockReturnValue({});
    mocks.loadAction.mockResolvedValue({ id: "action-1", created_by_clerk_id: "creator-1", action_phase: "pre_action" });
    mocks.identity.mockResolvedValue({ userId: "organizer-1", role: "benevole", activeRole: "benevole" });
    mocks.organizers.mockResolvedValue(["organizer-1"]);
    mocks.canReview.mockReturnValue(true);
    mocks.canOverride.mockReturnValue(false);
    mocks.loadReviews.mockResolvedValue([]);
    mocks.review.mockResolvedValue({ participantUserId: "volunteer-1", participationStatus: "confirmed", previousValue: null, newValue: null });
    mocks.audit.mockResolvedValue(undefined);
    mocks.refreshProgression.mockResolvedValue(undefined);
    mocks.rebuildBadges.mockResolvedValue(undefined);
  });

  it("allows a canonical organizer to read and process the queue", async () => {
    expect((await GET(req(), ctx)).status).toBe(200);
    const response = await POST(req({ participantId: "registration-1", decision: "accept" }), ctx);
    expect(response.status).toBe(200);
    expect(mocks.review).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ actionId: "action-1", participantId: "registration-1", decision: "accept" }));
    expect(mocks.audit).toHaveBeenCalled();
  });

  it("denies another user even when that user knows the action id", async () => {
    mocks.mobileAuth.mockResolvedValue({ ok: true, userId: "other-user" });
    mocks.identity.mockResolvedValue({ userId: "other-user", role: "benevole", activeRole: "benevole" });
    mocks.canReview.mockReturnValue(false);
    expect((await GET(req(), ctx)).status).toBe(403);
    expect(mocks.loadReviews).not.toHaveBeenCalled();
  });
});
