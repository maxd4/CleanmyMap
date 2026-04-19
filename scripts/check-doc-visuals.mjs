#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

const FIXED_PRIORITY_DOCS = [
  "documentation/index-par-objectif.md",
  "documentation/architecture/system-overview.md",
  "documentation/architecture/modules-cles-et-dependances.md",
  "documentation/data/pipeline-import.md",
  "documentation/securite/authz-authn-regles.md",
  "documentation/exploitation/incidents-frequents-et-reprise.md",
];

const MERMAID_BLOCK_RE = /```mermaid[\s\S]*?```/m;

async function listAuditRubriqueDocs() {
  const dir = path.join(ROOT, "documentation", "audit_rubrique");
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".txt"))
    .map((entry) => path.posix.join("documentation", "audit_rubrique", entry.name))
    .sort();
}

async function hasMermaidSchema(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const content = await readFile(absolutePath, "utf8");
  return MERMAID_BLOCK_RE.test(content);
}

async function validatePrioritizedDocs() {
  const auditDocs = await listAuditRubriqueDocs();
  const prioritizedDocs = [...FIXED_PRIORITY_DOCS, ...auditDocs];
  const missingSchemas = [];
  const missingFiles = [];

  for (const relativePath of prioritizedDocs) {
    const absolutePath = path.join(ROOT, relativePath);
    try {
      const fileStats = await stat(absolutePath);
      if (!fileStats.isFile()) {
        missingFiles.push(relativePath);
        continue;
      }
      const hasSchema = await hasMermaidSchema(relativePath);
      if (!hasSchema) {
        missingSchemas.push(relativePath);
      }
    } catch {
      missingFiles.push(relativePath);
    }
  }

  if (missingFiles.length > 0 || missingSchemas.length > 0) {
    console.error("check-doc-visuals: FAILED");
    if (missingFiles.length > 0) {
      console.error("\nMissing prioritized docs:");
      for (const file of missingFiles) {
        console.error(`- ${file}`);
      }
    }
    if (missingSchemas.length > 0) {
      console.error("\nPrioritized docs missing Mermaid schema:");
      for (const file of missingSchemas) {
        console.error(`- ${file}`);
      }
    }
    process.exit(1);
  }

  console.log(
    `check-doc-visuals: OK (${prioritizedDocs.length} prioritized docs with schema)`,
  );
}

await validatePrioritizedDocs();
