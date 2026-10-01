import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  ACTION_BACKUP_CONFIRMATION,
  formatRestorePlan,
  validateActionBackup,
} from "./action-backup-contract.mjs";

export async function readActionBackup(inputPath) {
  const fullPath = resolve(process.cwd(), inputPath);
  const content = await readFile(fullPath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid action backup: JSON parsing failed");
  }
  validateActionBackup(parsed);
  return parsed;
}

export async function restoreActionBackup({
  supabase,
  backup,
  apply = false,
  confirmation = null,
}) {
  validateActionBackup(backup);
  const plan = formatRestorePlan(backup);

  if (!apply) {
    return { ...plan, mode: "dry-run" };
  }
  if (confirmation !== ACTION_BACKUP_CONFIRMATION) {
    throw new Error(`Explicit confirmation required: ${ACTION_BACKUP_CONFIRMATION}`);
  }
  if (backup.counts.actions === 0) {
    return { ...plan, mode: "apply", status: "empty", restored: 0 };
  }

  const result = await supabase.rpc("restore_action_backup", { p_backup: backup });
  if (result.error) throw new Error(`restore_action_backup: ${result.error.message}`);
  return {
    ...plan,
    mode: "apply",
    status: "restored",
    restored: result.data?.restored ?? backup.counts.actions,
  };
}

function parseArgs(argv) {
  const [inputPath, ...flags] = argv;
  const apply = flags.includes("--apply");
  const confirmationFlag = flags.find((flag) => flag.startsWith("--confirm="));
  const confirmation = confirmationFlag?.slice("--confirm=".length) ?? null;
  if (!inputPath || flags.some((flag) => !["--apply", confirmationFlag].includes(flag))) {
    throw new Error(
      "Usage: node scripts/restore-actions-backup.mjs <path-to-json> [--apply --confirm=RESTORE ACTION BACKUP]",
    );
  }
  return { inputPath, apply, confirmation };
}

async function main() {
  const { inputPath, apply, confirmation } = parseArgs(process.argv.slice(2));
  const backup = await readActionBackup(inputPath);

  if (!apply) {
    console.log(JSON.stringify(await restoreActionBackup({ backup }), null, 2));
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const result = await restoreActionBackup({
    supabase,
    backup,
    apply: true,
    confirmation,
  });
  console.log(JSON.stringify(result, null, 2));
}

const currentModuleUrl = pathToFileURL(process.argv[1] ?? "").href;
if (currentModuleUrl === import.meta.url) {
  main().catch((error) => {
    console.error("Action restore failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
