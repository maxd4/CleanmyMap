import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  if (process.argv[index].startsWith("--")) args.set(process.argv[index].slice(2), process.argv[index + 1]);
}

function identifier(value) {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1).replaceAll('""', '"') : value;
}

function relation(schema, table) {
  return `${identifier(schema ?? "public")}.${identifier(table)}`;
}

export function extractDataRelations(sql) {
  const relations = new Set();
  for (const line of String(sql).split(/\r?\n/)) {
    const copy = line.match(/^\s*COPY\s+((?:"[^"]+"|[A-Za-z_][\w$]*))(?:\.((?:"[^"]+"|[A-Za-z_][\w$]*)))?\s*(?:\(|FROM\s+stdin)/i);
    if (copy) relations.add(relation(copy[2] ? copy[1] : "public", copy[2] ?? copy[1]));
    const setval = line.match(/pg_catalog\.setval\(\s*'((?:''|[^'])+)'/i);
    if (setval) {
      const path = setval[1].replaceAll("''", "'");
      const separator = path.indexOf(".");
      if (separator > 0) relations.add(`${path.slice(0, separator)}.${path.slice(separator + 1)}`);
    }
  }
  return [...relations].sort();
}

export function compareRelationSets(dataSql, availableText) {
  const exported = extractDataRelations(dataSql);
  const available = new Set(String(availableText).split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  return { exported, available: [...available].sort(), missing: exported.filter((item) => !available.has(item)) };
}

function safeDigest(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function formatRelationCoherence(result) {
  if (result.missing.length > 0) {
    return `RELATION_COHERENCE: FAIL exported=${result.exported.length} available=${result.available.length} missing=${result.missing.length} first_missing_digest=${safeDigest(result.missing[0])}`;
  }
  return `RELATION_COHERENCE: PASS exported=${result.exported.length} available=${result.available.length}`;
}

export async function writeExportedRelations(path, sql) {
  await writeFile(path, `${extractDataRelations(sql).join("\n")}\n`, { flag: "wx" });
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  try {
    const dataFile = args.get("data-file");
    const availableFile = args.get("available-file");
    const exportedFile = args.get("write-exported-file");
    if (!dataFile || !availableFile) throw new Error("Usage: node verify-supabase-backup-relation-coherence.mjs --data-file PATH --available-file PATH");
    const dataSql = await readFile(dataFile, "utf8");
    const result = compareRelationSets(dataSql, await readFile(availableFile, "utf8"));
    if (exportedFile) await writeExportedRelations(exportedFile, dataSql);
    console.log(formatRelationCoherence(result));
    if (result.missing.length > 0) process.exitCode = 1;
  } catch (error) {
    console.error(`RELATION_COHERENCE: ERROR ${error instanceof Error ? error.message : "unknown"}`);
    process.exitCode = 2;
  }
}
