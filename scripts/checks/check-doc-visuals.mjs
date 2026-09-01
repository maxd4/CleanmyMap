#!/usr/bin/env node
import { createRepositoryView, parseRepositoryRef } from "./repository-view.mjs";

const ROOT = process.cwd();

const FIXED_PRIORITY_DOCS = [
  "documentation/architecture/system-overview.md",
  "documentation/architecture/modules-cles-et-dependances.md",
  "documentation/security/authz-authn-regles.md",
  "documentation/operations/incidents-frequents-et-reprise.md",
  "documentation/product/vision-et-objectifs.md",
  "documentation/product/roadmap-priorisee.md",
  "documentation/product/parcours-utilisateurs.md",
  "documentation/product/matrice-rubriques.md",
  "documentation/product/coherence-mobile-first.md",
  "documentation/product/SCIENTIFIC_PROTOCOL.md",
  "documentation/product/visual-first-priorites.md",
];

const MERMAID_BLOCK_RE = /```mermaid[\s\S]*?```/m;

function hasMermaidSchema(view, relativePath) {
  const content = view.readText(relativePath);
  return MERMAID_BLOCK_RE.test(content);
}

function validatePrioritizedDocs(view) {
  const prioritizedDocs = [...FIXED_PRIORITY_DOCS];
  const missingSchemas = [];
  const missingFiles = [];

  for (const relativePath of prioritizedDocs) {
    if (!view.isFile(relativePath)) {
      missingFiles.push(relativePath);
      continue;
    }
    if (!hasMermaidSchema(view, relativePath)) {
      missingSchemas.push(relativePath);
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

  return prioritizedDocs.length;
}

function main() {
  const ref = parseRepositoryRef();
  const view = createRepositoryView({ root: ROOT, ref });
  const count = validatePrioritizedDocs(view);
  console.log(`check-doc-visuals: OK (${count} prioritized docs with schema${ref ? `; ref ${ref}` : ""})`);
}

main();
