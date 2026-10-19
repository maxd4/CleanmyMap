import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runActionRoleAttestationConcurrency } from "./action-role-attestation-concurrency.mjs";

const source = readFileSync(new URL("./action-role-attestation-concurrency.mjs", import.meta.url), "utf8");
const correctionSql = readFileSync(
  new URL("../apps/web/supabase/tests/action-role-attestation-correction.sql", import.meta.url),
  "utf8",
);

test("role attestation concurrency proof uses two local PostgreSQL sessions and cleanup", () => {
  assert.match(source, /\["supabase", "db", "query", "--workdir", "apps\/web", "--local"/);
  assert.match(source, /for update/);
  assert.match(source, /pg_stat_activity/);
  assert.match(source, /ROLE_ATTESTATION_LOCK_HELD/);
  assert.match(source, /ROLE_ATTESTATION_CORRECTION_WAITING/);
  assert.match(source, /wait_event_type = 'Lock'/);
  assert.match(source, /AbortController/);
  assert.match(source, /Promise\.allSettled/);
  assert.match(source, /CONCURRENCY_SYNC_TIMEOUT_MS/);
  assert.match(source, /action_role_attestation_correction_reason_required/);
  assert.match(source, /correctionReviewerId/);
  assert.match(source, /'confirm', '\$\{correctionReviewerId\}', null, false/);
  assert.match(source, /verifyUnchangedSql/);
  assert.doesNotMatch(source, /setTimeout\(resolve, 150\)/);
  const serviceRoleTransactions = source.match(/begin;\nset local role service_role;[\s\S]*?commit;/g) ?? [];
  assert.equal(serviceRoleTransactions.length, 3);
  for (const transaction of serviceRoleTransactions) {
    assert.match(transaction, /set_config\('request\.jwt\.claims', '\{"role":"service_role"\}', true\)/);
    assert.match(transaction, /set_config\('request\.jwt\.claim\.role', 'service_role', true\)/);
  }
  assert.match(source, /promise\.catch\([\s\S]*?settled: promise\.then/s);
  assert.match(source, /finally \{[\s\S]*?Promise\.allSettled[\s\S]*?query\(cleanupSql\);/s);
  assert.match(source, /AggregateError/);
});

test("role attestation SQL contract distinguishes PostgreSQL role from JWT role claim", () => {
  const serviceRoleTransactions = correctionSql.match(/begin;\nset local role service_role;[\s\S]*?(?:commit|rollback);/g) ?? [];
  assert.equal(serviceRoleTransactions.length, 4);
  assert.match(correctionSql, /set_config\('request\.jwt\.claim\.role', 'authenticated', true\)/);
  assert.match(correctionSql, /action_role_attestation_forbidden/);
  for (const transaction of serviceRoleTransactions.slice(1)) {
    assert.match(transaction, /set_config\('request\.jwt\.claims', '\{"role":"service_role"\}', true\)/);
    assert.match(transaction, /set_config\('request\.jwt\.claim\.role', 'service_role', true\)/);
  }
});

function createConcurrentQueryHarness({ holderMode = "success", correctionMode = "reject-after-observation", cleanupMode = "success" } = {}) {
  const calls = [];
  const tasks = [];
  const state = { holder: "idle", correction: "idle" };

  function startTask(name, mode, signal) {
    const task = { name, settled: false, cancelled: false };
    tasks.push(task);
    return new Promise((resolve, reject) => {
      const settle = (settler, value) => {
        if (task.settled) return;
        task.settled = true;
        signal?.removeEventListener("abort", onAbort);
        settler(value);
      };
      const onAbort = () => {
        task.cancelled = true;
        state[name] = "cancelled";
        settle(reject, new Error(`${name} query cancelled`));
      };

      signal?.addEventListener("abort", onAbort, { once: true });
      if (mode === "fail-immediately") {
        state[name] = "failed";
        settle(reject, new Error(`${name} query failed immediately`));
        return;
      }

      state[name] = "active";
      if (mode === "hang") return;
      const delay = mode === "reject-after-observation" ? 25 : 45;
      setTimeout(() => {
        if (mode === "reject-after-observation") {
          state[name] = "failed";
          settle(reject, new Error("action_role_attestation_correction_reason_required"));
        } else {
          state[name] = "completed";
          settle(resolve, { stdout: "", stderr: "" });
        }
      }, delay);
    });
  }

  const query = (sql, { signal } = {}) => {
    calls.push(sql);
    if (sql.includes("insert into public.actions")) return Promise.resolve({ stdout: "", stderr: "" });
    if (sql.includes("ROLE_ATTESTATION_LOCK_HELD")) {
      return Promise.resolve({ stdout: state.holder === "active" && holderMode !== "hang" ? "ROLE_ATTESTATION_LOCK_HELD" : "ROLE_ATTESTATION_LOCK_NOT_HELD" });
    }
    if (sql.includes("ROLE_ATTESTATION_CORRECTION_WAITING")) {
      return Promise.resolve({ stdout: state.correction === "active" ? "ROLE_ATTESTATION_CORRECTION_WAITING" : "ROLE_ATTESTATION_CORRECTION_NOT_WAITING" });
    }
    if (sql.includes("application_name', 'cleanmymap-role-attestation-lock-holder")) {
      return startTask("holder", holderMode, signal);
    }
    if (sql.includes("application_name', 'cleanmymap-role-attestation-correction")) {
      return startTask("correction", correctionMode, signal);
    }
    if (sql.includes("delete from public.actions") && !sql.includes("insert into public.actions")) {
      if (cleanupMode === "fail") return Promise.reject(new Error("cleanup query failed"));
      return Promise.resolve({ stdout: "", stderr: "" });
    }
    return Promise.resolve({ stdout: "", stderr: "" });
  };

  return { calls, tasks, query };
}

async function assertNoUnhandledRejection(operation) {
  const unhandled = [];
  const onUnhandledRejection = (reason) => unhandled.push(reason);
  process.on("unhandledRejection", onUnhandledRejection);
  try {
    await operation();
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    process.off("unhandledRejection", onUnhandledRejection);
  }
  assert.deepEqual(unhandled, []);
}

test("behavioral proof keeps the holder and correction sessions controlled", async () => {
  const harness = createConcurrentQueryHarness();

  await assertNoUnhandledRejection(() => runActionRoleAttestationConcurrency({ query: harness.query, syncTimeoutMs: 250, pollIntervalMs: 1 }));

  assert.equal(harness.calls.filter((sql) => sql.includes("delete from public.actions")).length, 2);
  assert.ok(harness.tasks.every((task) => task.settled), "every concurrent command must settle");
  assert.ok(harness.tasks.every((task) => !task.cancelled), "successful contention must not cancel completed commands");
});

test("an immediate holder failure interrupts observation, cleans up and has no unhandled rejection", async () => {
  const harness = createConcurrentQueryHarness({ holderMode: "fail-immediately" });
  const startedAt = Date.now();

  await assertNoUnhandledRejection(() => assert.rejects(
    runActionRoleAttestationConcurrency({ query: harness.query, syncTimeoutMs: 250, pollIntervalMs: 1 }),
    /holder query failed immediately/,
  ));

  assert.ok(Date.now() - startedAt < 200, "an immediate command failure must not consume the observation timeout");
  assert.ok(harness.calls.some((sql) => sql.includes("delete from public.actions") && !sql.includes("insert into public.actions")));
  assert.ok(harness.tasks.every((task) => task.settled), "the failed holder must be settled before cleanup");
});

test("an immediate correction failure interrupts its observation and cancels the holder", async () => {
  const harness = createConcurrentQueryHarness({ correctionMode: "fail-immediately" });

  await assert.rejects(
    runActionRoleAttestationConcurrency({ query: harness.query, syncTimeoutMs: 250, pollIntervalMs: 1 }),
    /correction query failed immediately/,
  );

  assert.ok(harness.tasks.some((task) => task.name === "holder" && task.cancelled));
  assert.ok(harness.tasks.every((task) => task.settled), "both sessions must settle before cleanup");
});

test("an observation timeout cancels the active command during polling and still cleans up", async () => {
  const harness = createConcurrentQueryHarness({ holderMode: "hang" });

  await assert.rejects(
    runActionRoleAttestationConcurrency({ query: harness.query, syncTimeoutMs: 25, pollIntervalMs: 1 }),
    /action lock holder timed out after 25ms/,
  );

  assert.ok(harness.tasks.some((task) => task.name === "holder" && task.cancelled));
  assert.ok(harness.tasks.every((task) => task.settled), "timeout cancellation must not abandon a command");
  assert.ok(harness.calls.some((sql) => sql.includes("delete from public.actions") && !sql.includes("insert into public.actions")));
});

test("cleanup failure remains visible alongside the primary command failure", async () => {
  const harness = createConcurrentQueryHarness({ holderMode: "fail-immediately", cleanupMode: "fail" });

  await assert.rejects(
    runActionRoleAttestationConcurrency({ query: harness.query, syncTimeoutMs: 250, pollIntervalMs: 1 }),
    (error) => {
      assert.ok(error instanceof AggregateError);
      assert.equal(error.errors.length, 2);
      assert.match(String(error.errors[0]), /holder query failed immediately/);
      assert.match(String(error.errors[1]), /cleanup query failed/);
      return true;
    },
  );
  assert.ok(harness.tasks.every((task) => task.settled));
});
