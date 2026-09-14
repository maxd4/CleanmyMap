import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260914000001_explicit_action_publication.sql", import.meta.url),
  "utf8",
);

describe("explicit action publication migration", () => {
  it("keeps publication separate from moderation and closes public draft reads", () => {
    expect(migration).toContain("add column if not exists published_at timestamptz");
    expect(migration).toContain("drop policy if exists actions_select_all");
    expect(migration).toContain("published_at is not null");
    expect(migration).toContain("status in ('pending', 'approved')");
    expect(migration).toContain("event_start_time > (current_time at time zone 'Europe/Paris')::time");
    expect(migration).not.toContain("action_phase text");
  });
});
