import { describe, expect, it } from "vitest";
import { buildIndividualLeaderboardCandidates } from "./progression-ranking";

type QueryResult = { data: unknown; error: null };

function buildBatchSupabase(profileCount: number) {
  const calls: string[] = [];
  const profiles = Array.from({ length: profileCount }, (_, index) => ({
    id: `user-${index}`,
    display_name: `User ${index}`,
    display_name_mode: "full_name",
    handle: null,
    leaderboard_public_opt_in: true,
  }));
  const supabase = {
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              return {
                limit() {
                  calls.push(table);
                  return Promise.resolve({ data: profiles, error: null } satisfies QueryResult);
                },
              };
            },
            in() {
              return {
                limit() {
                  calls.push(table);
                  return Promise.resolve({ data: [], error: null } satisfies QueryResult);
                },
              };
            },
          };
        },
      };
    },
  };
  return { supabase, calls };
}

describe("batch user leaderboard source", () => {
  it("keeps database reads bounded and never loads a catalog per user", async () => {
    const { supabase, calls } = buildBatchSupabase(32);
    const rows = await buildIndividualLeaderboardCandidates(supabase as never, "level");

    expect(rows).toHaveLength(32);
    expect(calls.filter((table) => table === "progression_profiles")).toHaveLength(1);
    expect(calls.filter((table) => table === "progression_events")).toHaveLength(1);
    expect(calls).not.toContain("gamification_catalog");
    expect(calls.length).toBeLessThanOrEqual(10);
  });
});
