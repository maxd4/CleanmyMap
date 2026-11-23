import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261123000009_action_backup_form_editor_composition.sql", import.meta.url),
  "utf8",
);
const proof = readFileSync(
  new URL("../../../../supabase/tests/action-form-editors.pgtap.sql", import.meta.url),
  "utf8",
);

describe("action backup form-editor composition STATIC_CONTRACT", () => {
  it("adds the combined restore behavior in a forward-only server RPC", () => {
    expect(migration).toMatch(/create or replace function public\.restore_action_backup_with_form_editors/i);
    expect(migration).toMatch(/restore_action_backup_with_individual_butts_lots\(p_backup\)/i);
    expect(migration).toMatch(/action_field_role_assignments/i);
    expect(migration).toMatch(/action_form_editors/i);
    expect(migration).toMatch(/action_form_editor_audit/i);
    expect(migration).toMatch(/revoke all .* from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute .* to service_role/i);
  });

  it("executes a PostgreSQL restore proof for editor rows and audit history", () => {
    expect(proof).toMatch(/restore_action_backup_with_form_editors\(jsonb_build_object/i);
    expect(proof).toMatch(/action backup restoration retains the delegated editor relation/i);
    expect(proof).toMatch(/action backup restoration retains the editor audit record/i);
  });
});
