import { existsSync } from "node:fs";
import { join } from "node:path";
import { createWorkspaceCoordinator } from "./workspace-coordination.mjs";

const ROOT = process.cwd();
const REQUIRED = [
  "AGENTS.md",
  "documentation/sessions/project_context.md",
  "documentation/sessions/history/latest-session.md",
];

function mustExist(relativePath) {
  const absolutePath = join(ROOT, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required bootstrap file: ${relativePath}`);
  }
}

for (const file of REQUIRED) {
  mustExist(file);
}

function readRunId() {
  const argument = process.argv.slice(2).find((value) => value.startsWith("--run-id"));
  if (!argument) return null;
  return argument.includes("=") ? argument.split("=", 2)[1] : process.argv[process.argv.indexOf(argument) + 1] ?? null;
}

const coordination = createWorkspaceCoordinator({ repositoryRoot: ROOT });
const coordinationStatus = coordination.status({ runId: readRunId() });

console.log("Session bootstrap ready.");
console.log("Files verified:");
for (const file of REQUIRED) {
  console.log(`- ${file}`);
}
console.log(`ACTIVE_RUNS=${coordinationStatus.activeRuns.length}`);
console.log(`OWNED_FILES=${coordinationStatus.ownedFiles}`);
console.log(`LEGACY_UNOWNED=${coordinationStatus.legacyUnowned}`);
console.log(`OVERLAPS=${coordinationStatus.overlaps.length}`);
console.log(`PUBLICATION_OWNER=${coordinationStatus.publicationOwner ?? "none"}`);
console.log(`ORPHAN_DIRTY=${coordinationStatus.orphanDirty.length}`);
if (coordinationStatus.run) {
  console.log(`RUN_ID=${coordinationStatus.run.runId}`);
  console.log(`RUN_OWNED_PATHS=${coordinationStatus.run.ownedPaths.length}`);
  console.log(`RUN_REMOTE_CHANGED=${coordinationStatus.run.remoteChangedPaths.length}`);
}
