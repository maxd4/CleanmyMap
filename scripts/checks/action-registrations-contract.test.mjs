import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const migrationPath = path.join(
  root,
  "apps/web/supabase/migrations/20260915000014_action_registrations_and_final_participants.sql",
);
const hardeningMigrationPath = path.join(
  root,
  "apps/web/supabase/migrations/20260915000018_harden_action_registrations_privileges.sql",
);
const browserDenyMigrationPath = path.join(
  root,
  "apps/web/supabase/migrations/20260915000021_action_registrations_browser_deny_policy.sql",
);
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");

test("action registrations migration separates planned and final presence", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /create table if not exists public\.action_registrations/);
  assert.match(sql, /action_registrations_action_user_unique unique \(action_id, user_id\)/);
  assert.match(sql, /registration_status text not null default 'pending'/);
  assert.match(sql, /registration_source text not null default 'group_form'/);
  assert.match(sql, /check \(registration_status in \('pending', 'confirmed', 'cancelled'\)\)/);
  assert.match(sql, /create policy action_registrations_service_only/);
  assert.match(sql, /from public\.action_participants ap[\s\S]+where coalesce\(a\.action_phase, 'post_action_complete'\) in \('pre_action', 'post_action_draft'\)[\s\S]+ap\.participation_source in \('group_form', 'manual_add'\)/);
  assert.match(sql, /delete from public\.action_participants ap[\s\S]+coalesce\(a\.action_phase, 'post_action_complete'\) in \('pre_action', 'post_action_draft'\)[\s\S]+ap\.participation_source in \('group_form', 'manual_add', 'admin', 'admin_override'\)/);
  assert.match(sql, /coalesce\(a\.action_phase, 'post_action_complete'\) in \('pre_action', 'post_action_draft'\)/);
  assert.match(sql, /coalesce\(a\.action_phase, 'post_action_complete'\) not in \('pre_action', 'post_action_draft'\)/);
  assert.match(sql, /from public\.action_participants ap[\s\S]+participation_status = 'confirmed'/);
  assert.doesNotMatch(
    sql,
    /insert into public\.action_participants[\s\S]{0,800}from public\.action_registrations/,
  );
});

test("post-action initialization is account-backed, idempotent, and lifecycle-triggered", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /create or replace function public\.initialize_action_final_participants/);
  assert.match(sql, /join public\.profiles p on p\.id = a\.created_by_clerk_id/);
  assert.match(sql, /join public\.profiles p on p\.id = ao\.organizer_clerk_id/);
  assert.match(sql, /'action_creator'/);
  assert.match(sql, /'action_organizer'/);
  assert.match(sql, /on conflict \(action_id, user_id\) do nothing/);
  assert.match(sql, /after insert or update of action_phase on public\.actions/);
  assert.match(sql, /after insert or update of organizer_clerk_id on public\.action_organizers/);
  assert.doesNotMatch(sql, /associationName|organizerType|organizationName/);
});

test("action registrations stay server-only without a deprecated role policy", () => {
  const sql = readFileSync(hardeningMigrationPath, "utf8");

  assert.match(sql, /alter table public\.action_registrations enable row level security/i);
  assert.match(sql, /revoke all on table public\.action_registrations from public;/i);
  assert.match(sql, /revoke all on table public\.action_registrations from anon, authenticated;/i);
  assert.match(
    sql,
    /grant select, insert, update, delete on table public\.action_registrations\s+to service_role;/i,
  );
  assert.match(sql, /drop policy if exists action_registrations_service_only/i);
  assert.doesNotMatch(sql, /create policy action_registrations_service_only/i);
  assert.doesNotMatch(sql, /auth\.role\(\)/i);
  assert.doesNotMatch(sql, /grant [^;]+\b(?:anon|authenticated)\b/i);
});

test("action registrations expose an explicit browser deny policy append-only", () => {
  const browserDenySql = readFileSync(browserDenyMigrationPath, "utf8");
  const hardeningSql = readFileSync(hardeningMigrationPath, "utf8");
  const originalSql = readFileSync(migrationPath, "utf8");
  const migrationName = path.basename(browserDenyMigrationPath);
  const migrationSequence = Number(migrationName.match(/^(\d+)/)?.[1]);
  const migrationNames = readdirSync(path.dirname(browserDenyMigrationPath));

  assert.equal(migrationSequence > 20260915000020, true);
  assert.equal(migrationNames.includes(migrationName), true);
  assert.notEqual(browserDenyMigrationPath, hardeningMigrationPath);

  assert.match(
    browserDenySql,
    /alter table public\.action_registrations enable row level security/i,
  );
  assert.match(
    browserDenySql,
    /create policy action_registrations_browser_deny[\s\S]+on public\.action_registrations[\s\S]+for all[\s\S]+to anon, authenticated[\s\S]+using \(false\)[\s\S]+with check \(false\)/i,
  );
  assert.doesNotMatch(browserDenySql, /grant [^;]+\b(?:anon|authenticated)\b/i);
  assert.doesNotMatch(browserDenySql, /revoke\s+/i);

  assert.match(
    hardeningSql,
    /revoke all on table public\.action_registrations from anon, authenticated;/i,
  );
  assert.match(
    hardeningSql,
    /grant select, insert, update, delete on table public\.action_registrations\s+to service_role;/i,
  );
  assert.doesNotMatch(originalSql, /action_registrations_browser_deny/i);
  assert.doesNotMatch(hardeningSql, /action_registrations_browser_deny/i);
});

test("future participation consumers use registrations while post-action claims retain participants", () => {
  const futureConsumers = [
    "apps/web/src/lib/actions/store-participants.ts",
    "apps/web/src/lib/actions/participation/organizers.ts",
    "apps/web/src/lib/actions/participation/group-participation-membership.ts",
    "apps/web/src/lib/actions/participation/group-participation-review.ts",
    "apps/web/src/lib/actions/participation/participant-summaries.ts",
    "apps/web/src/lib/admin/admin-dashboard-contract.ts",
  ];

  for (const relativePath of futureConsumers) {
    const source = read(relativePath);
    assert.match(source, /action_registrations|registration-records/);
  }

  assert.match(
    read("apps/web/src/lib/actions/participation/post-action-claims.ts"),
    /action_participants|insertParticipantRecord/,
  );
});

test("gamification is sourced only from confirmed final participants", () => {
  const gamificationMigration = read(
    "apps/web/supabase/migrations/20260915000005_gamification_confirmed_participation_count.sql",
  );

  assert.match(
    gamificationMigration,
    /from public\.action_participants ap[\s\S]+participation_status = 'confirmed'/,
  );
  assert.doesNotMatch(gamificationMigration, /action_registrations/);

  const badgeListing = read("apps/web/src/lib/gamification/badges/listing.ts");
  assert.doesNotMatch(badgeListing, /action_registrations/);
});
