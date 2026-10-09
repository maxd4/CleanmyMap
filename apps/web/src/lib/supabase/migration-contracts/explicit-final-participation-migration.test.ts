import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261009000001_explicit_final_participation.sql",
    import.meta.url,
  ),
  "utf8",
);

function functionBody(functionName: string): string {
  const match = migration.match(
    new RegExp(
      `create or replace function public\\.${functionName}\\([\\s\\S]*?\\n\\$\\$;`,
      "i",
    ),
  );
  if (!match) throw new Error(`Missing function definition: ${functionName}`);
  return match[0];
}

describe("explicit final participation migration STATIC_CONTRACT", () => {
  it("is append-only and retains the service-role compatibility surface", () => {
    expect(migration).toMatch(/create or replace function public\.initialize_action_final_participants\(p_action_id uuid\)/i);
    expect(migration).toMatch(/create or replace function public\.initialize_action_final_participants_on_action\(\)/i);
    expect(migration).toMatch(/create or replace function public\.initialize_action_final_participants_on_organizer\(\)/i);
    expect(migration).toMatch(/grant execute on function public\.initialize_action_final_participants\(uuid\) to service_role/i);
    expect(migration).not.toMatch(/drop trigger|drop function|delete from public\.action_participants|insert into public\.action_participants/i);
  });

  it("makes the initializer and both installed trigger callbacks inert", () => {
    for (const functionName of [
      "initialize_action_final_participants",
      "initialize_action_final_participants_on_action",
      "initialize_action_final_participants_on_organizer",
    ]) {
      const body = functionBody(functionName);
      expect(body).not.toMatch(/insert\s+into\s+public\.action_participants|perform\s+public\.initialize_action_final_participants/i);
    }
  });

  it("does not touch backup/restore or independent notification triggers", () => {
    expect(migration).not.toMatch(/restore_action_backup|action_conversations|notification_audience/i);
    expect(migration).toContain("existing action and action_organizers triggers remain attached");
  });
});
