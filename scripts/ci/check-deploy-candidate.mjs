#!/usr/bin/env node

import fs from "node:fs";
import { printDeployCandidateResult, resolveDeployCandidate } from "./deploy-validation.mjs";

const shaArgument = process.argv.find((arg) => arg.startsWith("--sha="));
const baseArgument = process.argv.find((arg) => arg.startsWith("--base-ref="));
const deploymentArgument = process.argv.find((arg) => arg.startsWith("--deployment-ref="));
const proofArgument = process.argv.find((arg) => arg.startsWith("--deployment-proof="));
const treeArgument = process.argv.find((arg) => arg.startsWith("--candidate-tree="));
const allowDirtyCandidate = process.argv.includes("--allow-dirty-candidate");
let deploymentProof = null;
if (proofArgument) {
  try {
    deploymentProof = JSON.parse(fs.readFileSync(proofArgument.slice("--deployment-proof=".length), "utf8"));
  } catch (error) {
    console.error(`CONTROL_STATUS: BLOCKED_DECISION`);
    console.error(`DEPLOY_PUBLICATION_PROOF_ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
}
}
const result = await resolveDeployCandidate({
  repositoryRoot: process.cwd(),
  baseRef: baseArgument?.slice("--base-ref=".length) || "",
  deploymentReference: deploymentArgument ? { sha: deploymentArgument.slice("--deployment-ref=".length) } : null,
  deploymentProof,
  candidateSha: shaArgument?.slice("--sha=".length),
  candidateTreeSha: treeArgument?.slice("--candidate-tree=".length) || "",
  allowDirtyCandidate,
  allowedDirtyFiles: proofArgument ? [proofArgument.slice("--deployment-proof=".length)] : [],
});

if (deploymentProof || !proofArgument) {
  process.exitCode = printDeployCandidateResult(result) ? 0 : 1;
}
