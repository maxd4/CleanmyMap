import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadUserLevelRankingSummary } from "./progression-ranking-data";

const cacheState = vi.hoisted(() => ({
  promises: new Map<string, Promise<unknown>>(),
}));
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const buildIndividualLeaderboardCandidatesMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  unstable_cache: (factory: () => Promise<unknown>, keyParts: string[]) => {
    const key = keyParts.join("|");
    return async () => {
      if (!cacheState.promises.has(key)) {
        cacheState.promises.set(key, factory());
      }
      return cacheState.promises.get(key)!;
    };
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("./progression-ranking", () => ({
  buildIndividualLeaderboardCandidates: buildIndividualLeaderboardCandidatesMock,
}));

describe("loadUserLevelRankingSummary", () => {
  beforeEach(() => {
    cacheState.promises.clear();
    vi.clearAllMocks();
    buildIndividualLeaderboardCandidatesMock.mockResolvedValue([
      {
        userId: "user-2",
        rank: 1,
        publicLabel: "Alice",
        level: 3,
        xpValidated: 25,
        badgeTotal: 2,
        gradeCount: 1,
        oneShotCount: 1,
      },
    ]);
  });

  it("uses the canonical opted-in level projection and caches it", async () => {
    const supabase = {};
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const first = await loadUserLevelRankingSummary("user-2");
    const second = await loadUserLevelRankingSummary("user-2");

    expect(first.currentUserRow).toMatchObject({
      userId: "user-2",
      actorName: "Alice",
      currentLevel: 3,
      xpValidated: 25,
      badgeTotal: 2,
    });
    expect(second.currentUserRow).toEqual(first.currentUserRow);
    expect(buildIndividualLeaderboardCandidatesMock).toHaveBeenCalledTimes(1);
    expect(buildIndividualLeaderboardCandidatesMock).toHaveBeenCalledWith(supabase, "level");
  });
});
