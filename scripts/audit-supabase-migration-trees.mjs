import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const repoRoot = process.cwd();

const trees = [
  {
    label: "workspace",
    dir: path.join(repoRoot, "apps", "web", "supabase", "migrations"),
  },
  {
    label: "root",
    dir: path.join(repoRoot, "supabase", "migrations"),
  },
];

for (const tree of trees) {
  if (!fs.existsSync(tree.dir)) {
    console.error(
      `Supabase migration tree audit failed: missing ${path.relative(repoRoot, tree.dir)}`,
    );
    process.exit(1);
  }
}

function readTree(dir) {
  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();

  return new Map(
    files.map((name) => {
      const content = fs.readFileSync(path.join(dir, name));
      const sha256 = crypto.createHash("sha256").update(content).digest("hex");
      return [name, { sha256, size: content.length }];
    }),
  );
}

const workspace = readTree(trees[0].dir);
const root = readTree(trees[1].dir);

const allNames = [...new Set([...workspace.keys(), ...root.keys()])].sort();
const onlyWorkspace = [];
const onlyRoot = [];
const divergent = [];
const identical = [];

for (const name of allNames) {
  const workspaceFile = workspace.get(name);
  const rootFile = root.get(name);

  if (!workspaceFile) {
    onlyRoot.push(name);
    continue;
  }

  if (!rootFile) {
    onlyWorkspace.push(name);
    continue;
  }

  if (workspaceFile.sha256 !== rootFile.sha256) {
    divergent.push(name);
    continue;
  }

  identical.push(name);
}

console.log("Supabase migration tree audit");
console.log(`- workspace files: ${workspace.size}`);
console.log(`- root files: ${root.size}`);
console.log(`- identical: ${identical.length}`);
console.log(`- only workspace: ${onlyWorkspace.length}`);
console.log(`- only root: ${onlyRoot.length}`);
console.log(`- divergent content: ${divergent.length}`);

function printGroup(title, files) {
  if (files.length === 0) {
    return;
  }

  console.log(`\n${title}`);
  for (const file of files) {
    console.log(`- ${file}`);
  }
}

printGroup("Only in apps/web/supabase/migrations", onlyWorkspace);
printGroup("Only in supabase/migrations", onlyRoot);
printGroup("Same filename, divergent content", divergent);

if (
  onlyWorkspace.length === 0 &&
  onlyRoot.length === 0 &&
  divergent.length === 0
) {
  console.log("\nMigration trees are currently identical.");
  process.exit(0);
}

console.error(
  [
    "",
    "Migration trees are not identical.",
    "Do not delete or modify one tree blindly.",
    "Follow documentation/architecture/adr/ADR-006-supabase-migrations-source-of-truth.md.",
  ].join("\n"),
);

process.exit(2);
