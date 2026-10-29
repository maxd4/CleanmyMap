import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261030000002_secure_school_future_map_coordinates.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("school future map privacy migration", () => {
  it("keeps the public RPC boundary and hides only future school pre-actions", () => {
    expect(migration).toContain(
      "rename to actions_map_feed_context_projection",
    );
    expect(migration).toContain("security invoker");
    expect(migration).toContain("a.action_context = 'school'");
    expect(migration).toContain("coalesce(a.action_phase, 'post_action_complete') = 'pre_action'");
    expect(migration).toContain("public.is_public_future_pre_action(");
    expect(migration).toContain("grant execute on function public.actions_map_feed");
    expect(migration).not.toContain("drop policy");
    expect(migration).not.toContain("disable row level security");
  });
});
