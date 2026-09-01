import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260831000000_harden_actions_column_privileges.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

const selfServiceColumns = [
  "action_phase",
  "preparation_data",
  "actor_name",
  "action_date",
  "location_label",
  "latitude",
  "longitude",
  "waste_kg",
  "cigarette_butts",
  "volunteers_count",
  "duration_minutes",
  "notes",
].join(", ");

const serverOwnedColumns = [
  "status",
  "moderation_visibility",
  "hidden_at",
  "hidden_by_clerk_id",
  "hidden_reason",
];

it("removes client table-wide UPDATE while preserving the server path", () => {
  expect(migration).toContain(
    "revoke update on table public.actions from anon, authenticated;",
  );
  expect(migration).toContain(
    "grant update ( " + selfServiceColumns + " ) on table public.actions to authenticated;",
  );
  expect(migration).toContain(
    "grant update on table public.actions to service_role;",
  );
});

it("does not grant self-service UPDATE on state or moderation columns", () => {
  const grant = migration.match(
    /grant update \(([^)]+)\) on table public\.actions to authenticated;/,
  )?.[1] ?? "";

  for (const column of serverOwnedColumns) {
    expect(grant).not.toContain(column);
  }
});
