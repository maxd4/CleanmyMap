import type { GamificationReconciliationPlan } from "./gamification-reconciliation-plan";
import type { GamificationReconciliationReceipt } from "./gamification-reconciliation-receipt";

export type GamificationReconcileMode = "dry-run" | "apply";
export type GamificationReconcileTarget = "user" | "all";

export type GamificationReconcileArgs = {
  mode: GamificationReconcileMode;
  target: GamificationReconcileTarget;
  userId?: string;
  batchSize: number;
  resumePath?: string;
  runId?: string;
};

export type GamificationReconcileAggregate = {
  accountsInspected: number;
  accountsModified: number;
  xpAddedTotal: number;
  xpRemovedTotal: number;
  eventsAdded: number;
  eventsUpdated: number;
  eventsRemoved: number;
  badgesAdded: number;
  badgesRemoved: number;
  milestonesAdded: number;
  milestonesRemoved: number;
  errors: Array<{ userId: string; message: string }>;
};

export type GamificationReconcileCheckpoint = {
  version: 1;
  runId: string;
  mode: "apply-all";
  rulesVersion: string;
  batchSize: number;
  lastUserId: string | null;
  aggregate: GamificationReconcileAggregate;
  status: "running" | "paused" | "completed";
  updatedAt: string;
};

export type GamificationReconcileUserResult = {
  plan: GamificationReconciliationPlan;
  inserted?: number;
  updated?: number;
  removed?: number;
  receipt?: GamificationReconciliationReceipt | null;
};

export type GamificationReconcileDependencies = {
  rulesVersion: string;
  previewUser: (userId: string) => Promise<GamificationReconciliationPlan>;
  applyUser: (userId: string) => Promise<GamificationReconcileUserResult>;
  listUsers: (params: { afterUserId: string | null; limit: number }) => Promise<string[]>;
  writeCheckpoint: (checkpoint: GamificationReconcileCheckpoint) => Promise<void>;
  auditApply: (params: {
    runId: string;
    userId: string;
    plan: GamificationReconciliationPlan;
  }) => Promise<void>;
  now?: () => string;
};

export function emptyGamificationReconcileAggregate(): GamificationReconcileAggregate {
  return {
    accountsInspected: 0,
    accountsModified: 0,
    xpAddedTotal: 0,
    xpRemovedTotal: 0,
    eventsAdded: 0,
    eventsUpdated: 0,
    eventsRemoved: 0,
    badgesAdded: 0,
    badgesRemoved: 0,
    milestonesAdded: 0,
    milestonesRemoved: 0,
    errors: [],
  };
}

function hasChanges(plan: GamificationReconciliationPlan): boolean {
  return plan.xpDelta !== 0 ||
    plan.eventsToAdd.length > 0 ||
    plan.eventsToUpdate.length > 0 ||
    plan.eventsToRemove.length > 0 ||
    plan.badgesAdded.length > 0 ||
    plan.badgesRemoved.length > 0 ||
    plan.milestonesAdded.length > 0 ||
    plan.milestonesRemoved.length > 0;
}

export function addPlanToAggregate(
  aggregate: GamificationReconcileAggregate,
  plan: GamificationReconciliationPlan,
): void {
  aggregate.accountsInspected += 1;
  if (hasChanges(plan)) aggregate.accountsModified += 1;
  if (plan.xpDelta > 0) aggregate.xpAddedTotal += plan.xpDelta;
  if (plan.xpDelta < 0) aggregate.xpRemovedTotal += Math.abs(plan.xpDelta);
  aggregate.eventsAdded += plan.eventsToAdd.length;
  aggregate.eventsUpdated += plan.eventsToUpdate.length;
  aggregate.eventsRemoved += plan.eventsToRemove.length;
  aggregate.badgesAdded += plan.badgesAdded.length;
  aggregate.badgesRemoved += plan.badgesRemoved.length;
  aggregate.milestonesAdded += plan.milestonesAdded.length;
  aggregate.milestonesRemoved += plan.milestonesRemoved.length;
}

function cloneAggregate(aggregate: GamificationReconcileAggregate): GamificationReconcileAggregate {
  return {
    ...aggregate,
    errors: aggregate.errors.map((error) => ({ ...error })),
  };
}

function parseArgumentTokens(argv: readonly string[]): {
  values: Map<string, string>;
  flags: Set<string>;
} {
  const valueOptions = new Set(["--user", "--batch-size", "--resume", "--run-id", "--actor"]);
  const flagOptions = new Set(["--all", "--dry-run", "--apply"]);
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument?.startsWith("--")) throw new Error(`Argument inattendu: ${argument ?? ""}`);
    const next = argv[index + 1];
    if (!valueOptions.has(argument) && !flagOptions.has(argument)) {
      throw new Error(`Option inconnue: ${argument}`);
    }
    if (valueOptions.has(argument)) {
      if (!next || next.startsWith("--")) throw new Error(`${argument} attend une valeur.`);
      values.set(argument, next);
      index += 1;
    } else {
      flags.add(argument);
    }
  }
  return { values, flags };
}

export function parseGamificationReconcileArgs(argv: readonly string[]): GamificationReconcileArgs {
  const { values, flags } = parseArgumentTokens(argv);

  const isUser = values.has("--user");
  const isAll = flags.has("--all");
  if (isUser === isAll) throw new Error("Choisir exactement --user <id> ou --all.");
  const isDryRun = flags.has("--dry-run");
  const isApply = flags.has("--apply");
  if (isDryRun === isApply) throw new Error("Choisir exactement --dry-run ou --apply.");
  if (values.has("--resume") && (!isAll || !isApply)) {
    throw new Error("--resume est réservé à --all --apply.");
  }

  const batchSize = Number(values.get("--batch-size") ?? "50");
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new Error("--batch-size doit être un entier entre 1 et 500.");
  }
  const userId = values.get("--user")?.trim();
  if (isUser && !userId) throw new Error("--user ne peut pas être vide.");
  return {
    mode: isApply ? "apply" : "dry-run",
    target: isUser ? "user" : "all",
    userId,
    batchSize,
    resumePath: values.get("--resume"),
    runId: values.get("--run-id"),
  };
}

async function writeRunnerCheckpoint(
  args: GamificationReconcileArgs,
  dependencies: GamificationReconcileDependencies,
  runId: string,
  lastUserId: string | null,
  aggregate: GamificationReconcileAggregate,
  status: GamificationReconcileCheckpoint["status"],
  now: () => string,
): Promise<void> {
  if (args.mode !== "apply") return;
  await dependencies.writeCheckpoint({
    version: 1,
    runId,
    mode: "apply-all",
    rulesVersion: dependencies.rulesVersion,
    batchSize: args.batchSize,
    lastUserId,
    aggregate: cloneAggregate(aggregate),
    status,
    updatedAt: now(),
  });
}

async function processUser(
  args: GamificationReconcileArgs,
  dependencies: GamificationReconcileDependencies,
  userId: string,
  runId: string,
  aggregate: GamificationReconcileAggregate,
  lastUserId: string | null,
  now: () => string,
): Promise<string> {
  try {
    const result = args.mode === "dry-run"
      ? { plan: await dependencies.previewUser(userId) }
      : await dependencies.applyUser(userId);
    addPlanToAggregate(aggregate, result.plan);
    if (args.mode === "apply") {
      await dependencies.auditApply({ runId, userId, plan: result.plan });
    }
    await writeRunnerCheckpoint(args, dependencies, runId, userId, aggregate, "running", now);
    return userId;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    aggregate.errors.push({ userId, message });
    await writeRunnerCheckpoint(args, dependencies, runId, lastUserId, aggregate, "paused", now);
    if (args.mode === "dry-run") return lastUserId ?? "";
    throw new Error(`Réconciliation interrompue pour ${userId}: ${message}`);
  }
}

async function runSingleUser(
  args: GamificationReconcileArgs,
  dependencies: GamificationReconcileDependencies,
  runId: string,
  aggregate: GamificationReconcileAggregate,
): Promise<GamificationReconcileUserResult> {
  const userId = args.userId!;
  if (args.mode === "dry-run") {
    const plan = await dependencies.previewUser(userId);
    addPlanToAggregate(aggregate, plan);
    return { plan };
  }
  const result = await dependencies.applyUser(userId);
  addPlanToAggregate(aggregate, result.plan);
  await dependencies.auditApply({ runId, userId, plan: result.plan });
  return result;
}

async function runAllUsers(
  args: GamificationReconcileArgs,
  dependencies: GamificationReconcileDependencies,
  runId: string,
  aggregate: GamificationReconcileAggregate,
  now: () => string,
  initialLastUserId: string | null,
): Promise<string | null> {
  let lastUserId = initialLastUserId;
  while (true) {
    const userIds = await dependencies.listUsers({ afterUserId: lastUserId, limit: args.batchSize });
    if (userIds.length === 0) break;
    for (const userId of userIds) {
      if (!userId.trim()) continue;
      lastUserId = await processUser(args, dependencies, userId, runId, aggregate, lastUserId, now);
    }
    if (userIds.length < args.batchSize) break;
  }
  await writeRunnerCheckpoint(args, dependencies, runId, lastUserId, aggregate, "completed", now);
  return lastUserId;
}

export async function runGamificationReconcile(
  args: GamificationReconcileArgs,
  dependencies: GamificationReconcileDependencies,
  initial?: {
    runId: string;
    lastUserId?: string | null;
    aggregate?: GamificationReconcileAggregate;
  },
): Promise<{ aggregate: GamificationReconcileAggregate; runId: string; userPlan?: GamificationReconciliationPlan; userReceipt?: GamificationReconciliationReceipt | null }> {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const runId = initial?.runId ?? args.runId ?? `gamification-reconcile-${Date.now()}`;
  const aggregate = cloneAggregate(initial?.aggregate ?? emptyGamificationReconcileAggregate());

  if (args.target === "user") {
    const result = await runSingleUser(args, dependencies, runId, aggregate);
    return { aggregate, runId, userPlan: result.plan, userReceipt: result.receipt };
  }

  await runAllUsers(args, dependencies, runId, aggregate, now, initial?.lastUserId ?? null);
  return { aggregate, runId };
}
