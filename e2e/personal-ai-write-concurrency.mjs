import assert from "node:assert/strict";
import { resolveLocalEphemeralDbUrl, runLocalPsqlQuery } from "./supabase-local-psql.mjs";

const owner = "personal-ai-concurrency-proof";
const barrierKey = 918273646701;
const firstPeriod = { start: "2026-11-01T00:00:00Z", end: "2026-11-07T23:59:59Z" };
const overlapPeriod = { start: "2026-11-06T00:00:00Z", end: "2026-11-12T23:59:59Z" };

function query(sql, timeoutMs = 20_000) {
  return runLocalPsqlQuery(sql, { timeoutMs, errorLabel: "Personal AI write concurrency proof failed" });
}

const cleanup = `begin; set local role postgres; delete from public.personal_ai_declarations where owner_clerk_id = '${owner}'; commit;`;

function declaration(chatbot, period) {
  return JSON.stringify({
    normalizationVersion: "personal-ai-declaration-v1",
    provider: "OPENAI",
    source: "MANUAL",
    sourceVersion: null,
    provenance: "USER_DECLARED",
    granularity: "UNKNOWN",
    periodStartUtc: period.start,
    periodEndUtc: period.end,
    modelRaw: null,
    modelCanonical: null,
    operator: null,
    execution: "CLOUD",
    inferenceRegion: null,
    access: "UNKNOWN",
    requestCount: null,
    tokens: { inputTotal: null, inputUncached: null, cacheRead: null, cacheWrite: null, outputVisible: null, outputReasoning: null, outputTotal: null, reasoningRelation: "UNKNOWN", logicalTotal: null },
    modality: { images: null, audioMinutes: null, videoSeconds: null },
    energy: { kwh: null, boundary: null, evidence: null, averageWatts: null, durationSeconds: null, idleWatts: null },
  });
}

function scenario(chatbot) {
  return JSON.stringify({
    version: "personal-ai-chat-usage-v1",
    sourceKind: "SELF_REPORTED_CHAT_USAGE",
    chatbot,
    chatbotLabel: null,
    accessMode: "FREE",
    frequency: "DAILY",
    exchanges: 2,
    questionCharacters: 50,
    answerCharacters: 100,
    imageUse: null,
    audioUse: null,
  });
}

function saveSql(id, chatbot, period) {
  const idSql = id ? `'${id}'::uuid` : "null";
  return `select id from public.save_personal_ai_declaration_for_owner(
    '${owner}', ${idSql}, '${declaration(chatbot, period)}'::jsonb,
    '${scenario(chatbot)}'::jsonb, '{"version":"test"}'::jsonb, 'test-method', 'test-factor', null
  );`;
}

function serviceSession(sql) {
  return `begin; set local role service_role;
    select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);
    ${sql}
    commit;`;
}

async function concurrentPair(firstSql, secondSql) {
  const first = query(firstSql);
  await query(`do $$ declare v_ready boolean := false; v_attempt integer; begin
    for v_attempt in 1..300 loop
      if pg_try_advisory_lock(${barrierKey}) then
        perform pg_advisory_unlock(${barrierKey});
        perform pg_sleep(0.05);
      else
        v_ready := true; exit;
      end if;
    end loop;
    if not v_ready then raise exception 'Personal AI concurrency barrier timed out'; end if;
  end $$;`, 20_000);
  const second = query(secondSql);
  return Promise.allSettled([first, second]);
}

async function main() {
  await resolveLocalEphemeralDbUrl();
  await query(cleanup);
  const seeded = await query(serviceSession(saveSql(null, "CHATGPT", firstPeriod)));
  const id = seeded.stdout.match(/id\s*\|\s*([0-9a-f-]{36})/i)?.[1];
  assert.ok(id, "initial scenario must be persisted");

  const edit = serviceSession(`select pg_advisory_lock(${barrierKey});
    select pg_advisory_xact_lock(hashtextextended('${owner}', 0));
    select pg_sleep(0.6);
    ${saveSql(id, "CHATGPT", firstPeriod)}
    select pg_advisory_unlock(${barrierKey});`);
  const idempotentCreate = serviceSession(saveSql(null, "CHATGPT", firstPeriod));
  const pair = await concurrentPair(edit, idempotentCreate);
  assert.equal(pair.filter((result) => result.status === "fulfilled").length, 2, "concurrent edit and create must serialize without deadlock");
  const stable = await query(`select count(*)::int as count from public.personal_ai_declarations where owner_clerk_id = '${owner}' and quick_scenario ->> 'chatbot' = 'CHATGPT';`);
  assert.match(stable.stdout, /count\s*\|\s*1/);

  const winner = serviceSession(`select pg_advisory_lock(${barrierKey});
    select pg_advisory_xact_lock(hashtextextended('${owner}', 0));
    select pg_sleep(0.6);
    ${saveSql(null, "CLAUDE", overlapPeriod)}
    select pg_advisory_unlock(${barrierKey});`);
  const competingOverlap = serviceSession(`do $$ begin
    ${saveSql(null, "GEMINI", overlapPeriod).replace("select id from", "perform id from")}
  exception when exclusion_violation then
    raise notice 'PERSONAL_AI_EXPECTED_OVERLAP=23P01';
  end $$;`);
  const overlapResults = await concurrentPair(winner, competingOverlap);
  assert.equal(overlapResults.filter((result) => result.status === "fulfilled").length, 2, "overlap contender must report the expected SQL conflict without deadlock");
  assert.match(overlapResults.map((result) => result.value.stdout + result.value.stderr).join("\n"), /PERSONAL_AI_EXPECTED_OVERLAP=23P01/);

  const final = await query(`select count(*)::int as count from public.personal_ai_declarations where owner_clerk_id = '${owner}' and status = 'ACTIVE';`);
  assert.match(final.stdout, /count\s*\|\s*2/);
  await query(cleanup);
  console.log("EXECUTED_DB_CONTRACT: Personal AI owner lock ordering, concurrent scenario writes and overlap rejection passed.");
}

main().catch(async (error) => {
  try { await query(cleanup); } catch (cleanupError) { console.error(cleanupError); }
  console.error(error);
  process.exitCode = 1;
});
