import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261029000002_action_context_classification.sql",
    import.meta.url,
  ),
  "utf8",
);
const mapMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261029000003_action_context_map_projection.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("action context classification migration", () => {
  it("keeps the canonical action table nullable for historical unknown rows", () => {
    expect(migration).toContain("add column if not exists action_context text");
    expect(migration).toContain("action_context is null");
    expect(migration).toContain("automatic_children_ratio");
    expect(migration).toContain("does not infer a context from organizer_type");
  });

  it("constrains the three contexts and keeps confirmation traceable", () => {
    expect(migration).toContain("'citizen', 'company', 'school'");
    expect(migration).toContain("actions_action_context_pair_check");
    expect(migration).toContain("school_context_confirmed_by_clerk_id");
    expect(migration).toContain("school_context_confirmed_at is not null");
    expect(migration).toContain("idx_actions_action_context");
  });

  it("keeps the public map projection available for context-aware consumers", () => {
    expect(mapMigration).toContain("action_context text");
    expect(mapMigration).toContain("a.action_context");
    expect(mapMigration).toContain("null::text action_context");
    expect(mapMigration).toContain("grant execute on function public.actions_map_feed");
  });
});
