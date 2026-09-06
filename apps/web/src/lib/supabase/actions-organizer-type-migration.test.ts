import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260906000001_actions_organizer_type.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

it("adds a nullable, six-value organizer type without reclassifying legacy rows", () => {
  expect(migration).toContain("add column if not exists organizer_type text");
  expect(migration).toContain("organizer_type is null");
  for (const value of [
    "spontaneous",
    "company",
    "association",
    "student_association",
    "collective",
    "other",
  ]) {
    expect(migration).toContain(`'${value}'`);
  }
  expect(migration).not.toContain("association_name");
});

it("keeps RLS and scoped author permissions while adding the structured field", () => {
  expect(migration).toContain(
    "revoke update on table public.actions from anon, authenticated;",
  );
  expect(migration).toContain("organizer_type,");
  expect(migration).toContain(
    "grant update on table public.actions to service_role;",
  );
  expect(migration).not.toContain("enable row level security");
});
