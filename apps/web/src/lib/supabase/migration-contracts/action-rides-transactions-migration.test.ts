import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261031000005_action_rides_transactions.sql", import.meta.url),
  "utf8",
).toLowerCase();
const compactMigration = migration.replace(/\s+/gu, " ");

describe("action rides transaction migration contract [STATIC_CONTRACT]", () => {
  it("defines the complete server-only transition surface", () => {
    for (const functionName of [
      "accept_action_ride_request",
      "decline_action_ride_request",
      "withdraw_action_ride_request",
      "transition_action_ride",
      "update_action_ride_details",
    ]) {
      expect(migration).toContain(`create or replace function public.${functionName}`);
      expect(migration).toContain(`revoke all on function public.${functionName}`);
      expect(migration).toContain(`grant execute on function public.${functionName}`);
    }
    expect(compactMigration).toContain("grant execute on function public.accept_action_ride_request(uuid, text) to service_role");
    expect(compactMigration).not.toContain("grant execute on function public.accept_action_ride_request(uuid, text) to authenticated");
  });

  it("keeps acceptance serialized and capacity-owned", () => {
    const acceptance = migration.slice(migration.indexOf("create or replace function public.accept_action_ride_request"));
    expect(acceptance).toContain("for update of r");
    expect(acceptance).toContain("for update;");
    expect(acceptance).toContain("action_ride_capacity(v_ride.id)");
    expect(acceptance).toContain("ride capacity exceeded");
    expect(acceptance).toContain("status = 'accepted'");
  });

  it("keeps cancellation notifications idempotent and private", () => {
    expect(migration).toContain("app_notifications_action_ride_cancel_identity_idx");
    expect(migration).toContain("eventtype', 'action_ride_cancelled");
    expect(migration).toContain("on conflict do nothing");
    expect(migration).toContain("rr.status = 'accepted'");
    expect(migration).toContain("rr.passenger_user_id <> v_ride.driver_user_id");
  });
});
