import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260901012605_harden_action_rpc_execute_privileges.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

const createActionSignature =
  "public.create_action_with_training( text, text, date, text, double precision, double precision, numeric, integer, integer, integer, text, text, text, double precision, text )";
const moderateActionSignature =
  "public.moderate_action_atomically( uuid, text, text )";

it("revokes action RPC execution from public client roles", () => {
  expect(migration).toContain(
    `revoke all on function ${createActionSignature} from public, anon, authenticated;`,
  );
  expect(migration).toContain(
    `revoke all on function ${moderateActionSignature} from public, anon, authenticated;`,
  );
});

it("retains execution only for service_role", () => {
  expect(migration).toContain(
    `grant execute on function ${createActionSignature} to service_role;`,
  );
  expect(migration).toContain(
    `grant execute on function ${moderateActionSignature} to service_role;`,
  );
  expect(migration).not.toMatch(
    /grant execute on function[^;]+ to (?:anon|authenticated)/,
  );
});

it("does not alter function bodies, actions RLS, or Storage", () => {
  expect(migration).not.toMatch(/create\s+(?:or\s+replace\s+)?function/);
  expect(migration).not.toMatch(/(?:create|alter|drop)\s+policy/);
  expect(migration).not.toMatch(/public\.actions/);
  expect(migration).not.toMatch(/storage\./);
});
