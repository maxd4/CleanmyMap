import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const migration = readFileSync(new URL("../../../../supabase/migrations/20261122000006_extend_action_organizer_types.sql", import.meta.url), "utf8").replace(/\s+/g, " ").toLowerCase();

it("extends both organizer constraints without changing historical rows", () => {
  expect(migration).toContain("drop constraint if exists actions_organizer_type_check");
  expect(migration).toContain("drop constraint if exists organizer_directory_entries_organizer_type_check");
  for (const value of ["spontaneous", "company", "association", "student_association", "collective", "other", "school", "local_authority"]) {
    expect(migration).toContain(`'${value}'`);
  }
  expect(migration).toContain("organizer_type is null");
  expect(migration).not.toContain("update public.actions");
  expect(migration).not.toContain("alter table public.organizer_directory_entries enable row level security");
});
