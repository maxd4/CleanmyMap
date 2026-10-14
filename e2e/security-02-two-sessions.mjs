import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const supabaseCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const fixtureIds = [
  "security-02-session-stale-admin",
  "security-02-session-stale-elu",
  "security-02-session-stale-max",
];

async function runQuery(sql) {
  try {
    return await execFileAsync(
      supabaseCommand,
      ["supabase", "db", "query", "--workdir", "apps/web", "--local", sql],
      {
        cwd: root,
        shell: process.platform === "win32",
        maxBuffer: 8 * 1024 * 1024,
      },
    );
  } catch (error) {
    const detail = [error?.stdout, error?.stderr, error?.message].filter(Boolean).join("\n");
    throw new Error(`DB_SEMANTICS_NOT_EXECUTED: local Supabase query failed.\n${detail}`);
  }
}

const setupSql = `
begin;
do $$ begin
  if exists (select 1 from public.profiles where id in ('${fixtureIds.join("','")}')) then
    raise exception 'SECURITY-02 two-session fixture already exists';
  end if;
end $$;
set local role service_role;
insert into public.profiles (id, display_name, role_label, active_role_label, metadata)
values
  ('${fixtureIds[0]}', 'Security 02 session stale admin', 'admin', 'admin', '{}'::jsonb),
  ('${fixtureIds[1]}', 'Security 02 session stale elu', 'elu', 'elu', '{}'::jsonb),
  ('${fixtureIds[2]}', 'Security 02 session stale max', 'max', 'max', '{}'::jsonb);
commit;
`;

const sessionA = `
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"${fixtureIds[0]}"}', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '${fixtureIds[0]}', true);
do $$
declare v_count bigint;
begin
  select count(*) into v_count from public.app_messages where channel_type = 'admin_elu';
  if v_count <> 0 then raise exception 'stale admin projection exposed admin_elu'; end if;
  begin
    insert into public.app_messages (sender_id, channel_type, content)
    values ('${fixtureIds[0]}', 'admin_elu', 'SECURITY-02 two-session stale write');
    raise exception 'stale admin projection inserted admin_elu';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
`;

const sessionB = `
begin;
set local role service_role;
do $$
declare v_conversation_id uuid; v_owner_id text;
begin
  select c.id, a.created_by_clerk_id into v_conversation_id, v_owner_id
  from public.action_conversations c
  join public.actions a on a.id = c.action_id
  where a.published_at is not null
    and coalesce(a.moderation_visibility, 'public') <> 'hidden'
  order by c.created_at limit 1;
  if v_conversation_id is null then raise exception 'no published action conversation'; end if;
  perform set_config('security02.session_conversation_id', v_conversation_id::text, true);
  perform set_config('security02.session_owner_id', v_owner_id, true);
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', current_setting('security02.session_owner_id', true))::text, true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', current_setting('security02.session_owner_id', true), true);
do $$ begin
  if not exists (select 1 from public.action_conversations where id = current_setting('security02.session_conversation_id', true)::uuid) then
    raise exception 'legitimate action owner lost relation access';
  end if;
end $$;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"${fixtureIds[0]}"}', true);
select set_config('request.jwt.claim.sub', '${fixtureIds[0]}', true);
do $$ begin
  if exists (select 1 from public.action_conversations where id = current_setting('security02.session_conversation_id', true)::uuid) then
    raise exception 'stale admin projection inherited action relation access';
  end if;
end $$;
rollback;
`;

const cleanupSql = `
begin;
set local role service_role;
delete from public.profiles where id in ('${fixtureIds.join("','")}');
commit;
`;

await runQuery(setupSql);
try {
  const results = await Promise.allSettled([runQuery(sessionA), runQuery(sessionB)]);
  for (const result of results) {
    if (result.status === "rejected") throw result.reason;
  }
  assert.equal(results.length, 2, "SECURITY-02 requires two independent PostgreSQL sessions");
} finally {
  await runQuery(cleanupSql);
}

console.log("SECURITY-02 two-session PostgreSQL contract passed.");
