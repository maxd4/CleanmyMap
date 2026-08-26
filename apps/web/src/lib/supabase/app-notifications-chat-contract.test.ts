import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260826051000_harden_app_notifications_chat_contract.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("app_notifications chat contract", () => {
  it("allows chat notification rows without weakening ownership", () => {
    expect(migration).toContain("app_notifications_type_check");
    expect(migration).toContain("'chat'");
    expect(migration).toContain(
      "revoke all on table public.app_notifications from public, anon;",
    );
    expect(migration).toContain(
      "grant select, update on table public.app_notifications to authenticated, service_role;",
    );
  });

  it("removes direct anonymous execution from the fan-out RPC", () => {
    expect(migration).toContain(
      "revoke all on function public.create_chat_notifications_for_message(uuid) from public, anon;",
    );
    expect(migration).toContain(
      "grant execute on function public.create_chat_notifications_for_message(uuid) to service_role;",
    );
  });
});
