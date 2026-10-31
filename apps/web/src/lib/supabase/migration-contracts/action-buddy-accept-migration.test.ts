import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261031000001_action_buddy_accept_aliases.sql", import.meta.url),
  "utf8",
);

const functionBody = migration.match(
  /create or replace function public\.accept_action_buddy_proposal\([^)]*\)[\s\S]*?as \$\$([\s\S]*?)\$\$;/i,
)?.[1] ?? "";

describe("action buddy acceptance migration contract", () => {
  it("keeps the RPC signature, server boundary and transaction locks", () => {
    expect(migration).toContain("returns table (");
    expect(migration).toContain("status text");
    expect(migration).toContain("request_id uuid");
    expect(migration).toContain("proposal_id uuid");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = pg_catalog, public");
    expect(migration).toContain("pg_advisory_xact_lock(");
    expect(migration).toContain("for update");
    expect(migration).toContain("revoke all on function public.accept_action_buddy_proposal(uuid) from public, anon, authenticated;");
    expect(migration).toContain("grant execute on function public.accept_action_buddy_proposal(uuid) to service_role;");
  });

  it("qualifies every ambiguous request/proposal status and identifier reference", () => {
    expect(functionBody).toContain("from public.action_buddy_requests as existing_request");
    expect(functionBody).toContain("existing_request.status = 'matched'");
    expect(functionBody).toContain("update public.action_buddy_proposals as competing_proposal");
    expect(functionBody).toContain("competing_proposal.request_id = v_request.id");
    expect(functionBody).toContain("competing_proposal.status = 'pending'");
    expect(functionBody).toContain("update public.action_buddy_requests as accepted_request");
    expect(functionBody).toContain("accepted_request.id = v_request.id");
    expect(functionBody).toContain("update public.action_buddy_proposals as accepted_proposal");
    expect(functionBody).toContain("accepted_proposal.id = v_proposal.id");
    expect(functionBody).not.toMatch(/\bwhere\s+status\s*=/i);
    expect(functionBody).not.toMatch(/\bwhere\s+request_id\s*=/i);
    expect(functionBody).not.toMatch(/\bwhere\s+id\s*=\s*p_proposal_id/i);
  });
});
