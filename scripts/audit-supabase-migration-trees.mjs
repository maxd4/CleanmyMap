import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const repoRoot = process.cwd();

const canonicalDir = path.join(repoRoot, "apps", "web", "supabase", "migrations");
const forbiddenMirrorDir = path.join(repoRoot, "supabase", "migrations");

if (!fs.existsSync(canonicalDir)) {
  console.error(
    `Supabase migration audit failed: missing ${path.relative(repoRoot, canonicalDir)}`,
  );
  process.exit(1);
}

if (fs.existsSync(forbiddenMirrorDir)) {
  console.error(
    [
      "Supabase migration audit failed: the deprecated root migration tree exists:",
      `- ${path.relative(repoRoot, forbiddenMirrorDir)}`,
      "Use apps/web/supabase/migrations/ as the only editable migration source.",
    ].join("\n"),
  );
  process.exit(2);
}

function readCanonicalMigrations(dir) {
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

const canonical = readCanonicalMigrations(canonicalDir);
const duplicateVersions = [];
const versions = new Map();

for (const name of canonical.keys()) {
  const version = name.match(/^(\d+)_/)?.[1];
  if (!version) {
    continue;
  }

  const names = versions.get(version) ?? [];
  names.push(name);
  versions.set(version, names);
}

for (const [version, names] of versions) {
  if (names.length > 1) {
    duplicateVersions.push(`${version}: ${names.join(", ")}`);
  }
}

console.log("Supabase migration tree audit");
console.log(`- canonical files: ${canonical.size}`);
console.log("- root mirror: absent");
console.log(`- duplicate versions: ${duplicateVersions.length}`);

if (duplicateVersions.length > 0) {
  console.error("\nDuplicate Supabase migration versions:");
  for (const duplicate of duplicateVersions) {
    console.error(`- ${duplicate}`);
  }
  process.exit(2);
}

console.log("\nOnly apps/web/supabase/migrations/ is editable.");
