import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260830000000_harden_profiles_column_privileges.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

const editableColumns = [
  "display_name",
  "display_name_mode",
  "avatar_url",
  "handle",
  "paris_arrondissement",
  "metadata",
  "updated_at",
].join(", ");

it("keeps profile role and referral writes server-only", () => {
  expect(migration).toContain(
    "revoke insert, update on table public.profiles from anon, authenticated;",
  );
  expect(migration).toContain(
    `grant insert, update on table public.profiles to service_role;`,
  );
  expect(migration).not.toMatch(
    /grant (?:insert|update)[^;]*\b(?:role_label|referral_code|referred_by_profile_id|referred_at)\b[^;]*\b(?:anon|authenticated)\b/,
  );
});

it("limits authenticated profile writes to the editable columns", () => {
  expect(migration).toContain(
    `grant insert ( id, ${editableColumns} ) on table public.profiles to authenticated;`,
  );
  expect(migration).toContain(
    `grant update ( ${editableColumns} ) on table public.profiles to authenticated;`,
  );
  expect(migration).not.toContain("profiles_select_all");
});
