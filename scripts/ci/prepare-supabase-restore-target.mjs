import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const CANONICAL_PORTS = Object.freeze([
  ["port = 54321", "port = 54321"],
  ["port = 54322", "port = 54322"],
  ["shadow_port = 54320", "shadow_port = 54320"],
  ["port = 54329", "port = 54329"],
  ["port = 54323", "port = 54323"],
  ["port = 54324", "port = 54324"],
  ["# smtp_port = 54325", "smtp_port = 54325"],
  ["# pop3_port = 54326", "pop3_port = 54326"],
  ["port = 54327", "port = 54327"],
]);

function argument(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((entry) => entry.startsWith(prefix));
  return value?.slice(prefix.length);
}

function replaceExactly(text, needle, replacement) {
  const count = text.split(needle).length - 1;
  if (count !== 1) throw new Error(`canonical Supabase config contract mismatch for ${needle}`);
  return text.replace(needle, replacement);
}

function replaceSectionEnabled(text, section) {
  const sectionPattern = new RegExp(`(\\[${section.replaceAll(".", "\\.")}\\][\\s\\S]*?)(?=\\n\\[|$)`);
  const match = text.match(sectionPattern);
  if (!match) throw new Error(`canonical Supabase config is missing [${section}]`);
  const updated = match[1].replace(/^enabled = true\r?$/m, "enabled = false");
  if (updated === match[1]) throw new Error(`[${section}] is already disabled or has no enabled flag`);
  return text.replace(match[1], updated);
}

export function rewriteRestoreTargetConfig(configText, { projectId, portOffset = 1000 } = {}) {
  if (!/^[A-Za-z0-9_-]+$/.test(projectId ?? "")) throw new Error("projectId must be a safe Supabase project identifier");
  if (!Number.isInteger(portOffset) || portOffset < 1) throw new Error("portOffset must be a positive integer");

  let result = replaceExactly(configText, 'project_id = "web"', `project_id = "${projectId}"`);
  for (const [source, target] of CANONICAL_PORTS) {
    const port = Number(source.match(/(\d+)$/)?.[1]);
    const replacement = source.startsWith("# ") ? target.replace(/\d+$/, String(port + portOffset)) : target.replace(/\d+$/, String(port + portOffset));
    result = replaceExactly(result, source, replacement);
  }
  result = replaceExactly(result, "inspector_port = 8083", "inspector_port = 54803");
  result = replaceSectionEnabled(result, "db.migrations");
  result = replaceSectionEnabled(result, "db.seed");
  return result;
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  const sourceConfig = argument("source-config");
  const targetConfig = argument("target-config");
  const projectId = argument("project-id");
  const portOffset = Number(argument("port-offset") ?? "1000");
  if (!sourceConfig || !targetConfig || !projectId) {
    console.error("Usage: node prepare-supabase-restore-target.mjs --source-config PATH --target-config PATH --project-id ID [--port-offset N]");
    process.exitCode = 2;
  } else {
    const rewritten = rewriteRestoreTargetConfig(await readFile(sourceConfig, "utf8"), { projectId, portOffset });
    await mkdir(dirname(targetConfig), { recursive: true });
    await writeFile(targetConfig, rewritten, "utf8");
  }
}
