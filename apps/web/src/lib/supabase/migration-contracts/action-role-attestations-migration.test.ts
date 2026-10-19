import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261019000006_action_role_attestations.sql"),
  "utf8",
);

describe("action role attestations migration contract", () => {
  it("keeps the three evidence layers and historical revisions distinct", () => {
    expect(migration).toContain("action_field_role_assignments");
    expect(migration).toContain("action_participants");
    expect(migration).toContain("action_role_attestations");
    expect(migration).toContain("action_role_attestation_audit");
    expect(migration).toContain("unique (action_id, user_id, role_code)");
    expect(migration).toContain("responsibility_provenance");
    expect(migration).toContain("revision integer");
  });

  it("enforces final lifecycle, confirmed participation, independent review and atomic notifications", () => {
    expect(migration).toContain("v_action.action_phase <> 'post_action_complete'");
    expect(migration).toContain("v_participant.participation_status <> 'confirmed'");
    expect(migration).toContain("independent_reviewer_required");
    expect(migration).toContain("insert into public.action_role_attestation_audit");
    expect(migration).toContain("insert into public.app_notifications");
    expect(migration).toContain("on conflict do nothing");
    expect(migration).toContain("grant execute on function public.review_action_role_attestation");
  });

  it("does not give tables or RPCs browser grants", () => {
    expect(migration).toContain("revoke all on table public.action_role_attestations from public, anon, authenticated");
    expect(migration).toContain("revoke all on function public.review_action_role_attestation");
  });
});
