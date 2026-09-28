import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECKPOINT_DIR = resolve(APP_DIR, "artifacts", "validation", "gamification-reconcile");

function parseDotEnv(content) {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

async function loadEnvironment() {
  const filePath = join(APP_DIR, ".env.local");
  const fileValues = existsSync(filePath) ? parseDotEnv(await readFile(filePath, "utf8")) : {};
  const value = (key) => process.env[key]?.trim() || fileValues[key]?.trim() || "";
  const url = value("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = value("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function optionValue(argv, option) {
  const index = argv.indexOf(option);
  return index >= 0 ? argv[index + 1] : undefined;
}

function help() {
  console.log("Usage: npm run gamification:reconcile -w apps/web -- <cible> <mode> [options]");
  console.log("");
  console.log("Cibles: --user <id> | --all");
  console.log("Modes:  --dry-run | --apply");
  console.log("Options: --batch-size <1..500> --resume <checkpoint.json> --run-id <id> --actor <id>");
  console.log("");
  console.log("--dry-run est sans mutation, sans audit et sans checkpoint.");
}

function publicPlan(plan, receipt) {
  return {
    userId: plan.userId,
    rulesVersionBefore: plan.rulesVersionBefore,
    rulesVersionAfter: plan.rulesVersionAfter,
    xpBefore: plan.xpBefore,
    xpExpected: plan.xpExpected,
    xpDelta: plan.xpDelta,
    levelBefore: plan.levelBefore,
    levelAfter: plan.levelAfter,
    eventsToAdd: plan.eventsToAdd,
    eventsToUpdate: plan.eventsToUpdate,
    eventsToRemove: plan.eventsToRemove,
    badgesAdded: plan.badgesAdded,
    badgesRemoved: plan.badgesRemoved,
    milestonesAdded: plan.milestonesAdded,
    milestonesRemoved: plan.milestonesRemoved,
    legacyEventCountPreserved: plan.legacyEventCountPreserved,
    receipt: receipt ?? null,
  };
}

function checkpointPath(input) {
  const pathname = resolve(CHECKPOINT_DIR, input || "default.json");
  const outside = relative(CHECKPOINT_DIR, pathname).startsWith("..");
  if (outside || isAbsolute(relative(CHECKPOINT_DIR, pathname)) || !pathname.endsWith(".json")) {
    throw new Error("Le checkpoint doit rester sous apps/web/artifacts/validation/gamification-reconcile/*.json.");
  }
  return pathname;
}

async function readCheckpoint(pathname) {
  const parsed = JSON.parse(await readFile(pathname, "utf8"));
  if (parsed?.version !== 1 || parsed?.mode !== "apply-all" || typeof parsed.runId !== "string") {
    throw new Error("Checkpoint de réconciliation invalide.");
  }
  return parsed;
}

async function writeCheckpoint(pathname, checkpoint) {
  await mkdir(dirname(pathname), { recursive: true });
  const temporaryPath = `${pathname}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");
  await rename(temporaryPath, pathname);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help")) {
    help();
    return;
  }
  const { appendAdminOperationAudit } = await import("../src/lib/admin/audit/operation-audit.ts");
  const { GAMIFICATION_RULES_V1 } = await import("../src/lib/gamification/gamification-rules.ts");
  const { loadGamificationReconciliationSnapshot } = await import("../src/lib/gamification/gamification-reconciliation-plan.ts");
  const { reconcileUserGamification } = await import("../src/lib/gamification/gamification-reconciliation.ts");
  const { buildGamificationReconciliationReceipt } = await import("../src/lib/gamification/gamification-reconciliation-receipt.ts");
  const { parseGamificationReconcileArgs, runGamificationReconcile } = await import("../src/lib/gamification/gamification-reconcile-runner.ts");
  const args = parseGamificationReconcileArgs(argv);
  const actorUserId = optionValue(argv, "--actor") || "system:gamification-reconcile";
  const supabase = await loadEnvironment();
  const checkpointFile = args.target === "all" && args.mode === "apply"
    ? checkpointPath(args.resumePath || `${args.runId || `run-${Date.now()}`}.json`)
    : null;
  const initialCheckpoint = checkpointFile && existsSync(checkpointFile)
    ? await readCheckpoint(checkpointFile)
    : null;
  if (initialCheckpoint && initialCheckpoint.rulesVersion !== GAMIFICATION_RULES_V1.version) {
    throw new Error(`Le checkpoint cible ${initialCheckpoint.rulesVersion}, mais les règles courantes sont ${GAMIFICATION_RULES_V1.version}.`);
  }

  const result = await runGamificationReconcile(args, {
    rulesVersion: GAMIFICATION_RULES_V1.version,
    previewUser: async (userId) => (await loadGamificationReconciliationSnapshot(
      supabase,
      userId,
      GAMIFICATION_RULES_V1,
    )).plan,
    applyUser: async (userId) => {
      const reconciled = await reconcileUserGamification(supabase, userId, {
        rules: GAMIFICATION_RULES_V1,
        reasonCategory: "rules_update",
      });
      return { plan: reconciled.plan, receipt: reconciled.receipt, inserted: reconciled.inserted, updated: reconciled.updated, removed: reconciled.removed };
    },
    listUsers: async ({ afterUserId, limit }) => {
      let query = supabase.from("profiles").select("id").order("id", { ascending: true }).limit(limit);
      if (afterUserId) query = query.gt("id", afterUserId);
      const response = await query;
      if (response.error) throw new Error(`profiles: ${response.error.message}`);
      return (response.data ?? []).map((row) => String(row.id)).filter(Boolean);
    },
    writeCheckpoint: checkpointFile
      ? (checkpoint) => writeCheckpoint(checkpointFile, checkpoint)
      : async () => { throw new Error("Un checkpoint ne doit jamais être écrit en dry-run."); },
    auditApply: async ({ runId, userId, plan }) => appendAdminOperationAudit({
      operationId: `${runId}:${userId}`,
      at: new Date().toISOString(),
      actorUserId,
      operationType: "admin_operation",
      outcome: "success",
      targetId: userId,
      details: {
        command: "gamification:reconcile",
        rulesVersionBefore: plan.rulesVersionBefore,
        rulesVersionAfter: plan.rulesVersionAfter,
        xpBefore: plan.xpBefore,
        xpExpected: plan.xpExpected,
        xpDelta: plan.xpDelta,
        eventsAdded: plan.eventsToAdd.length,
        eventsUpdated: plan.eventsToUpdate.length,
        eventsRemoved: plan.eventsToRemove.length,
        badgesAdded: plan.badgesAdded,
        badgesRemoved: plan.badgesRemoved,
        milestonesAdded: plan.milestonesAdded,
        milestonesRemoved: plan.milestonesRemoved,
      },
    }),
  }, initialCheckpoint ? {
    runId: initialCheckpoint.runId,
    lastUserId: initialCheckpoint.lastUserId,
    aggregate: initialCheckpoint.aggregate,
  } : undefined);

  const output = {
    command: "gamification:reconcile",
    mode: args.mode,
    target: args.target,
    rulesVersion: GAMIFICATION_RULES_V1.version,
    runId: result.runId,
    checkpoint: args.mode === "apply" && args.target === "all" ? checkpointFile : null,
    ...(args.target === "user"
      ? {
          plan: publicPlan(
            result.userPlan,
            result.userReceipt ?? (args.mode === "dry-run"
              ? buildGamificationReconciliationReceipt(result.userPlan, { reasonCategory: "rules_update" })
              : null),
          ),
        }
      : { aggregate: result.aggregate }),
  };
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error("gamification:reconcile failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
