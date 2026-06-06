import { describe, expect, it, vi } from "vitest";
import {
  buildReferralLineageLeaderboard,
  buildReferralLineageView,
  formatReferralLevel,
  loadReferralLineageView,
} from "./referral-lineage";

describe("referral lineage", () => {
  const profiles = [
    {
      id: "root",
      display_name: "Root User",
      referral_code: "ROOT01",
      referred_by_profile_id: null,
      referred_at: null,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "child",
      display_name: "Child User",
      referral_code: "CHILD01",
      referred_by_profile_id: "root",
      referred_at: "2026-02-01T00:00:00Z",
      created_at: "2026-02-01T00:00:00Z",
    },
    {
      id: "grandchild",
      display_name: "Grand Child",
      referral_code: null,
      referred_by_profile_id: "child",
      referred_at: "2026-03-01T00:00:00Z",
      created_at: "2026-03-01T00:00:00Z",
    },
    {
      id: "other-root",
      display_name: "Other Root",
      referral_code: "OTHER01",
      referred_by_profile_id: null,
      referred_at: null,
      created_at: "2026-01-05T00:00:00Z",
    },
  ];

  it("builds a visible tree with ancestor chain and descendants", () => {
    const view = buildReferralLineageView("child", profiles);

    expect(view).not.toBeNull();
    expect(
      view?.ancestorChain.map((item) => `${item.level}:${item.displayName}`),
    ).toEqual(["-1:Root User", "0:Child User"]);
    expect(view?.descendantsCount).toBe(1);
    expect(view?.maxDepth).toBe(1);
    expect(view?.directInviteesCount).toBe(1);
    expect(view?.descendantTree[0]).toMatchObject({
      id: "grandchild",
      displayName: "Grand Child",
      level: 1,
      descendantsCount: 0,
    });
  });

  it("sorts the largest trees first", () => {
    const leaderboard = buildReferralLineageLeaderboard(profiles, 3);

    expect(leaderboard[0].profile.id).toBe("root");
    expect(leaderboard[0].descendantsCount).toBe(2);
    expect(leaderboard[1].profile.id).toBe("child");
    expect(leaderboard[1].descendantsCount).toBe(1);
  });

  it("formats the level labels", () => {
    expect(formatReferralLevel(0)).toBe("Niveau 0");
    expect(formatReferralLevel(1)).toBe("N+1");
    expect(formatReferralLevel(-2)).toBe("N-2");
  });

  it("loads a focused lineage tree without scanning all profiles", async () => {
    const focus = profiles[1];
    const rpcMock = vi.fn(async () => ({
      data: profiles.slice(0, 3),
      error: null,
    }));

    const supabase = {
      rpc: rpcMock,
    } as any;

    const view = await loadReferralLineageView(supabase, focus.id);

    expect(view?.focus.id).toBe(focus.id);
    expect(view?.descendantsCount).toBe(1);
    expect(rpcMock).toHaveBeenCalledWith("load_referral_lineage_profiles", {
      focus_profile_id: focus.id,
    });
  });
});
