#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { findCandidateResidues } from "../ci/candidate-lifecycle.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");
const residues = findCandidateResidues(repositoryRoot);

const report = {
  validationRoot: path.relative(repositoryRoot, residues.validationRoot).replaceAll("\\", "/"),
  generatedCandidates: residues.generated.map((value) => path.relative(repositoryRoot, value).replaceAll("\\", "/")),
  unknownCanonicalEntries: residues.unknown.map((value) => path.relative(repositoryRoot, value).replaceAll("\\", "/")),
  adHocEntries: residues.adHoc.map((value) => path.relative(repositoryRoot, value).replaceAll("\\", "/")),
};

console.log(JSON.stringify(report, null, 2));

if (strict && residues.generated.length > 0) {
  console.error(
    `Candidate cleanup check failed: ${residues.generated.length} marked ephemeral candidate(s) remain.`,
  );
  process.exitCode = 1;
} else if (residues.adHoc.length > 0) {
  console.warn(
    `Candidate cleanup check reported ${residues.adHoc.length} ad hoc validation entr${residues.adHoc.length === 1 ? "y" : "ies"}; no deletion was attempted.`,
  );
}
