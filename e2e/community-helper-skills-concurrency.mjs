import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const supabaseCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const userId = "community-helper-skills-concurrency-user";
const requestedSets = {
  A: ["materiel", "transport"],
  B: ["communication", "logistique"],
};
const barrierKeys = {
  A: 918273647001n,
  B: 918273647002n,
};

async function runQuery(sql, { timeoutMs = 30_000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await execFileAsync(
      supabaseCommand,
      ["supabase", "db", "query", "--workdir", "apps/web", "--local", sql],
      {
        cwd: root,
        shell: process.platform === "win32",
        maxBuffer: 8 * 1024 * 1024,
        signal: controller.signal,
      },
    );
  } catch (error) {
    const detail = [error?.stdout, error?.stderr, error?.message].filter(Boolean).join("\n");
    throw new Error(`DB_SEMANTICS_NOT_EXECUTED: Community helper skills concurrency query failed.\n${detail}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function assertEphemeralDestination() {
  let result;
  try {
    result = await execFileAsync(
      supabaseCommand,
      ["supabase", "status", "--workdir", "apps/web", "--output", "json"],
      { cwd: root, shell: process.platform === "win32", maxBuffer: 2 * 1024 * 1024 },
    );
  } catch (error) {
    const detail = [error?.stdout, error?.stderr, error?.message].filter(Boolean).join("\n");
    throw new Error(`DB_SEMANTICS_NOT_EXECUTED: ephemeral Supabase status is unavailable.\n${detail}`);
  }
  const start = result.stdout.indexOf("{");
  if (start < 0) throw new Error("DB_SEMANTICS_NOT_EXECUTED: Supabase status did not return JSON.");
  let status;
  try {
    status = JSON.parse(result.stdout.slice(start));
  } catch (error) {
    throw new Error(`DB_SEMANTICS_NOT_EXECUTED: Supabase status JSON is invalid. ${error.message}`);
  }
  const apiUrl = new URL(status.API_URL ?? "");
  assert.ok(
    apiUrl.hostname === "127.0.0.1" || apiUrl.hostname === "localhost",
    "Refusing a community helper skills concurrency proof against a non-local destination",
  );
}

const cleanupSql = `
begin;
set local role postgres;
delete from public.community_helper_skills where user_id = '${userId}';
commit;
`;

function barrierSql(participant, ownKey, otherKey) {
  return `
select pg_advisory_lock(${ownKey});
do $$
declare
  v_ready boolean := false;
  v_attempt integer;
begin
  for v_attempt in 1..200 loop
    if pg_try_advisory_lock(${otherKey}) then
      perform pg_advisory_unlock(${otherKey});
      perform pg_sleep(0.05);
    else
      v_ready := true;
      exit;
    end if;
  end loop;
  if not v_ready then
    raise exception 'Community helper skills concurrency barrier timed out for ${participant}';
  end if;
  raise notice 'HELPER_SKILLS_CONCURRENCY_READY=${participant} pid=%', pg_backend_pid();
end;
$$;
`;
}

function sessionSql(participant, categories, ownKey, otherKey) {
  const categorySql = categories.map((category) => `'${category}'`).join(", ");
  return `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"${userId}"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${barrierSql(participant, ownKey, otherKey)}
do $$
declare
  v_categories text;
begin
  select coalesce(string_agg(replaced.category, ',' order by replaced.category), '<empty>')
    into v_categories
    from public.replace_community_helper_skills(
      '${userId}',
      array[${categorySql}]::text[]
    ) as replaced;
  raise notice 'HELPER_SKILLS_CONCURRENCY_RESULT=${participant} categories=%', v_categories;
end;
$$;
-- Keep the first committed replacement open briefly while the other session
-- is waiting on the per-user transaction advisory lock.
select pg_sleep(0.5);
select pg_advisory_unlock(${ownKey});
commit;
`;
}

function output(result) {
  return `${result.value?.stdout ?? ""}\n${result.value?.stderr ?? ""}`;
}

async function main() {
  await assertEphemeralDestination();
  try {
    await runQuery(cleanupSql);
    const results = await Promise.allSettled([
      runQuery(sessionSql("A", requestedSets.A, barrierKeys.A, barrierKeys.B)),
      runQuery(sessionSql("B", requestedSets.B, barrierKeys.B, barrierKeys.A)),
    ]);
    const rejected = results.filter((result) => result.status === "rejected");
    if (rejected.length > 0) {
      throw new Error(rejected.map((result) => result.reason?.message ?? String(result.reason)).join("\n"));
    }

    const outputs = results.map(output);
    const ready = outputs.flatMap((value) => [
      ...value.matchAll(/HELPER_SKILLS_CONCURRENCY_READY=[^ ]+ pid=(\d+)/g),
    ]);
    assert.equal(ready.length, 2, "both PostgreSQL sessions must reach the barrier");
    assert.equal(new Set(ready.map((match) => match[1])).size, 2, "the proof must use two PostgreSQL backends");
    for (const [participant, categories] of Object.entries(requestedSets)) {
      assert.equal(
        outputs.filter((value) => value.includes(`HELPER_SKILLS_CONCURRENCY_RESULT=${participant} categories=${categories.join(",")}`)).length,
        1,
        `${participant} must return exactly its requested categories`,
      );
    }

    const finalState = await runQuery(`
select coalesce(string_agg(category, ',' order by category), '<empty>') as categories
  from public.community_helper_skills
 where user_id = '${userId}';
`);
    const finalOutput = finalState.stdout.replace(/\s+/g, "");
    const finalSet = Object.values(requestedSets).map((categories) => categories.join(","));
    assert.equal(finalSet.some((categories) => finalOutput.includes(categories)), true, "final state must equal one complete replacement");
    assert.equal(finalOutput.includes("communication,logistique,materiel,transport"), false, "concurrent replacements must never be merged");
    console.log("EXECUTED_DB_CONTRACT: Community helper skills two-session exact replacement contract passed.");
  } finally {
    try {
      await runQuery(cleanupSql);
    } catch (error) {
      console.error(error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
