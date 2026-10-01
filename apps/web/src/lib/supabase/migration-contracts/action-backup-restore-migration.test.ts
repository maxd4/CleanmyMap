import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const correctiveMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261001000002_action_backup_restore_null_safe.sql",
    import.meta.url,
  ),
  "utf8",
);

const originalMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261001000001_action_backup_restore.sql",
    import.meta.url,
  ),
  "utf8",
);

const correctedFunctions = [
  "initialize_action_final_participants_on_organizer",
  "sync_action_conversation_notification_audience_on_action",
  "sync_action_conversation_notification_audience_on_action_source",
] as const;

function functionBody(sql: string, functionName: string): string {
  const match = sql.match(
    new RegExp(
      `create or replace function public\\.${functionName}\\([\\s\\S]*?\\n\\$\\$;`,
      "i",
    ),
  );

  if (!match) {
    throw new Error(`Missing function definition: ${functionName}`);
  }

  return match[0];
}

describe("action backup restore NULL-safe migration STATIC_CONTRACT", () => {
  it("keeps the corrective migration append-only and scoped to the three buggy functions", () => {
    expect(correctiveMigration).toMatch(
      /create or replace function public\.initialize_action_final_participants_on_organizer/i,
    );
    expect(correctiveMigration).toMatch(
      /create or replace function public\.sync_action_conversation_notification_audience_on_action/i,
    );
    expect(correctiveMigration).toMatch(
      /create or replace function public\.sync_action_conversation_notification_audience_on_action_source/i,
    );
    expect(correctiveMigration).not.toMatch(/create or replace function public\.restore_action_backup/i);
  });

  it.each(correctedFunctions)("uses NULL-safe restore gating for %s", (functionName) => {
    const body = functionBody(correctiveMigration, functionName);

    expect(body).toMatch(
      /current_setting\('cleanmymap\.action_restore', true\) is distinct from 'on'/i,
    );
    expect(body).not.toMatch(/current_setting\('cleanmymap\.action_restore', true\)\s*<>\s*'on'/i);
  });

  it("models the explicit PostgreSQL contract: NULL/off are active and on is suspended", () => {
    const normalTriggerIsActive = (setting: string | null) => setting !== "on";

    expect(normalTriggerIsActive(null)).toBe(true);
    expect(normalTriggerIsActive("off")).toBe(true);
    expect(normalTriggerIsActive("on")).toBe(false);
  });

  it("does not rewrite the two existing equality-guarded restore functions", () => {
    expect(functionBody(originalMigration, "ensure_action_conversation_on_publish")).toMatch(
      /current_setting\('cleanmymap\.action_restore', true\) = 'on'/i,
    );
    expect(functionBody(originalMigration, "initialize_action_final_participants_on_action")).toMatch(
      /current_setting\('cleanmymap\.action_restore', true\) = 'on'/i,
    );
  });
});
