import { describe, expect, it } from "vitest";
import {
  buildPilotageScopeCacheKey,
  loadOrganizedActionIds,
  mergeOrganizedActionIds,
} from "./scope";

describe("pilotage organized scope", () => {
  it("unites creator and canonical organizer relations without association-name matching", () => {
    expect(
      mergeOrganizedActionIds(
        [{ id: "action-a" }],
        [{ action_id: "action-a" }, { action_id: "action-b" }],
      ),
    ).toEqual(["action-a", "action-b"]);
  });

  it("includes only the authenticated user's creator and organizer relations", async () => {
    const queries: Array<{ table: string; column: string; value: string }> = [];
    const supabase = {
      from(table: string) {
        return {
          select() {
            return {
              eq(column: string, value: string) {
                queries.push({ table, column, value });
                return Promise.resolve({
                  data:
                    table === "actions"
                      ? [{ id: "action-a" }]
                      : [{ action_id: "action-a" }],
                  error: null,
                });
              },
            };
          },
        };
      },
    } as never;

    await expect(loadOrganizedActionIds("user-a", supabase)).resolves.toEqual(["action-a"]);
    expect(queries).toEqual([
      { table: "actions", column: "created_by_clerk_id", value: "user-a" },
      { table: "action_organizers", column: "organizer_clerk_id", value: "user-a" },
    ]);
  });

  it("keeps a user with no organized action in an explicit empty corpus", () => {
    const actionIds = mergeOrganizedActionIds([], []);

    expect(actionIds).toEqual([]);
    expect(buildPilotageScopeCacheKey({ kind: "organized", userId: "user-a" }, actionIds)).not.toBe(
      buildPilotageScopeCacheKey(undefined, null),
    );
  });

  it("shares a cache lane only when the authorized corpus is equal", () => {
    const scope = { kind: "organized" as const, userId: "user-a" };

    expect(buildPilotageScopeCacheKey(scope, ["b", "a"])).toBe(
      buildPilotageScopeCacheKey({ ...scope, userId: "user-b" }, ["a", "b"]),
    );
    expect(buildPilotageScopeCacheKey(scope, ["action-a"])).not.toBe(
      buildPilotageScopeCacheKey(scope, ["action-b"]),
    );
  });
});
