import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261031000003_action_retrospectives.sql", import.meta.url),
  "utf8",
).toLowerCase();
const compactMigration = migration.replace(/\s+/gu, " ");

describe("action retrospective migration contract [STATIC_CONTRACT]", () => {
  it("defines one private retrospective per action with SQL length guards", () => {
    expect(migration).toContain("create table if not exists public.action_retrospectives");
    expect(migration).toContain("action_id uuid primary key references public.actions(id) on delete cascade");
    expect(migration).toContain("authored_by_clerk_id text not null");
    expect(migration).toContain("char_length(coalesce(thanks_message, '')) <= 500");
    expect(migration).toContain("char_length(coalesce(worked_well, '')) <= 1000");
    expect(migration).toContain("char_length(coalesce(blockers, '')) <= 1000");
    expect(migration).toContain("char_length(coalesce(improve_next_time, '')) <= 1000");
    expect(migration).toContain("on conflict (action_id) do update");
  });

  it("keeps drafts and RPCs behind the service-role boundary", () => {
    expect(migration).toContain("alter table public.action_retrospectives enable row level security");
    expect(migration).toContain("create policy action_retrospectives_service_only");
    expect(migration).toContain("revoke all privileges on table public.action_retrospectives");
    expect(migration).toContain("grant select, insert, update, delete on table public.action_retrospectives");
    expect(migration).toContain("if coalesce(auth.role(), '') <> 'service_role' then");
    expect(migration).toContain("revoke all on function public.publish_action_retrospective(uuid, text)");
    expect(compactMigration).toContain("grant execute on function public.publish_action_retrospective(uuid, text) to service_role");
    expect(migration).not.toContain("grant execute on function public.publish_action_retrospective(uuid, text) to authenticated");
  });

  it("locks and rechecks the publication transaction and targets final participants only", () => {
    expect(migration).toContain("from public.actions\n  where id = p_action_id\n  for update");
    expect(migration).toContain("from public.action_retrospectives\n  where action_id = p_action_id\n  for update");
    expect(migration).toContain("v_action.status <> 'approved'");
    expect(migration).toContain("v_action.published_at is null");
    expect(migration).toContain("ap.participation_status = 'confirmed'");
    expect(migration).toContain("ap.user_id <> v_retrospective.authored_by_clerk_id");
    expect(migration).toContain("action_retrospective_published");
    expect(migration).toContain("on conflict do nothing");
    expect(migration).toContain("set notified_at = timezone('utc', now())");
  });

  it("does not expose author identity in the public SQL projection", () => {
    const publicFunction = migration.slice(
      migration.indexOf("create or replace function public.read_public_action_retrospective"),
      migration.indexOf("create or replace function public.publish_action_retrospective"),
    );
    expect(publicFunction).not.toContain("authored_by_clerk_id");
    expect(publicFunction).toContain("r.thanks_message");
    expect(publicFunction).toContain("r.improve_next_time");
  });
});
